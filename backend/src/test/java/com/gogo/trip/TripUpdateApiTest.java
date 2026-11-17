package com.gogo.trip;

import com.gogo.auth.TestAuth;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// US-003 (issue #60): trip basic-info update contract — planning fields member-writable,
// name organizer-only, split gate, plan invalidation and the joiningClosed split.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:trip-update-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class TripUpdateApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long tripId;

    @BeforeEach
    void resetFixtureState() {
        tripId = jdbcTemplate.queryForObject("SELECT MIN(id) FROM trip", Long.class);
        jdbcTemplate.update("UPDATE trip SET name = 'Singapore Friends Day', destination = 'Singapore', "
                + "start_date = '2026-12-05', end_date = '2026-12-05', start_location = 'City Hall MRT', "
                + "end_location = 'Merlion Park', main_plan_confirmed = 0, joining_closed = 0 WHERE id = ?", tripId);
        jdbcTemplate.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbcTemplate.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbcTemplate.update("DELETE FROM split_draft WHERE trip_id = ?", tripId);
        jdbcTemplate.update("UPDATE trip_member SET ready = 1, preference_revision = 1 "
                + "WHERE trip_id = ? AND user_id IN (1, 2, 3, 4)", tripId);
        jdbcTemplate.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'budget'", tripId);
        jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);
    }

    private static String body(String name, String destination, String start, String end,
            String startLocation, String endLocation) {
        return "{\"name\":\"" + name + "\",\"destination\":\"" + destination + "\","
                + "\"startDate\":\"" + start + "\",\"endDate\":\"" + end + "\","
                + "\"startLocation\":\"" + startLocation + "\",\"endLocation\":\"" + endLocation + "\"}";
    }

    private static String defaultBody() {
        return body("Singapore Friends Day", "Singapore", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park");
    }

    private MvcResult update(String userId, String content) throws Exception {
        return mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(content)).andReturn();
    }

    private JsonNode updateOk(String userId, String content) throws Exception {
        MvcResult result = update(userId, content);
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MvcResult readTrip(String userId) throws Exception {
        return mockMvc.perform(get("/api/trips/" + tripId).with(TestAuth.asUser(userId))).andReturn();
    }

    private JsonNode generateDraft() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("1")))
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(201, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private void confirmPlan() throws Exception {
        MvcResult result = mockMvc.perform(
                post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1"))).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
    }

    private void insertSplit(String status) {
        String document = "{\"initiatorMemberId\":\"2\",\"mainPlanVersion\":1,\"draftVersion\":3,"
                + "\"status\":\"" + status + "\",\"departureStopId\":null,\"reunionStopId\":null,"
                + "\"groups\":{},\"routes\":null,\"createdAt\":\"2026-11-17T00:00:00Z\","
                + "\"updatedAt\":\"2026-11-17T00:00:00Z\"}";
        jdbcTemplate.update("INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at) "
                + "VALUES ('split-fixture', ?, ?, 3, '2026-11-17T00:00:00Z', '2026-11-17T00:00:00Z')",
                tripId, document);
    }

    private String draftStatus(int version) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM main_plan_draft WHERE trip_id = ? AND version = ?",
                String.class, tripId, version);
    }

    @Test
    void organizerUpdatesAllSixFieldsBeforeConfirmation() throws Exception {
        JsonNode updated = updateOk("1", body("海边周末游", "Bali", "2026-12-10", "2026-12-12",
                "HarbourFront", "Changi Airport"));
        org.junit.jupiter.api.Assertions.assertEquals("海边周末游", updated.get("name").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Bali", updated.get("destination").asText());
        org.junit.jupiter.api.Assertions.assertEquals(1, updated.get("organizerId").asLong());
        org.junit.jupiter.api.Assertions.assertFalse(updated.get("mainPlanConfirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertFalse(updated.get("joiningClosed").asBoolean());

        JsonNode read = objectMapper.readTree(readTrip("2").getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals("海边周末游", read.get("name").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Bali", read.get("destination").asText());
        org.junit.jupiter.api.Assertions.assertEquals("HarbourFront", read.get("startLocation").asText());
    }

    @Test
    void anyMemberUpdatesPlanningBasics() throws Exception {
        JsonNode updated = updateOk("2", body("Singapore Friends Day", "Bali", "2026-12-10", "2026-12-12",
                "City Hall MRT", "Merlion Park"));
        org.junit.jupiter.api.Assertions.assertEquals("Singapore Friends Day", updated.get("name").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Bali", updated.get("destination").asText());
        org.junit.jupiter.api.Assertions.assertEquals(1, updated.get("organizerId").asLong());
    }

    @Test
    void nonOrganizerCannotChangeTheName() throws Exception {
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("2"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Renamed", "Singapore", "2026-12-05", "2026-12-05",
                                "City Hall MRT", "Merlion Park")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ORGANIZER"));
        JsonNode read = objectMapper.readTree(readTrip("1").getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals("Singapore Friends Day", read.get("name").asText());
    }

    @Test
    void nameOnlyOrganizerEditKeepsTheConfirmedPlan() throws Exception {
        generateDraft();
        confirmPlan();
        JsonNode updated = updateOk("1", body("海滨一日", "Singapore", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park"));
        org.junit.jupiter.api.Assertions.assertTrue(updated.get("mainPlanConfirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertTrue(updated.get("joiningClosed").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus(1));
    }

    @Test
    void planningEditAfterConfirmationResetsThePlan() throws Exception {
        generateDraft();
        confirmPlan();
        JsonNode updated = updateOk("2", body("Singapore Friends Day", "Bali", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park"));
        org.junit.jupiter.api.Assertions.assertFalse(updated.get("mainPlanConfirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertTrue(updated.get("joiningClosed").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals("superseded", draftStatus(1));
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NO_DRAFT"));
    }

    @Test
    void planningEditWhileDraftExistsMarksTheDraftStale() throws Exception {
        JsonNode draft = generateDraft();
        updateOk("2", body("Singapore Friends Day", "Bali", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park"));
        JsonNode read = objectMapper.readTree(
                mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                        .andReturn().getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(read.get("stale").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(draft.get("version").asInt(), read.get("version").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(draft.get("inputRevisions"), read.get("inputRevisions"));
    }

    @Test
    void nameOnlyEditLeavesAnUnconfirmedDraftFresh() throws Exception {
        generateDraft();
        updateOk("1", body("新名字", "Singapore", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park"));
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stale").value(false));
    }

    @Test
    void activeSplitDraftBlocksPlanningEdits() throws Exception {
        insertSplit("active");
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("2"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Singapore Friends Day", "Bali", "2026-12-05", "2026-12-05",
                                "City Hall MRT", "Merlion Park")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SPLIT_DRAFT_ACTIVE"));
        JsonNode read = objectMapper.readTree(readTrip("1").getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals("Singapore", read.get("destination").asText());
    }

    @Test
    void confirmedSplitBlocksPlanningEdits() throws Exception {
        insertSplit("confirmed");
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Singapore Friends Day", "Bali", "2026-12-05", "2026-12-05",
                                "City Hall MRT", "Merlion Park")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SPLIT_CONFIRMED"));
    }

    @Test
    void splitGateDoesNotBlockANameOnlyEdit() throws Exception {
        insertSplit("active");
        JsonNode updated = updateOk("1", body("新名字", "Singapore", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park"));
        org.junit.jupiter.api.Assertions.assertEquals("新名字", updated.get("name").asText());
        org.junit.jupiter.api.Assertions.assertEquals("active",
                jdbcTemplate.queryForObject(
                        "SELECT json_extract(document, '$.status') FROM split_draft WHERE trip_id = ?",
                        String.class, tripId));
    }

    @Test
    void startDateMayEqualEndDate() throws Exception {
        JsonNode updated = updateOk("1", body("Singapore Friends Day", "Singapore", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park"));
        org.junit.jupiter.api.Assertions.assertEquals("2026-12-05", updated.get("endDate").asText());
    }

    @Test
    void invertedDateRangeIsRejected() throws Exception {
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Singapore Friends Day", "Singapore", "2026-12-06", "2026-12-05",
                                "City Hall MRT", "Merlion Park")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
        JsonNode read = objectMapper.readTree(readTrip("1").getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals("2026-12-05", read.get("startDate").asText());
    }

    @Test
    void blankNameIsRejected() throws Exception {
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("  ", "Singapore", "2026-12-05", "2026-12-05",
                                "City Hall MRT", "Merlion Park")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NAME_REQUIRED"));
    }

    @Test
    void blankDestinationIsRejected() throws Exception {
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("2"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Singapore Friends Day", " ", "2026-12-05", "2026-12-05",
                                "City Hall MRT", "Merlion Park")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DESTINATION_REQUIRED"));
    }

    @Test
    void malformedDateIsRejected() throws Exception {
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Singapore Friends Day", "Singapore", "12-05-2026", "2026-12-05",
                                "City Hall MRT", "Merlion Park")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE"));
    }

    @Test
    void locationsCanBeClearedBackToUnset() throws Exception {
        JsonNode updated = updateOk("2", body("Singapore Friends Day", "Singapore", "2026-12-05", "2026-12-05",
                "", ""));
        org.junit.jupiter.api.Assertions.assertTrue(updated.get("startLocation").isNull());
        org.junit.jupiter.api.Assertions.assertTrue(updated.get("endLocation").isNull());
        mockMvc.perform(get("/api/trips/" + tripId).with(TestAuth.asUser("1")))
                .andExpect(jsonPath("$.startLocation").value(nullValue()))
                .andExpect(jsonPath("$.endLocation").value(nullValue()));
    }

    @Test
    void nonMemberIsDenied() throws Exception {
        mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser("5"))
                        .contentType(MediaType.APPLICATION_JSON).content(defaultBody()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"))
                .andExpect(jsonPath("$.name").doesNotExist());
    }

    @Test
    void unknownTripIsReportedSeparately() throws Exception {
        mockMvc.perform(put("/api/trips/999999").with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON).content(defaultBody()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void repeatingSavedValuesIsIdempotent() throws Exception {
        generateDraft();
        confirmPlan();
        JsonNode updated = updateOk("2", defaultBody());
        org.junit.jupiter.api.Assertions.assertTrue(updated.get("mainPlanConfirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus(1));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        MockHttpServletRequestBuilder request = put("/api/trips/" + tripId)
                .contentType(MediaType.APPLICATION_JSON).content(defaultBody())
                .with(TestAuth.csrfOnly());
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void retiredIdentityHeaderDoesNotAuthenticate() throws Exception {
        mockMvc.perform(put("/api/trips/" + tripId).header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON).content(defaultBody())
                        .with(TestAuth.csrfOnly()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }
}
