package com.gogo.hello.splits.controller;

import com.gogo.auth.TestAuth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for the manual route pair edit (spec US-087 S2/S2b/S3–S6/S8 + US-088 N3a, design DD1–DD3).
 * A group keeps its read-only stop names and derives activity/leg totals from the submitted stay minutes; group B
 * submits a single breakdown. Any trip member may save while the draft is active; the plan_node header and the draft
 * document routes are written in one transaction with a conditional version bump.
 */
class SplitRouteEditApiTest extends AbstractSplitApiTest {

    @Test
    @DisplayName("saveRoutes_nonInitiatorMember_returns200DerivedTotalsAndPersistsHeaders")
    void saveRoutes_nonInitiatorMember_returns200DerivedTotalsAndPersistsHeaders() throws Exception {
        int version = prepareConfirmableDraftAs("Alice");
        putRoutes(memberId("Ben"), version, editedRoutes(20, 15, "National Gallery (edited)"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.draftVersion").value(version + 1))
                .andExpect(jsonPath("$.data.routes.length()").value(2))
                .andExpect(jsonPath("$.data.routes[0].groupLabel").value("A"))
                .andExpect(jsonPath("$.data.routes[0].activityName").value("City Hall MRT → Gardens by the Bay"))
                .andExpect(jsonPath("$.data.routes[0].locationName").value("City Hall MRT"))
                .andExpect(jsonPath("$.data.routes[0].activityMinutes").value(65))
                .andExpect(jsonPath("$.data.routes[0].travelLegsMinutes[0]").value(30))
                .andExpect(jsonPath("$.data.routes[0].steps[1].name").value("National Gallery (edited)"))
                .andExpect(jsonPath("$.data.routes[0].steps[1].minutes").value(20))
                .andExpect(jsonPath("$.data.routes[0].bufferMinutes").value(0))
                .andExpect(jsonPath("$.data.routes[1].groupLabel").value("B"))
                .andExpect(jsonPath("$.data.routes[1].activityName").value("Gardens by the Bay"))
                .andExpect(jsonPath("$.data.routes[1].locationName").value("Gardens by the Bay"));
        Map<String, Object> rowA = splitRouteRow("split-a");
        assertThat(rowA.get("title")).isEqualTo("City Hall MRT → Gardens by the Bay");
        assertThat(rowA.get("location_name")).isEqualTo("City Hall MRT");
        Map<String, Object> rowB = splitRouteRow("split-b");
        assertThat(rowB.get("location_name")).isEqualTo("Gardens by the Bay");
        assertThat(draftRoutes().get("A").get("activityMinutes").asInt()).isEqualTo(65);
        assertThat(draftRoutes().get("A").get("steps").get(1).get("name").asText()).isEqualTo("National Gallery (edited)");
        assertThat(draftRoutes().get("A").get("steps").get(1).get("minutes").asInt()).isEqualTo(20);
        assertThat(draftVersionColumn()).isEqualTo(version + 1);
    }

    @Test
    @DisplayName("saveRoutes_staleVersion_returns409AndWritesNothing")
    void saveRoutes_staleVersion_returns409AndWritesNothing() throws Exception {
        int version = prepareConfirmableDraftAs("Alice");
        putRoutes(memberId("Alice"), version - 1, editedRoutes(20, 30, "海湾"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        assertThat(draftRoutes().get("A").get("activityMinutes").asInt()).isEqualTo(75);
        assertThat(splitRouteRow("split-a").get("location_name")).isEqualTo("City Hall MRT");
        assertThat(draftVersionColumn()).isEqualTo(version);
    }

    @Test
    @DisplayName("saveRoutes_noGeneratedPair_returns409IncompleteWithBothRoutes")
    void saveRoutes_noGeneratedPair_returns409IncompleteWithBothRoutes() throws Exception {
        startDraftAs("Alice");
        saveBoundariesAs("Alice", 1);
        putRoutes(memberId("Alice"), 2, editedRoutes(20, 30, "海湾"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"))
                .andExpect(jsonPath("$.error.details.missing[0]").value("routes.A"))
                .andExpect(jsonPath("$.error.details.missing[1]").value("routes.B"));
        assertThat(splitRouteCount()).isZero();
    }

    @Test
    @DisplayName("saveRoutes_illegalPayloads_return400ByErrorFamily")
    void saveRoutes_illegalPayloads_return400ByErrorFamily() throws Exception {
        int version = prepareConfirmableDraftAs("Alice");
        Map<String, Object> badStep = groupA(List.of(30, -1, 15), List.of(30, 30, 15), "沿主线方案");
        putRoutes(memberId("Alice"), version, List.of(badStep, groupB("Gardens by the Bay", 60, List.of(20, 20))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTE_INPUT"));
        Map<String, Object> badLegs = groupA(List.of(30, 20, 15), List.of(30, 30), "沿主线方案");
        putRoutes(memberId("Alice"), version, List.of(badLegs, groupB("Gardens by the Bay", 60, List.of(20, 20))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTE_INPUT"));
        putRoutes(memberId("Alice"), version, List.of(groupA(List.of(30, 20, 15), List.of(30, 30, 15), " "),
                        groupB("Gardens by the Bay", 60, List.of(20, 20))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTE_INPUT"));
        putRoutes(memberId("Alice"), version, List.of(
                        groupA(List.of(30, 20, 15), List.of(30, 30, 15), "沿主线方案"),
                        groupB("Gardens by the Bay", 60, List.of(20, 20, 0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTE_INPUT"));
        putRoutes(memberId("Alice"), version, List.of(
                        groupA(List.of(30, 20, 15), List.of(30, 30, 15), "沿主线方案"),
                        groupA(List.of(30, 20, 15), List.of(30, 30, 15), "沿主线方案")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTE_PAIR"));
        Map<String, Object> labelC = groupA(List.of(30, 20, 15), List.of(30, 30, 15), "沿主线方案");
        labelC.put("groupLabel", "C");
        putRoutes(memberId("Alice"), version, List.of(labelC,
                        groupB("Gardens by the Bay", 60, List.of(20, 20))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_GROUP_LABEL"));
        assertThat(draftVersionColumn()).isEqualTo(version);
    }

    @Test
    @DisplayName("saveRoutes_terminalDraft_returns409NotActive")
    void saveRoutes_terminalDraft_returns409NotActive() throws Exception {
        int version = prepareConfirmableDraftAs("Alice");
        setDraftStatus("confirmed");
        putRoutes(memberId("Alice"), version, editedRoutes(20, 30, "海湾"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("saveRoutes_outsiderOrAnonymous_returns403Or401")
    void saveRoutes_outsiderOrAnonymous_returns403Or401() throws Exception {
        int version = prepareConfirmableDraftAs("Alice");
        putRoutes(eveId(), version, editedRoutes(20, 30, "海湾"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
        putRoutes(null, version, editedRoutes(20, 30, "海湾"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
    }

    @Test
    @DisplayName("saveRoutes_aGroupOverWindow_stillSavesAndTimingReportsOverrun")
    void saveRoutes_aGroupOverWindow_stillSavesAndTimingReportsOverrun() throws Exception {
        int version = prepareConfirmableDraftAs("Alice");
        putRoutes(memberId("Alice"), version, editedRoutes(30, 40, "海湾"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.routes[0].activityMinutes").value(100));
        String body = objectMapper.writeValueAsString(Map.of(
                "windowMinutes", 150,
                "routes", List.of(
                        Map.of("groupLabel", "A", "activityMinutes", 100,
                                "travelLegsMinutes", List.of(30, 30, 15), "bufferMinutes", 0),
                        Map.of("groupLabel", "B", "activityMinutes", 60,
                                "travelLegsMinutes", List.of(20, 20), "bufferMinutes", 10))));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:check-timing", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.feasible").value(false))
                .andExpect(jsonPath("$.data.routes[0].totalMinutes").value(175))
                .andExpect(jsonPath("$.data.routes[0].overrunMinutes").value(25));
    }

    private List<Map<String, Object>> editedRoutes(int secondStay, int thirdStay, String secondName) {
        return List.of(
                groupA(List.of(30, secondStay, thirdStay), List.of(30, 30, 15), secondName),
                groupB("Gardens by the Bay", 60, List.of(20, 20)));
    }

    private Map<String, Object> groupA(List<Integer> stepMinutes, List<Integer> legs, String secondName) {
        Map<String, Object> route = new LinkedHashMap<>();
        route.put("groupLabel", "A");
        route.put("steps", List.of(
                step("City Hall MRT", stepMinutes.get(0)),
                step(secondName, stepMinutes.get(1)),
                step("Gardens by the Bay", stepMinutes.get(2))));
        route.put("travelLegsMinutes", legs);
        return route;
    }

    private Map<String, Object> groupB(String station, int stayMinutes, List<Integer> legs) {
        Map<String, Object> route = new LinkedHashMap<>();
        route.put("groupLabel", "B");
        route.put("steps", List.of(step(station, stayMinutes)));
        route.put("travelLegsMinutes", legs);
        return route;
    }

    private Map<String, Object> step(String name, Integer minutes) {
        Map<String, Object> step = new LinkedHashMap<>();
        step.put("name", name);
        step.put("minutes", minutes);
        return step;
    }

    private ResultActions putRoutes(String memberId, int draftVersion, List<Map<String, Object>> routes)
            throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("draftVersion", draftVersion, "routes", routes));
        var request = put("/api/trips/{tripId}/split-draft/routes", sgfTripId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
        if (memberId != null) {
            request.with(TestAuth.asUser(memberId));
        } else {
            request.with(TestAuth.csrfOnly());
        }
        return mockMvc.perform(request);
    }

    private Map<String, Object> splitRouteRow(String branchId) {
        return jdbc.queryForMap(
                "SELECT title, location_name FROM plan_node WHERE trip_id = ? AND branch_id = ?",
                sgfTripId(), branchId);
    }

    private com.fasterxml.jackson.databind.JsonNode draftRoutes() throws Exception {
        return objectMapper.readTree(draftJson()).path("routes");
    }
}
