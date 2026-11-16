package com.gogo.trip;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
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
                request.endDate(), request.startLocation(), request.endLocation(), organizerId);
    }

    public Optional<TripResponse> findById(long tripId) {
        List<TripResponse> rows = jdbc.query(
                "SELECT id, name, destination, start_date, end_date, start_location, end_location, organizer_id "
                        + "FROM trip WHERE id = ?",
                (rs, rowNum) -> new TripResponse(rs.getLong("id"), rs.getString("name"),
                        rs.getString("destination"), rs.getString("start_date"), rs.getString("end_date"),
                        rs.getString("start_location"), rs.getString("end_location"), rs.getLong("organizer_id")),
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
}