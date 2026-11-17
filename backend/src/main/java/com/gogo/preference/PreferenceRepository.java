package com.gogo.preference;

import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Single-row upsert and member left join for `member_preference` (DD7, DD8). There is no
 * `SELECT ... FOR UPDATE`: the unique key plus the single pooled connection serialize writers.
 */
@Repository
public class PreferenceRepository {

    private static final String INTEREST = "interest";

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public PreferenceRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public void save(long tripId, long userId, List<String> codes) {
        jdbc.sql("INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?) "
                        + "ON CONFLICT (trip_id, user_id, kind) "
                        + "DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
                .params(tripId, userId, INTEREST, writePayload(codes), Instant.now().toString())
                .update();
    }

    public List<StoredPreference> membersOf(long tripId) {
        return jdbc.sql("SELECT m.user_id, p.payload "
                        + "FROM trip_member m "
                        + "LEFT JOIN member_preference p "
                        + "ON p.trip_id = m.trip_id AND p.user_id = m.user_id AND p.kind = ? "
                        + "WHERE m.trip_id = ? "
                        + "ORDER BY m.user_id")
                .params(INTEREST, tripId)
                .query((rs, rowNum) -> new StoredPreference(rs.getLong("user_id"), rs.getString("payload")))
                .list();
    }

    List<String> codesOf(StoredPreference stored) {
        if (stored.payload() == null) {
            return List.of();
        }
        try {
            PreferencePayload payload = objectMapper.readValue(stored.payload(), PreferencePayload.class);
            return payload.codes() == null ? List.of() : payload.codes();
        } catch (JsonProcessingException cause) {
            throw new IllegalStateException(
                    "Stored preference payload is not readable JSON: " + stored.payload(), cause);
        }
    }

    private String writePayload(List<String> codes) {
        try {
            return objectMapper.writeValueAsString(new PreferencePayload(codes));
        } catch (JsonProcessingException cause) {
            throw new IllegalStateException("Preference payload is not serializable", cause);
        }
    }

    public record StoredPreference(long userId, String payload) {
    }
}
