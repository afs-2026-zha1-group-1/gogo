package com.gogo.hello.splits;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.SplitBranchId;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * JdbcTemplate persistence for the splits capability (design D2/D9). Adapted to the main trip schema:
 * identity is app_user (INTEGER) supplied by the session principal, membership is trip_member(trip_id, user_id),
 * confirmation is {@code trip.main_plan_confirmed}, and the split draft lives in the separate {@code split_draft}
 * table (unique per trip). Main-line stops and split route structure nodes live in {@code plan_node}; main-line rows
 * are written only by the main-plan confirmation projection ({@code MainPlanProjection}), never by this repository.
 * No ORM.
 */
@Repository
public class SplitDraftRepository {

    private final JdbcTemplate jdbcTemplate;

    public SplitDraftRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean memberExistsGlobally(String memberId) {
        return count("SELECT COUNT(*) FROM app_user WHERE id = ?", memberId) > 0;
    }

    public boolean tripExists(String tripId) {
        return count("SELECT COUNT(*) FROM trip WHERE id = ?", tripId) > 0;
    }

    public boolean isMemberOfTrip(String memberId, String tripId) {
        return count("SELECT COUNT(*) FROM trip_member WHERE user_id = ? AND trip_id = ?", memberId, tripId) > 0;
    }

    /** main_plan_confirmed (V3 boolean state column, default 0) is the confirmation predicate. */
    public boolean isMainPlanConfirmed(String tripId) {
        List<Integer> flags = jdbcTemplate.queryForList(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, tripId);
        return !flags.isEmpty() && flags.get(0) != null && flags.get(0) != 0;
    }

    /** Member user ids of a trip, ordered by display name (Alice, Ben, Chloe, Daniel...). */
    public List<String> findMemberIdsOrdered(String tripId) {
        return jdbcTemplate.queryForList(
                "SELECT tm.user_id FROM trip_member tm JOIN app_user u ON u.id = tm.user_id "
                        + "WHERE tm.trip_id = ? ORDER BY u.display_name",
                String.class, tripId);
    }

    /**
     * Inserts the first active draft (design D9). The {@code split_draft.trip_id} UNIQUE constraint makes this
     * atomic: a duplicate insert (an active draft already exists) raises a key violation, mapped to 0 so the
     * caller returns 409 SPLIT_DRAFT_CONFLICT.
     */
    public int createDraftIfAbsent(String tripId, String draftJson) {
        return createDraftIfAbsent(tripId, 1, draftJson);
    }

    /**
     * Inserts one round (US-096). The {@code (trip_id, round_index)} UNIQUE constraint makes this atomic: a
     * duplicate insert (that round already exists) raises a key violation, mapped to 0 so the caller returns
     * 409 SPLIT_DRAFT_CONFLICT.
     */
    public int createDraftIfAbsent(String tripId, int roundIndex, String draftJson) {
        String now = Instant.now().toString();
        try {
            jdbcTemplate.update(
                    "INSERT INTO split_draft (id, trip_id, round_index, document, draft_version, created_at, updated_at) "
                            + "VALUES (?, ?, ?, ?, 1, ?, ?)",
                    UUID.randomUUID().toString(), tripId, roundIndex, draftJson, now, now);
            return 1;
        } catch (DataAccessException ex) {
            // SQLite UNIQUE(trip_id, round_index) violation (error 19) is not auto-translated; any failure
            // here means that round already exists → map to 0 so the caller returns 409 SPLIT_DRAFT_CONFLICT.
            return 0;
        }
    }

    /**
     * Loads a confirmed main-plan stop (design D7): only {@code branch_id = 'main'} rows at the draft's main-plan
     * version qualify. A null/unknown/out-of-main id yields empty, which the caller maps to BOUNDARY_NOT_IN_MAIN_PLAN.
     */
    public Optional<PlanStop> findMainPlanStop(String tripId, String stopId, int planVersion) {
        if (stopId == null) {
            return Optional.empty();
        }
        TripDayFacts facts = tripDayFacts(tripId);
        List<PlanStop> stops = jdbcTemplate.query(
                "SELECT id, title, start_at, end_at, cost_cents, location_name FROM plan_node "
                        + "WHERE trip_id = ? AND id = ? AND branch_id = 'main' AND plan_version = ?",
                (rs, rowNum) -> new PlanStop(
                        rs.getString("id"),
                        rs.getString("title"),
                        parseInstant(rs.getString("start_at")),
                        parseInstant(rs.getString("end_at")),
                        rs.getInt("cost_cents"),
                        rs.getString("location_name"),
                        facts.dayIndexOf(parseInstant(rs.getString("start_at")))),
                tripId, stopId, planVersion);
        return stops.stream().findFirst();
    }

    /** Reads the raw round-1 draft JSON document; no row maps to {@code null}. */
    public String findDraftJson(String tripId) {
        return findDraftJson(tripId, 1);
    }

    /** Reads one round's raw draft JSON document; no row maps to {@code null}. */
    public String findDraftJson(String tripId, int roundIndex) {
        List<String> docs = jdbcTemplate.queryForList(
                "SELECT document FROM split_draft WHERE trip_id = ? AND round_index = ?",
                String.class, tripId, roundIndex);
        return docs.isEmpty() ? null : docs.get(0);
    }

    /** Round indexes present for a trip, ascending. */
    public List<Integer> findRoundIndexes(String tripId) {
        return jdbcTemplate.queryForList(
                "SELECT round_index FROM split_draft WHERE trip_id = ? ORDER BY round_index",
                Integer.class, tripId);
    }

    /** Highest round index present for a trip; empty when the trip has no round. */
    public Optional<Integer> findMaxRoundIndex(String tripId) {
        Integer value = jdbcTemplate.queryForObject(
                "SELECT MAX(round_index) FROM split_draft WHERE trip_id = ?", Integer.class, tripId);
        return Optional.ofNullable(value);
    }

    /** All rounds' raw documents, ascending, for read-only projections and aggregate status. */
    public List<RoundRow> findRoundRows(String tripId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT round_index, document FROM split_draft WHERE trip_id = ? ORDER BY round_index",
                tripId);
        List<RoundRow> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Object index = row.get("round_index");
            result.add(new RoundRow(index == null ? 1 : ((Number) index).intValue(),
                    (String) row.get("document")));
        }
        return result;
    }

    /** One persisted round (US-096). */
    public record RoundRow(int roundIndex, String document) {
    }

    /**
     * Conditional draft update (design D9): only succeeds while the stored {@code draft_version} matches the
     * expected version; the column is bumped atomically. Returns the affected row count; 0 means a concurrent
     * change advanced the version (caller maps to 409 STALE_DRAFT_VERSION). pool=1 serializes writers.
     */
    public int updateDraftIfVersion(String tripId, String draftJson, int expectedVersion) {
        return updateDraftIfVersion(tripId, 1, draftJson, expectedVersion);
    }

    /** Conditional update for one round; version +1 only for content edits. */
    public int updateDraftIfVersion(String tripId, int roundIndex, String draftJson, int expectedVersion) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, draft_version = draft_version + 1, updated_at = ? "
                        + "WHERE trip_id = ? AND round_index = ? AND draft_version = ?",
                draftJson, Instant.now().toString(), tripId, roundIndex, expectedVersion);
    }

    /** Deletes round 1's split route pair; main-plan rows are never touched. */
    public int deleteSplitRoutes(String tripId) {
        return deleteSplitRoutes(tripId, 1);
    }

    /** Deletes one round's split route pair; main-plan and other-round rows are never touched. */
    public int deleteSplitRoutes(String tripId, int roundIndex) {
        String[] ids = SplitBranchId.forRound(roundIndex);
        return jdbcTemplate.update(
                "DELETE FROM plan_node WHERE trip_id = ? AND branch_id IN (?, ?)", tripId, ids[0], ids[1]);
    }

    /** Deletes every split route node for a trip, including legacy round-1 ids. */
    public int deleteAllSplitRoutes(String tripId) {
        return jdbcTemplate.update(
                "DELETE FROM plan_node WHERE trip_id = ? AND (branch_id LIKE 'split-r%' "
                        + "OR branch_id IN ('split-a', 'split-b'))", tripId);
    }

    /** Trip organizer id as the identity string used by {@code X-User-Id} (app_user.id); empty when missing. */
    public Optional<String> findOrganizerId(String tripId) {
        List<String> ids = jdbcTemplate.queryForList(
                "SELECT organizer_id FROM trip WHERE id = ?", String.class, tripId);
        return ids.stream().findFirst();
    }

    /** Trip destination, used to pick the city fixture for branch candidates and the display zone. */
    public Optional<String> findDestination(String tripId) {
        List<String> values = jdbcTemplate.queryForList(
                "SELECT destination FROM trip WHERE id = ?", String.class, tripId);
        return values.stream().findFirst();
    }

    /**
     * Conditional confirmation (design D4/D5/D11): succeeds only while the stored draft is active at the expected
     * version. The JSON status is part of the predicate so a concurrent cancel/confirm cannot be overwritten, and the
     * column version deliberately stays unchanged because confirmation is not a draft content edit.
     */
    public int confirmDraftIfActive(String tripId, int expectedVersion, String draftJson, String now) {
        return confirmDraftIfActive(tripId, 1, expectedVersion, draftJson, now);
    }

    /** Conditional confirmation for one round; the stored version deliberately stays unchanged. */
    public int confirmDraftIfActive(String tripId, int roundIndex, int expectedVersion, String draftJson,
            String now) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, updated_at = ? "
                        + "WHERE trip_id = ? AND round_index = ? AND draft_version = ? "
                        + "AND json_extract(document, '$.status') = 'active'",
                draftJson, now, tripId, roundIndex, expectedVersion);
    }

    /** Conditional cancellation for round 1. */
    public int cancelDraftIfActive(String tripId, int expectedVersion, String draftJson, String now) {
        return cancelDraftIfActive(tripId, 1, expectedVersion, draftJson, now);
    }

    /** Conditional cancellation for one round; same active + version predicate as confirmation. */
    public int cancelDraftIfActive(String tripId, int roundIndex, int expectedVersion, String draftJson,
            String now) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, updated_at = ? "
                        + "WHERE trip_id = ? AND round_index = ? AND draft_version = ? "
                        + "AND json_extract(document, '$.status') = 'active'",
                draftJson, now, tripId, roundIndex, expectedVersion);
    }

    /** US-051: conditional cancellation of round 1's confirmed split at the expected version. */
    public int cancelConfirmedIfConfirmed(String tripId, int expectedVersion, String draftJson, String now) {
        return cancelConfirmedIfConfirmed(tripId, 1, expectedVersion, draftJson, now);
    }

    /** Conditional cancellation of one confirmed round; the version stays unchanged. */
    public int cancelConfirmedIfConfirmed(String tripId, int roundIndex, int expectedVersion, String draftJson,
            String now) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, updated_at = ? "
                        + "WHERE trip_id = ? AND round_index = ? AND draft_version = ? "
                        + "AND json_extract(document, '$.status') = 'confirmed'",
                draftJson, now, tripId, roundIndex, expectedVersion);
    }

    /** Rebuilds round 1's cancelled draft in place. */
    public int rebuildIfCancelled(String tripId, String draftJson, String now) {
        return rebuildIfCancelled(tripId, 1, draftJson, now);
    }

    /** Rebuilds one cancelled round in place; the reset column version lands with the document. */
    public int rebuildIfCancelled(String tripId, int roundIndex, String draftJson, String now) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, draft_version = 1, updated_at = ? "
                        + "WHERE trip_id = ? AND round_index = ? "
                        + "AND json_extract(document, '$.status') = 'cancelled'",
                draftJson, now, tripId, roundIndex);
    }

    /**
     * Inserts one split route structure node (design D6): {@code branch_id = split-a/split-b}, activity title and
     * location, the shared window start/end, {@code plan_version = mainPlanVersion}. Durations live in the draft
     * document, not here.
     */
    public void insertSplitRoute(String id, String tripId, int planVersion, String branchId, String activityName,
            String locationName, String startAt, String endAt, int sortOrder, String createdAt) {
        jdbcTemplate.update(
                "INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, "
                        + "start_at, end_at, location_name, lat, lng, sort_order, created_at) "
                        + "VALUES (?, ?, ?, NULL, ?, 'activity', ?, ?, ?, ?, NULL, NULL, ?, ?)",
                id, tripId, planVersion, branchId, activityName, startAt, endAt, locationName, sortOrder, createdAt);
    }

    /** Loads all confirmed main-plan stops at a version (design D14), ordered by sort_order. */
    public List<PlanStop> findMainPlanStops(String tripId, int planVersion) {
        TripDayFacts facts = tripDayFacts(tripId);
        return jdbcTemplate.query(
                "SELECT id, title, start_at, end_at, cost_cents, location_name FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id = 'main' AND plan_version = ? ORDER BY sort_order",
                (rs, rowNum) -> new PlanStop(
                        rs.getString("id"),
                        rs.getString("title"),
                        parseInstant(rs.getString("start_at")),
                        parseInstant(rs.getString("end_at")),
                        rs.getInt("cost_cents"),
                        rs.getString("location_name"),
                        facts.dayIndexOf(parseInstant(rs.getString("start_at")))),
                tripId, planVersion);
    }

    /** Trip start date + zone, so a plan_node row's own instant maps back to its trip day. */
    private record TripDayFacts(String startDate, java.time.ZoneId zone) {

        private static final TripDayFacts EMPTY = new TripDayFacts(null, com.gogo.trip.TripZones.of(null));

        int dayIndexOf(Instant instant) {
            if (startDate == null || instant == null) {
                return 1;
            }
            try {
                java.time.LocalDate start = java.time.LocalDate.parse(startDate);
                java.time.LocalDate day = instant.atZone(zone).toLocalDate();
                return (int) java.time.temporal.ChronoUnit.DAYS.between(start, day) + 1;
            } catch (java.time.format.DateTimeParseException ex) {
                return 1;
            }
        }
    }

    private TripDayFacts tripDayFacts(String tripId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT start_date, destination FROM trip WHERE id = ?", tripId);
        if (rows.isEmpty()) {
            return TripDayFacts.EMPTY;
        }
        Map<String, Object> row = rows.get(0);
        return new TripDayFacts((String) row.get("start_date"),
                com.gogo.trip.TripZones.of((String) row.get("destination")));
    }

    /** Trip members keyed by user id, ordered by display name (US-045 budget result names). */
    public Map<String, String> findMemberNames(String tripId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT tm.user_id, u.display_name FROM trip_member tm JOIN app_user u ON u.id = tm.user_id "
                        + "WHERE tm.trip_id = ? ORDER BY u.display_name",
                tripId);
        Map<String, String> names = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            names.put(String.valueOf(row.get("user_id")), (String) row.get("display_name"));
        }
        return names;
    }

    /** Raw {@code kind = 'budget'} preference payloads keyed by user id; the service owns the JSON contract. */
    public Map<String, String> findBudgetPayloads(String tripId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT user_id, payload FROM member_preference WHERE trip_id = ? AND kind = 'budget' "
                        + "ORDER BY user_id",
                tripId);
        Map<String, String> payloads = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            payloads.put(String.valueOf(row.get("user_id")), (String) row.get("payload"));
        }
        return payloads;
    }
    /**
     * Updates one saved split route's editable header (spec US-087 S2, design DD3): activity name and location only.
     * The current plan version and branch id pin the row so main-plan rows are never touched. Returns the affected
     * row count (0 means the pair is missing and the caller maps it to SPLIT_DRAFT_INCOMPLETE).
     */
    public int updateSplitRoute(String tripId, int planVersion, String branchId, String activityName,
            String locationName) {
        return jdbcTemplate.update(
                "UPDATE plan_node SET title = ?, location_name = ? "
                        + "WHERE trip_id = ? AND plan_version = ? AND branch_id = ?",
                activityName, locationName, tripId, planVersion, branchId);
    }

    /** Reads round 1's route pair editable header keyed by branch id. */
    public Map<String, SplitRouteActivity> findSplitRouteActivities(String tripId) {
        return findSplitRouteActivities(tripId, 1);
    }

    /** Reads one round's route pair editable header keyed by branch id. */
    public Map<String, SplitRouteActivity> findSplitRouteActivities(String tripId, int roundIndex) {
        String[] ids = SplitBranchId.forRound(roundIndex);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT branch_id, title, location_name FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id IN (?, ?) ORDER BY sort_order",
                tripId, ids[0], ids[1]);
        Map<String, SplitRouteActivity> activities = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            activities.put((String) row.get("branch_id"),
                    new SplitRouteActivity((String) row.get("title"), (String) row.get("location_name")));
        }
        return activities;
    }

    /** Editable header of one split route row ({@code plan_node.title}/{@code location_name}). */
    public record SplitRouteActivity(String title, String locationName) {
    }

    private static Instant parseInstant(String text) {
        return text == null ? null : Instant.parse(text);
    }

    private int count(String sql, Object... args) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }
}
