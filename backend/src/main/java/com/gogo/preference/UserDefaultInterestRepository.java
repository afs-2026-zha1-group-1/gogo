package com.gogo.preference;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Single-row store for a user's personal default interests (US-019, V9). */
@Repository
public class UserDefaultInterestRepository {

    private final JdbcTemplate jdbc;

    public UserDefaultInterestRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<String> payloadOf(long userId) {
        List<String> rows = jdbc.query(
                "SELECT payload FROM user_default_interest WHERE user_id = ?",
                (rs, rowNum) -> rs.getString("payload"),
                userId);
        return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.get(0));
    }

    public void save(long userId, String payloadJson) {
        jdbc.update("INSERT INTO user_default_interest (user_id, payload, updated_at) VALUES (?, ?, ?) "
                        + "ON CONFLICT (user_id) DO UPDATE SET payload = excluded.payload, "
                        + "updated_at = excluded.updated_at",
                userId, payloadJson, Instant.now().toString());
    }
}
