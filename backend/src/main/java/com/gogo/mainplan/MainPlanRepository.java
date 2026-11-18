package com.gogo.mainplan;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

// Draft/stop persistence and the read-side aggregation queries (design
// D4/D6/D7). member_preference is read-only here (REQ-019 owns the writes).
@Repository
public class MainPlanRepository {

    public record DraftRow(long id, long tripId, int version, String status,
            int costPerPersonCents, String inputRevisionsJson, String tripBasicsJson) {
    }

    public record StopRow(long id, int seq, String name, String startLocal, String endLocal,
            String locationName, Integer travelMinutesToNext, String interestsJson, int costCents) {

        /** Cost-less convenience for schedule-only fixtures (US-045 adds the cost column). */
        public StopRow(int seq, String name, String startLocal, String endLocal,
                Integer travelMinutesToNext, String interestsJson) {
            this(0L, seq, name, startLocal, endLocal, null, travelMinutesToNext, interestsJson, 0);
        }

        /** US-045 fixtures keep the cost slot while staying id-less and location-less. */
        public StopRow(int seq, String name, String startLocal, String endLocal,
                Integer travelMinutesToNext, String interestsJson, int costCents) {
            this(0L, seq, name, startLocal, endLocal, null, travelMinutesToNext, interestsJson, costCents);
        }
    }

    public record MemberRow(long userId, String displayName, boolean ready, int preferenceRevision,
            String submissionPayload) {
    }

    public record PreferenceRow(long userId, String payload) {
    }

    private final JdbcTemplate jdbc;

    public MainPlanRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int maxVersion(long tripId) {
        Integer max = jdbc.queryForObject(
                "SELECT MAX(version) FROM main_plan_draft WHERE trip_id = ?", Integer.class, tripId);
        return max == null ? 0 : max;
    }

    public long insertDraft(long tripId, int version, int costPerPersonCents, String inputRevisionsJson,
            String tripBasicsJson) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, "
                            + "input_revisions_json, trip_basics_json) VALUES (?, ?, 'current', ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, tripId);
            ps.setInt(2, version);
            ps.setInt(3, costPerPersonCents);
            ps.setString(4, inputRevisionsJson);
            ps.setString(5, tripBasicsJson);
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void supersedeCurrentDrafts(long tripId) {
        jdbc.update("UPDATE main_plan_draft SET status = 'superseded' WHERE trip_id = ? AND status = 'current'",
                tripId);
    }

    /** US-003: a planning edit invalidates the confirmed plan (design D3/D6). */
    public void supersedeConfirmedDraft(long tripId) {
        jdbc.update("UPDATE main_plan_draft SET status = 'superseded' WHERE trip_id = ? AND status = 'confirmed'",
                tripId);
    }

    public void insertStop(long draftId, MainPlanResult.PlannedStop stop, String interestsJson) {
        jdbc.update("INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, "
                + "travel_minutes_to_next, interests_json, cost_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                draftId, stop.seq(), stop.name(), stop.startTime(), stop.endTime(),
                stop.travelMinutesToNext(), interestsJson, stop.costCents());
    }

    public Optional<DraftRow> findDraftByStatus(long tripId, String status) {
        List<DraftRow> rows = jdbc.query(
                "SELECT id, trip_id, version, status, cost_per_person_cents, input_revisions_json, trip_basics_json "
                        + "FROM main_plan_draft WHERE trip_id = ? AND status = ?",
                (rs, rowNum) -> new DraftRow(rs.getLong("id"), rs.getLong("trip_id"), rs.getInt("version"),
                        rs.getString("status"), rs.getInt("cost_per_person_cents"),
                        rs.getString("input_revisions_json"), rs.getString("trip_basics_json")),
                tripId, status);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public List<StopRow> stopsForDraft(long draftId) {
        return jdbc.query(
                "SELECT id, seq, name, start_local, end_local, location_name, travel_minutes_to_next, "
                        + "interests_json, cost_cents FROM main_plan_stop WHERE draft_id = ? ORDER BY seq",
                MainPlanRepository::toStopRow,
                draftId);
    }

    public boolean stopExists(long draftId, int seq) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM main_plan_stop WHERE draft_id = ? AND seq = ?", Integer.class, draftId, seq);
        return count != null && count > 0;
    }

    /**
     * One draft stop scoped to the trip (US-090 「我的方案」edit); empty when the id is not a stop of this trip's
     * main plan, so a foreign stop id can never be edited through this route.
     */
    public Optional<StopRow> findStop(long tripId, long stopId) {
        List<StopRow> rows = jdbc.query(
                "SELECT s.id, s.seq, s.name, s.start_local, s.end_local, s.location_name, "
                        + "s.travel_minutes_to_next, s.interests_json, s.cost_cents "
                        + "FROM main_plan_stop s JOIN main_plan_draft d ON d.id = s.draft_id "
                        + "WHERE s.id = ? AND d.trip_id = ?",
                MainPlanRepository::toStopRow,
                stopId, tripId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    /**
     * Writes one edited stop (US-090 time/location, US-003 name): name, time pair and location change in one row;
     * seq, legs and cost stay untouched.
     */
    public int updateStop(long stopId, String name, String startLocal, String endLocal, String locationName) {
        return jdbc.update(
                "UPDATE main_plan_stop SET name = ?, start_local = ?, end_local = ?, location_name = ? WHERE id = ?",
                name, startLocal, endLocal, locationName, stopId);
    }

    /** Next free position for an appended stop (US-090 新增节点); positions are never renumbered. */
    public int nextSeq(long draftId) {
        Integer max = jdbc.queryForObject(
                "SELECT MAX(seq) FROM main_plan_stop WHERE draft_id = ?", Integer.class, draftId);
        return max == null ? 1 : max + 1;
    }

    /** Appends a manually authored stop (US-090 新增节点); no legs, interests or cost invented. */
    public void insertStopRow(long draftId, int seq, String name, String startLocal, String endLocal,
            String locationName) {
        jdbc.update("INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, location_name, "
                        + "travel_minutes_to_next, interests_json, cost_cents) "
                        + "VALUES (?, ?, ?, ?, ?, ?, NULL, '[]', 0)",
                draftId, seq, name, startLocal, endLocal, locationName);
    }

    /** Removes one stop (US-090 删除节点); the remaining positions keep their seq so plan_node ids stay put. */
    public int deleteStop(long stopId) {
        return jdbc.update("DELETE FROM main_plan_stop WHERE id = ?", stopId);
    }

    /**
     * Fills the leg of the stop that stops being last once another stop is appended (US-090); a non-last stop
     * without travel minutes makes the plan unconfirmable (MISSING_LEG).
     */
    public int updateTravelMinutesToNext(long stopId, int minutes) {
        return jdbc.update("UPDATE main_plan_stop SET travel_minutes_to_next = ? WHERE id = ?", minutes, stopId);
    }

    private static StopRow toStopRow(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new StopRow(rs.getLong("id"), rs.getInt("seq"), rs.getString("name"),
                rs.getString("start_local"), rs.getString("end_local"), rs.getString("location_name"),
                (Integer) rs.getObject("travel_minutes_to_next"), rs.getString("interests_json"),
                rs.getInt("cost_cents"));
    }

    public void markDraftConfirmed(long draftId) {
        jdbc.update("UPDATE main_plan_draft SET status = 'confirmed' WHERE id = ?", draftId);
    }

    /** US-003 D7/D8: confirmation closes joining permanently and is the only confirmation-state writer. */
    public void setTripConfirmedAndJoiningClosed(long tripId) {
        jdbc.update("UPDATE trip SET main_plan_confirmed = 1, joining_closed = 1 WHERE id = ?", tripId);
    }

    /** US-003 D13: stop edit applies only while the draft is still the current (unconfirmed) one. */
    public int updateStopIfCurrent(long draftId, int seq, String name, String startLocal, String endLocal) {
        return jdbc.update(
                "UPDATE main_plan_stop SET name = ?, start_local = ?, end_local = ? "
                        + "WHERE draft_id = ? AND seq = ? AND EXISTS ("
                        + "SELECT 1 FROM main_plan_draft d WHERE d.id = ? AND d.status = 'current')",
                name, startLocal, endLocal, draftId, seq, draftId);
    }

    public void updateTripLocations(long tripId, String startLocation, String endLocation) {
        jdbc.update("UPDATE trip SET start_location = ?, end_location = ? WHERE id = ?",
                startLocation, endLocation, tripId);
    }

    // Readiness and the explicit "no preference" flag come from the US-026 submission row; the
    // payload is left unparsed so the service owns the JSON contract. The scaffold column stays a
    // fallback, so a submission saved before this projection existed still counts as ready.
    public List<MemberRow> members(long tripId) {
        return jdbc.query(
                "SELECT m.user_id, u.display_name, "
                        + "CASE WHEN s.payload IS NOT NULL AND TRIM(s.payload) <> '' THEN 1 ELSE m.ready END AS ready, "
                        + "m.preference_revision, s.payload AS submission_payload "
                        + "FROM trip_member m JOIN app_user u ON u.id = m.user_id "
                        + "LEFT JOIN member_preference s ON s.trip_id = m.trip_id AND s.user_id = m.user_id "
                        + "AND s.kind = 'submission' "
                        + "WHERE m.trip_id = ? ORDER BY m.user_id",
                (rs, rowNum) -> new MemberRow(rs.getLong("user_id"), rs.getString("display_name"),
                        rs.getInt("ready") == 1, rs.getInt("preference_revision"),
                        rs.getString("submission_payload")),
                tripId);
    }

    public List<PreferenceRow> preferenceRows(long tripId, String kind) {
        return jdbc.query(
                "SELECT user_id, payload FROM member_preference WHERE trip_id = ? AND kind = ? "
                        + "ORDER BY user_id, id",
                (rs, rowNum) -> new PreferenceRow(rs.getLong("user_id"), rs.getString("payload")),
                tripId, kind);
    }
}