package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
 * API acceptance tests for the member-only draft detail read (spec REQ-007 chain D1/D2/D3-N/D4-N/D5-N, design
 * D14/D6/D7, tasks 6.1/6.2). GET assembles one consistent saved snapshot (document + main-plan stops + derived
 * boundary times/window + plan_node split rows joined with draft route durations); it never mutates the draft or
 * bumps the version and does not require initiator status. An existing trip without a draft returns 200 data=null.
 */
class SplitDraftDetailApiTest extends AbstractSplitApiTest {

    private static final String UNKNOWN_TRIP = "00000000-0000-0000-0000-000000000000";
    private static final String UNKNOWN_MEMBER = "99999999-9999-9999-9999-999999999999";

    @Test
    @DisplayName("getDetail_memberChloeAfterBoundariesAndRoutes_returns200ConsistentSnapshotWithoutVersionBump")
    void getDetail_memberChloeAfterBoundariesAndRoutes_returns200ConsistentSnapshotWithoutVersionBump() throws Exception {
        startDraft();
        saveBoundaries(1);
        postGenerate(memberId("Ben"), 2).andExpect(status().isOk());
        String ben = memberId("Ben");
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        getDetail(memberId("Chloe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.initiatorMemberId").value(ben))
                .andExpect(jsonPath("$.data.mainPlanVersion").value(1))
                .andExpect(jsonPath("$.data.draftVersion").value(3))
                .andExpect(jsonPath("$.data.status").value("active"))
                .andExpect(jsonPath("$.data.groups.A.length()").value(2))
                .andExpect(jsonPath("$.data.groups.B.length()").value(2))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.mainPlanStops.length()").value(2))
                .andExpect(jsonPath("$.data.mainPlanStops[0].id").value(cityHall))
                .andExpect(jsonPath("$.data.mainPlanStops[0].name").value("City Hall MRT"))
                .andExpect(jsonPath("$.data.mainPlanStops[0].startAt").value("2026-12-05T01:00:00Z"))
                .andExpect(jsonPath("$.data.mainPlanStops[0].endAt").value("2026-12-05T01:30:00Z"))
                .andExpect(jsonPath("$.data.mainPlanStops[1].name").value("Merlion Park"))
                .andExpect(jsonPath("$.data.departureStopId").value(cityHall))
                .andExpect(jsonPath("$.data.reunionStopId").value(merlion))
                .andExpect(jsonPath("$.data.departureAt").value("2026-12-05T01:30:00Z"))
                .andExpect(jsonPath("$.data.reunionAt").value("2026-12-05T03:30:00Z"))
                .andExpect(jsonPath("$.data.windowMinutes").value(120))
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
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[0]").value(20))
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[1]").value(20));
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("draftVersion").asInt()).isEqualTo(3);
        assertThat(activeDraftCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("getDetail_beforeBoundarySelection_returns200NullBoundariesAndEmptyRoutes")
    void getDetail_beforeBoundarySelection_returns200NullBoundariesAndEmptyRoutes() throws Exception {
        startDraft();
        getDetail(memberId("Chloe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.draftVersion").value(1))
                .andExpect(jsonPath("$.data.mainPlanStops.length()").value(2))
                .andExpect(jsonPath("$.data.departureStopId").doesNotExist())
                .andExpect(jsonPath("$.data.reunionStopId").doesNotExist())
                .andExpect(jsonPath("$.data.departureAt").doesNotExist())
                .andExpect(jsonPath("$.data.reunionAt").doesNotExist())
                .andExpect(jsonPath("$.data.windowMinutes").doesNotExist())
                .andExpect(jsonPath("$.data.routes.length()").value(0));
    }

    @Test
    @DisplayName("getDetail_afterBoundariesBeforeGeneration_returns200Window120AndEmptyRoutes")
    void getDetail_afterBoundariesBeforeGeneration_returns200Window120AndEmptyRoutes() throws Exception {
        startDraft();
        saveBoundaries(1);
        getDetail(memberId("Chloe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.draftVersion").value(2))
                .andExpect(jsonPath("$.data.departureStopId").value(stopId("City Hall MRT")))
                .andExpect(jsonPath("$.data.reunionStopId").value(stopId("Merlion Park")))
                .andExpect(jsonPath("$.data.windowMinutes").value(120))
                .andExpect(jsonPath("$.data.routes.length()").value(0));
    }

    @Test
    @DisplayName("getDetail_noActiveDraft_returns200NullDataAndCreatesNothing")
    void getDetail_noActiveDraft_returns200NullDataAndCreatesNothing() throws Exception {
        getDetail(memberId("Ben"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error").doesNotExist());
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("getDetail_outsiderEve_returns403NotAMemberAndNoPrivateValues")
    void getDetail_outsiderEve_returns403NotAMemberAndNoPrivateValues() throws Exception {
        startDraft();
        getDetail(eveId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
    }

    @Test
    @DisplayName("getDetail_missingIdentity_returns401MemberRequired")
    void getDetail_missingIdentity_returns401MemberRequired() throws Exception {
        mockMvc.perform(get("/api/trips/{tripId}/split-draft", sgfTripId()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
    }

    @Test
    @DisplayName("getDetail_globallyUnknownId_returns401MemberRequired")
    void getDetail_globallyUnknownId_returns401MemberRequired() throws Exception {
        getDetail(UNKNOWN_MEMBER)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
    }

    @Test
    @DisplayName("getDetail_knownMemberUnknownTrip_returns404TripNotFoundAndCreatesNothing")
    void getDetail_knownMemberUnknownTrip_returns404TripNotFoundAndCreatesNothing() throws Exception {
        mockMvc.perform(get("/api/trips/{tripId}/split-draft", UNKNOWN_TRIP)
                        .header("X-Member-Id", memberId("Ben")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("TRIP_NOT_FOUND"));
        assertThat(activeDraftCount()).isZero();
    }

    private ResultActions getDetail(String memberId) throws Exception {
        return mockMvc.perform(get("/api/trips/{tripId}/split-draft", sgfTripId())
                .header("X-Member-Id", memberId));
    }

    private void startDraft() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-Member-Id", memberId("Ben")))
                .andExpect(status().isCreated());
    }

    private void saveBoundaries(int draftVersion) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("departureStopId", stopId("City Hall MRT"));
        body.put("reunionStopId", stopId("Merlion Park"));
        body.put("draftVersion", draftVersion);
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/boundaries", sgfTripId())
                        .header("X-Member-Id", memberId("Ben"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    private ResultActions postGenerate(String memberId, int draftVersion) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:generate", sgfTripId())
                .header("X-Member-Id", memberId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"draftVersion\":" + draftVersion + "}"));
    }
}