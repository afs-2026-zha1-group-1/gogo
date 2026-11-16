-- V2: splits capability schema (REQ-004~007, design D4/D5).
-- Exactly four tables + trip.split_draft nullable TEXT JSON document column (the only schema extension).
-- Self-contained fixture seed shared by prod and test. Greeting table and V1 seed are untouched.

CREATE TABLE trip (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    plan_version INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    split_draft TEXT
);

CREATE TABLE trip_member (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trip(id),
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    plan_ack_version INTEGER NOT NULL,
    joined_at TEXT NOT NULL,
    UNIQUE(trip_id, display_name)
);

CREATE TABLE member_preference (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trip(id),
    member_id TEXT NOT NULL REFERENCES trip_member(id),
    kind TEXT NOT NULL,
    payload TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE plan_node (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trip(id),
    plan_version INTEGER NOT NULL,
    parent_id TEXT,
    branch_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    title TEXT NOT NULL,
    start_at TEXT,
    end_at TEXT,
    location_name TEXT,
    lat REAL,
    lng REAL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- Seed trip: Singapore Friends Day, confirmed main plan v1, no active draft.
INSERT INTO trip (id, title, destination, start_date, end_date, invite_code, plan_version, created_at, split_draft)
VALUES ('11111111-1111-1111-1111-111111111111', 'Singapore Friends Day', 'Singapore',
        '2026-12-05', '2026-12-05', 'SGF26A', 1, '2026-12-05T00:00:00Z', NULL);

-- A second trip so Eve is a globally valid identity but an outsider to SGF26A (S4-N / T4-N / D3-N).
INSERT INTO trip (id, title, destination, start_date, end_date, invite_code, plan_version, created_at, split_draft)
VALUES ('22222222-2222-2222-2222-222222222222', 'Eve Other Trip', 'Singapore',
        '2026-12-06', '2026-12-06', 'EVE26A', 1, '2026-12-06T00:00:00Z', NULL);

-- Members: Alice owner + Ben/Chloe/Daniel member, all plan_ack_version = 1 (confirmed). Eve belongs to the other trip.
INSERT INTO trip_member (id, trip_id, display_name, role, plan_ack_version, joined_at) VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alice', 'owner', 1, '2026-12-05T00:00:00Z'),
 ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Ben', 'member', 1, '2026-12-05T00:00:00Z'),
 ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Chloe', 'member', 1, '2026-12-05T00:00:00Z'),
 ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Daniel', 'member', 1, '2026-12-05T00:00:00Z'),
 ('bbbbbbbb-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Eve', 'owner', 1, '2026-12-06T00:00:00Z');

-- Main plan v1 stops (branch_id = main). Times stored as ISO-8601 UTC; window granularity is minutes.
INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, start_at, end_at, location_name, lat, lng, sort_order, created_at) VALUES
 ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1, NULL, 'main', 'stop', 'City Hall MRT', '2026-12-05T01:00:00Z', '2026-12-05T01:30:00Z', 'City Hall MRT', NULL, NULL, 1, '2026-12-05T00:00:00Z'),
 ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, NULL, 'main', 'stop', 'Merlion Park', '2026-12-05T03:30:00Z', '2026-12-05T04:00:00Z', 'Merlion Park', NULL, NULL, 2, '2026-12-05T00:00:00Z');

-- Singapore Zoo is NOT in the confirmed main plan (branch_id = optional); used by B3-N out-of-main selection.
INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, start_at, end_at, location_name, lat, lng, sort_order, created_at) VALUES
 ('cccccccc-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 1, NULL, 'optional', 'stop', 'Singapore Zoo', NULL, NULL, 'Singapore Zoo', NULL, NULL, 3, '2026-12-05T00:00:00Z');