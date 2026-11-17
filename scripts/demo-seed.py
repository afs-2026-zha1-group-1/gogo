"""演示数据：准备 香港 / 伦敦 两条可直接演示的行程与主线草稿。

做五件事（只动目的地匹配 香港/伦敦 的行程；没有则按演示名称新建）：
1) 复制数据库备份（SQLite backup API，含 WAL 内容）；
2) 保证行程至少两名成员且全员就绪（Ben 组织者 + Eve；提交行让成员 ready）；
3) 主线方案写成“草稿 v1”（status=current），预填与夹具一致的分站数据，行程复位为未确认；
4) plan_node 写入同一条主线的节点（确认时会被投影覆盖，内容一致）；
5) 清掉旧分队草稿（改边界后旧路线不再有效）。

用法：python scripts/demo-seed.py [db_path]
默认库：backend/data/gogo.db
"""

import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "backend" / "data" / "gogo.db"

# (名称, 开始, 结束, 到下一站分钟, 兴趣标签)
HONG_KONG_MAIN = [
    ("西九文化区 M+ 博物馆", "09:00", "10:20", 20, ["heritage", "photo"]),
    ("天星小轮（尖沙咀 → 中环）", "10:40", "11:10", 15, ["slow", "photo"]),
    ("中环街市与半山扶梯", "11:25", "12:45", 20, ["food", "craft"]),
    ("太平山顶与凌霄阁", "13:05", "14:35", 40, ["nature", "photo"]),
    ("铜锣湾时代广场", "15:15", "16:30", 25, ["food", "craft"]),
    ("尖沙咀海滨长廊与星光大道", "16:55", "18:10", None, ["photo", "slow"]),
]

LONDON_MAIN = [
    ("大英博物馆", "09:00", "10:30", 20, ["heritage", "photo"]),
    ("考文特花园", "10:50", "11:50", 15, ["food", "craft"]),
    ("国家美术馆与特拉法加广场", "12:05", "13:05", 20, ["heritage", "photo"]),
    ("博罗市场午餐", "13:25", "14:25", 20, ["food", "coffee"]),
    ("伦敦塔与塔桥", "14:45", "16:15", 25, ["heritage", "photo"]),
    ("泰晤士河游船（塔桥 → 威斯敏斯特）", "16:40", "17:40", 20, ["slow", "photo"]),
    ("伦敦眼与南岸夜景", "18:00", "19:15", None, ["photo", "slow"]),
]

ORGANIZER_ID = 2  # Ben
SECOND_MEMBER_ID = 5  # Eve

CITIES = [
    {
        "name": "演示 · 香港两日",
        "match": ("香港", "hong kong"),
        "start_date": "2026-11-21",
        "end_date": "2026-11-22",
        "start_location": "珠海",
        "end_location": "珠海",
        "stops": HONG_KONG_MAIN,
        "cost_cents": 68000,
        "utc_offset_hours": 8,
        "interests": {ORGANIZER_ID: '{"codes":["food","photo","heritage"]}',
                      SECOND_MEMBER_ID: '{"codes":["food","craft","slow"]}'},
    },
    {
        "name": "演示 · 伦敦一周",
        "match": ("伦敦", "london"),
        "start_date": "2026-11-23",
        "end_date": "2026-11-29",
        "start_location": "希思罗机场",
        "end_location": "国王十字车站",
        "stops": LONDON_MAIN,
        "cost_cents": 9500,
        "utc_offset_hours": 0,  # 11 月下旬伦敦为 GMT
        "interests": {ORGANIZER_ID: '{"codes":["coffee","photo","heritage"]}',
                      SECOND_MEMBER_ID: '{"codes":["food","craft","slow"]}'},
    },
]


def backup(db_path: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = db_path.with_name(f"{db_path.name}.bak-demo-{stamp}")
    source = sqlite3.connect(db_path)
    dest = sqlite3.connect(target)
    with dest:
        source.backup(dest)
    source.close()
    dest.close()
    return target


def match_city(destination: str):
    value = (destination or "").strip()
    lower = value.lower()
    for city in CITIES:
        for key in city["match"]:
            if key in (lower if key.isascii() else value):
                return city
    return None


def columns(conn: sqlite3.Connection, table: str) -> set:
    return {row[1] for row in conn.execute(f"pragma table_info({table})")}


def ensure_trip(conn: sqlite3.Connection, city):
    query = "SELECT id, name, destination, start_date, end_date, start_location, end_location FROM trip"
    for row in conn.execute(query):
        if match_city(row[2]) is city:
            return row
    cur = conn.execute(
        "INSERT INTO trip (name, destination, start_date, end_date, start_location, end_location, organizer_id) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (city["name"], city["match"][0], city["start_date"], city["end_date"],
         city["start_location"], city["end_location"], ORGANIZER_ID))
    return (cur.lastrowid, city["name"], city["match"][0], city["start_date"], city["end_date"],
            city["start_location"], city["end_location"])


def ensure_members(conn: sqlite3.Connection, trip_id: int, city) -> None:
    now_sql = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    for user_id in (ORGANIZER_ID, SECOND_MEMBER_ID):
        conn.execute("INSERT OR IGNORE INTO trip_member (trip_id, user_id) VALUES (?, ?)", (trip_id, user_id))
        conn.execute(
            "UPDATE trip_member SET ready = 1, preference_revision = CASE WHEN preference_revision < 1 THEN 1 "
            "ELSE preference_revision END WHERE trip_id = ? AND user_id = ?", (trip_id, user_id))
        conn.execute(
            "INSERT OR REPLACE INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
            "VALUES (?, ?, 'interest', ?, ?)",
            (trip_id, user_id, city["interests"][user_id], now_sql))
        conn.execute(
            "INSERT OR REPLACE INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
            "VALUES (?, ?, 'submission', ?, ?)",
            (trip_id, user_id, '{"status":"ready","noPreference":false}', now_sql))


def revision_payload(conn: sqlite3.Connection, trip_id: int) -> str:
    rows = conn.execute(
        "SELECT user_id, preference_revision FROM trip_member WHERE trip_id = ? ORDER BY user_id",
        (trip_id,),
    ).fetchall()
    return json.dumps(
        [{"userId": user_id, "revision": revision} for user_id, revision in rows],
        separators=(",", ":"),
    )


def basics_payload(trip) -> str:
    return json.dumps(
        {
            "destination": trip[2],
            "startDate": trip[3],
            "endDate": trip[4],
            "startLocation": trip[5],
            "endLocation": trip[6],
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def utc_instant(date_text: str, clock: str, offset_hours: int) -> str:
    local = datetime.strptime(f"{date_text} {clock}", "%Y-%m-%d %H:%M").replace(
        tzinfo=timezone(timedelta(hours=offset_hours))
    )
    return local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def seed_trip(conn: sqlite3.Connection, trip, city, trip_cols, draft_cols) -> None:
    trip_id = trip[0]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    now_sql = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    ensure_members(conn, trip_id, city)

    conn.execute(
        "DELETE FROM main_plan_stop WHERE draft_id IN "
        "(SELECT id FROM main_plan_draft WHERE trip_id = ?)",
        (trip_id,),
    )
    conn.execute("DELETE FROM main_plan_draft WHERE trip_id = ?", (trip_id,))
    conn.execute("DELETE FROM plan_node WHERE trip_id = ?", (trip_id,))
    conn.execute("DELETE FROM split_draft WHERE trip_id = ?", (trip_id,))
    reset = "UPDATE trip SET main_plan_confirmed = 0"
    if "joining_closed" in trip_cols:
        reset += ", joining_closed = 0"
    conn.execute(reset + " WHERE id = ?", (trip_id,))

    draft_columns = ["trip_id", "version", "status", "cost_per_person_cents", "input_revisions_json",
                     "created_at"]
    draft_values = [trip_id, 1, "current", city["cost_cents"], revision_payload(conn, trip_id), now_sql]
    if "trip_basics_json" in draft_cols:
        draft_columns.append("trip_basics_json")
        draft_values.append(basics_payload(trip))
    placeholders = ",".join("?" for _ in draft_columns)
    cursor = conn.execute(
        f"INSERT INTO main_plan_draft ({','.join(draft_columns)}) VALUES ({placeholders})",
        draft_values,
    )
    draft_id = cursor.lastrowid

    for seq, (name, start, end, leg, interests) in enumerate(city["stops"], start=1):
        conn.execute(
            "INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, "
            "travel_minutes_to_next, interests_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (draft_id, seq, name, start, end, leg,
             json.dumps(interests, separators=(",", ":"))),
        )
        conn.execute(
            "INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, "
            "title, start_at, end_at, location_name, lat, lng, sort_order, created_at) "
            "VALUES (?, ?, 1, NULL, 'main', 'stop', ?, ?, ?, ?, NULL, NULL, ?, ?)",
            (
                str(uuid4()),
                trip_id,
                name,
                utc_instant(trip[3], start, city["utc_offset_hours"]),
                utc_instant(trip[3], end, city["utc_offset_hours"]),
                name,
                seq,
                now_iso,
            ),
        )


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DB
    if not db_path.exists():
        raise SystemExit(f"数据库不存在：{db_path}")

    target = backup(db_path)
    print(f"已备份：{target.name}")

    conn = sqlite3.connect(db_path, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        trip_cols = columns(conn, "trip")
        draft_cols = columns(conn, "main_plan_draft")
        with conn:
            for city in CITIES:
                trip = ensure_trip(conn, city)
                seed_trip(conn, trip, city, trip_cols, draft_cols)
                print(f"已预填：#{trip[0]} {trip[1]}（{trip[2]}）"
                      f" 主线站点 {len(city['stops'])} 个，成员 2 人，分队已清空")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
