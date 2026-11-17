package com.gogo.trip;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import com.gogo.auth.TestAuth;

// US-071 revision: delta "Current trip selection" (8 scenarios). The selection is
// stored per account in app_user.current_trip_id (V8) and validated for membership.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:current-trip-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class CurrentTripApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long seededTripId() {
        return jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
    }

    @BeforeEach
    void resetSelections() {
        jdbcTemplate.update("UPDATE app_user SET current_trip_id = NULL");
        jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", seededTripId());
    }

    private void select(long userId, long tripId) throws Exception {
        mockMvc.perform(put("/api/trips/current").with(TestAuth.asUser(String.valueOf(userId)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tripId\":" + tripId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId));
    }

    @Test
    void readReturnsStoredSelection() throws Exception {
        long tripId = seededTripId();
        select(1, tripId);
        mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId));
    }

    @Test
    void noSelectionReturnsNull() throws Exception {
        mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(nullValue()));
    }

    @Test
    void selectionPersistsAcrossRequests() throws Exception {
        long tripId = seededTripId();
        select(1, tripId);
        // A fresh request with the same principal (re-login equivalent) still sees it.
        mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId));
        mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId));
    }

    @Test
    void nonMemberSelectionDenied() throws Exception {
        long tripId = seededTripId();
        mockMvc.perform(put("/api/trips/current").with(TestAuth.asUser("5"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tripId\":" + tripId + "}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(nullValue()));
    }

    @Test
    void unknownTripReported() throws Exception {
        long tripId = seededTripId();
        select(1, tripId);
        mockMvc.perform(put("/api/trips/current").with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tripId\":999999}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
        mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId));
    }

    @Test
    void unauthenticatedRejected() throws Exception {
        mockMvc.perform(get("/api/trips/current"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(put("/api/trips/current").with(TestAuth.csrfOnly())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tripId\":1}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void selectionScopedToAccount() throws Exception {
        long tripId = seededTripId();
        select(1, tripId);
        mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(nullValue()));
    }

    @Test
    void staleSelectionReadsAsNoSelection() throws Exception {
        long tripId = seededTripId();
        select(1, tripId);
        jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 1", tripId);
        try {
            mockMvc.perform(get("/api/trips/current").with(TestAuth.asUser("1")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tripId").value(nullValue()));
        } finally {
            jdbcTemplate.update("INSERT INTO trip_member (trip_id, user_id) VALUES (?, 1)", tripId);
        }
    }
}
