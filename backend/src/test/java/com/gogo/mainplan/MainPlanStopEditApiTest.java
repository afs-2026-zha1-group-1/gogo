package com.gogo.mainplan;

import com.gogo.auth.TestAuth;

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

// US-003 D10-D13: stop name/time editing on the current unconfirmed draft.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:main-plan-stop-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class MainPlanStopEditApiTest {

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
        jdbcTemplate.update("UPDATE trip_member SET ready = 1, preference_revision = 1 "
                + "WHERE trip_id = ? AND user_id IN (1, 2, 3, 4)", tripId);
        jdbcTemplate.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'budget'", tripId);
        jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);
    }

    private JsonNode generateDraft() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("1")))
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(201, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MvcResult edit(String userId, int seq, String name, String start, String end) throws Exception {
        String body = "{\"name\":\"" + name + "\",\"startTime\":\"" + start + "\",\"endTime\":\"" + end + "\"}";
        MockHttpServletRequestBuilder request = put("/api/trips/" + tripId + "/main-plan/stops/" + seq)
                .contentType(MediaType.APPLICATION_JSON).content(body);
        if (userId != null) {
            request = request.with(TestAuth.asUser(userId));
        } else {
            request = request.with(TestAuth.csrfOnly());
        }
        return mockMvc.perform(request).andReturn();
    }

    private JsonNode editOk(int seq, String name, String start, String end) throws Exception {
        MvcResult result = edit("1", seq, name, start, end);
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode readPlan() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String code(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();
    }

    @Test
    void organizerEditsAStopBeforeConfirmation() throws Exception {
        JsonNode draft = generateDraft();
        JsonNode edited = editOk(1, "Marina Bay Sands", "09:15", "09:45");
        JsonNode stop = edited.get("stops").get(0);
        org.junit.jupiter.api.Assertions.assertEquals("Marina Bay Sands", stop.get("name").asText());
        org.junit.jupiter.api.Assertions.assertEquals("09:15", stop.get("startTime").asText());
        org.junit.jupiter.api.Assertions.assertEquals("09:45", stop.get("endTime").asText());
        org.junit.jupiter.api.Assertions.assertEquals(draft.get("version").asInt(), edited.get("version").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(draft.get("inputRevisions"), edited.get("inputRevisions"));

        JsonNode read = readPlan();
        org.junit.jupiter.api.Assertions.assertEquals("Marina Bay Sands", read.get("stops").get(0).get("name").asText());
    }

    @Test
    void orderTravelTimeAndTagsCannotBeEdited() throws Exception {
        generateDraft();
        String body = "{\"name\":\"Marina Bay Sands\",\"startTime\":\"09:15\",\"endTime\":\"09:45\","
                + "\"seq\":4,\"travelMinutesToNext\":99,\"interests\":[\"hacked\"]}";
        MvcResult result = mockMvc.perform(put("/api/trips/" + tripId + "/main-plan/stops/1")
                .with(TestAuth.asUser("1")).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        JsonNode stop = objectMapper.readTree(result.getResponse().getContentAsString()).get("stops").get(0);
        org.junit.jupiter.api.Assertions.assertEquals(1, stop.get("seq").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(30, stop.get("travelMinutesToNext").asInt());
        org.junit.jupiter.api.Assertions.assertEquals("culture", stop.get("interests").get(0).asText());
    }

    @Test
    void repeatingTheSameValuesIsIdempotent() throws Exception {
        generateDraft();
        editOk(1, "City Hall MRT", "09:00", "09:30");
        JsonNode again = readPlan();
        org.junit.jupiter.api.Assertions.assertEquals("City Hall MRT", again.get("stops").get(0).get("name").asText());
    }

    @Test
    void blankNameIsRejectedWithoutWrite() throws Exception {
        generateDraft();
        MvcResult result = edit("1", 1, "  ", "09:15", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(400, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NAME_REQUIRED", code(result));
        org.junit.jupiter.api.Assertions.assertEquals("City Hall MRT", readPlan().get("stops").get(0).get("name").asText());
    }

    @Test
    void malformedTimeIsRejectedWithoutWrite() throws Exception {
        generateDraft();
        MvcResult result = edit("1", 1, "Marina Bay Sands", "9:5", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(400, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("INVALID_TIME", code(result));
        org.junit.jupiter.api.Assertions.assertEquals("09:00", readPlan().get("stops").get(0).get("startTime").asText());
    }

    @Test
    void endNotAfterStartIsRejectedWithoutWrite() throws Exception {
        generateDraft();
        MvcResult result = edit("1", 1, "Marina Bay Sands", "10:00", "10:00");
        org.junit.jupiter.api.Assertions.assertEquals(400, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("INVALID_TIME_RANGE", code(result));
    }

    @Test
    void unknownStopIsReportedSeparately() throws Exception {
        generateDraft();
        MvcResult result = edit("1", 99, "Marina Bay Sands", "09:15", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(404, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("STOP_NOT_FOUND", code(result));
    }

    @Test
    void noDraftYetIsReported() throws Exception {
        MvcResult result = edit("1", 1, "Marina Bay Sands", "09:15", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(404, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NO_DRAFT", code(result));
    }

    @Test
    void aConfirmedDraftRejectsEditing() throws Exception {
        generateDraft();
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isOk());
        MvcResult result = edit("1", 1, "Marina Bay Sands", "09:15", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(409, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("ALREADY_CONFIRMED", code(result));
    }

    @Test
    void aNonOrganizerMemberIsDenied() throws Exception {
        generateDraft();
        MvcResult result = edit("2", 1, "Marina Bay Sands", "09:15", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(403, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NOT_ORGANIZER", code(result));
        org.junit.jupiter.api.Assertions.assertEquals("City Hall MRT", readPlan().get("stops").get(0).get("name").asText());
    }

    @Test
    void aNonMemberIsDenied() throws Exception {
        generateDraft();
        MvcResult result = edit("5", 1, "Marina Bay Sands", "09:15", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(403, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NOT_A_MEMBER", code(result));
    }

    @Test
    void unknownTripIsReportedSeparately() throws Exception {
        MvcResult result = mockMvc.perform(put("/api/trips/999999/main-plan/stops/1")
                .with(TestAuth.asUser("1")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"X\",\"startTime\":\"09:00\",\"endTime\":\"09:30\"}")).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(404, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("TRIP_NOT_FOUND", code(result));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        generateDraft();
        MvcResult result = edit(null, 1, "Marina Bay Sands", "09:15", "09:45");
        org.junit.jupiter.api.Assertions.assertEquals(401, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("USER_REQUIRED", code(result));
    }

    @Test
    void editedOverlapsStillBlockConfirmation() throws Exception {
        generateDraft();
        editOk(1, "City Hall MRT", "09:00", "10:30");
        MvcResult confirm = mockMvc.perform(
                post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1"))).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(422, confirm.getResponse().getStatus());
        JsonNode body = objectMapper.readTree(confirm.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals("VALIDATION_FAILED", body.get("code").asText());
        boolean overlap = false;
        for (JsonNode error : body.get("scheduleErrors")) {
            if ("OVERLAP".equals(error.get("type").asText())) {
                overlap = true;
            }
        }
        org.junit.jupiter.api.Assertions.assertTrue(overlap);
    }

    @Test
    void regenerationDiscardsManualEdits() throws Exception {
        generateDraft();
        editOk(1, "Manual Stop", "09:15", "09:45");
        JsonNode regenerated = generateDraft();
        org.junit.jupiter.api.Assertions.assertEquals(2, regenerated.get("version").asInt());
        org.junit.jupiter.api.Assertions.assertEquals("City Hall MRT", regenerated.get("stops").get(0).get("name").asText());
    }
}
