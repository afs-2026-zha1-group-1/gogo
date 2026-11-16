package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for split boundary selection (spec REQ-005 B1/B2-N/B3-N/B4-N/B5-N/B6-N + half-boundary
 * reverse, design D7/D8/D9, tasks 3.1/3.3). MockMvc + real in-memory SQLite, reset to seed before each test.
 * Window = reunion.start - departure.end (minutes) derived from main-plan stop rows; only the initiator may
 * save a complete pair within the confirmed main plan with a positive window and the current draftVersion.
 */
class SplitBoundaryApiTest extends AbstractSplitApiTest {

    @Test
    @DisplayName("saveBoundaries_initiatorPositiveWindow_returns200Window120AndVersion2")
    void saveBoundaries_initiatorPositiveWindow_returns200Window120AndVersion2() throws Exception {
        startDraft();
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        putBoundaries(memberId("Ben"), boundaryBody(cityHall, merlion, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.departureStopId").value(cityHall))
                .andExpect(jsonPath("$.data.reunionStopId").value(merlion))
                .andExpect(jsonPath("$.data.departureAt").value("2026-12-05T01:30:00Z"))
                .andExpect(jsonPath("$.data.reunionAt").value("2026-12-05T03:30:00Z"))
                .andExpect(jsonPath("$.data.windowMinutes").value(120))
                .andExpect(jsonPath("$.data.draftVersion").value(2));
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(2);
        assertThat(draft.get("departureStopId").asText()).isEqualTo(cityHall);
        assertThat(draft.get("reunionStopId").asText()).isEqualTo(merlion);
    }

    @Test
    @DisplayName("saveBoundaries_reverseNonPositiveWindow_returns400AndKeepsBoundariesAndVersion")
    void saveBoundaries_reverseNonPositiveWindow_returns400AndKeepsBoundariesAndVersion() throws Exception {
        startDraft();
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        putBoundaries(memberId("Ben"), boundaryBody(merlion, cityHall, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("NONPOSITIVE_SPLIT_WINDOW"));
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(1);
        assertThat(draft.get("departureStopId").isNull()).isTrue();
        assertThat(draft.get("reunionStopId").isNull()).isTrue();
    }

    @Test
    @DisplayName("saveBoundaries_stopOutsideMainPlan_returns400AndCreatesNoNode")
    void saveBoundaries_stopOutsideMainPlan_returns400AndCreatesNoNode() throws Exception {
        startDraft();
        String zoo = stopId("Singapore Zoo");
        String merlion = stopId("Merlion Park");
        putBoundaries(memberId("Ben"), boundaryBody(zoo, merlion, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("BOUNDARY_NOT_IN_MAIN_PLAN"));
        Integer nodes = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ?", Integer.class, sgfTripId());
        assertThat(nodes).isEqualTo(3);
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(1);
        assertThat(draft.get("departureStopId").isNull()).isTrue();
    }

    @Test
    @DisplayName("saveBoundaries_nonInitiatorChloe_returns403NotSplitInitiator")
    void saveBoundaries_nonInitiatorChloe_returns403NotSplitInitiator() throws Exception {
        startDraft();
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        putBoundaries(memberId("Chloe"), boundaryBody(cityHall, merlion, 1))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("NOT_SPLIT_INITIATOR"));
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(1);
        assertThat(draft.get("departureStopId").isNull()).isTrue();
    }

    @Test
    @DisplayName("saveBoundaries_noActiveDraft_returns409SplitDraftNotActive")
    void saveBoundaries_noActiveDraft_returns409SplitDraftNotActive() throws Exception {
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        putBoundaries(memberId("Ben"), boundaryBody(cityHall, merlion, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("saveBoundaries_staleDraftVersion_returns409AndKeepsCurrentVersion")
    void saveBoundaries_staleDraftVersion_returns409AndKeepsCurrentVersion() throws Exception {
        startDraft();
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        putBoundaries(memberId("Ben"), boundaryBody(cityHall, merlion, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draftVersion").value(2));
        putBoundaries(memberId("Ben"), boundaryBody(cityHall, merlion, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(2);
        assertThat(draft.get("departureStopId").asText()).isEqualTo(cityHall);
    }

    @Test
    @DisplayName("saveBoundaries_halfBoundaryMissingReunion_returns400PairRequired")
    void saveBoundaries_halfBoundaryMissingReunion_returns400PairRequired() throws Exception {
        startDraft();
        String cityHall = stopId("City Hall MRT");
        putBoundaries(memberId("Ben"), boundaryBody(cityHall, null, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("BOUNDARY_NOT_IN_MAIN_PLAN"));
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(1);
        assertThat(draft.get("departureStopId").isNull()).isTrue();
        assertThat(draft.get("reunionStopId").isNull()).isTrue();
    }

    private void startDraft() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-User-Id", memberId("Ben")))
                .andExpect(status().isCreated());
    }

    private ResultActions putBoundaries(String memberId, String body) throws Exception {
        return mockMvc.perform(put("/api/trips/{tripId}/split-draft/boundaries", sgfTripId())
                .header("X-User-Id", memberId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String boundaryBody(String departureStopId, String reunionStopId, int draftVersion) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("departureStopId", departureStopId);
        body.put("reunionStopId", reunionStopId);
        body.put("draftVersion", draftVersion);
        return objectMapper.writeValueAsString(body);
    }
}