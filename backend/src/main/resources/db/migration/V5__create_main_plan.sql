-- US-031-037 main itinerary (design D1, G1 C2 shape).
-- member_preference belongs to REQ-019's V4 on feat/travel_preference (not
-- merged yet): this IF NOT EXISTS stand-in matches that verified shape so the
-- fixture-self-contained ruling holds; after REQ-019 lands first the statement
-- is a no-op. Product code only reads this table (merge-time check = F1).
CREATE TABLE IF NOT EXISTS member_preference (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    kind       TEXT NOT NULL,
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (trip_id, user_id, kind)
);

CREATE TABLE main_plan_draft (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id               INTEGER NOT NULL REFERENCES trip (id),
    version               INTEGER NOT NULL,
    status                TEXT NOT NULL,  -- current / superseded / confirmed
    cost_per_person_cents INTEGER NOT NULL,
    input_revisions_json  TEXT NOT NULL,  -- [{"userId":1,"revision":1},...]
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (trip_id, version)
);

CREATE TABLE main_plan_stop (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id               INTEGER NOT NULL REFERENCES main_plan_draft (id),
    seq                    INTEGER NOT NULL,
    name                   TEXT NOT NULL,
    start_local            TEXT NOT NULL,  -- HH:MM on the trip date
    end_local              TEXT NOT NULL,
    travel_minutes_to_next INTEGER,        -- NULL on the last stop
    interests_json         TEXT,           -- provider tags JSON array, may be empty
    UNIQUE (draft_id, seq)
);

ALTER TABLE trip_member ADD COLUMN ready INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trip_member ADD COLUMN preference_revision INTEGER NOT NULL DEFAULT 1;

-- Fixture trip: the four seeded members are ready at preference revision 1
-- (US-031 AC1). Later joiners keep the column defaults (not ready).
UPDATE trip_member SET ready = 1, preference_revision = 1
WHERE trip_id = (SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day')
  AND user_id IN (1, 2, 3, 4);

-- Preference kind rows per member (content free per fixtures; must_do items
-- carry locations so the preferences-first completion branch is exercisable).
-- Idempotent inserts: they cannot collide with REQ-019 V4 seeds after merge.
-- No budget row by default = no hard limit.
INSERT OR IGNORE INTO member_preference (trip_id, user_id, kind, payload, updated_at)
SELECT t.id, u.id, 'interest',
       CASE u.id
           WHEN 1 THEN '{"codes":["food","culture","art"]}'
           WHEN 2 THEN '{"codes":["food","culture","nature"]}'
           WHEN 3 THEN '{"codes":["food","culture","shopping"]}'
           ELSE '{"codes":["food","culture","nature"]}'
       END,
       datetime('now')
FROM trip t, app_user u
WHERE t.name = 'Singapore Friends Day' AND u.id IN (1, 2, 3, 4);

INSERT OR IGNORE INTO member_preference (trip_id, user_id, kind, payload, updated_at)
SELECT t.id, u.id, 'must_do',
       CASE u.id
           WHEN 1 THEN '{"items":[{"name":"Merlion Park","location":"Merlion Park"}]}'
           WHEN 2 THEN '{"items":[{"name":"Gardens by the Bay","location":"Gardens by the Bay"}]}'
           WHEN 3 THEN '{"items":[{"name":"National Gallery Singapore","location":"National Gallery Singapore"}]}'
           ELSE '{"items":[{"name":"City Hall MRT","location":"City Hall MRT"}]}'
       END,
       datetime('now')
FROM trip t, app_user u
WHERE t.name = 'Singapore Friends Day' AND u.id IN (1, 2, 3, 4);