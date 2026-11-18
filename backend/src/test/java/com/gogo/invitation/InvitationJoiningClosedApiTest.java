package com.gogo.invitation;

import com.gogo.auth.TestAuth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

// US-003 D8: joiningClosed is reported separately from mainPlanConfirmed and stays
// closed after a planning edit resets the plan.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:invitation-join-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class InvitationJoiningClosedApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long tripId;
    private String token;

    @BeforeEach
    void resetFixtureState() {
        tripId = jdbcTemplate.queryForObject("SELECT MIN(id) FROM trip", Long.class);
        jdbcTemplate.update("UPDATE trip SET name = 'Singapore Friends Day', destination = 'Singapore', "
                + "start_date = '2026-12-05', end_date = '2026-12-05', main_plan_confirmed = 0, "
                + "joining_closed = 0 WHERE id = ?", tripId);
        jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);
        jdbcTemplate.update("DELETE FROM trip_invitation WHERE trip_id = ?", tripId);
        token = "0123456789abcdef0123456789abcdef";
        jdbcTemplate.update("INSERT INTO trip_invitation (trip_id, token) VALUES (?, ?)", tripId, token);
    }

    @Test
    void previewReportsJoiningOpenBeforeConfirmation() throws Exception {
        mockMvc.perform(get("/api/invitations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripName").value("Singapore Friends Day"))
                .andExpect(jsonPath("$.mainPlanConfirmed").value(false))
                .andExpect(jsonPath("$.joiningClosed").value(false));
    }

    @Test
    void previewReportsBothFlagsAfterConfirmation() throws Exception {
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 1, joining_closed = 1 WHERE id = ?", tripId);
        mockMvc.perform(get("/api/invitations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mainPlanConfirmed").value(true))
                .andExpect(jsonPath("$.joiningClosed").value(true));
    }

    @Test
    void previewAfterAPlanningEditKeepsJoiningClosed() throws Exception {
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 0, joining_closed = 1 WHERE id = ?", tripId);
        mockMvc.perform(get("/api/invitations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mainPlanConfirmed").value(false))
                .andExpect(jsonPath("$.joiningClosed").value(true));
    }

    @Test
    void acceptanceStaysClosedAfterAPlanningEdit() throws Exception {
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 0, joining_closed = 1 WHERE id = ?", tripId);
        mockMvc.perform(post("/api/invitations/" + token + "/accept").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("JOINING_CLOSED"));
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ? AND user_id = 5", Long.class, tripId));
    }

    @Test
    void anExistingMemberAcceptsAgainWhileClosed() throws Exception {
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 1, joining_closed = 1 WHERE id = ?", tripId);
        mockMvc.perform(post("/api/invitations/" + token + "/accept").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joined").value(true))
                .andExpect(jsonPath("$.alreadyMember").value(true));
    }

    @Test
    void acceptanceWithoutASessionIsRejected() throws Exception {
        mockMvc.perform(post("/api/invitations/" + token + "/accept").with(TestAuth.csrfOnly()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }
}
