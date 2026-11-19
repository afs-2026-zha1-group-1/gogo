-- Multi-day main plan: every stop belongs to one trip day (1 = start_date).
-- seq stays contiguous across the whole plan; day_index drives the date and the
-- per-day schedule validation.
ALTER TABLE main_plan_stop ADD COLUMN day_index INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_main_plan_stop_day
    ON main_plan_stop (draft_id, day_index, seq);
