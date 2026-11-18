package com.gogo.hello.splits;

import com.gogo.auth.TestAuth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;

// US-051: the organizer cancels a confirmed split before departure.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:split-cancel-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class SplitConfirmedCancelApiTest {

    private static final String FUTURE_STOP = "future-departure";
    private static final String PAST_STOP = "past-departure";
    private static final String NO_TIME_STOP = "no-time-departure";
    private static final String REUNION_STOP = "reunion-stop";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long tripId;

    @BeforeEach
    void resetFixtureState() {
        tripId = jdbcTemplate.queryForObject("SELECT MIN(id) FROM trip", Long.class);
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 1, joining_closed = 1 WHERE id = ?", tripId);
        jdbcTemplate.update("DELETE FROM split_draft WHERE trip_id = ?", tripId);
        jdbcTemplate.update("DELETE FROM plan_node WHERE trip_id = ? AND branch_id IN ('split-a', 'split-b')",
                tripId);
        jdbcTemplate.update("DELETE FROM plan_node WHERE trip_id = ? AND id IN (?, ?, ?, ?)",
                tripId, FUTURE_STOP, PAST_STOP, NO_TIME_STOP, REUNION_STOP);
        insertStop(FUTURE_STOP, "2030-01-01T01:00:00Z", "2030-01-01T01:30:00Z", 10);
        insertStop(PAST_STOP, "2020-01-01T01:00:00Z", "2020-01-01T01:30:00Z", 11);
        insertStop(NO_TIME_STOP, null, null, 12);
        insertStop(REUNION_STOP, "2030-01-01T04:00:00Z", "2030-01-01T04:30:00Z", 13);
    }

    private void insertStop(String id, String startAt, String endAt, int sortOrder) {
        jdbcTemplate.update("INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, "
                        + "title, start_at, end_at, location_name, lat, lng, sort_order, created_at) "
                        + "VALUES (?, ?, 1, NULL, 'main', 'stop', ?, ?, ?, ?, NULL, NULL, ?, '2026-11-17T00:00:00Z')",
                id, tripId, id, startAt, endAt, id, sortOrder);
    }

    private void insertDraft(String status, String departureStopId, int draftVersion) {
        String document = "{\"initiatorMemberId\":\"1\",\"mainPlanVersion\":1,\"draftVersion\":" + draftVersion
                + ",\"status\":\"" + status + "\",\"departureStopId\":"
                + (departureStopId == null ? "null" : "\"" + departureStopId + "\"")
                + ",\"reunionStopId\":\"" + REUNION_STOP + "\","
                + "\"groups\":{\"A\":[\"1\",\"2\"],\"B\":[\"3\",\"4\"]},\"routes\":null,"
                + "\"createdAt\":\"2026-11-17T00:00:00Z\",\"updatedAt\":\"2026-11-17T00:00:00Z\"}";
        jdbcTemplate.update("INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at) "
                + "VALUES ('split-fixture', ?, ?, ?, '2026-11-17T00:00:00Z', '2026-11-17T00:00:00Z')",
                tripId, document, draftVersion);
        jdbcTemplate.update("INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, "
                        + "title, start_at, end_at, location_name, lat, lng, sort_order, created_at) "
                        + "VALUES ('split-a-node', ?, 1, NULL, 'split-a', 'activity', 'Zoo', "
                        + "'2030-01-01T01:30:00Z', '2030-01-01T04:00:00Z', 'Zoo', NULL, NULL, 1, "
                        + "'2026-11-17T00:00:00Z'), ('split-b-node', ?, 1, NULL, 'split-b', 'activity', 'Museum', "
                        + "'2030-01-01T01:30:00Z', '2030-01-01T04:00:00Z', 'Museum', NULL, NULL, 2, "
                        + "'2026-11-17T00:00:00Z')", tripId, tripId);
    }

    private MvcResult cancel(String userId, int draftVersion) throws Exception {
        String body = "{\"draftVersion\":" + draftVersion + "}";
        if (userId == null) {
            return mockMvc.perform(post("/api/trips/" + tripId + "/split:cancel")
                    .with(TestAuth.csrfOnly()).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
        }
        return mockMvc.perform(post("/api/trips/" + tripId + "/split:cancel")
                .with(TestAuth.asUser(userId)).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
    }

    private String errorCode(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("error").get("code").asText();
    }

    private String draftStatus() {
        return jdbcTemplate.queryForObject(
                "SELECT json_extract(document, '$.status') FROM split_draft WHERE trip_id = ?",
                String.class, tripId);
    }

    private long splitNodeCount() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM plan_node "
                + "WHERE trip_id = ? AND branch_id IN ('split-a', 'split-b')", Long.class, tripId);
    }

    private long mainNodeCount() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ? AND branch_id = 'main'", Long.class, tripId);
    }

    @Test
    void organizerCancelsAConfirmedSplitBeforeDeparture() throws Exception {
        insertDraft("confirmed", FUTURE_STOP, 3);
        long mainBefore = mainNodeCount();
        MvcResult result = cancel("1", 3);
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("cancelled", draftStatus());
        org.junit.jupiter.api.Assertions.assertEquals(0, splitNodeCount());
        org.junit.jupiter.api.Assertions.assertEquals(mainBefore, mainNodeCount());
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, tripId));
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT joining_closed FROM trip WHERE id = ?", Integer.class, tripId));

        MvcResult replacement = mockMvc.perform(post("/api/trips/" + tripId + "/split-draft")
                .with(TestAuth.asUser("1"))).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(201, replacement.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("active", objectMapper
                .readTree(replacement.getResponse().getContentAsString()).get("data").get("status").asText());
        org.junit.jupiter.api.Assertions.assertEquals(1, objectMapper
                .readTree(replacement.getResponse().getContentAsString()).get("data").get("draftVersion").asInt());
    }

    @Test
    void aNonOrganizerMemberCannotCancel() throws Exception {
        insertDraft("confirmed", FUTURE_STOP, 3);
        MvcResult result = cancel("2", 3);
        org.junit.jupiter.api.Assertions.assertEquals(403, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NOT_SPLIT_ORGANIZER", errorCode(result));
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus());
    }

    @Test
    void aNonMemberCannotCancel() throws Exception {
        insertDraft("confirmed", FUTURE_STOP, 3);
        MvcResult result = cancel("5", 3);
        org.junit.jupiter.api.Assertions.assertEquals(403, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NOT_A_MEMBER", errorCode(result));
    }

    @Test
    void cancellationAfterDepartureIsRejected() throws Exception {
        insertDraft("confirmed", PAST_STOP, 3);
        MvcResult result = cancel("1", 3);
        org.junit.jupiter.api.Assertions.assertEquals(409, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("SPLIT_ALREADY_DEPARTED", errorCode(result));
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus());
    }

    @Test
    void onlyAConfirmedSplitCanUseThisEndpoint() throws Exception {
        insertDraft("active", FUTURE_STOP, 3);
        MvcResult result = cancel("1", 3);
        org.junit.jupiter.api.Assertions.assertEquals(409, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("SPLIT_DRAFT_NOT_ACTIVE", errorCode(result));
    }

    @Test
    void aCancelledSplitCannotBeCancelledAgain() throws Exception {
        insertDraft("cancelled", FUTURE_STOP, 3);
        MvcResult result = cancel("1", 3);
        org.junit.jupiter.api.Assertions.assertEquals(409, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("SPLIT_DRAFT_NOT_ACTIVE", errorCode(result));
    }

    @Test
    void aStaleDraftVersionIsRejected() throws Exception {
        insertDraft("confirmed", FUTURE_STOP, 3);
        MvcResult result = cancel("1", 2);
        org.junit.jupiter.api.Assertions.assertEquals(409, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("STALE_DRAFT_VERSION", errorCode(result));
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus());
    }

    @Test
    void aMissingDepartureTimeCountsAsNotDeparted() throws Exception {
        insertDraft("confirmed", NO_TIME_STOP, 3);
        MvcResult result = cancel("1", 3);
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("cancelled", draftStatus());
    }

    @Test
    void anAnonymousRequestIsRejectedByTheSplitsGuard() throws Exception {
        insertDraft("confirmed", FUTURE_STOP, 3);
        MvcResult result = cancel(null, 3);
        org.junit.jupiter.api.Assertions.assertEquals(401, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("MEMBER_REQUIRED", errorCode(result));
    }

    @Test
    void cancelKeepsTheConfirmedMainPlanAndMembership() throws Exception {
        insertDraft("confirmed", FUTURE_STOP, 3);
        jdbcTemplate.update("INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, "
                        + "input_revisions_json, trip_basics_json) VALUES (?, 1, 'confirmed', 5000, "
                        + "'[{\"userId\":1,\"revision\":1}]', NULL)", tripId);
        long membersBefore = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ?", Long.class, tripId);
        cancel("1", 3);
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertEquals(membersBefore, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ?", Long.class, tripId));
    }
}
