-- V4: splits capability on top of main's schema (app_user / trip INTEGER / trip_member composite).
-- The splits feature does NOT own the trip tables; it extends them with a separate split_draft
-- table (unique active draft per trip) and a plan_node table (main-line stops + split route
-- structure nodes). No change to trip's columns; main_plan_confirmed (added by V3) is the
-- confirmation predicate.

CREATE TABLE split_draft (
    id            TEXT PRIMARY KEY,
    trip_id       INTEGER NOT NULL UNIQUE REFERENCES trip (id),
    document      TEXT,
    draft_version INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE plan_node (
    id            TEXT PRIMARY KEY,
    trip_id       INTEGER NOT NULL REFERENCES trip (id),
    plan_version  INTEGER NOT NULL,
    parent_id     TEXT,
    branch_id     TEXT NOT NULL,
    node_type     TEXT NOT NULL,
    title         TEXT NOT NULL,
    start_at      TEXT,
    end_at        TEXT,
    location_name TEXT,
    lat           REAL,
    lng           REAL,
    sort_order    INTEGER NOT NULL,
    created_at    TEXT NOT NULL
);

-- Fixture main-line stops for the seeded trip (main V2 seed: trip id = 1 = Singapore Friends Day).
-- Times are ISO-8601 UTC. branch_id = 'main' are selectable boundaries; 'optional' is out of main.
INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, start_at, end_at, location_name, lat, lng, sort_order, created_at) VALUES
 ('cccccccc-0000-0000-0000-000000000001', 1, 1, NULL, 'main', 'stop', 'City Hall MRT', '2026-12-05T01:00:00Z', '2026-12-05T01:30:00Z', 'City Hall MRT', NULL, NULL, 1, '2026-12-05T00:00:00Z'),
 ('cccccccc-0000-0000-0000-000000000002', 1, 1, NULL, 'main', 'stop', 'Merlion Park', '2026-12-05T03:30:00Z', '2026-12-05T04:00:00Z', 'Merlion Park', NULL, NULL, 2, '2026-12-05T00:00:00Z'),
 ('cccccccc-0000-0000-0000-000000000003', 1, 1, NULL, 'optional', 'stop', 'Singapore Zoo', NULL, NULL, 'Singapore Zoo', NULL, NULL, 3, '2026-12-05T00:00:00Z');
