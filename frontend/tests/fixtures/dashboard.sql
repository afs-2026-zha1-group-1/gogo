INSERT INTO trip (id, name, destination, start_date, end_date, start_location, end_location, organizer_id)
VALUES (9001, 'Stale draft trip', 'Penang', '2026-12-10', '2026-12-12', 'Penang Station', 'Airport', 1);
INSERT INTO trip_member (trip_id, user_id, ready, preference_revision) VALUES
  (9001, 1, 1, 2), (9001, 2, 1, 1), (9001, 3, 1, 1), (9001, 4, 0, 1);
INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, input_revisions_json)
VALUES (9001, 1, 'current', 0,
  '[{"userId":1,"revision":1},{"userId":2,"revision":1},{"userId":3,"revision":1},{"userId":4,"revision":1}]');

INSERT INTO trip (id, name, destination, start_date, end_date, start_location, end_location, organizer_id, main_plan_confirmed)
VALUES (9002, 'Active split trip', 'Malacca', '2026-12-15', '2026-12-16', 'Station', 'Harbour', 1, 1);
UPDATE trip SET joining_closed = 1 WHERE id = 9002;
INSERT INTO trip_member (trip_id, user_id, ready, preference_revision) VALUES
  (9002, 1, 1, 1), (9002, 2, 1, 1), (9002, 3, 1, 1), (9002, 4, 1, 1);
INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, input_revisions_json)
VALUES (9002, 1, 'confirmed', 0,
  '[{"userId":1,"revision":1},{"userId":2,"revision":1},{"userId":3,"revision":1},{"userId":4,"revision":1}]');
INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at)
VALUES ('us061-active', 9002,
  '{"initiatorMemberId":"1","mainPlanVersion":1,"draftVersion":1,"status":"active","departureStopId":null,"reunionStopId":null,"groups":{"A":["1","2"],"B":["3","4"]},"routes":null,"createdAt":"2026-11-17T00:00:00Z","updatedAt":"2026-11-17T00:00:00Z"}',
  1, '2026-11-17T00:00:00Z', '2026-11-17T00:00:00Z');
