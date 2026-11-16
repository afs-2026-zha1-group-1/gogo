package com.gogo.trip;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import com.gogo.auth.TestAuth;

// US-013: fixtures M1-M10; API layer per ATDD design. Identity is the merged
// account/session principal (US-066), not the retired X-User-Id scaffold.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:trip-members-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class TripMembersApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long seededTripId() {
        return jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
    }

    private long memberRows(long tripId) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ?", Long.class, tripId);
    }

    @BeforeEach
    void removeJoinedFixtureMember() {
        jdbcTemplate.update("DELETE FROM trip_member WHERE user_id = 5");
    }

    @Test
    void memberReadsRoster() throws Exception {
        long tripId = seededTripId();
        long before = memberRows(tripId);
        mockMvc.perform(get("/api/trips/{id}/members", tripId).with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId))
                .andExpect(jsonPath("$.members.length()").value(4))
                .andExpect(jsonPath("$.members[*].userId").value(contains(1, 2, 3, 4)))
                .andExpect(jsonPath("$.members[*].displayName")
                        .value(contains("Alice", "Ben", "Chloe", "Daniel")))
                .andExpect(jsonPath("$.members[*].organizer")
                        .value(contains(true, false, false, false)));
        org.junit.jupiter.api.Assertions.assertEquals(before, memberRows(tripId));
    }

    @Test
    void organizerReadsSameRoster() throws Exception {
        long tripId = seededTripId();
        mockMvc.perform(get("/api/trips/{id}/members", tripId).with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(4))
                .andExpect(jsonPath("$.members[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.members[0].organizer").value(true))
                .andExpect(jsonPath("$.members[1].organizer").value(false));
    }

    @Test
    void outsiderDeniedWithoutIdentities() throws Exception {
        long tripId = seededTripId();
        mockMvc.perform(get("/api/trips/{id}/members", tripId).with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"))
                .andExpect(jsonPath("$.members").doesNotExist())
                .andExpect(content().string(not(containsString("Alice"))))
                .andExpect(content().string(not(containsString("Ben"))))
                .andExpect(content().string(not(containsString("userId"))));
    }

    @Test
    void unauthenticatedRequestRejected() throws Exception {
        long tripId = seededTripId();
        mockMvc.perform(get("/api/trips/{id}/members", tripId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"))
                .andExpect(jsonPath("$.members").doesNotExist());
    }

    @Test
    void unknownPrincipalRejected() throws Exception {
        long tripId = seededTripId();
        mockMvc.perform(get("/api/trips/{id}/members", tripId).with(TestAuth.asUser("999999")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void legacyIdentityHeadersDoNotAuthenticate() throws Exception {
        long tripId = seededTripId();
        for (String legacy : new String[] {" ", "abc", "2"}) {
            mockMvc.perform(get("/api/trips/{id}/members", tripId).header("X-User-Id", legacy))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        }
    }

    @Test
    void unknownTripReported() throws Exception {
        mockMvc.perform(get("/api/trips/999999/members").with(TestAuth.asUser("2")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"))
                .andExpect(jsonPath("$.members").doesNotExist());
    }

    @Test
    void outsiderUnknownTripReported() throws Exception {
        mockMvc.perform(get("/api/trips/999999/members").with(TestAuth.asUser("5")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void directMembershipInsertAppearsOnce() throws Exception {
        long tripId = seededTripId();
        jdbcTemplate.update("INSERT OR IGNORE INTO trip_member (trip_id, user_id) VALUES (?, 5)", tripId);
        try {
            mockMvc.perform(get("/api/trips/{id}/members", tripId).with(TestAuth.asUser("5")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.members.length()").value(5))
                    .andExpect(jsonPath("$.members[4].userId").value(5))
                    .andExpect(jsonPath("$.members[4].displayName").value("Eve"))
                    .andExpect(jsonPath("$.members[4].organizer").value(false));
        } finally {
            jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);
        }
    }

    @Test
    void repeatedDirectInsertDoesNotDuplicateRow() throws Exception {
        long tripId = seededTripId();
        jdbcTemplate.update("INSERT OR IGNORE INTO trip_member (trip_id, user_id) VALUES (?, 5)", tripId);
        jdbcTemplate.update("INSERT OR IGNORE INTO trip_member (trip_id, user_id) VALUES (?, 5)", tripId);
        try {
            mockMvc.perform(get("/api/trips/{id}/members", tripId).with(TestAuth.asUser("2")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.members.length()").value(5))
                    .andExpect(jsonPath("$.members[4].displayName").value("Eve"));
        } finally {
            jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);
        }
    }

    @Test
    void personalPlanningFieldsAreAbsent() throws Exception {
        long tripId = seededTripId();
        mockMvc.perform(get("/api/trips/{id}/members", tripId).with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[0].ready").doesNotExist())
                .andExpect(jsonPath("$.members[0].preferenceRevision").doesNotExist())
                .andExpect(jsonPath("$.members[0].interests").doesNotExist())
                .andExpect(jsonPath("$.members[0].hardBudgetCents").doesNotExist())
                .andExpect(jsonPath("$.members[0].mainPlan").doesNotExist());
    }

    @Test
    void nonReadVerbsNotAllowed() throws Exception {
        long tripId = seededTripId();
        mockMvc.perform(post("/api/trips/{id}/members", tripId).with(TestAuth.asUser("1")))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put("/api/trips/{id}/members", tripId).with(TestAuth.asUser("1")))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete("/api/trips/{id}/members", tripId).with(TestAuth.asUser("1")))
                .andExpect(status().isMethodNotAllowed());
    }
}
