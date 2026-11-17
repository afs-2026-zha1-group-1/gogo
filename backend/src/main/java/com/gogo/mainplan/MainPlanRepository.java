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

    public record StopRow(int seq, String name, String startLocal, String endLocal,
            Integer travelMinutesToNext, String interestsJson) {
    }

    public record MemberRow(long userId, String displayName, boolean ready, int preferenceRevision) {
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
                + "travel_minutes_to_next, interests_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
                draftId, stop.seq(), stop.name(), stop.startTime(), stop.endTime(),
                stop.travelMinutesToNext(), interestsJson);
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
                "SELECT seq, name, start_local, end_local, travel_minutes_to_next, interests_json "
                        + "FROM main_plan_stop WHERE draft_id = ? ORDER BY seq",
                (rs, rowNum) -> new StopRow(rs.getInt("seq"), rs.getString("name"),
                        rs.getString("start_local"), rs.getString("end_local"),
                        (Integer) rs.getObject("travel_minutes_to_next"), rs.getString("interests_json")),
                draftId);
    }

    public boolean stopExists(long draftId, int seq) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM main_plan_stop WHERE draft_id = ? AND seq = ?", Integer.class, draftId, seq);
        return count != null && count > 0;
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

    public List<MemberRow> members(long tripId) {
        return jdbc.query(
                "SELECT m.user_id, u.display_name, m.ready, m.preference_revision "
                        + "FROM trip_member m JOIN app_user u ON u.id = m.user_id "
                        + "WHERE m.trip_id = ? ORDER BY m.user_id",
                (rs, rowNum) -> new MemberRow(rs.getLong("user_id"), rs.getString("display_name"),
                        rs.getInt("ready") == 1, rs.getInt("preference_revision")),
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