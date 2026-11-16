-- REQ-019 (design DD8). V5__create_main_plan already declares this table on the baseline
-- this change merges into, so the statement is a no-op there; IF NOT EXISTS keeps it honest
-- instead of failing the migration when the earlier declaration won.
CREATE TABLE IF NOT EXISTS member_preference (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id    INTEGER NOT NULL REFERENCES trip (id),
    user_id    INTEGER NOT NULL REFERENCES app_user (id),
    kind       TEXT NOT NULL,
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (trip_id, user_id, kind)
);
