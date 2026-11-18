"""分队数据源核对：播种测试行程并比对分队读到的节点是否来自主线方案。

用法（在仓库根目录执行）：
  python docs/ai4se-plugins/20261117-195500-split-main-plan-check.py seed --db backend/data/gogo-split-main-plan.db --copy-from backend/data/gogo.db
  python docs/ai4se-plugins/20261117-195500-split-main-plan-check.py report --db backend/data/gogo-split-main-plan.db
  python docs/ai4se-plugins/20261117-195500-split-main-plan-check.py verify --db backend/data/gogo-split-main-plan.db --base-url http://localhost:8091
  python docs/ai4se-plugins/20261117-195500-split-main-plan-check.py cleanup --db backend/data/gogo-split-main-plan.db

seed    ：插入「分队数据源核对 · 主线5站」行程（Alice/Ben/Chloe），主线草稿已确认、5 个辨识度高的站点；
          刻意不写 plan_node，主线路由只会在分队发起时由 MainPlanProjection 投影出来。
report  ：打印主线 main_plan_stop 与 plan_node(branch_id='main') 的现状，用于确认“发起前为空/发起后一致”。
verify  ：登录后 GET /main-plan，POST /split-draft，GET /split-draft，逐站比对名称与 ISO 时刻（Asia/Singapore）。
cleanup ：删除该行程及其全部关联数据（main_plan_stop / main_plan_draft / plan_node / split_draft / trip_member / trip_invitation）。
"""

import argparse
import http.cookiejar
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

TRIP_NAME = "分队数据源核对 · 主线5站"
INVITE_TOKEN = "SPLITMAINCHECK"
ORGANIZER_ID = 1  # Alice
MEMBER_IDS = [1, 2, 3]  # Alice / Ben / Chloe
MAIN_VERSION = 1
MAIN_STOPS = [
    # (seq, 名称, 开始 HH:MM, 结束 HH:MM, 到下一站交通分钟)
    (1, "主线·码头集合", "08:05", "08:35", 30),
    (2, "主线·旧城早餐", "09:10", "09:55", 25),
    (3, "主线·滨海美术馆", "10:45", "11:40", 40),
    (4, "主线·花园步道", "13:00", "14:10", 15),
    (5, "主线·灯塔会合", "17:30", "18:00", None),
]
TRIP_ZONE = timezone(timedelta(hours=8))  # 与 MainPlanProjection 的 Asia/Singapore 一致


def connect(path):
    if not os.path.exists(path):
        sys.exit(f"数据库不存在：{path}（可先用 --copy-from 复制一份开发库）")
    con = sqlite3.connect(path, timeout=15)
    con.row_factory = sqlite3.Row
    return con


def copy_database(source, target):
    src = sqlite3.connect(source)
    dst = sqlite3.connect(target)
    with dst:
        src.backup(dst)
    src.close()
    dst.close()
    print(f"已复制数据库：{source} -> {target}")


def cleanup(con):
    trip = con.execute("SELECT id FROM trip WHERE name = ?", (TRIP_NAME,)).fetchall()
    if not trip:
        return None
    trip_id = trip[0]["id"]
    con.execute("DELETE FROM plan_node WHERE trip_id = ?", (trip_id,))
    con.execute("DELETE FROM split_draft WHERE trip_id = ?", (trip_id,))
    con.execute(
        "DELETE FROM main_plan_stop WHERE draft_id IN (SELECT id FROM main_plan_draft WHERE trip_id = ?)",
        (trip_id,),
    )
    con.execute("DELETE FROM main_plan_draft WHERE trip_id = ?", (trip_id,))
    con.execute("DELETE FROM trip_member WHERE trip_id = ?", (trip_id,))
    con.execute("DELETE FROM trip_invitation WHERE trip_id = ?", (trip_id,))
    con.execute("UPDATE app_user SET current_trip_id = NULL WHERE current_trip_id = ?", (trip_id,))
    con.execute("DELETE FROM trip WHERE id = ?", (trip_id,))
    return trip_id


def seed(con):
    with con:
        removed = cleanup(con)
        cur = con.execute(
            "INSERT INTO trip (name, destination, start_date, end_date, start_location, end_location, "
            "organizer_id, main_plan_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            (TRIP_NAME, "Singapore", "2026-12-20", "2026-12-21", "主线·码头集合", "主线·灯塔会合", ORGANIZER_ID),
        )
        trip_id = cur.lastrowid
        for user_id in MEMBER_IDS:
            con.execute("INSERT INTO trip_member (trip_id, user_id) VALUES (?, ?)", (trip_id, user_id))
        con.execute(
            "INSERT INTO trip_invitation (trip_id, token) VALUES (?, ?)", (trip_id, INVITE_TOKEN)
        )
        draft = con.execute(
            "INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, input_revisions_json) "
            "VALUES (?, ?, 'confirmed', 5000, '[]')",
            (trip_id, MAIN_VERSION),
        )
        draft_id = draft.lastrowid
        for seq, name, start, end, leg in MAIN_STOPS:
            con.execute(
                "INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, "
                "travel_minutes_to_next, interests_json) VALUES (?, ?, ?, ?, ?, ?, '[]')",
                (draft_id, seq, name, start, end, leg),
            )
    if removed:
        print(f"已重建旧测试行程 id={removed}")
    return trip_id


def trip_id_of(con):
    rows = con.execute("SELECT id FROM trip WHERE name = ?", (TRIP_NAME,)).fetchall()
    return rows[0]["id"] if rows else None


def local_to_iso(date_str, clock):
    hh, mm = (int(part) for part in clock.split(":"))
    stamp = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=hh, minute=mm, tzinfo=TRIP_ZONE)
    return stamp.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def print_report(con):
    trip_id = trip_id_of(con)
    if trip_id is None:
        sys.exit(f"未找到测试行程「{TRIP_NAME}」，先执行 seed")
    trip = con.execute(
        "SELECT id, name, start_date, main_plan_confirmed FROM trip WHERE id = ?", (trip_id,)
    ).fetchone()
    print(f"\n== 测试行程 == id={trip['id']} name={trip['name']} start_date={trip['start_date']} "
          f"main_plan_confirmed={trip['main_plan_confirmed']}")

    print("\n== 主线方案（main_plan_stop，确认态）==")
    for row in con.execute(
        "SELECT s.seq, s.name, s.start_local, s.end_local, d.version, d.status FROM main_plan_stop s "
        "JOIN main_plan_draft d ON d.id = s.draft_id WHERE d.trip_id = ? ORDER BY s.seq",
        (trip_id,),
    ):
        print(f"  seq={row['seq']} {row['name']} {row['start_local']}-{row['end_local']} "
              f"(version={row['version']}, {row['status']})")

    print("\n== plan_node 主线行（分队读取源：branch_id='main'）==")
    rows = con.execute(
        "SELECT plan_version, title, start_at, end_at, sort_order FROM plan_node "
        "WHERE trip_id = ? AND branch_id = 'main' ORDER BY plan_version, sort_order",
        (trip_id,),
    ).fetchall()
    if not rows:
        print("  （空 — 尚未发起分队；发起时由 MainPlanProjection 从主线投影）")
    for row in rows:
        print(f"  v{row['plan_version']} sort={row['sort_order']} {row['title']} "
              f"{row['start_at']} → {row['end_at']}")

    print("\n== 分队草稿 ==")
    drafts = con.execute(
        "SELECT draft_version, document FROM split_draft WHERE trip_id = ?", (trip_id,)
    ).fetchall()
    if not drafts:
        print("  （无草稿）")
    for row in drafts:
        doc = json.loads(row["document"])
        print(f"  draft_version={row['draft_version']} status={doc.get('status')} "
              f"mainPlanVersion={doc.get('mainPlanVersion')} "
              f"departureStopId={doc.get('departureStopId')} reunionStopId={doc.get('reunionStopId')}")


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = None

    def csrf_token(self):
        for cookie in self.jar:
            if cookie.name == "XSRF-TOKEN":
                return urllib.parse.unquote(cookie.value)
        return None

    def call(self, method, path, body=None):
        if self.csrf is None:
            self.raw("GET", "/api/auth/csrf")
            self.csrf = self.csrf_token()
        data = json.dumps(body).encode("utf-8") if body is not None else None
        headers = {"X-XSRF-TOKEN": self.csrf} if self.csrf else {}
        if data is not None:
            headers["Content-Type"] = "application/json"
        return self.raw(method, path, data, headers)

    def raw(self, method, path, data=None, headers=None):
        request = urllib.request.Request(self.base + path, data=data, method=method, headers=headers or {})
        try:
            with self.opener.open(request) as response:
                text = response.read().decode("utf-8")
                return response.status, (json.loads(text) if text else None)
        except urllib.error.HTTPError as error:
            text = error.read().decode("utf-8")
            try:
                return error.code, json.loads(text)
            except json.JSONDecodeError:
                return error.code, text


def verify(con, base_url, email, password):
    trip_id = trip_id_of(con)
    if trip_id is None:
        sys.exit(f"未找到测试行程「{TRIP_NAME}」，先执行 seed")
    start_date = con.execute("SELECT start_date FROM trip WHERE id = ?", (trip_id,)).fetchone()["start_date"]
    api = Api(base_url)

    status, body = api.call("POST", "/api/auth/login", {"email": email, "password": password})
    if status != 200:
        sys.exit(f"登录失败 HTTP {status}: {body}")

    status, plan = api.call("GET", f"/api/trips/{trip_id}/main-plan")
    if status != 200:
        sys.exit(f"读取主线方案失败 HTTP {status}: {plan}")
    plan_stops = plan.get("stops") or []

    status, started = api.call("POST", f"/api/trips/{trip_id}/split-draft")
    if status not in (200, 201):
        sys.exit(f"发起分队失败 HTTP {status}: {started}")
    main_version = (started.get("data") or {}).get("mainPlanVersion")

    status, detail = api.call("GET", f"/api/trips/{trip_id}/split-draft")
    if status != 200 or not (detail.get("data") or detail):
        sys.exit(f"读取分队详情失败 HTTP {status}: {detail}")
    split = detail.get("data") if isinstance(detail, dict) and "data" in detail else detail
    split_stops = split.get("mainPlanStops") or []

    print(f"\n== API 核对 == base={base_url} trip={trip_id} 登录={email}")
    print(f"主线方案 version={plan.get('version')} confirmed={plan.get('confirmed')} 站点数={len(plan_stops)}")
    print(f"分队草稿 mainPlanVersion={main_version} 分队站点数={len(split_stops)}")

    expected = [
        (row["name"], local_to_iso(start_date, row["startTime"]), local_to_iso(start_date, row["endTime"]))
        for row in plan_stops
    ]
    actual = [(row.get("name"), row.get("startAt"), row.get("endAt")) for row in split_stops]

    print("\n主线方案站点(HH:mm)                    → 期望 ISO(UTC)                    分队返回(ISO)")
    failures = 0
    for expected_row, actual_row in zip(expected, actual):
        same_name = expected_row[0] == actual_row[0]
        same_time = expected_row[1] == actual_row[1] and expected_row[2] == actual_row[2]
        mark = "OK " if same_name and same_time else "FAIL"
        failures += 0 if (same_name and same_time) else 1
        print(f"[{mark}] {expected_row[0]:<12} {expected_row[1]}→{expected_row[2]}  "
              f"| 分队: {actual_row[0]} {actual_row[1]}→{actual_row[2]}")
    if len(expected) != len(actual):
        failures += abs(len(expected) - len(actual))
        print(f"[FAIL] 站点数量不一致：主线 {len(expected)} vs 分队 {len(actual)}")

    nodes = con.execute(
        "SELECT plan_version, title, start_at, end_at FROM plan_node "
        "WHERE trip_id = ? AND branch_id = 'main' ORDER BY sort_order",
        (trip_id,),
    ).fetchall()
    print(f"\nplan_node 主线行：{len(nodes)} 条（应等于主线站点数，plan_version={main_version}）")
    for row in nodes:
        print(f"  v{row['plan_version']} {row['title']} {row['start_at']} → {row['end_at']}")

    print("\n结论：" + ("PASS — 分队站点与主线方案逐站一致" if failures == 0
                       else f"FAIL — {failures} 处不一致"))
    return 0 if failures == 0 else 1


def main():
    parser = argparse.ArgumentParser(description="分队数据源核对（主线方案 -> plan_node -> 分队）")
    parser.add_argument("action", choices=["seed", "report", "verify", "cleanup"])
    parser.add_argument("--db", default="backend/data/gogo-split-main-plan.db")
    parser.add_argument("--copy-from", help="seed 前先复制该库（目标不存在或覆盖）")
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--email", default="alice@example.com")
    parser.add_argument("--password", default="gogo-demo-2026")
    args = parser.parse_args()

    if args.action == "seed":
        if args.copy_from:
            if os.path.exists(args.db):
                os.remove(args.db)
            copy_database(args.copy_from, args.db)
        con = connect(args.db)
        trip_id = seed(con)
        print(f"已插入测试行程「{TRIP_NAME}」id={trip_id}（主线 {MAIN_VERSION} 版，{len(MAIN_STOPS)} 站，已确认）")
        print_report(con)
        con.close()
        return 0

    con = connect(args.db)
    try:
        if args.action == "report":
            print_report(con)
            return 0
        if args.action == "cleanup":
            removed = cleanup(con)
            con.commit()
            print(f"已删除测试行程 id={removed}" if removed else "没有需要清理的测试行程")
            return 0
        if args.action == "verify":
            return verify(con, args.base_url, args.email, args.password)
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
