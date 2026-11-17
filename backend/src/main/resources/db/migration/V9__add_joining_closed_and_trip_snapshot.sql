-- US-003 (design D5): decouple "joining closed" from the main-plan flag so a
-- planning-basics edit can reset the plan without re-opening invitations, and
-- record the trip-basics snapshot every generated draft is based on.
ALTER TABLE trip ADD COLUMN joining_closed INTEGER NOT NULL DEFAULT 0;
UPDATE trip SET joining_closed = main_plan_confirmed;
ALTER TABLE main_plan_draft ADD COLUMN trip_basics_json TEXT;
