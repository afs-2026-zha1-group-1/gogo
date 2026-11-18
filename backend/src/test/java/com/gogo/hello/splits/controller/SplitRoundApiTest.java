package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.gogo.auth.TestAuth;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * US-096 round API acceptance tests: second round start, boundary ordering, route isolation, confirmation and
 * cancellation. The six-stop plan gives both rounds a window large enough for the deterministic fixture B route.
 */
class SplitRoundApiTest extends AbstractSplitApiTest {

    @BeforeEach
    void seedSixStopPlan() {
        clearBudgets();
        String tripId = sgfTripId();
        jdbc.update("DELETE FROM plan_node WHERE trip_id = ? AND branch_id = 'main'", tripId);
        jdbc.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbc.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbc.update("INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, "
                + "input_revisions_json) VALUES (?, 1, 'confirmed', 5000, '[]')", tripId);
        Number draftId = jdbc.queryForObject(
                "SELECT id FROM main_plan_draft WHERE trip_id = ? AND version = 1", Number.class, tripId);
        insertStop(draftId, 1, "City Hall MRT", "09:00", "09:30");
        insertStop(draftId, 2, "National Gallery Singapore", "10:00", "10:30");
        insertStop(draftId, 3, "Chinatown", "11:00", "12:00");
        insertStop(draftId, 4, "Gardens by the Bay", "12:30", "13:00");
        insertStop(draftId, 5, "Merlion Park", "14:00", "14:30");
        insertStop(draftId, 6, "Clarke Quay", "15:00", "15:30");
        assertThat(mainPlanProjection.projectConfirmed(Long.parseLong(tripId))).contains(1);
    }

    private void insertStop(Number draftId, int seq, String name, String start, String end) {
        jdbc.update("INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, "
                        + "travel_minutes_to_next, interests_json, cost_cents) VALUES (?, ?, ?, ?, ?, 30, '[]', 0)",
                draftId, seq, name, start, end);
    }

    private String mainStopId(String title) {
        return jdbc.queryForObject(
                "SELECT id FROM plan_node WHERE trip_id = ? AND title = ? AND branch_id = 'main' AND plan_version = 1",
                String.class, sgfTripId(), title);
    }

    private void prepareConfirmedRoundOne() throws Exception {
        int version = startDraftAs("Ben");
        saveRoundOneBoundaries(version, "City Hall MRT", "Gardens by the Bay");
        int grouped = assignRoundOne("Chloe", "B", version + 1);
        generateRoundOne(grouped);
        confirmRoundOne(grouped + 1);
    }

    private void saveRoundOneBoundaries(int draftVersion, String departure, String reunion) throws Exception {
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/boundaries", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "departureStopId", mainStopId(departure),
                                "reunionStopId", mainStopId(reunion),
                                "draftVersion", draftVersion))))
                .andExpect(status().isOk());
    }

    private int assignRoundOne(String member, String group, int version) throws Exception {
        MvcResult result = mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "memberId", memberId(member),
                                "groupLabel", group,
                                "draftVersion", version))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("draftVersion").asInt();
    }

    private void generateRoundOne(int version) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:generate", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", version))))
                .andExpect(status().isOk());
    }

    private void confirmRoundOne(int version) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", version))))
                .andExpect(status().isOk());
    }

    private int startNextRound() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/trips/{tripId}/split-draft/rounds", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.roundIndex").value(2))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("roundIndex").asInt();
    }

    private void saveRoundTwoBoundaries(int version, String departure, String reunion) throws Exception {
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/rounds/2/boundaries", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "departureStopId", mainStopId(departure),
                                "reunionStopId", mainStopId(reunion),
                                "draftVersion", version))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roundIndex").value(2));
    }

    private void generateRoundTwo(int version) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/rounds/2/routes:generate", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", version))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roundIndex").value(2));
    }

    private void confirmRoundTwo(int version) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/rounds/2:confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", version))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roundIndex").value(2))
                .andExpect(jsonPath("$.data.status").value("confirmed"));
    }

    private JsonNode roundDocument(int roundIndex) throws Exception {
        String json = jdbc.queryForObject(
                "SELECT document FROM split_draft WHERE trip_id = ? AND round_index = ?",
                String.class, sgfTripId(), roundIndex);
        return objectMapper.readTree(json);
    }

    private int roundRouteCount(int roundIndex) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ? AND branch_id IN (?, ?)",
                Integer.class, sgfTripId(), "split-r" + roundIndex + "-a", "split-r" + roundIndex + "-b");
        return count == null ? 0 : count;
    }

    private String roundBTitle(int roundIndex) {
        return jdbc.queryForObject(
                "SELECT title FROM plan_node WHERE trip_id = ? AND branch_id = ?",
                String.class, sgfTripId(), "split-r" + roundIndex + "-b");
    }

    @Test
    @DisplayName("startNextRound after confirmation copies groups and keeps both rounds")
    void startNextRound_afterConfirmation_copiesGroupsAndKeepsBothRounds() throws Exception {
        prepareConfirmedRoundOne();
        startNextRound();

        JsonNode roundTwo = roundDocument(2);
        assertThat(roundTwo.path("status").asText()).isEqualTo("active");
        assertThat(roundTwo.path("draftVersion").asInt()).isEqualTo(1);
        assertThat(roundTwo.path("groups").path("A").toString()).isEqualTo("[\"1\",\"2\",\"4\"]");
        assertThat(roundTwo.path("groups").path("B").toString()).isEqualTo("[\"3\"]");

        mockMvc.perform(get("/api/trips/{tripId}/split-draft/rounds", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.aggregateStatus").value("active"))
                .andExpect(jsonPath("$.data.rounds.length()").value(2))
                .andExpect(jsonPath("$.data.rounds[0].roundIndex").value(1))
                .andExpect(jsonPath("$.data.rounds[1].roundIndex").value(2))
                .andExpect(jsonPath("$.data.canStartNextRound").value(false))
                .andExpect(jsonPath("$.data.nextRoundBlockedReason").value("ROUND_ALREADY_ACTIVE"));
    }

    @Test
    @DisplayName("second round routes are isolated and confirmation aggregates both rounds")
    void secondRound_routesAreIsolated_andBothRoundsConfirm() throws Exception {
        prepareConfirmedRoundOne();
        startNextRound();
        saveRoundTwoBoundaries(1, "Gardens by the Bay", "Clarke Quay");
        generateRoundTwo(2);
        assertThat(roundBTitle(2)).isNotEqualTo(roundBTitle(1));
        confirmRoundTwo(3);

        assertThat(roundRouteCount(1)).isEqualTo(2);
        assertThat(roundRouteCount(2)).isEqualTo(2);
        assertThat(roundDocument(1).path("status").asText()).isEqualTo("confirmed");
        assertThat(roundDocument(2).path("status").asText()).isEqualTo("confirmed");
        mockMvc.perform(get("/api/trips/{tripId}/split-draft/rounds", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.aggregateStatus").value("confirmed"))
                .andExpect(jsonPath("$.data.canStartNextRound").value(false))
                .andExpect(jsonPath("$.data.nextRoundBlockedReason").value("ROUND_LIMIT_REACHED"));
    }

    @Test
    @DisplayName("startNextRound before the first round is confirmed returns 409")
    void startNextRound_beforePreviousConfirmed_returns409() throws Exception {
        startDraftAs("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/rounds", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED"));
    }

    @Test
    @DisplayName("second round departure before the previous reunion returns 400")
    void secondRound_departureBeforePreviousReunion_returns400() throws Exception {
        prepareConfirmedRoundOne();
        startNextRound();
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/rounds/2/boundaries", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "departureStopId", mainStopId("City Hall MRT"),
                                "reunionStopId", mainStopId("Clarke Quay"),
                                "draftVersion", 1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("BOUNDARY_BEFORE_PREVIOUS_REUNION"));
    }

    @Test
    @DisplayName("third round is rejected by the round limit")
    void thirdRound_returns409() throws Exception {
        prepareConfirmedRoundOne();
        startNextRound();
        saveRoundTwoBoundaries(1, "Gardens by the Bay", "Clarke Quay");
        generateRoundTwo(2);
        confirmRoundTwo(3);
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/rounds", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_ROUND_LIMIT_REACHED"));
    }

    @Test
    @DisplayName("cancelConfirmedRoundTwo deletes only round two routes")
    void cancelConfirmedRoundTwo_deletesOnlyItsRoutes() throws Exception {
        prepareConfirmedRoundOne();
        startNextRound();
        saveRoundTwoBoundaries(1, "Gardens by the Bay", "Clarke Quay");
        generateRoundTwo(2);
        confirmRoundTwo(3);
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/rounds/2:cancel-confirmed", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", 3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("cancelled"));
        assertThat(roundRouteCount(1)).isEqualTo(2);
        assertThat(roundRouteCount(2)).isZero();
        assertThat(roundDocument(1).path("status").asText()).isEqualTo("confirmed");
    }

    @Test
    @DisplayName("cancelling round one is blocked by a live round two")
    void cancelRoundOne_withLiveRoundTwo_returns409() throws Exception {
        prepareConfirmedRoundOne();
        startNextRound();
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", 4))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        mockMvc.perform(post("/api/trips/{tripId}/split:cancel", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", 4))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_LATER_ROUNDS_EXIST"));
    }

    @Test
    @DisplayName("second-round confirmation aggregates both rounds' budget")
    void secondRoundConfirmation_aggregatesBothRoundsBudget() throws Exception {
        prepareConfirmedRoundOne();
        insertBudget("Chloe", 30, "hard");
        startNextRound();
        saveRoundTwoBoundaries(1, "Gardens by the Bay", "Clarke Quay");
        generateRoundTwo(2);
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/rounds/2:confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", 3))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_BUDGET_HARD_OVERRUN"));
        assertThat(roundDocument(2).path("status").asText()).isEqualTo("active");
    }
}
