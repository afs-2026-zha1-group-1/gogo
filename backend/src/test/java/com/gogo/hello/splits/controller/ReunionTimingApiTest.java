package com.gogo.hello.splits.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gogo.hello.splits.SplitDraftRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for the reunion timing check (spec REQ-007 T1/T2-N/T3-N/T4-N/T5-N/T6-N, design D13/D8,
 * tasks 5.1/5.3). The entry guard may read identity/trip/membership; the calculator consumes only the supplied
 * snapshot. T1 spies the repository to prove zero calculation DB access (only the three guard lookups occur);
 * overruns/missing inputs return 200 feasible=false; an empty or non-pair snapshot returns 400 INVALID_ROUTE_PAIR.
 */
class ReunionTimingApiTest extends AbstractSplitApiTest {

    private static final String UNKNOWN_TRIP = "00000000-0000-0000-0000-000000000000";
    private static final String UNKNOWN_MEMBER = "99999999-9999-9999-9999-999999999999";

    @MockitoSpyBean
    private SplitDraftRepository repository;

    @Test
    @DisplayName("checkTiming_fixturePairWithinWindow_returns200Totals105And110FeasibleWithZeroCalcDb")
    void checkTiming_fixturePairWithinWindow_returns200Totals105And110FeasibleWithZeroCalcDb() throws Exception {
        String ben = memberId("Ben");
        String body = timingBody(120, List.of(route("A", 60, List.of(15, 20), 10), route("B", 60, List.of(20, 20), 10)));
        postTiming(ben, body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.windowMinutes").value(120))
                .andExpect(jsonPath("$.data.feasible").value(true))
                .andExpect(jsonPath("$.data.routes.length()").value(2))
                .andExpect(jsonPath("$.data.routes[0].groupLabel").value("A"))
                .andExpect(jsonPath("$.data.routes[0].totalMinutes").value(105))
                .andExpect(jsonPath("$.data.routes[0].overrunMinutes").value(0))
                .andExpect(jsonPath("$.data.routes[0].feasible").value(true))
                .andExpect(jsonPath("$.data.routes[1].totalMinutes").value(110))
                .andExpect(jsonPath("$.data.routes[1].feasible").value(true));
        verify(repository).memberExistsGlobally(ben);
        verify(repository).tripExists(sgfTripId());
        verify(repository).isMemberOfTrip(ben, sgfTripId());
        verifyNoMoreInteractions(repository);
    }

    @Test
    @DisplayName("checkTiming_lastLegOverrun_returns200Total125Overrun5PairInfeasibleButBPasses")
    void checkTiming_lastLegOverrun_returns200Total125Overrun5PairInfeasibleButBPasses() throws Exception {
        String body = timingBody(120, List.of(route("A", 60, List.of(15, 40), 10), route("B", 60, List.of(20, 20), 10)));
        postTiming(memberId("Ben"), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.feasible").value(false))
                .andExpect(jsonPath("$.data.routes[0].totalMinutes").value(125))
                .andExpect(jsonPath("$.data.routes[0].overrunMinutes").value(5))
                .andExpect(jsonPath("$.data.routes[0].feasible").value(false))
                .andExpect(jsonPath("$.data.routes[1].totalMinutes").value(110))
                .andExpect(jsonPath("$.data.routes[1].feasible").value(true));
    }

    @Test
    @DisplayName("checkTiming_missingLastLeg_returns200MissingInputsAndPairInfeasible")
    void checkTiming_missingLastLeg_returns200MissingInputsAndPairInfeasible() throws Exception {
        List<Integer> legs = new ArrayList<>();
        legs.add(15);
        legs.add(null);
        String body = timingBody(120, List.of(route("A", 60, legs, 10), route("B", 60, List.of(20, 20), 10)));
        postTiming(memberId("Ben"), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.feasible").value(false))
                .andExpect(jsonPath("$.data.routes[0].feasible").value(false))
                .andExpect(jsonPath("$.data.routes[0].missingInputs[0]").value("travelLegsMinutes[1]"));
    }

    @Test
    @DisplayName("checkTiming_outsiderEve_returns403NotAMember")
    void checkTiming_outsiderEve_returns403NotAMember() throws Exception {
        String body = timingBody(120, List.of(route("A", 60, List.of(15, 20), 10), route("B", 60, List.of(20, 20), 10)));
        postTiming(eveId(), body)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
    }

    @Test
    @DisplayName("checkTiming_emptySnapshot_returns400InvalidRoutePair")
    void checkTiming_emptySnapshot_returns400InvalidRoutePair() throws Exception {
        postTiming(memberId("Ben"), timingBody(120, List.of()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTE_PAIR"));
    }

    @Test
    @DisplayName("checkTiming_singleRoute_returns400InvalidRoutePair")
    void checkTiming_singleRoute_returns400InvalidRoutePair() throws Exception {
        String body = timingBody(120, List.of(route("A", 60, List.of(15, 20), 10)));
        postTiming(memberId("Ben"), body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTE_PAIR"));
    }

    @Test
    @DisplayName("checkTiming_missingIdentity_returns401AndCalculatorNotInvoked")
    void checkTiming_missingIdentity_returns401AndCalculatorNotInvoked() throws Exception {
        String body = timingBody(120, List.of(route("A", 60, List.of(15, 20), 10), route("B", 60, List.of(20, 20), 10)));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:check-timing", sgfTripId())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
        verify(repository, never()).findDraftJson(anyString());
    }

    @Test
    @DisplayName("checkTiming_globallyUnknownId_returns401MemberRequired")
    void checkTiming_globallyUnknownId_returns401MemberRequired() throws Exception {
        String body = timingBody(120, List.of(route("A", 60, List.of(15, 20), 10), route("B", 60, List.of(20, 20), 10)));
        postTiming(UNKNOWN_MEMBER, body)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
        verify(repository, never()).findDraftJson(anyString());
    }

    @Test
    @DisplayName("checkTiming_knownMemberUnknownTrip_returns404TripNotFound")
    void checkTiming_knownMemberUnknownTrip_returns404TripNotFound() throws Exception {
        String body = timingBody(120, List.of(route("A", 60, List.of(15, 20), 10), route("B", 60, List.of(20, 20), 10)));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:check-timing", UNKNOWN_TRIP)
                        .header("X-User-Id", memberId("Ben"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("TRIP_NOT_FOUND"));
        verify(repository, never()).findDraftJson(anyString());
    }

    private ResultActions postTiming(String memberId, String body) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:check-timing", sgfTripId())
                .header("X-User-Id", memberId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String timingBody(long windowMinutes, List<Map<String, Object>> routes) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("windowMinutes", windowMinutes);
        body.put("routes", routes);
        return objectMapper.writeValueAsString(body);
    }

    private Map<String, Object> route(String groupLabel, Integer activityMinutes, List<Integer> legs, Integer buffer) {
        Map<String, Object> route = new LinkedHashMap<>();
        route.put("groupLabel", groupLabel);
        route.put("activityMinutes", activityMinutes);
        route.put("travelLegsMinutes", legs);
        route.put("bufferMinutes", buffer);
        return route;
    }
}