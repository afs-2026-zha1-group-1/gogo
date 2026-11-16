CREATE TABLE member_preference (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id    INTEGER NOT NULL REFERENCES trip (id),
    user_id    INTEGER NOT NULL REFERENCES app_user (id),
    kind       TEXT NOT NULL,
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (trip_id, user_id, kind)
);
