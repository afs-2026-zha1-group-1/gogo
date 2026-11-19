package com.gogo.trip;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class TripRepository {

    private final JdbcTemplate jdbc;

    public TripRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Long> findUserId(String headerValue) {
        long id;
        try {
            id = Long.parseLong(headerValue.trim());
        } catch (NumberFormatException | NullPointerException cause) {
            return Optional.empty();
        }
        List<Long> ids = jdbc.queryForList("SELECT id FROM app_user WHERE id = ?", Long.class, id);
        return ids.isEmpty() ? Optional.empty() : Optional.of(ids.get(0));
    }

    @Transactional
    public TripResponse create(TripCreateRequest request, long organizerId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO trip (name, destination, start_date, end_date, start_location, end_location, organizer_id) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, request.name());
            ps.setString(2, request.destination());
            ps.setString(3, request.startDate());
            ps.setString(4, request.endDate());
            ps.setString(5, request.startLocation());
            ps.setString(6, request.endLocation());
            ps.setLong(7, organizerId);
            return ps;
        }, keyHolder);
        long tripId = keyHolder.getKey().longValue();
        jdbc.update("INSERT INTO trip_member (trip_id, user_id) VALUES (?, ?)", tripId, organizerId);
        return new TripResponse(tripId, request.name(), request.destination(), request.startDate(),
                request.endDate(), request.startLocation(), request.endLocation(), organizerId, false, false);
    }

    public Optional<TripResponse> findById(long tripId) {
        List<TripResponse> rows = jdbc.query(
                "SELECT id, name, destination, start_date, end_date, start_location, end_location, organizer_id, "
                        + "main_plan_confirmed, joining_closed FROM trip WHERE id = ?",
                (rs, rowNum) -> new TripResponse(rs.getLong("id"), rs.getString("name"),
                        rs.getString("destination"), rs.getString("start_date"), rs.getString("end_date"),
                        rs.getString("start_location"), rs.getString("end_location"), rs.getLong("organizer_id"),
                        rs.getInt("main_plan_confirmed") != 0, rs.getInt("joining_closed") != 0),
                tripId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public boolean isMember(long tripId, long userId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ? AND user_id = ?",
                Long.class, tripId, userId);
        return count != null && count > 0;
    }

    public TripMemberListResponse findMembers(long tripId) {
        List<TripMember> members = jdbc.query(
                "SELECT u.id, u.display_name, CASE WHEN u.id = t.organizer_id THEN 1 ELSE 0 END AS organizer "
                        + "FROM trip_member tm "
                        + "JOIN app_user u ON u.id = tm.user_id "
                        + "JOIN trip t ON t.id = tm.trip_id "
                        + "WHERE tm.trip_id = ? ORDER BY u.id",
                (rs, rowNum) -> new TripMember(rs.getLong("id"), rs.getString("display_name"),
                        rs.getInt("organizer") != 0),
                tripId);
        return new TripMemberListResponse(tripId, members);
    }

    /** US-003: full-form update with name/organizer and split gates plus plan invalidation (design D1-D3). */
    @Transactional
    public TripResponse updateBasics(long tripId, long callerId, TripCreateRequest request) {
        TripResponse existing = findById(tripId)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + tripId));
        if (!isMember(tripId, callerId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        boolean nameChanged = !Objects.equals(existing.name(), request.name());
        if (nameChanged && existing.organizerId() != callerId) {
            throw new TripApiException(403, "NOT_ORGANIZER", "Only the organizer can rename the trip");
        }
        boolean planningChanged = !Objects.equals(existing.destination(), request.destination())
                || !Objects.equals(existing.startDate(), request.startDate())
                || !Objects.equals(existing.endDate(), request.endDate())
                || !Objects.equals(existing.startLocation(), request.startLocation())
                || !Objects.equals(existing.endLocation(), request.endLocation());
        if (planningChanged) {
            String splitStatus = findSplitStatus(tripId);
            if ("active".equals(splitStatus)) {
                throw new TripApiException(409, "SPLIT_DRAFT_ACTIVE",
                        "Cancel the split draft before changing planning basics");
            }
            if ("confirmed".equals(splitStatus)) {
                throw new TripApiException(409, "SPLIT_CONFIRMED",
                        "Cancel the confirmed split before changing planning basics");
            }
        }
        boolean invalidate = planningChanged && existing.mainPlanConfirmed();
        int confirmed = invalidate ? 0 : (existing.mainPlanConfirmed() ? 1 : 0);
        int joiningClosed = (existing.joiningClosed() || existing.mainPlanConfirmed()) ? 1 : 0;
        String sql = "UPDATE trip SET name = ?, destination = ?, start_date = ?, end_date = ?, start_location = ?, "
                + "end_location = ?, main_plan_confirmed = ?, joining_closed = ? WHERE id = ?";
        int updated;
        if (planningChanged) {
            updated = jdbc.update(sql + " AND NOT EXISTS (SELECT 1 FROM split_draft WHERE trip_id = ? "
                    + "AND json_extract(document, '$.status') IN ('active', 'confirmed'))",
                    request.name(), request.destination(), request.startDate(), request.endDate(),
                    request.startLocation(), request.endLocation(), confirmed, joiningClosed, tripId, tripId);
        } else {
            updated = jdbc.update(sql, request.name(), request.destination(), request.startDate(),
                    request.endDate(), request.startLocation(), request.endLocation(), confirmed, joiningClosed,
                    tripId);
        }
        if (updated == 0) {
            String splitStatus = findSplitStatus(tripId);
            if ("confirmed".equals(splitStatus)) {
                throw new TripApiException(409, "SPLIT_CONFIRMED",
                        "Cancel the confirmed split before changing planning basics");
            }
            if ("active".equals(splitStatus)) {
                throw new TripApiException(409, "SPLIT_DRAFT_ACTIVE",
                        "Cancel the split draft before changing planning basics");
            }
            throw new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + tripId);
        }
        if (invalidate) {
            jdbc.update("UPDATE main_plan_draft SET status = 'superseded' "
                    + "WHERE trip_id = ? AND status = 'confirmed'", tripId);
        }
        return findById(tripId)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + tripId));
    }

    /** Draft/split status from the splits document, or null when the trip has no split row. */
    public String findSplitStatus(long tripId) {
        List<String> statuses = jdbc.queryForList(
                "SELECT json_extract(document, '$.status') FROM split_draft WHERE trip_id = ?",
                String.class, tripId);
        return statuses.isEmpty() ? null : statuses.get(0);
    }

    /**
     * Delete a trip and everything that belongs to it. Only the organizer may do this; the
     * cascade is written out by hand because no foreign key declares ON DELETE CASCADE.
     */
    @Transactional
    public void deleteTrip(long tripId, long callerId) {
        TripResponse existing = findById(tripId)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + tripId));
        if (!isMember(tripId, callerId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        if (existing.organizerId() != callerId) {
            throw new TripApiException(403, "NOT_ORGANIZER", "Only the organizer can delete the trip");
        }
        jdbc.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbc.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM plan_node WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM split_draft WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM member_preference WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM trip_invitation WHERE trip_id = ?", tripId);
        jdbc.update("UPDATE app_user SET current_trip_id = NULL WHERE current_trip_id = ?", tripId);
        jdbc.update("DELETE FROM trip_member WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM trip WHERE id = ?", tripId);
    }

    public TripListResponse findTripsForUser(long userId) {
        List<TripListItem> trips = jdbc.query(
                "SELECT t.id, t.name, t.destination, t.start_date, t.end_date, t.main_plan_confirmed, "
                        + "CASE WHEN t.organizer_id = tm.user_id THEN 1 ELSE 0 END AS organizer "
                        + "FROM trip t JOIN trip_member tm ON tm.trip_id = t.id "
                        + "WHERE tm.user_id = ? "
                        + "ORDER BY (t.end_date < date('now')) ASC, t.start_date ASC, t.id ASC",
                (rs, rowNum) -> new TripListItem(rs.getLong("id"), rs.getString("name"),
                        rs.getString("destination"), rs.getString("start_date"), rs.getString("end_date"),
                        rs.getInt("organizer") != 0, rs.getInt("main_plan_confirmed") != 0),
                userId);
        return new TripListResponse(trips);
    }

    /** US-071 revision: the account's stored current trip, or null when unset/stale. */
    public CurrentTripResponse findCurrentTrip(long userId) {
        Long stored = jdbc.queryForObject(
                "SELECT current_trip_id FROM app_user WHERE id = ?", Long.class, userId);
        if (stored == null || !isMember(stored, userId) || findById(stored).isEmpty()) {
            return new CurrentTripResponse(null);
        }
        return new CurrentTripResponse(stored);
    }

    /** US-071 revision: persist the selection only for trips the caller belongs to. */
    @Transactional
    public CurrentTripResponse selectCurrentTrip(long userId, long tripId) {
        findById(tripId)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + tripId));
        if (!isMember(tripId, userId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        jdbc.update("UPDATE app_user SET current_trip_id = ? WHERE id = ?", tripId, userId);
        return new CurrentTripResponse(tripId);
    }
}