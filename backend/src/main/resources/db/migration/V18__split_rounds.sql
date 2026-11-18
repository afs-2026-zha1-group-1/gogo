-- US-096: one split draft per round. The original table had one row per trip (UNIQUE trip_id);
-- this rebuild keeps the primary key/document nullability exactly as V4 defined them, adds
-- round_index and scopes uniqueness to (trip_id, round_index). Existing rows become round 1 and
-- the old split-a/split-b route nodes are renamed to the round-aware form.

CREATE TABLE split_draft_new (
    id            TEXT PRIMARY KEY,
    trip_id       INTEGER NOT NULL REFERENCES trip (id),
    round_index   INTEGER NOT NULL DEFAULT 1 CHECK (round_index >= 1),
    document      TEXT,
    draft_version INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    UNIQUE (trip_id, round_index)
);

INSERT INTO split_draft_new (id, trip_id, round_index, document, draft_version, created_at, updated_at)
SELECT id, trip_id, 1, document, draft_version, created_at, updated_at FROM split_draft;

DROP TABLE split_draft;
ALTER TABLE split_draft_new RENAME TO split_draft;

UPDATE plan_node SET branch_id = 'split-r1-a' WHERE branch_id = 'split-a';
UPDATE plan_node SET branch_id = 'split-r1-b' WHERE branch_id = 'split-b';
