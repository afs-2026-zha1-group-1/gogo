package com.gogo.hello.splits;

import com.gogo.hello.splits.domain.PlanStop;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * JdbcTemplate persistence for the splits capability (design D2/D9), matching the {@code GreetingRepository}
 * precedent. Slice 1 exposes the identity/trip/membership lookups consumed by {@link MemberGuard}; conditional
 * draft updates are added with the draft-start slice. No ORM, no extra tables or columns.
 */
@Repository
public class SplitDraftRepository {

    private final JdbcTemplate jdbcTemplate;

    public SplitDraftRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean memberExistsGlobally(String memberId) {
        return count("SELECT COUNT(*) FROM trip_member WHERE id = ?", memberId) > 0;
    }

    public boolean tripExists(String tripId) {
        return count("SELECT COUNT(*) FROM trip WHERE id = ?", tripId) > 0;
    }

    public boolean isMemberOfTrip(String memberId, String tripId) {
        return count("SELECT COUNT(*) FROM trip_member WHERE id = ? AND trip_id = ?", memberId, tripId) > 0;
    }

    public int findTripPlanVersion(String tripId) {
        Integer version = jdbcTemplate.queryForObject(
                "SELECT plan_version FROM trip WHERE id = ?", Integer.class, tripId);
        return version == null ? 0 : version;
    }

    public List<Integer> findMemberAckVersions(String tripId) {
        return jdbcTemplate.queryForList(
                "SELECT plan_ack_version FROM trip_member WHERE trip_id = ?", Integer.class, tripId);
    }

    public List<String> findMemberIdsOrdered(String tripId) {
        return jdbcTemplate.queryForList(
                "SELECT id FROM trip_member WHERE trip_id = ? ORDER BY display_name", String.class, tripId);
    }

    /**
     * Conditional insert of the first active draft (design D9): only succeeds while {@code split_draft IS NULL}.
     * Returns the affected row count; 0 means an active draft already exists (caller maps to 409 CONFLICT).
     */
    public int createDraftIfAbsent(String tripId, String draftJson) {
        return jdbcTemplate.update(
                "UPDATE trip SET split_draft = ? WHERE id = ? AND split_draft IS NULL", draftJson, tripId);
    }

    /**
     * Loads a confirmed main-plan stop (design D7): only {@code branch_id = 'main'} rows at the draft's main-plan
     * version qualify. A null/unknown/out-of-main id yields empty, which the caller maps to BOUNDARY_NOT_IN_MAIN_PLAN
     * (this also covers the half-boundary reverse case where one stop id is missing).
     */
    public Optional<PlanStop> findMainPlanStop(String tripId, String stopId, int planVersion) {
        if (stopId == null) {
            return Optional.empty();
        }
        List<PlanStop> stops = jdbcTemplate.query(
                "SELECT id, title, start_at, end_at FROM plan_node "
                        + "WHERE trip_id = ? AND id = ? AND branch_id = 'main' AND plan_version = ?",
                (rs, rowNum) -> new PlanStop(
                        rs.getString("id"),
                        rs.getString("title"),
                        parseInstant(rs.getString("start_at")),
                        parseInstant(rs.getString("end_at"))),
                tripId, stopId, planVersion);
        return stops.stream().findFirst();
    }

    /** Reads the raw draft JSON document; SQL NULL (no active draft) maps to {@code null}. */
    public String findDraftJson(String tripId) {
        return jdbcTemplate.queryForObject("SELECT split_draft FROM trip WHERE id = ?", String.class, tripId);
    }

    /**
     * Conditional draft update (design D9): only succeeds while the stored {@code draftVersion} matches the
     * expected version. Returns the affected row count; 0 means a concurrent change advanced the version
     * (caller maps to 409 STALE_DRAFT_VERSION). pool=1 serializes writers.
     */
    public int updateDraftIfVersion(String tripId, String draftJson, int expectedVersion) {
        return jdbcTemplate.update(
                "UPDATE trip SET split_draft = ? WHERE id = ? AND json_extract(split_draft, '$.draftVersion') = ?",
                draftJson, tripId, expectedVersion);
    }

    /** Deletes the existing split route pair (design D10); main-plan rows are never touched. */
    public int deleteSplitRoutes(String tripId) {
        return jdbcTemplate.update(
                "DELETE FROM plan_node WHERE trip_id = ? AND branch_id IN ('split-a', 'split-b')", tripId);
    }

    /**
     * Inserts one split route structure node (design D6): {@code branch_id = split-a/split-b}, activity title and
     * location, the shared window start/end, {@code plan_version = mainPlanVersion}. Uses existing columns only
     * (no new plan_node column); durations live in the draft document, not here.
     */
    public void insertSplitRoute(String id, String tripId, int planVersion, String branchId, String activityName,
            String startAt, String endAt, int sortOrder, String createdAt) {
        jdbcTemplate.update(
                "INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, "
                        + "start_at, end_at, location_name, lat, lng, sort_order, created_at) "
                        + "VALUES (?, ?, ?, NULL, ?, 'activity', ?, ?, ?, ?, NULL, NULL, ?, ?)",
                id, tripId, planVersion, branchId, activityName, startAt, endAt, activityName, sortOrder, createdAt);
    }

    /**
     * Loads all confirmed main-plan stops at a version (design D14), ordered by sort_order, for the detail
     * snapshot's selectable boundary options. Only {@code branch_id = 'main'} rows qualify (optional nodes excluded).
     */
    public List<PlanStop> findMainPlanStops(String tripId, int planVersion) {
        return jdbcTemplate.query(
                "SELECT id, title, start_at, end_at FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id = 'main' AND plan_version = ? ORDER BY sort_order",
                (rs, rowNum) -> new PlanStop(
                        rs.getString("id"),
                        rs.getString("title"),
                        parseInstant(rs.getString("start_at")),
                        parseInstant(rs.getString("end_at"))),
                tripId, planVersion);
    }

    /**
     * Reads the split route pair's activity names keyed by branch id (design D6/D14): the structure node title is
     * the activity name, joined with the draft's duration breakdown when assembling the detail snapshot. Ordered by
     * sort_order; main-plan rows are never included.
     */
    public Map<String, String> findSplitRouteActivities(String tripId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT branch_id, title FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id IN ('split-a', 'split-b') ORDER BY sort_order",
                tripId);
        Map<String, String> activities = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            activities.put((String) row.get("branch_id"), (String) row.get("title"));
        }
        return activities;
    }

    private static Instant parseInstant(String text) {
        return text == null ? null : Instant.parse(text);
    }

    private int count(String sql, Object... args) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }
}