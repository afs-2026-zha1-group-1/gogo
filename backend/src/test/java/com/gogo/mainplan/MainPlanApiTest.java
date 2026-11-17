package com.gogo.mainplan;

import com.gogo.auth.TestAuth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// US-031-037: fixtures M1-M14, V1-V7, M-N/V-N identity/trip negatives and the
// API halves of the ATDD §5 reverse checks. Test-only JDBC flips follow the
// fixtures "State setup" table; the fake provider is the real MVP provider.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:main-plan-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class MainPlanApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long tripId;

    @BeforeEach
    void resetFixtureState() {
        tripId = jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
        jdbcTemplate.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbcTemplate.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbcTemplate.update("UPDATE trip_member SET ready = 1, preference_revision = 1 "
                + "WHERE trip_id = ? AND user_id IN (1, 2, 3, 4)", tripId);
        jdbcTemplate.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'budget'", tripId);
        // A submission row now also projects readiness, so it must not leak between tests.
        jdbcTemplate.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'submission'", tripId);
        jdbcTemplate.update("UPDATE trip SET start_location = 'City Hall MRT', "
                + "end_location = 'Merlion Park', main_plan_confirmed = 0 WHERE id = ?", tripId);
        jdbcTemplate.update("DELETE FROM trip_invitation WHERE trip_id = ?", tripId);
        jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);
    }

    // ---- request helpers ----

    private MockHttpServletRequestBuilder withIdentity(MockHttpServletRequestBuilder request, String userId) {
        return request.with(TestAuth.asUser(userId));
    }

    private MvcResult generate(String userId) throws Exception {
        return mockMvc.perform(withIdentity(post("/api/trips/" + tripId + "/main-plan"), userId)).andReturn();
    }

    private MvcResult confirm(String userId) throws Exception {
        return mockMvc.perform(withIdentity(post("/api/trips/" + tripId + "/main-plan/confirm"), userId)).andReturn();
    }

    private MvcResult readPlan(String userId) throws Exception {
        return mockMvc.perform(withIdentity(get("/api/trips/" + tripId + "/main-plan"), userId)).andReturn();
    }

    private MvcResult readInputs(String userId) throws Exception {
        return mockMvc.perform(withIdentity(get("/api/trips/" + tripId + "/main-plan/inputs"), userId)).andReturn();
    }

    private JsonNode generateOk() throws Exception {
        MvcResult result = generate("1");
        org.junit.jupiter.api.Assertions.assertEquals(201, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode confirmOk() throws Exception {
        MvcResult result = confirm("1");
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    // ---- stored-state helpers ----

    private long draftCount() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM main_plan_draft WHERE trip_id = ?", Long.class, tripId);
    }

    private String draftStatus(int version) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM main_plan_draft WHERE trip_id = ? AND version = ?",
                String.class, tripId, version);
    }

    private long currentDraftId() {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM main_plan_draft WHERE trip_id = ? AND status = 'current'", Long.class, tripId);
    }

    private boolean tripConfirmed() {
        Integer flag = jdbcTemplate.queryForObject(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, tripId);
        return flag != null && flag == 1;
    }

    private List<Map<String, Object>> preferenceSnapshot() {
        return jdbcTemplate.queryForList(
                "SELECT id, trip_id, user_id, kind, payload, updated_at FROM member_preference "
                        + "WHERE trip_id = ? ORDER BY id", tripId);
    }

    // ---- test-only flips (fixtures "State setup"; no product write path) ----

    private void setReady(long userId, boolean ready) {
        jdbcTemplate.update("UPDATE trip_member SET ready = ? WHERE trip_id = ? AND user_id = ?",
                ready ? 1 : 0, tripId, userId);
    }

    private void bumpRevision(long userId, int revision) {
        jdbcTemplate.update("UPDATE trip_member SET preference_revision = ? WHERE trip_id = ? AND user_id = ?",
                revision, tripId, userId);
    }

    private void insertBudget(long userId, int amountYuan, String limitType) {
        jdbcTemplate.update("INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
                + "VALUES (?, ?, 'budget', ?, datetime('now'))",
                tripId, userId,
                "{\"amount\":" + amountYuan + ",\"currency\":\"SGD\",\"limitType\":\"" + limitType + "\"}");
    }

    private void nullLocations() {
        jdbcTemplate.update("UPDATE trip SET start_location = NULL, end_location = NULL WHERE id = ?", tripId);
    }

    private void mutateStop(int seq, String column, Object value) {
        jdbcTemplate.update("UPDATE main_plan_stop SET " + column + " = ? WHERE draft_id = ? AND seq = ?",
                value, currentDraftId(), seq);
    }

    // M1/G1: all four members ready -> 201 draft v1 with the fixture projection.
    @Test
    void allReadyMembersGenerateDraftVersionOne() throws Exception {
        MvcResult result = generate("1");
        org.junit.jupiter.api.Assertions.assertEquals(201, result.getResponse().getStatus());
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.confirmed").value(false))
                .andExpect(jsonPath("$.stale").value(false))
                .andExpect(jsonPath("$.costPerPersonCents").value(5000))
                .andExpect(jsonPath("$.inputRevisions.length()").value(4))
                .andExpect(jsonPath("$.inputRevisions[0].userId").value(1))
                .andExpect(jsonPath("$.inputRevisions[0].revision").value(1))
                .andExpect(jsonPath("$.inputRevisions[3].userId").value(4))
                .andExpect(jsonPath("$.inputRevisions[3].revision").value(1))
                .andExpect(jsonPath("$.stops.length()").value(4))
                .andExpect(jsonPath("$.stops[0].seq").value(1))
                .andExpect(jsonPath("$.stops[0].name").value("City Hall MRT"))
                .andExpect(jsonPath("$.stops[0].startTime").value("09:00"))
                .andExpect(jsonPath("$.stops[0].endTime").value("09:30"))
                .andExpect(jsonPath("$.stops[0].travelMinutesToNext").value(30))
                .andExpect(jsonPath("$.stops[1].name").value("National Gallery Singapore"))
                .andExpect(jsonPath("$.stops[1].startTime").value("10:00"))
                .andExpect(jsonPath("$.stops[1].endTime").value("10:30"))
                .andExpect(jsonPath("$.stops[1].travelMinutesToNext").value(30))
                .andExpect(jsonPath("$.stops[2].name").value("Gardens by the Bay"))
                .andExpect(jsonPath("$.stops[2].startTime").value("11:00"))
                .andExpect(jsonPath("$.stops[2].endTime").value("11:15"))
                .andExpect(jsonPath("$.stops[2].travelMinutesToNext").value(15))
                .andExpect(jsonPath("$.stops[3].name").value("Merlion Park"))
                .andExpect(jsonPath("$.stops[3].startTime").value("11:30"))
                .andExpect(jsonPath("$.stops[3].endTime").value("12:00"))
                .andExpect(jsonPath("$.stops[3].travelMinutesToNext").doesNotExist());
        org.junit.jupiter.api.Assertions.assertEquals(1, draftCount());
        org.junit.jupiter.api.Assertions.assertEquals("current", draftStatus(1));
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // M2/G2: a pending member blocks generation and is named in the detail.
    @Test
    void pendingMemberBlocksGeneration() throws Exception {
        setReady(4, false);
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBERS_NOT_READY"))
                .andExpect(jsonPath("$.pendingMembers.length()").value(1))
                .andExpect(jsonPath("$.pendingMembers[0].userId").value(4))
                .andExpect(jsonPath("$.pendingMembers[0].displayName").value("Daniel"));
        org.junit.jupiter.api.Assertions.assertEquals(0, draftCount());
    }

    // M3/G3a: null locations are completed at generation (preferences first:
    // start = first nonblank by user id order = Alice's Merlion Park, end =
    // last = Daniel's City Hall MRT).
    @Test
    void nullLocationsAreCompletedAtGeneration() throws Exception {
        nullLocations();
        generateOk();
        mockMvc.perform(get("/api/trips/" + tripId).with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startLocation").value("Merlion Park"))
                .andExpect(jsonPath("$.endLocation").value("City Hall MRT"));
    }

    // M3/G3b: supplied nonblank locations are preserved unchanged.
    @Test
    void suppliedLocationsArePreserved() throws Exception {
        generateOk();
        mockMvc.perform(get("/api/trips/" + tripId).with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startLocation").value("City Hall MRT"))
                .andExpect(jsonPath("$.endLocation").value("Merlion Park"));
    }

    // M4/G4: a member who is not the organizer cannot generate.
    @Test
    void nonOrganizerCannotGenerate() throws Exception {
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ORGANIZER"));
        org.junit.jupiter.api.Assertions.assertEquals(0, draftCount());
    }

    // M5/G5: regeneration creates version 2 and supersedes version 1.
    @Test
    void regenerationSupersedesPreviousDraft() throws Exception {
        generateOk();
        MvcResult second = generate("1");
        org.junit.jupiter.api.Assertions.assertEquals(201, second.getResponse().getStatus());
        JsonNode body = objectMapper.readTree(second.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals(2, body.get("version").asInt());
        org.junit.jupiter.api.Assertions.assertEquals("superseded", draftStatus(1));
        org.junit.jupiter.api.Assertions.assertEquals("current", draftStatus(2));
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));
    }

    // M14/G6: generation after confirmation is rejected without a new draft.
    @Test
    void generationAfterConfirmationIsRejected() throws Exception {
        generateOk();
        confirmOk();
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_CONFIRMED"));
        org.junit.jupiter.api.Assertions.assertEquals(1, draftCount());
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus(1));
    }

    // M6/I1: a member reads the inputs summary with the full wire field set.
    @Test
    void memberReadsInputsSummary() throws Exception {
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan/inputs").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId))
                .andExpect(jsonPath("$.readyCount").value(4))
                .andExpect(jsonPath("$.memberCount").value(4))
                .andExpect(jsonPath("$.members.length()").value(4))
                .andExpect(jsonPath("$.members[0].userId").value(1))
                .andExpect(jsonPath("$.members[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.members[0].ready").value(true))
                .andExpect(jsonPath("$.members[0].preferenceRevision").value(1))
                .andExpect(jsonPath("$.members[3].displayName").value("Daniel"))
                .andExpect(jsonPath("$.commonInterests.length()").value(2))
                .andExpect(jsonPath("$.commonInterests[0]").value("food"))
                .andExpect(jsonPath("$.commonInterests[1]").value("culture"))
                .andExpect(jsonPath("$.mustDo.length()").value(4))
                .andExpect(jsonPath("$.budgets.length()").value(4))
                .andExpect(jsonPath("$.budgets[0].userId").value(1))
                .andExpect(jsonPath("$.budgets[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.budgets[0].hardBudgetCents").doesNotExist())
                .andExpect(jsonPath("$.rules.length()").value(6))
                .andExpect(jsonPath("$.rules[0]").value("ALL_MEMBERS_READY"))
                .andExpect(jsonPath("$.rules[1]").value("SUPPLIED_ACTIVITY_TIMES"))
                .andExpect(jsonPath("$.rules[2]").value("TRAVEL_LEGS_BETWEEN_STOPS"))
                .andExpect(jsonPath("$.rules[3]").value("HARD_BUDGET_RESPECTED"))
                .andExpect(jsonPath("$.rules[4]").value("STALE_DRAFT_BLOCKS_CONFIRM"))
                .andExpect(jsonPath("$.rules[5]").value("LOCATION_COMPLETION_AT_GENERATION"));
    }

    // M7/I2: the inputs summary is readable before any draft exists.
    @Test
    void inputsReadableBeforeAnyDraft() throws Exception {
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan/inputs").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readyCount").value(4))
                .andExpect(jsonPath("$.memberCount").value(4));
        org.junit.jupiter.api.Assertions.assertEquals(0, draftCount());
    }

    // US-026 projection: the real submission action is what marks a member ready for generation,
    // and a member who chose "no preference" is ready while contributing no personal values.
    @Test
    void submissionProjectsReadinessIntoInputs() throws Exception {
        jdbcTemplate.update("UPDATE trip_member SET ready = 0, preference_revision = 0 "
                + "WHERE trip_id = ? AND user_id = 1", tripId);
        mockMvc.perform(withIdentity(put("/api/trips/" + tripId + "/preferences/submission")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"noPreference\":true}"), "1"))
                .andExpect(status().isOk());
        mockMvc.perform(withIdentity(get("/api/trips/" + tripId + "/main-plan/inputs"), "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[0].userId").value(1))
                .andExpect(jsonPath("$.members[0].ready").value(true))
                .andExpect(jsonPath("$.members[0].noPreference").value(true))
                .andExpect(jsonPath("$.members[0].preferenceRevision").value(1))
                .andExpect(jsonPath("$.budgets[0].userId").value(1))
                .andExpect(jsonPath("$.budgets[0].amount").doesNotExist());
    }

    // M8/I3: a non-member is denied the inputs summary.
    @Test
    void nonMemberDeniedInputs() throws Exception {
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan/inputs").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
    }

    // M9: a member reads the current draft with the full plan projection.
    @Test
    void memberReadsCurrentDraft() throws Exception {
        generateOk();
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.confirmed").value(false))
                .andExpect(jsonPath("$.stale").value(false))
                .andExpect(jsonPath("$.costPerPersonCents").value(5000))
                .andExpect(jsonPath("$.inputRevisions.length()").value(4))
                .andExpect(jsonPath("$.stops.length()").value(4))
                .andExpect(jsonPath("$.stops[0].startTime").value("09:00"))
                .andExpect(jsonPath("$.stops[3].travelMinutesToNext").doesNotExist());
    }

    // M10: a revision bump surfaces staleness without changing the draft.
    @Test
    void revisionBumpSurfacesStaleness() throws Exception {
        generateOk();
        bumpRevision(2, 2);
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.stale").value(true))
                .andExpect(jsonPath("$.confirmed").value(false))
                .andExpect(jsonPath("$.inputRevisions[1].userId").value(2))
                .andExpect(jsonPath("$.inputRevisions[1].revision").value(1));
    }

    // M11: reading before any generation reports NO_DRAFT.
    @Test
    void draftReadWithoutDraftIsNotFound() throws Exception {
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NO_DRAFT"));
    }

    // M12: after confirmation the read returns the same version, confirmed.
    @Test
    void confirmedPlanRead() throws Exception {
        generateOk();
        confirmOk();
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.confirmed").value(true))
                .andExpect(jsonPath("$.stale").value(false));
        org.junit.jupiter.api.Assertions.assertEquals(1, draftCount());
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus(1));
    }

    // M13: the confirmed version stays frozen after a later revision bump.
    @Test
    void confirmedPlanStaysFrozenAfterRevisionBump() throws Exception {
        generateOk();
        confirmOk();
        bumpRevision(2, 2);
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.confirmed").value(true))
                .andExpect(jsonPath("$.stale").value(false));
    }

    // V1/C1: valid draft confirmed, joining closed (full product path incl. J4).
    @Test
    void validDraftConfirmedAndJoiningCloses() throws Exception {
        generateOk();
        MvcResult result = confirm("1");
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals(1, body.get("version").asInt());
        org.junit.jupiter.api.Assertions.assertTrue(body.get("confirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertFalse(body.get("stale").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(5000, body.get("costPerPersonCents").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(4, body.get("stops").size());
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus(1));
        org.junit.jupiter.api.Assertions.assertTrue(tripConfirmed());
        // J4 closure through the real invitation endpoints.
        MvcResult issue = mockMvc.perform(post("/api/trips/" + tripId + "/invitation").with(TestAuth.asUser("1")))
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(200, issue.getResponse().getStatus());
        String token = objectMapper.readTree(issue.getResponse().getContentAsString()).get("token").asText();
        mockMvc.perform(post("/api/invitations/" + token + "/accept").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("JOINING_CLOSED"));
    }

    // V2/C2: a hard-budget overrun blocks confirmation with the overrun detail.
    @Test
    void hardBudgetOverrunBlocksConfirmation() throws Exception {
        generateOk();
        // The member stores 40 SGD (major units); the draft costs 50 SGD = 5000 cents.
        insertBudget(1, 40, "hard");
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.overruns.length()").value(1))
                .andExpect(jsonPath("$.overruns[0].userId").value(1))
                .andExpect(jsonPath("$.overruns[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.overruns[0].hardBudgetCents").value(4000))
                .andExpect(jsonPath("$.overruns[0].overrunCents").value(1000))
                .andExpect(jsonPath("$.scheduleErrors.length()").value(0));
        org.junit.jupiter.api.Assertions.assertEquals("current", draftStatus(1));
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V3/C3: out-of-order start times block with the offending seq.
    @Test
    void outOfOrderStopsBlockConfirmation() throws Exception {
        generateOk();
        mutateStop(2, "start_local", "08:00");
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[?(@.type == 'OUT_OF_ORDER' && @.seq == 2)]").exists())
                .andExpect(jsonPath("$.overruns.length()").value(0));
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V3/C3: overlapping stops block with the offending seq.
    @Test
    void overlappingStopsBlockConfirmation() throws Exception {
        generateOk();
        mutateStop(2, "start_local", "09:15");
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[?(@.type == 'OVERLAP' && @.seq == 2)]").exists());
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V3/C3: a missing travel leg on a non-last stop blocks.
    @Test
    void missingTravelLegBlocksConfirmation() throws Exception {
        generateOk();
        mutateStop(1, "travel_minutes_to_next", null);
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[?(@.type == 'MISSING_LEG' && @.seq == 1)]").exists());
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V3/C3: a leg longer than the gap blocks; the leg-carrying stop is offending.
    @Test
    void travelExceedingGapBlocksConfirmation() throws Exception {
        generateOk();
        mutateStop(1, "travel_minutes_to_next", 45);
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[?(@.type == 'TRAVEL_EXCEEDS_GAP' && @.seq == 1)]").exists());
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V3/C3: a stop outside the trip day window blocks.
    @Test
    void outOfDayStopBlocksConfirmation() throws Exception {
        generateOk();
        mutateStop(3, "start_local", "25:00");
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[?(@.type == 'OUT_OF_DAY' && @.seq == 3)]").exists());
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V4/C4: a stale draft blocks until regeneration, then confirmation passes.
    @Test
    void staleDraftBlocksUntilRegeneration() throws Exception {
        generateOk();
        bumpRevision(2, 2);
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_DRAFT"));
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
        generateOk();
        confirmOk();
        org.junit.jupiter.api.Assertions.assertTrue(tripConfirmed());
    }

    // V5/C5: a member who is not the organizer cannot confirm.
    @Test
    void nonOrganizerCannotConfirm() throws Exception {
        generateOk();
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("2")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ORGANIZER"));
        org.junit.jupiter.api.Assertions.assertEquals("current", draftStatus(1));
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V6: confirming before any generation reports NO_DRAFT and changes nothing.
    @Test
    void confirmWithoutDraftIsNotFound() throws Exception {
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NO_DRAFT"));
        org.junit.jupiter.api.Assertions.assertEquals(0, draftCount());
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // V7: re-confirming an already-confirmed plan changes no state.
    @Test
    void reConfirmIsRejectedWithoutStateChange() throws Exception {
        generateOk();
        confirmOk();
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_CONFIRMED"));
        org.junit.jupiter.api.Assertions.assertEquals(1, draftCount());
        org.junit.jupiter.api.Assertions.assertEquals("confirmed", draftStatus(1));
        org.junit.jupiter.api.Assertions.assertTrue(tripConfirmed());
    }

    // M-N/V-N: missing or unknown identity is 401 on all four endpoints.
    @Test
    void allEndpointsRequireKnownIdentity() throws Exception {
        for (String userId : new String[] { null, "999999" }) {
            mockMvc.perform(withIdentity(post("/api/trips/" + tripId + "/main-plan"), userId))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
            mockMvc.perform(withIdentity(post("/api/trips/" + tripId + "/main-plan/confirm"), userId))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
            mockMvc.perform(withIdentity(get("/api/trips/" + tripId + "/main-plan"), userId))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
            mockMvc.perform(withIdentity(get("/api/trips/" + tripId + "/main-plan/inputs"), userId))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        }
        org.junit.jupiter.api.Assertions.assertEquals(0, draftCount());
    }

    // M-N/V-N: an unknown trip id is 404 on all four endpoints.
    @Test
    void allEndpointsReportUnknownTrip() throws Exception {
        mockMvc.perform(post("/api/trips/999999/main-plan").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
        mockMvc.perform(post("/api/trips/999999/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
        mockMvc.perform(get("/api/trips/999999/main-plan").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
        mockMvc.perform(get("/api/trips/999999/main-plan/inputs").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    // M-N/V-N: Eve (non-member) is denied on all four endpoints.
    @Test
    void nonMemberDeniedOnAllEndpoints() throws Exception {
        generateOk();
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan/inputs").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        org.junit.jupiter.api.Assertions.assertEquals(1, draftCount());
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }

    // Reverse (ATDD §5): this change adds no preference write route. REQ-019 owns
    // PUT /api/trips/{id}/preferences, so only the other verbs and the member-scoped
    // paths must stay absent.
    @Test
    void preferenceWritePathsAreAbsent() throws Exception {
        for (MockHttpServletRequestBuilder request : List.of(
                post("/api/trips/" + tripId + "/preferences"),
                patch("/api/trips/" + tripId + "/preferences"),
                post("/api/trips/" + tripId + "/members/2/preferences"),
                put("/api/trips/" + tripId + "/members/2/preferences"),
                patch("/api/trips/" + tripId + "/members/2/preferences"))) {
            int status = mockMvc.perform(request.with(TestAuth.asUser("1"))).andReturn().getResponse().getStatus();
            org.junit.jupiter.api.Assertions.assertTrue(status == 404 || status == 405,
                    "preference write path must be absent, got " + status);
        }
    }

    // Reverse (ATDD §5): generate + confirm leave member_preference rows untouched.
    @Test
    void preferenceRowsUnchangedByGenerateAndConfirm() throws Exception {
        List<Map<String, Object>> before = preferenceSnapshot();
        org.junit.jupiter.api.Assertions.assertFalse(before.isEmpty());
        generateOk();
        confirmOk();
        org.junit.jupiter.api.Assertions.assertEquals(before, preferenceSnapshot());
    }

    // Reverse (ATDD §5): no split or notification routes exist.
    @Test
    void splitAndNotificationRoutesAreAbsent() throws Exception {
        for (MockHttpServletRequestBuilder request : List.of(
                post("/api/trips/" + tripId + "/split"),
                post("/api/trips/" + tripId + "/split-expenses"),
                get("/api/trips/" + tripId + "/notifications"),
                post("/api/trips/" + tripId + "/notifications"))) {
            int status = mockMvc.perform(request.with(TestAuth.asUser("1"))).andReturn().getResponse().getStatus();
            org.junit.jupiter.api.Assertions.assertTrue(status == 404 || status == 405,
                    "split/notification route must be absent, got " + status);
        }
    }

    // Reverse (ATDD §5): a soft budget neither blocks nor appears in projections.
    @Test
    void softBudgetDoesNotBlockConfirmation() throws Exception {
        generateOk();
        insertBudget(2, 10, "soft");
        mockMvc.perform(get("/api/trips/" + tripId + "/main-plan/inputs").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgets[1].userId").value(2))
                .andExpect(jsonPath("$.budgets[1].amount").value(10))
                .andExpect(jsonPath("$.budgets[1].currency").value("SGD"))
                .andExpect(jsonPath("$.budgets[1].limitType").value("soft"))
                .andExpect(jsonPath("$.budgets[1].hardBudgetCents").doesNotExist())
                .andExpect(jsonPath("$.softBudget").doesNotExist())
                .andExpect(jsonPath("$.softBudgets").doesNotExist());
        MvcResult result = confirm("1");
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(tripConfirmed());
    }

    // Reverse (ATDD §5): generation never auto-confirms.
    @Test
    void generationDoesNotAutoConfirm() throws Exception {
        JsonNode body = generateOk();
        org.junit.jupiter.api.Assertions.assertFalse(body.get("confirmed").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals("current", draftStatus(1));
        org.junit.jupiter.api.Assertions.assertFalse(tripConfirmed());
    }
}