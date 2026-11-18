#!/usr/bin/env bash
# Cross-change contract scan to run before G1.
#
# Usage:
#   scripts/cross-change-scan.sh [change-id] [--advisory]
#
# Prints a markdown report to stdout. Exits 1 when BLOCKER > 0 unless
# --advisory is given. Read-only: never edits specs, code, or git state.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

ADVISORY=0
TARGET=""
while [ $# -gt 0 ]; do
  case "$1" in
    --advisory) ADVISORY=1 ;;
    -h|--help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) TARGET="$1" ;;
  esac
  shift
done

REGISTRY="requirement-workspace/registry.md"
SPECS="openspec/specs"
CHANGES="openspec/changes"
MIGR="backend/src/main/resources/db/migration"
FIXTURES="requirement-workspace/acceptance-test-fixtures.md"
MAX_BEHIND="${MAX_BEHIND:-20}"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/ccs.XXXXXX")" || exit 2
trap 'rm -rf "$TMP"' EXIT
FINDINGS="$TMP/findings.tsv"
: > "$FINDINGS"

add() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$FINDINGS"; }

ACTIVE="$(find "$CHANGES" -mindepth 1 -maxdepth 1 -type d ! -name archive 2>/dev/null \
  -exec basename {} \; | LC_ALL=C sort)"
ACTIVE_COUNT="$(printf '%s\n' "$ACTIVE" | grep -c . || true)"

# --- A1 requirement id uniqueness -------------------------------------------
if [ -f "$REGISTRY" ]; then
  awk -F'|' '/^\| *(REQ|US)-[0-9]+/{gsub(/ /,"",$2); print $2}' "$REGISTRY" > "$TMP/ids"
  LC_ALL=C sort "$TMP/ids" | uniq -d > "$TMP/dupids"
  while IFS= read -r id; do
    [ -n "$id" ] && add BLOCKER "ID 唯一" "$REGISTRY" "重复需求号 $id"
  done < "$TMP/dupids"
else
  add WARNING "ID 唯一" "$REGISTRY" "文件不存在，无法校验需求号唯一性"
fi

# --- A2 two active changes owning the same requirement id -------------------
: > "$TMP/own"
for c in $ACTIVE; do
  printf '%s\n' "$c" | grep -oE '(us|req)-[0-9]+' | tr '[:lower:]' '[:upper:]' |
    while IFS= read -r id; do printf '%s\t%s\n' "$id" "$c" >> "$TMP/own"; done
done
awk -F'\t' '{a[$1]=a[$1]" "$2} END{for(k in a){if(split(a[k],x," ")>1) print k":"a[k]}}' \
  "$TMP/own" | LC_ALL=C sort |
  while IFS= read -r line; do
    add BLOCKER "ID 归属" "active change dirs" "两个 active change 自称同一需求号：$line"
  done

# --- A3 migration numbers ---------------------------------------------------
if [ -d "$MIGR" ]; then
  find "$MIGR" -maxdepth 1 -name 'V*__*.sql' -exec basename {} \; 2>/dev/null |
    sed -E 's/^V([0-9]+)__.*/\1/' | LC_ALL=C sort -n > "$TMP/disk_v"
  MAX_V="$(tail -1 "$TMP/disk_v" 2>/dev/null || echo 0)"
  NEXT_V="$((MAX_V + 1))"
  : > "$TMP/planned"
  for c in $ACTIVE; do
    grep -rhoE 'V[0-9]+__[A-Za-z0-9_]+' "$CHANGES/$c" 2>/dev/null |
      sed -E 's/^V([0-9]+)__.*/\1/' | LC_ALL=C sort -u |
      while IFS= read -r n; do
        grep -qx "$n" "$TMP/disk_v" || printf '%s\t%s\n' "$n" "$c" >> "$TMP/planned"
      done
  done
  awk -F'\t' '{a[$1]=a[$1]" "$2} END{for(k in a){if(split(a[k],x," ")>1) print k":"a[k]}}' \
    "$TMP/planned" | LC_ALL=C sort |
    while IFS= read -r line; do
      add BLOCKER "迁移号" "active changes" "多个 change 预留同一迁移号：V$line"
    done
fi

# --- A4 identity surface coverage -------------------------------------------
: > "$TMP/ident_caps"
for f in "$SPECS"/*/spec.md; do
  [ -f "$f" ] || continue
  grep -qE 'X-User-Id|X-Member-Id' "$f" &&
    basename "$(dirname "$f")" >> "$TMP/ident_caps"
done
IDENT_CAPS="$(LC_ALL=C sort -u "$TMP/ident_caps" | tr '\n' ' ')"
IDENT_CODE_FILES="$(grep -RlE 'X-User-Id|X-Member-Id' backend/src frontend/src 2>/dev/null | wc -l | tr -d ' ')"

for c in $ACTIVE; do
  # An auth change is one that ships an auth delta. Prose mentions of 登录/session
  # in unrelated proposals must not trigger the gate.
  [ -f "$CHANGES/$c/specs/auth/spec.md" ] || continue
  for cap in $IDENT_CAPS; do
    [ -f "$CHANGES/$c/specs/$cap/spec.md" ] && continue
    add BLOCKER "身份横切" "$c" "认证类 change 未覆盖含身份头的 capability：$cap"
  done
done

# --- A5 baseline ------------------------------------------------------------
UP=""
git rev-parse --verify --quiet origin/main >/dev/null 2>&1 && UP="origin/main"
[ -z "$UP" ] && git rev-parse --verify --quiet main >/dev/null 2>&1 && UP="main"
BEHIND="?"
MERGE_BASE="?"
SCAN_REF="$(git branch --show-current 2>/dev/null || echo detached)"
if [ -n "$TARGET" ]; then
  BR="$(git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null |
    grep -iF "$TARGET" | head -1)"
  [ -n "$BR" ] && SCAN_REF="$BR"
fi
if [ -n "$UP" ]; then
  MERGE_BASE="$(git merge-base HEAD "$UP" 2>/dev/null | cut -c1-8)"
  if [ "$SCAN_REF" != "detached" ] && [ "$SCAN_REF" != "$UP" ] &&
    git rev-parse --verify --quiet "$SCAN_REF" >/dev/null 2>&1; then
    BEHIND="$(git rev-list --count "$SCAN_REF..$UP" 2>/dev/null || echo '?')"
  else
    BEHIND=0
  fi
  if [ "$BEHIND" != "?" ]; then
    if [ "$BEHIND" -gt "$MAX_BEHIND" ]; then
      add BLOCKER "基线" "$SCAN_REF" "落后 $UP $BEHIND 个提交（阈值 $MAX_BEHIND）"
    elif [ "$BEHIND" -gt 0 ]; then
      add WARNING "基线" "$SCAN_REF" "落后 $UP $BEHIND 个提交，需先吸收 main"
    fi
  fi
else
  add WARNING "基线" "git" "找不到 origin/main 或 main 分支，无法计算落后数"
fi

# --- A6 Living Spec drift ---------------------------------------------------
MEMBER_SPECS="$(grep -Rl 'X-Member-Id' "$SPECS"/*/spec.md 2>/dev/null | head -3 | tr '\n' ' ' | sed 's/ $//')"
if [ -n "$MEMBER_SPECS" ] && [ "$IDENT_CODE_FILES" -gt 0 ]; then
  add WARNING "Living 漂移" "$MEMBER_SPECS" "Living Spec 写 X-Member-Id，代码使用 X-User-Id"
fi

# --- A7 shared surface overlap ----------------------------------------------
: > "$TMP/paths"
for c in $ACTIVE; do
  grep -rhoE '(frontend|backend)/[A-Za-z0-9_./-]+\.(java|tsx|ts|jsx|js|css|sql)' \
    "$CHANGES/$c" 2>/dev/null | LC_ALL=C sort -u |
    while IFS= read -r p; do printf '%s\t%s\n' "$p" "$c" >> "$TMP/paths"; done
done
awk -F'\t' '{a[$1]=a[$1]" "$2} END{for(p in a){if(split(a[p],x," ")>1){s=x[1];for(i=2;i<=length(x);i++) s=s","x[i];print p"\t"s}}}' \
  "$TMP/paths" | LC_ALL=C sort | head -15 > "$TMP/overlap"
while IFS=$'\t' read -r p cs; do
  [ -n "$p" ] && add WARNING "共享面" "$p" "多个 active change 触及：$cs"
done < "$TMP/overlap"

# --- A8 upstream queue / MODIFIED without Living ---------------------------
for c in $ACTIVE; do
  for spec in "$CHANGES/$c"/specs/*/spec.md; do
    [ -f "$spec" ] || continue
    cap="$(basename "$(dirname "$spec")")"
    living="$SPECS/$cap/spec.md"
    [ -f "$living" ] && continue
    if grep -q '^## MODIFIED' "$spec"; then
      add BLOCKER "依赖队列" "$spec" "对 $cap 做 MODIFIED，但 Living Spec 不存在"
    else
      add WARNING "依赖队列" "$spec" "新增 capability $cap，归档前需 living-merge"
    fi
  done
done

# --- A9 fixtures / seed conventions ----------------------------------------
if [ -f "$FIXTURES" ]; then
  if grep -q 'X-Member-Id' "$FIXTURES" && [ "$IDENT_CODE_FILES" -gt 0 ]; then
    add WARNING "夹具" "$FIXTURES" "夹具写 X-Member-Id，代码使用 X-User-Id"
  fi
  if [ -f "$TMP/disk_v" ]; then
    grep -oE 'V[0-9]+' "$FIXTURES" 2>/dev/null | sed 's/V//' | LC_ALL=C sort -u |
      while IFS= read -r n; do
        grep -qx "$n" "$TMP/disk_v" ||
          add WARNING "夹具" "$FIXTURES" "夹具引用迁移 V$n，但磁盘没有该迁移"
      done
  fi
fi

# --- report -----------------------------------------------------------------
BLOCKERS="$(awk -F'\t' '$1=="BLOCKER"' "$FINDINGS" | wc -l | tr -d ' ')"
WARNINGS="$(awk -F'\t' '$1=="WARNING"' "$FINDINGS" | wc -l | tr -d ' ')"

echo "# Cross-change scan (auto)"
echo
echo "- repo: \`$ROOT\`"
echo "- ref: \`$SCAN_REF\`; upstream: \`${UP:-none}\`; merge-base: \`${MERGE_BASE}\`; behind: \`${BEHIND}\`"
echo "- target: ${TARGET:-\`ALL\` active changes}"
echo "- active changes ($ACTIVE_COUNT): $(printf '%s ' $ACTIVE)"
echo "- identity surfaces: living=[${IDENT_CAPS:-none}] code_files=$IDENT_CODE_FILES"
if [ -f "$TMP/disk_v" ]; then
  DISK_LIST="$(LC_ALL=C sort -n "$TMP/disk_v" | tr '\n' ' ' | sed 's/ $//')"
  PLANNED="$(awk -F'\t' '{printf "V%s(%s) ", $1, $2}' "$TMP/planned" 2>/dev/null)"
  echo "- migrations: disk=[${DISK_LIST}] next=V${NEXT_V:-?}; planned=${PLANNED:-none}"
fi
echo
echo "## Verdict"
echo
echo "**BLOCKER $BLOCKERS / WARNING $WARNINGS**"
echo
if [ "$BLOCKERS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "No automated findings. Fill the human review rows before G1."
else
  echo "| id | severity | axis | location | finding |"
  echo "|---|---|---|---|---|"
  n=0
  for sev in BLOCKER WARNING; do
    while IFS=$'\t' read -r s axis loc msg; do
      [ "$s" = "$sev" ] || continue
      n=$((n + 1))
      printf '| A%d | %s | %s | `%s` | %s |\n' "$n" "$s" "$axis" "$loc" "$msg"
    done < "$FINDINGS"
  done
fi
echo
echo "_Automatic heuristics only; error-contract, Living-drift, queue and fixture rows still need human confirmation._"
echo "_Bind the result into G1 with \`openspec/changes/<id>/cross-change-scan.md\`._"

if [ "$BLOCKERS" -gt 0 ] && [ "$ADVISORY" -eq 0 ]; then
  exit 1
fi
exit 0
