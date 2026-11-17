import sqlite3, sys, os

db = os.path.join(os.environ['TEMP'], 'gogo-req020-runtime.db')
con = sqlite3.connect(db)
con.row_factory = sqlite3.Row
kind = sys.argv[1] if len(sys.argv) > 1 else 'must_do'
users = [int(a) for a in sys.argv[2:]] if len(sys.argv) > 2 else [1, 2, 3, 4]
for u in users:
    row = con.execute(
        "SELECT payload, updated_at FROM member_preference WHERE trip_id = 1 AND user_id = ? AND kind = ?",
        (u, kind)).fetchone()
    if row is None:
        print('USER=%d ROW=none' % u)
    else:
        print('USER=%d ROW=present UPDATED_AT=%s PAYLOAD=%s' % (u, row['updated_at'], row['payload']))
counts = con.execute(
    "SELECT kind, COUNT(*) AS n FROM member_preference WHERE trip_id = 1 GROUP BY kind ORDER BY kind").fetchall()
print('KIND_COUNTS=' + ';'.join('%s=%d' % (c['kind'], c['n']) for c in counts))
