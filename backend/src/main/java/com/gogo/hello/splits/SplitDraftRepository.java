package com.gogo.hello.splits;

import com.gogo.hello.splits.domain.PlanStop;
import java.time.Instant;
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
        String now = Instant.now().toString();
        try {
            jdbcTemplate.update(
                    "INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at) "
                            + "VALUES (?, ?, ?, 1, ?, ?)",
                    UUID.randomUUID().toString(), tripId, draftJson, now, now);
            return 1;
        } catch (DataAccessException ex) {
            // SQLite UNIQUE(trip_id) violation (error 19) is not auto-translated; any failure here means an
            // active draft already exists → map to 0 so the caller returns 409 SPLIT_DRAFT_CONFLICT.
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
        List<PlanStop> stops = jdbcTemplate.query(
                "SELECT id, title, start_at, end_at, location_name FROM plan_node "
                        + "WHERE trip_id = ? AND id = ? AND branch_id = 'main' AND plan_version = ?",
                (rs, rowNum) -> new PlanStop(
                        rs.getString("id"),
                        rs.getString("title"),
                        parseInstant(rs.getString("start_at")),
                        parseInstant(rs.getString("end_at")),
                        rs.getString("location_name")),
                tripId, stopId, planVersion);
        return stops.stream().findFirst();
    }

    /** Reads the raw draft JSON document from split_draft; no row (no active draft) maps to {@code null}. */
    public String findDraftJson(String tripId) {
        List<String> docs = jdbcTemplate.queryForList(
                "SELECT document FROM split_draft WHERE trip_id = ?", String.class, tripId);
        return docs.isEmpty() ? null : docs.get(0);
    }

    /**
     * Conditional draft update (design D9): only succeeds while the stored {@code draft_version} matches the
     * expected version; the column is bumped atomically. Returns the affected row count; 0 means a concurrent
     * change advanced the version (caller maps to 409 STALE_DRAFT_VERSION). pool=1 serializes writers.
     */
    public int updateDraftIfVersion(String tripId, String draftJson, int expectedVersion) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, draft_version = draft_version + 1, updated_at = ? "
                        + "WHERE trip_id = ? AND draft_version = ?",
                draftJson, Instant.now().toString(), tripId, expectedVersion);
    }

    /** Deletes the existing split route pair (design D10); main-plan rows are never touched. */
    public int deleteSplitRoutes(String tripId) {
        return jdbcTemplate.update(
                "DELETE FROM plan_node WHERE trip_id = ? AND branch_id IN ('split-a', 'split-b')", tripId);
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
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, updated_at = ? "
                        + "WHERE trip_id = ? AND draft_version = ? "
                        + "AND json_extract(document, '$.status') = 'active'",
                draftJson, now, tripId, expectedVersion);
    }

    /** Conditional cancellation (design D4/D6/D11): same active + version predicate as confirmation. */
    public int cancelDraftIfActive(String tripId, int expectedVersion, String draftJson, String now) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, updated_at = ? "
                        + "WHERE trip_id = ? AND draft_version = ? "
                        + "AND json_extract(document, '$.status') = 'active'",
                draftJson, now, tripId, expectedVersion);
    }

    /** US-051: conditional cancellation of a confirmed split at the expected version. */
    public int cancelConfirmedIfConfirmed(String tripId, int expectedVersion, String draftJson, String now) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, updated_at = ? "
                        + "WHERE trip_id = ? AND draft_version = ? "
                        + "AND json_extract(document, '$.status') = 'confirmed'",
                draftJson, now, tripId, expectedVersion);
    }

    /**
     * Rebuilds a cancelled draft in place (design D7/D11): the replacement document and the reset column version both
     * land only while the stored status is still cancelled, so concurrent rebuilds collapse to a single winner.
     */
    public int rebuildIfCancelled(String tripId, String draftJson, String now) {
        return jdbcTemplate.update(
                "UPDATE split_draft SET document = ?, draft_version = 1, updated_at = ? "
                        + "WHERE trip_id = ? AND json_extract(document, '$.status') = 'cancelled'",
                draftJson, now, tripId);
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
        return jdbcTemplate.query(
                "SELECT id, title, start_at, end_at, location_name FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id = 'main' AND plan_version = ? ORDER BY sort_order",
                (rs, rowNum) -> new PlanStop(
                        rs.getString("id"),
                        rs.getString("title"),
                        parseInstant(rs.getString("start_at")),
                        parseInstant(rs.getString("end_at")),
                        rs.getString("location_name")),
                tripId, planVersion);
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

    /** Reads the split route pair's editable header keyed by branch id (design D6/D14/US-087 DD4). */
    public Map<String, SplitRouteActivity> findSplitRouteActivities(String tripId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT branch_id, title, location_name FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id IN ('split-a', 'split-b') ORDER BY sort_order",
                tripId);
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
