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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// US-003: trip-basics snapshot staleness and the organizer-only trip-detail
// confirmation shortcut that delegates to the validated confirmation.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:main-plan-snapshot-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1",
        "gogo.plan.ai.api-key="
})
@AutoConfigureMockMvc
class MainPlanSnapshotApiTest {

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
    }

    private JsonNode generateDraft() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("1")))
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(201, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode readPlan() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private void updateTrip(String destination, String startLocation, String userId) throws Exception {
        String body = "{\"name\":\"Singapore Friends Day\",\"destination\":\"" + destination + "\","
                + "\"startDate\":\"2026-12-05\",\"endDate\":\"2026-12-05\","
                + "\"startLocation\":\"" + startLocation + "\",\"endLocation\":\"Merlion Park\"}";
        MvcResult result = mockMvc.perform(put("/api/trips/" + tripId).with(TestAuth.asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
    }

    private MvcResult shortcut(String userId) throws Exception {
        return mockMvc.perform(post("/api/trips/" + tripId + "/main-plan:confirm").with(TestAuth.asUser(userId)))
                .andReturn();
    }

    @Test
    void generationWritesTheTripBasicsSnapshot() throws Exception {
        generateDraft();
        String snapshot = jdbcTemplate.queryForObject(
                "SELECT trip_basics_json FROM main_plan_draft WHERE trip_id = ? AND status = 'current'",
                String.class, tripId);
        org.junit.jupiter.api.Assertions.assertTrue(snapshot.contains("\"destination\":\"Singapore\""));
        org.junit.jupiter.api.Assertions.assertTrue(snapshot.contains("\"startLocation\":\"City Hall MRT\""));
        org.junit.jupiter.api.Assertions.assertFalse(snapshot.contains("\"name\""));
    }

    @Test
    void destinationChangeSurfacesStaleness() throws Exception {
        JsonNode draft = generateDraft();
        updateTrip("Bali", "City Hall MRT", "2");
        JsonNode read = readPlan();
        org.junit.jupiter.api.Assertions.assertTrue(read.get("stale").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(draft.get("version").asInt(), read.get("version").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(draft.get("inputRevisions"), read.get("inputRevisions"));
    }

    @Test
    void locationChangeSurfacesStaleness() throws Exception {
        generateDraft();
        updateTrip("Singapore", "HarbourFront", "1");
        org.junit.jupiter.api.Assertions.assertTrue(readPlan().get("stale").asBoolean());
    }

    @Test
    void nameOnlyChangeKeepsTheDraftFresh() throws Exception {
        generateDraft();
        String body = "{\"name\":\"海滨一日\",\"destination\":\"Singapore\","
                + "\"startDate\":\"2026-12-05\",\"endDate\":\"2026-12-05\","
                + "\"startLocation\":\"City Hall MRT\",\"endLocation\":\"Merlion Park\"}";
        org.junit.jupiter.api.Assertions.assertEquals(200, mockMvc.perform(put("/api/trips/" + tripId)
                .with(TestAuth.asUser("1")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertFalse(readPlan().get("stale").asBoolean());
    }

    @Test
    void aDraftWithoutSnapshotIsStaleAndCannotBeConfirmed() throws Exception {
        generateDraft();
        jdbcTemplate.update("UPDATE main_plan_draft SET trip_basics_json = NULL "
                + "WHERE trip_id = ? AND status = 'current'", tripId);
        org.junit.jupiter.api.Assertions.assertTrue(readPlan().get("stale").asBoolean());
        MvcResult confirm = mockMvc.perform(
                post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1"))).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(409, confirm.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("STALE_DRAFT", objectMapper
                .readTree(confirm.getResponse().getContentAsString()).get("code").asText());
    }

    @Test
    void theShortcutIsOrganizerOnly() throws Exception {
        generateDraft();
        MvcResult result = shortcut("2");
        org.junit.jupiter.api.Assertions.assertEquals(403, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NOT_ORGANIZER",
                objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText());
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, tripId));
    }

    @Test
    void theShortcutReportsAMissingDraft() throws Exception {
        MvcResult result = shortcut("1");
        org.junit.jupiter.api.Assertions.assertEquals(404, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("NO_DRAFT",
                objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText());
    }

    @Test
    void theShortcutBlocksAStaleDraft() throws Exception {
        generateDraft();
        updateTrip("Bali", "City Hall MRT", "2");
        MvcResult result = shortcut("1");
        org.junit.jupiter.api.Assertions.assertEquals(409, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("STALE_DRAFT",
                objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText());
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, tripId));
    }

    @Test
    void theShortcutConfirmsAValidDraftAndReturnsTheTrip() throws Exception {
        generateDraft();
        MvcResult result = shortcut("1");
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        JsonNode trip = objectMapper.readTree(result.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(trip.get("mainPlanConfirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertTrue(trip.get("joiningClosed").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", jdbcTemplate.queryForObject(
                "SELECT status FROM main_plan_draft WHERE trip_id = ? AND version = 1", String.class, tripId));
    }

    @Test
    void reconfirmationAfterInvalidationSucceeds() throws Exception {
        generateDraft();
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isOk());
        updateTrip("Bali", "City Hall MRT", "2");
        generateDraft();
        MvcResult confirm = mockMvc.perform(
                post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1"))).andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(200, confirm.getResponse().getStatus());
        JsonNode plan = objectMapper.readTree(confirm.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals(2, plan.get("version").asInt());
        org.junit.jupiter.api.Assertions.assertTrue(plan.get("confirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT joining_closed FROM trip WHERE id = ?", Integer.class, tripId));
    }

    @Test
    void confirmedPlanStaysFrozenAfterARevisionBump() throws Exception {
        generateDraft();
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isOk());
        jdbcTemplate.update("UPDATE trip_member SET preference_revision = 2 WHERE trip_id = ? AND user_id = 2",
                tripId);
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmed").value(true))
                .andExpect(jsonPath("$.stale").value(false));
    }
}
