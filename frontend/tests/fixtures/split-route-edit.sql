-- US-087-088 browser fixture: an active split draft with A steps and a B activity, ready for inline editing.
-- Loaded together with dashboard.sql by playwright.config.ts; the driver creates a throwaway database per run.

INSERT INTO trip (id, name, destination, start_date, end_date, start_location, end_location, organizer_id, main_plan_confirmed)
VALUES (9101, '路线编辑演示', 'Singapore', '2026-12-20', '2026-12-21', 'City Hall MRT', 'Merlion Park', 1, 1);

INSERT INTO trip_member (trip_id, user_id, ready, preference_revision) VALUES
  (9101, 1, 1, 1), (9101, 2, 1, 1), (9101, 3, 1, 1), (9101, 4, 1, 1);

INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, input_revisions_json)
VALUES (9101, 1, 'confirmed', 0,
  '[{"userId":1,"revision":1},{"userId":2,"revision":1},{"userId":3,"revision":1},{"userId":4,"revision":1}]');

INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, travel_minutes_to_next, interests_json)
SELECT id, 1, 'City Hall MRT', '09:00', '09:30', 30, '[]' FROM main_plan_draft WHERE trip_id = 9101 AND version = 1;
INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, travel_minutes_to_next, interests_json)
SELECT id, 2, 'National Gallery Singapore', '10:00', '10:30', 30, '[]' FROM main_plan_draft WHERE trip_id = 9101 AND version = 1;
INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, travel_minutes_to_next, interests_json)
SELECT id, 3, 'Gardens by the Bay', '11:00', '11:15', 15, '[]' FROM main_plan_draft WHERE trip_id = 9101 AND version = 1;
INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, travel_minutes_to_next, interests_json)
SELECT id, 4, 'Merlion Park', '11:30', '12:00', NULL, '[]' FROM main_plan_draft WHERE trip_id = 9101 AND version = 1;

INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, start_at, end_at, location_name, lat, lng, sort_order, created_at) VALUES
 ('main-9101-1', 9101, 1, NULL, 'main', 'stop', 'City Hall MRT', '2026-12-20T01:00:00Z', '2026-12-20T01:30:00Z', 'City Hall MRT', NULL, NULL, 1, '2026-12-20T00:00:00Z'),
 ('main-9101-2', 9101, 1, NULL, 'main', 'stop', 'National Gallery Singapore', '2026-12-20T02:00:00Z', '2026-12-20T02:30:00Z', 'National Gallery Singapore', NULL, NULL, 2, '2026-12-20T00:00:00Z'),
 ('main-9101-3', 9101, 1, NULL, 'main', 'stop', 'Gardens by the Bay', '2026-12-20T03:00:00Z', '2026-12-20T03:15:00Z', 'Gardens by the Bay', NULL, NULL, 3, '2026-12-20T00:00:00Z'),
 ('main-9101-4', 9101, 1, NULL, 'main', 'stop', 'Merlion Park', '2026-12-20T03:30:00Z', '2026-12-20T04:00:00Z', 'Merlion Park', NULL, NULL, 4, '2026-12-20T00:00:00Z'),
 ('split-a-9101', 9101, 1, NULL, 'split-a', 'activity', 'City Hall MRT → Gardens by the Bay', '2026-12-20T01:00:00Z', '2026-12-20T03:30:00Z', 'City Hall MRT', NULL, NULL, 1, '2026-12-20T00:00:00Z'),
 ('split-b-9101', 9101, 1, NULL, 'split-b', 'activity', 'Gardens by the Bay', '2026-12-20T01:00:00Z', '2026-12-20T03:30:00Z', 'Singapore', NULL, NULL, 2, '2026-12-20T00:00:00Z');

INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at)
VALUES ('split-draft-9101', 9101,
  '{"initiatorMemberId":"1","mainPlanVersion":1,"draftVersion":3,"status":"active","departureStopId":"main-9101-1","reunionStopId":"main-9101-4","groups":{"A":["1","2"],"B":["3","4"]},"routes":{"A":{"activityMinutes":75,"travelLegsMinutes":[30,30,15],"bufferMinutes":0,"steps":[{"name":"City Hall MRT","minutes":30},{"name":"主线·National Gallery Singapore","minutes":30},{"name":"Gardens by the Bay","minutes":15}]},"B":{"activityMinutes":60,"travelLegsMinutes":[20,20],"bufferMinutes":0,"steps":[{"name":"Gardens by the Bay","minutes":60}]}},"createdAt":"2026-12-20T00:00:00Z","updatedAt":"2026-12-20T00:00:00Z"}',
  3, '2026-12-20T00:00:00Z', '2026-12-20T00:00:00Z');

-- Confirmed draft for the terminal read-only assertions (N9).
INSERT INTO trip (id, name, destination, start_date, end_date, start_location, end_location, organizer_id, main_plan_confirmed)
VALUES (9102, '路线已确认演示', 'Singapore', '2026-12-22', '2026-12-23', 'City Hall MRT', 'Merlion Park', 1, 1);

INSERT INTO trip_member (trip_id, user_id, ready, preference_revision) VALUES
  (9102, 1, 1, 1), (9102, 2, 1, 1), (9102, 3, 1, 1), (9102, 4, 1, 1);

INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, input_revisions_json)
VALUES (9102, 1, 'confirmed', 0,
  '[{"userId":1,"revision":1},{"userId":2,"revision":1},{"userId":3,"revision":1},{"userId":4,"revision":1}]');

INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, start_at, end_at, location_name, lat, lng, sort_order, created_at) VALUES
 ('main-9102-1', 9102, 1, NULL, 'main', 'stop', 'City Hall MRT', '2026-12-22T01:00:00Z', '2026-12-22T01:30:00Z', 'City Hall MRT', NULL, NULL, 1, '2026-12-22T00:00:00Z'),
 ('main-9102-2', 9102, 1, NULL, 'main', 'stop', 'National Gallery Singapore', '2026-12-22T02:00:00Z', '2026-12-22T02:30:00Z', 'National Gallery Singapore', NULL, NULL, 2, '2026-12-22T00:00:00Z'),
 ('main-9102-3', 9102, 1, NULL, 'main', 'stop', 'Gardens by the Bay', '2026-12-22T03:00:00Z', '2026-12-22T03:15:00Z', 'Gardens by the Bay', NULL, NULL, 3, '2026-12-22T00:00:00Z'),
 ('main-9102-4', 9102, 1, NULL, 'main', 'stop', 'Merlion Park', '2026-12-22T03:30:00Z', '2026-12-22T04:00:00Z', 'Merlion Park', NULL, NULL, 4, '2026-12-22T00:00:00Z'),
 ('split-a-9102', 9102, 1, NULL, 'split-a', 'activity', 'City Hall MRT → Gardens by the Bay', '2026-12-22T01:00:00Z', '2026-12-22T03:30:00Z', 'City Hall MRT', NULL, NULL, 1, '2026-12-22T00:00:00Z'),
 ('split-b-9102', 9102, 1, NULL, 'split-b', 'activity', 'Gardens by the Bay', '2026-12-22T01:00:00Z', '2026-12-22T03:30:00Z', 'Singapore', NULL, NULL, 2, '2026-12-22T00:00:00Z');

INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at)
VALUES ('split-draft-9102', 9102,
  '{"initiatorMemberId":"1","mainPlanVersion":1,"draftVersion":3,"status":"confirmed","departureStopId":"main-9102-1","reunionStopId":"main-9102-4","groups":{"A":["1","2"],"B":["3","4"]},"routes":{"A":{"activityMinutes":75,"travelLegsMinutes":[30,30,15],"bufferMinutes":0,"steps":[{"name":"City Hall MRT","minutes":30},{"name":"主线·National Gallery Singapore","minutes":30},{"name":"Gardens by the Bay","minutes":15}]},"B":{"activityMinutes":60,"travelLegsMinutes":[20,20],"bufferMinutes":0,"steps":[{"name":"Gardens by the Bay","minutes":60}]}},"createdAt":"2026-12-22T00:00:00Z","updatedAt":"2026-12-22T00:00:00Z"}',
  3, '2026-12-22T00:00:00Z', '2026-12-22T00:00:00Z');
