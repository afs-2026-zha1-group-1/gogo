package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.gogo.auth.TestAuth;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.gogo.mainplan.MainPlanProjection;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Shared base for splits API acceptance tests on the main trip schema. Boots one in-memory SQLite context with
 * the real Flyway migrations (V1 greeting, V2 app_user/trip/trip_member seed, V3 invitation + main_plan_confirmed,
 * V4 split_draft + plan_node, V5 main_plan_draft/main_plan_stop). Before each test it resets to a split-ready seed
 * state: no active draft, no generated split route pairs, and a confirmed main plan whose stops are projected into
 * the main-line plan_node rows (the production MainPlanProjection is the only writer). Identity comes from the
 * authenticated principal (`TestAuth.asUser`), the same model production uses since the session-auth change;
 * fixtures are resolved by natural keys so tests never hardcode ids.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:file:split-api-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
abstract class AbstractSplitApiTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected MainPlanProjection mainPlanProjection;

    @BeforeEach
    void resetToSeed() {
        jdbc.update("DELETE FROM split_draft");
        jdbc.update("DELETE FROM plan_node WHERE branch_id LIKE 'split-r%' OR branch_id IN ('split-a', 'split-b')");
        jdbc.update("UPDATE trip SET main_plan_confirmed = 1");
        seedConfirmedMainPlan(1);
    }

    /**
     * Replaces the trip's confirmed main plan with the fake provider's four stops (09:00/09:30, 10:00/10:30,
     * 11:00/11:15, 11:30/12:00 trip-local) and their per-person costs (500/1500/2000/1000 cents, US-045), then
     * projects it into the main-line plan_node rows, mirroring production confirmation (main_plan_stop -> plan_node
     * branch_id='main', plan_version = draft version).
     */
    protected void seedConfirmedMainPlan(int version) {
        String tripId = sgfTripId();
        jdbc.update("DELETE FROM plan_node WHERE trip_id = ? AND branch_id = 'main'", tripId);
        jdbc.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbc.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbc.update("INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, "
                        + "input_revisions_json) VALUES (?, ?, 'confirmed', 5000, '[]')",
                tripId, version);
        Number draftId = jdbc.queryForObject(
                "SELECT id FROM main_plan_draft WHERE trip_id = ? AND version = ?", Number.class, tripId, version);
        insertMainPlanStop(draftId, 1, "City Hall MRT", "09:00", "09:30", 30, 500);
        insertMainPlanStop(draftId, 2, "National Gallery Singapore", "10:00", "10:30", 30, 1500);
        insertMainPlanStop(draftId, 3, "Gardens by the Bay", "11:00", "11:15", 15, 2000);
        insertMainPlanStop(draftId, 4, "Merlion Park", "11:30", "12:00", null, 1000);
        assertThat(mainPlanProjection.projectConfirmed(Long.parseLong(tripId))).contains(version);
    }

    private void insertMainPlanStop(Number draftId, int seq, String name, String start, String end, Integer leg,
            int costCents) {
        jdbc.update("INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, "
                        + "travel_minutes_to_next, interests_json, cost_cents) VALUES (?, ?, ?, ?, ?, ?, '[]', ?)",
                draftId, seq, name, start, end, leg, costCents);
    }

    protected String sgfTripId() {
        return jdbc.queryForObject(
                "SELECT id FROM trip WHERE name = 'Singapore Friends Day'", String.class);
    }

    protected String memberId(String displayName) {
        return jdbc.queryForObject(
                "SELECT id FROM app_user WHERE display_name = ?", String.class, displayName);
    }

    protected String eveId() {
        return jdbc.queryForObject("SELECT id FROM app_user WHERE display_name = 'Eve'", String.class);
    }

    protected String stopId(String title) {
        return jdbc.queryForObject(
                "SELECT id FROM plan_node WHERE trip_id = ? AND title = ?", String.class, sgfTripId(), title);
    }

    protected int activeDraftCount() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM split_draft WHERE trip_id = ?", Integer.class, sgfTripId());
        return count == null ? 0 : count;
    }

    protected String draftJson() {
        var docs = jdbc.queryForList(
                "SELECT document FROM split_draft WHERE trip_id = ?", String.class, sgfTripId());
        return docs.isEmpty() ? null : docs.get(0);
    }

    /** Starts the trip's draft as the named member and returns the resulting draftVersion (1). */
    protected int startDraftAs(String displayName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId(displayName))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("draftVersion").asInt();
    }

    /** Saves the fixture boundary pair (City Hall MRT -> Merlion Park) as the initiator. */
    protected void saveBoundariesAs(String displayName, int draftVersion) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "departureStopId", stopId("City Hall MRT"),
                "reunionStopId", stopId("Merlion Park"),
                "draftVersion", draftVersion));
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/boundaries", sgfTripId())
                        .with(TestAuth.asUser(memberId(displayName)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    /** Generates the fixture route pair as the initiator. */
    protected void generateRoutesAs(String displayName, int draftVersion) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("draftVersion", draftVersion));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:generate", sgfTripId())
                        .with(TestAuth.asUser(memberId(displayName)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    /** start (v1) -> boundaries (v2) -> Chloe to B (v3) -> routes (v4); returns the resulting draftVersion (4). */
    protected int prepareConfirmableDraftAs(String displayName) throws Exception {
        int version = startDraftAs(displayName);
        saveBoundariesAs(displayName, version);
        int grouped = assignAs("Chloe", "B", version + 1);
        generateRoutesAs(displayName, grouped);
        return grouped + 1;
    }

    /** Moves the named member into group A or B (US-040 A1) and returns the resulting draftVersion. */
    protected int assignAs(String displayName, String groupLabel, int draftVersion) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "groupLabel", groupLabel,
                "draftVersion", draftVersion));
        MvcResult result = mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", sgfTripId())
                        .with(TestAuth.asUser(memberId(displayName)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("draftVersion").asInt();
    }

    /** Test-only document mutation replacing the saved groups (漏组/重复组 construction, US-040 G6-N/CF8-N). */
    protected void updateGroups(Map<String, List<String>> groups) throws Exception {
        ObjectNode node = (ObjectNode) draftNode();
        ObjectNode groupsNode = objectMapper.createObjectNode();
        groups.forEach((label, members) -> {
            ArrayNode array = groupsNode.putArray(label);
            members.forEach(array::add);
        });
        node.set("groups", groupsNode);
        updateDraftDocument(node);
    }

    protected int splitRouteCount() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ? AND (branch_id LIKE 'split-r%' OR branch_id IN ('split-a', 'split-b'))",
                Integer.class, sgfTripId());
        return count == null ? 0 : count;
    }

    protected int mainStopCount() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ? AND branch_id = 'main'",
                Integer.class, sgfTripId());
        return count == null ? 0 : count;
    }

    protected JsonNode draftNode() throws Exception {
        String json = draftJson();
        return json == null ? null : objectMapper.readTree(json);
    }

    protected void updateDraftDocument(JsonNode node) {
        try {
            jdbc.update("UPDATE split_draft SET document = ? WHERE trip_id = ?",
                    objectMapper.writeValueAsString(node), sgfTripId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("failed to serialize mutated draft document", ex);
        }
    }

    /** Test-only status flip on the saved document (test setup, not a product path). */
    protected void setDraftStatus(String status) throws Exception {
        ObjectNode node = (ObjectNode) draftNode();
        node.put("status", status);
        updateDraftDocument(node);
    }

    /** Test-only mutation making route A express a missing activity estimate. */
    protected void setRouteActivityMinutes(String group, Integer value) throws Exception {
        ObjectNode node = (ObjectNode) draftNode();
        ObjectNode route = (ObjectNode) node.path("routes").path(group);
        if (value == null) {
            route.putNull("activityMinutes");
        } else {
            route.put("activityMinutes", value);
        }
        updateDraftDocument(node);
    }

    /** Test-only mutation making the last travel leg of a route overrun the window. */
    protected void setRouteLastTravelLeg(String group, int value) throws Exception {
        ObjectNode node = (ObjectNode) draftNode();
        ArrayNode legs = (ArrayNode) node.path("routes").path(group).path("travelLegsMinutes");
        legs.set(legs.size() - 1, legs.numberNode(value));
        updateDraftDocument(node);
    }

    /** Test-only mutation removing the saved route breakdown entirely. */
    protected void clearDocumentRoutes() throws Exception {
        ObjectNode node = (ObjectNode) draftNode();
        node.putNull("routes");
        updateDraftDocument(node);
    }

    /** Test-only mutation producing a half boundary (reunion stop missing). */
    protected void clearReunionStopId() throws Exception {
        ObjectNode node = (ObjectNode) draftNode();
        node.putNull("reunionStopId");
        updateDraftDocument(node);
    }

    /** Stored draft_version column (CAS version), not the document field. */
    protected int draftVersionColumn() {
        Integer version = jdbc.queryForObject(
                "SELECT draft_version FROM split_draft WHERE trip_id = ?", Integer.class, sgfTripId());
        return version == null ? -1 : version;
    }

    /**
     * Stores a US-024 budget row for the named member (major units + limit type, SGD). US-045 reads it through
     * member_preference, so tests exercise the same storage the preference page writes.
     */
    protected void insertBudget(String displayName, int amount, String limitType) {
        jdbc.update("INSERT OR REPLACE INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
                        + "VALUES (?, ?, 'budget', ?, datetime('now'))",
                sgfTripId(), memberId(displayName),
                "{\"amount\":" + amount + ",\"currency\":\"SGD\",\"limitType\":\"" + limitType + "\"}");
    }

    /** Removes every budget row so a test starts without member limits. */
    protected void clearBudgets() {
        jdbc.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'budget'", sgfTripId());
    }
}
