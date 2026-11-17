-- US-071 revision (2026-11-17): per-account current trip selection.
-- Nullable: an account that never picked a trip has no current trip.
ALTER TABLE app_user ADD COLUMN current_trip_id INTEGER REFERENCES trip(id);
