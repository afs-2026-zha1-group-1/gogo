-- US-045 split budget check: per-person activity costs.
-- A main-plan stop carries its own cost so the split budget check can tell which shared
-- activities were replaced by a branch activity (and therefore must not be counted twice).
-- plan_node mirrors main_plan_stop (MainPlanProjection is its only main-line writer), so the
-- splits module keeps reading one table. Manual branch activities live in the split draft
-- document; no extra table is needed.

ALTER TABLE main_plan_stop ADD COLUMN cost_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plan_node ADD COLUMN cost_cents INTEGER NOT NULL DEFAULT 0;
