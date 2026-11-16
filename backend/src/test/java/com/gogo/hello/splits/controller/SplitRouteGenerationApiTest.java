package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.gogo.hello.splits.provider.BranchCandidateProvider;
import com.gogo.hello.splits.provider.FixtureBranchCandidateProvider;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for group route generation (spec REQ-006 G1/G2-N/G3-N/G4-N/G5-N + group-move reverse,
 * design D6/D10/D11/D12, tasks 4.1/4.4). The provider is a Mockito double delegating to the real fixture by
 * default; G2-N makes B throw, G3-N deterministically advances the draft version during compute (the provider
 * runs outside the persistence transaction so the single connection stays free). Paired replacement is atomic.
 */
class SplitRouteGenerationApiTest extends AbstractSplitApiTest {

    @MockitoBean
    private BranchCandidateProvider provider;

    private final FixtureBranchCandidateProvider fixture = new FixtureBranchCandidateProvider();

    @BeforeEach
    void stubFixtureProvider() {
        when(provider.candidateFor(eq("A"), any(), any()))
                .thenAnswer(inv -> fixture.candidateFor("A", inv.getArgument(1), inv.getArgument(2)));
        when(provider.candidateFor(eq("B"), any(), any()))
                .thenAnswer(inv -> fixture.candidateFor("B", inv.getArgument(1), inv.getArgument(2)));
    }

    @Test
    @DisplayName("generateRoutes_initiatorAfterBoundaries_returns200PairFixtureDurationsAndVersionBump")
    void generateRoutes_initiatorAfterBoundaries_returns200PairFixtureDurationsAndVersionBump() throws Exception {
        startDraft();
        saveBoundaries(1);
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        postGenerate(memberId("Ben"), 2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.draftVersion").value(3))
                .andExpect(jsonPath("$.data.routes.length()").value(2))
                .andExpect(jsonPath("$.data.routes[0].groupLabel").value("A"))
                .andExpect(jsonPath("$.data.routes[0].activityName").value("National Gallery Singapore"))
                .andExpect(jsonPath("$.data.routes[0].departureStopId").value(cityHall))
                .andExpect(jsonPath("$.data.routes[0].reunionStopId").value(merlion))
                .andExpect(jsonPath("$.data.routes[0].activityMinutes").value(60))
                .andExpect(jsonPath("$.data.routes[0].travelLegsMinutes[0]").value(15))
                .andExpect(jsonPath("$.data.routes[0].travelLegsMinutes[1]").value(20))
                .andExpect(jsonPath("$.data.routes[0].bufferMinutes").value(10))
                .andExpect(jsonPath("$.data.routes[1].groupLabel").value("B"))
                .andExpect(jsonPath("$.data.routes[1].activityName").value("Gardens by the Bay"))
                .andExpect(jsonPath("$.data.routes[1].departureStopId").value(cityHall))
                .andExpect(jsonPath("$.data.routes[1].reunionStopId").value(merlion))
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[0]").value(20))
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[1]").value(20))
                .andExpect(jsonPath("$.data.routes[1].bufferMinutes").value(10));
        assertThat(splitRouteCount()).isEqualTo(2);
        assertThat(mainStopCount()).isEqualTo(2);
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(3);
        assertThat(draft.get("routes").get("A").get("activityMinutes").asInt()).isEqualTo(60);
        assertThat(draft.get("routes").get("B").get("travelLegsMinutes").get(0).asInt()).isEqualTo(20);
    }

    @Test
    @DisplayName("generateRoutes_providerFailsForB_returns500AndKeepsPreviousPairAndMain")
    void generateRoutes_providerFailsForB_returns500AndKeepsPreviousPairAndMain() throws Exception {
        startDraft();
        saveBoundaries(1);
        postGenerate(memberId("Ben"), 2).andExpect(status().isOk());
        when(provider.candidateFor(eq("B"), any(), any())).thenThrow(new RuntimeException("provider failed for B"));
        postGenerate(memberId("Ben"), 3)
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("ROUTE_GENERATION_FAILED"));
        assertThat(splitRouteCount()).isEqualTo(2);
        assertThat(mainStopCount()).isEqualTo(2);
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(3);
        assertThat(draft.get("routes").get("A").get("activityMinutes").asInt()).isEqualTo(60);
    }

    @Test
    @DisplayName("generateRoutes_concurrentReselectionAdvancesVersion_returns409StaleAndPreservesNewer")
    void generateRoutes_concurrentReselectionAdvancesVersion_returns409StaleAndPreservesNewer() throws Exception {
        startDraft();
        saveBoundaries(1);
        when(provider.candidateFor(eq("A"), any(), any())).thenAnswer(inv -> {
            jdbc.update("UPDATE split_draft SET document = json_set(document, '$.draftVersion', 3), draft_version = 3 WHERE trip_id = ?",
                    sgfTripId());
            return fixture.candidateFor("A", inv.getArgument(1), inv.getArgument(2));
        });
        postGenerate(memberId("Ben"), 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        assertThat(splitRouteCount()).isZero();
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(3);
    }

    @Test
    @DisplayName("generateRoutes_noBoundaries_returns409SplitBoundariesRequired")
    void generateRoutes_noBoundaries_returns409SplitBoundariesRequired() throws Exception {
        startDraft();
        postGenerate(memberId("Ben"), 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("SPLIT_BOUNDARIES_REQUIRED"));
        assertThat(splitRouteCount()).isZero();
    }

    @Test
    @DisplayName("generateRoutes_nonInitiatorChloe_returns403NotSplitInitiator")
    void generateRoutes_nonInitiatorChloe_returns403NotSplitInitiator() throws Exception {
        startDraft();
        saveBoundaries(1);
        postGenerate(memberId("Chloe"), 2)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("NOT_SPLIT_INITIATOR"));
        assertThat(splitRouteCount()).isZero();
    }

    @Test
    @DisplayName("generateRoutes_groupMoveEndpoint_notImplemented")
    void generateRoutes_groupMoveEndpoint_notImplemented() throws Exception {
        startDraft();
        int status = mockMvc.perform(post("/api/trips/{tripId}/split-draft/groups:move", sgfTripId())
                        .header("X-User-Id", memberId("Ben"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"from\":\"A\",\"to\":\"B\",\"memberId\":\"x\"}"))
                .andReturn().getResponse().getStatus();
        assertThat(status).isIn(404, 405);
        assertThat(splitRouteCount()).isZero();
    }

    private void startDraft() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-User-Id", memberId("Ben")))
                .andExpect(status().isCreated());
    }

    private void saveBoundaries(int draftVersion) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("departureStopId", stopId("City Hall MRT"));
        body.put("reunionStopId", stopId("Merlion Park"));
        body.put("draftVersion", draftVersion);
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/boundaries", sgfTripId())
                        .header("X-User-Id", memberId("Ben"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    private ResultActions postGenerate(String memberId, int draftVersion) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:generate", sgfTripId())
                .header("X-User-Id", memberId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"draftVersion\":" + draftVersion + "}"));
    }

    private int splitRouteCount() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ? AND branch_id IN ('split-a', 'split-b')",
                Integer.class, sgfTripId());
        return count == null ? 0 : count;
    }

    private int mainStopCount() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ? AND branch_id = 'main'", Integer.class, sgfTripId());
        return count == null ? 0 : count;
    }
}