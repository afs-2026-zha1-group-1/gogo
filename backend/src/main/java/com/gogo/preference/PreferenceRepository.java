package com.gogo.preference;

import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Single-row upsert and member left join for `member_preference` (DD7, DD8, MD1). There is no
 * `SELECT ... FOR UPDATE`: the unique key plus the single pooled connection serialize writers.
 * Since REQ-020 the statements take the preference `kind` as an argument; the interest call
 * sites pass `"interest"` and the must-do call sites pass `"must_do"` against the same row key.
 */
@Repository
public class PreferenceRepository {

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public PreferenceRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public void save(long tripId, long userId, String kind, List<String> codes) {
        jdbc.sql("INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?) "
                        + "ON CONFLICT (trip_id, user_id, kind) "
                        + "DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
                .params(tripId, userId, kind, writePayload(codes), Instant.now().toString())
                .update();
    }

    public void savePayload(long tripId, long userId, String kind, String payloadJson) {
        jdbc.sql("INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?) "
                        + "ON CONFLICT (trip_id, user_id, kind) "
                        + "DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
                .params(tripId, userId, kind, payloadJson, Instant.now().toString())
                .update();
    }

    public List<StoredPreference> membersOf(long tripId, String kind) {
        return jdbc.sql("SELECT m.user_id, p.payload "
                        + "FROM trip_member m "
                        + "LEFT JOIN member_preference p "
                        + "ON p.trip_id = m.trip_id AND p.user_id = m.user_id AND p.kind = ? "
                        + "WHERE m.trip_id = ? "
                        + "ORDER BY m.user_id")
                .params(kind, tripId)
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
