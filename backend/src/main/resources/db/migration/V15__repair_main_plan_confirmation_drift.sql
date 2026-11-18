-- US-090 UI fix: `trip.main_plan_confirmed` is a denormalized flag, and the legacy `POST /api/trips/{id}/main-plan:confirm`
-- used to set it without creating a confirmed `main_plan_draft`. That leaves trips whose flag says "confirmed" while
-- no plan exists, which makes the dashboard's consistency guard reject the whole trip ("行程数据不一致").
-- Repair the invariant once: a confirmed draft is the truth in both directions, and split drafts without a confirmed
-- main plan are unusable（their boundary stops no longer exist）so they are dropped.

-- 1) A confirmed draft means the trip is confirmed.
UPDATE trip SET main_plan_confirmed = 1
WHERE main_plan_confirmed = 0
  AND EXISTS (SELECT 1 FROM main_plan_draft d WHERE d.trip_id = trip.id AND d.status = 'confirmed');

-- 2) A flag without a confirmed draft is drift: clear it so the trip reads as "no plan yet".
UPDATE trip SET main_plan_confirmed = 0
WHERE main_plan_confirmed <> 0
  AND NOT EXISTS (SELECT 1 FROM main_plan_draft d WHERE d.trip_id = trip.id AND d.status = 'confirmed');

-- 3) Splits require a confirmed main plan; orphan drafts and their route rows are unusable.
DELETE FROM plan_node
WHERE branch_id IN ('split-a', 'split-b')
  AND trip_id IN (SELECT id FROM trip WHERE main_plan_confirmed = 0);

DELETE FROM split_draft
WHERE trip_id IN (SELECT id FROM trip WHERE main_plan_confirmed = 0);
