package com.gogo.hello.splits.controller;

import com.gogo.auth.TestAuth;

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
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for group route generation (spec REQ-006 G1/G2-N/G3-N/G4-N/G5-N + US-040 G6-N,
 * design D6/D10/D11/D12 + US-040 DD9). The provider is a Mockito double delegating to the real fixture by
 * default; G2-N makes B throw, G3-N deterministically advances the draft version during compute (the provider
 * runs outside the persistence transaction so the single connection stays free). Paired replacement is atomic.
 * Since US-040 every generation starts from a complete partition (Chloe moved to B) because the initial draft is
 * all-A with an empty B and an incomplete partition is now rejected with SPLIT_DRAFT_INCOMPLETE.
 */
class SplitRouteGenerationApiTest extends AbstractSplitApiTest {

    @MockitoBean
    private BranchCandidateProvider provider;

    private final FixtureBranchCandidateProvider fixture = new FixtureBranchCandidateProvider();

    @BeforeEach
    void stubFixtureProvider() {
        when(provider.candidateFor(eq("A"), any(), any(), any()))
                .thenAnswer(inv -> fixture.candidateFor("A", inv.getArgument(1), inv.getArgument(2), inv.getArgument(3)));
        when(provider.candidateFor(eq("B"), any(), any(), any()))
                .thenAnswer(inv -> fixture.candidateFor("B", inv.getArgument(1), inv.getArgument(2), inv.getArgument(3)));
    }

    @Test
    @DisplayName("generateRoutes_initiatorAfterBoundaries_returns200PairFixtureDurationsAndVersionBump")
    void generateRoutes_initiatorAfterBoundaries_returns200PairFixtureDurationsAndVersionBump() throws Exception {
        startDraft();
        saveBoundaries(1);
        assignAs("Chloe", "B", 2);
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        postGenerate(memberId("Ben"), 3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.draftVersion").value(4))
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
        assertThat(mainStopCount()).isEqualTo(4);
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(4);
        assertThat(draft.get("routes").get("A").get("activityMinutes").asInt()).isEqualTo(60);
        assertThat(draft.get("routes").get("B").get("travelLegsMinutes").get(0).asInt()).isEqualTo(20);
    }

    @Test
    @DisplayName("generateRoutes_providerFailsForB_returns500AndKeepsPreviousPairAndMain")
    void generateRoutes_providerFailsForB_returns500AndKeepsPreviousPairAndMain() throws Exception {
        startDraft();
        saveBoundaries(1);
        assignAs("Chloe", "B", 2);
        postGenerate(memberId("Ben"), 3).andExpect(status().isOk());
        when(provider.candidateFor(eq("B"), any(), any(), any())).thenThrow(new RuntimeException("provider failed for B"));
        postGenerate(memberId("Ben"), 4)
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("ROUTE_GENERATION_FAILED"));
        assertThat(splitRouteCount()).isEqualTo(2);
        assertThat(mainStopCount()).isEqualTo(4);
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(4);
        assertThat(draft.get("routes").get("A").get("activityMinutes").asInt()).isEqualTo(60);
    }

    @Test
    @DisplayName("generateRoutes_concurrentReselectionAdvancesVersion_returns409StaleAndPreservesNewer")
    void generateRoutes_concurrentReselectionAdvancesVersion_returns409StaleAndPreservesNewer() throws Exception {
        startDraft();
        saveBoundaries(1);
        assignAs("Chloe", "B", 2);
        when(provider.candidateFor(eq("A"), any(), any(), any())).thenAnswer(inv -> {
            jdbc.update("UPDATE split_draft SET document = json_set(document, '$.draftVersion', 4), draft_version = 4 WHERE trip_id = ?",
                    sgfTripId());
            return fixture.candidateFor("A", inv.getArgument(1), inv.getArgument(2), inv.getArgument(3));
        });
        postGenerate(memberId("Ben"), 3)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        assertThat(splitRouteCount()).isZero();
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(4);
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
    @DisplayName("generateRoutes_emptyGroup_returns409IncompleteWithGroupsB")
    void generateRoutes_emptyGroup_returns409IncompleteWithGroupsB() throws Exception {
        startDraft();
        saveBoundaries(1);
        postGenerate(memberId("Ben"), 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"))
                .andExpect(jsonPath("$.error.details.missing[0]").value("groups.B"));
        assertThat(splitRouteCount()).isZero();
        assertThat(objectMapper.readTree(draftJson()).get("draftVersion").asInt()).isEqualTo(2);
    }

    @Test
    @DisplayName("generateRoutes_unassignedAndDuplicateGroups_reportBothProblems")
    void generateRoutes_unassignedAndDuplicateGroups_reportBothProblems() throws Exception {
        startDraft();
        saveBoundaries(1);
        Map<String, List<String>> groups = new LinkedHashMap<>();
        groups.put("A", List.of(memberId("Alice"), memberId("Ben"), memberId("Chloe")));
        groups.put("B", List.of(memberId("Chloe")));
        updateGroups(groups);
        postGenerate(memberId("Ben"), 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"))
                .andExpect(jsonPath("$.error.details.missing[0]").value("groups.unassigned"))
                .andExpect(jsonPath("$.error.details.missing[1]").value("groups.duplicate"));
        assertThat(splitRouteCount()).isZero();
    }

    @Test
    @DisplayName("legacyGroupsMoveEndpoint_isReplacedByAssignmentEndpoint")
    void legacyGroupsMoveEndpoint_isReplacedByAssignmentEndpoint() throws Exception {
        startDraft();
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"from\":\"A\",\"to\":\"B\",\"memberId\":\"x\",\"draftVersion\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_GROUP_LABEL"));
    }

    private void startDraft() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isCreated());
    }

    private void saveBoundaries(int draftVersion) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("departureStopId", stopId("City Hall MRT"));
        body.put("reunionStopId", stopId("Merlion Park"));
        body.put("draftVersion", draftVersion);
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/boundaries", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    private ResultActions postGenerate(String memberId, int draftVersion) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:generate", sgfTripId())
                .with(TestAuth.asUser(memberId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"draftVersion\":" + draftVersion + "}"));
    }
}