package com.gogo.invitation;

import java.util.List;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.gogo.trip.TripRepository;
import com.gogo.trip.TripResponse;

@Repository
public class InvitationRepository {

    private final JdbcTemplate jdbc;
    private final TripRepository trips;

    public InvitationRepository(JdbcTemplate jdbc, TripRepository trips) {
        this.jdbc = jdbc;
        this.trips = trips;
    }

    @Transactional
    public IssuedInvitation issue(long tripId, long callerId) {
        TripResponse trip = trips.findById(tripId)
                .orElseThrow(() -> new InvitationApiException(404, "TRIP_NOT_FOUND", "No trip with id " + tripId));
        if (trip.organizerId() != callerId) {
            throw new InvitationApiException(403, "NOT_ORGANIZER", "Only the trip organizer can issue an invitation");
        }
        Optional<String> existing = findToken(tripId);
        if (existing.isPresent()) {
            return issued(existing.get(), trip);
        }
        for (int attempt = 0; attempt < 2; attempt++) {
            String token = InvitationTokens.next();
            try {
                jdbc.update("INSERT INTO trip_invitation (trip_id, token) VALUES (?, ?)", tripId, token);
                return issued(token, trip);
            } catch (DataIntegrityViolationException retryable) {
                if (attempt == 1) {
                    throw retryable;
                }
            }
        }
        throw new IllegalStateException("Unreachable token issuance state");
    }

    public InvitationPreview preview(String token) {
        List<InvitationPreview> rows = jdbc.query(
                "SELECT t.name, t.destination, t.start_date, t.end_date, t.main_plan_confirmed "
                        + "FROM trip_invitation i JOIN trip t ON t.id = i.trip_id WHERE i.token = ?",
                (rs, rowNum) -> new InvitationPreview(rs.getString("name"), rs.getString("destination"),
                        rs.getString("start_date"), rs.getString("end_date"),
                        rs.getInt("main_plan_confirmed") != 0),
                token);
        return rows.stream().findFirst()
                .orElseThrow(() -> new InvitationApiException(404, "INVITATION_NOT_FOUND",
                        "This invitation is not usable"));
    }

    @Transactional
    public JoinResult accept(String token, long userId) {
        long tripId = findTripId(token)
                .orElseThrow(() -> new InvitationApiException(404, "INVITATION_NOT_FOUND",
                        "This invitation is not usable"));
        if (trips.isMember(tripId, userId)) {
            return new JoinResult(true, true);
        }
        if (isMainPlanConfirmed(tripId)) {
            throw new InvitationApiException(403, "JOINING_CLOSED",
                    "Joining is closed after the main plan is confirmed");
        }
        int inserted = jdbc.update(
                "INSERT OR IGNORE INTO trip_member (trip_id, user_id) VALUES (?, ?)", tripId, userId);
        return new JoinResult(true, inserted == 0);
    }

    private Optional<String> findToken(long tripId) {
        List<String> tokens = jdbc.queryForList(
                "SELECT token FROM trip_invitation WHERE trip_id = ?", String.class, tripId);
        return tokens.stream().findFirst();
    }

    private Optional<Long> findTripId(String token) {
        List<Long> ids = jdbc.queryForList(
                "SELECT trip_id FROM trip_invitation WHERE token = ?", Long.class, token);
        return ids.stream().findFirst();
    }

    private boolean isMainPlanConfirmed(long tripId) {
        Integer confirmed = jdbc.queryForObject(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, tripId);
        return confirmed != null && confirmed != 0;
    }

    private static IssuedInvitation issued(String token, TripResponse trip) {
        return new IssuedInvitation(token, "/join/" + token, trip.id(), trip.name());
    }
}
