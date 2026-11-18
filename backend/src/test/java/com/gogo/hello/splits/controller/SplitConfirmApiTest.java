package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gogo.auth.TestAuth;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for split confirmation (US-049, delta CF1 / CF2-N / CF3-N / CF7-N / CF4-N / CF5-N / CF6-N /
 * R-N + shared guards, design D2/D3/D4/D5/D10/D11). Identity comes from the authenticated principal
 * ({@code TestAuth.asUser}), the same model production uses. The server recomputes timing from the saved draft
 * document; a client-declared confirmable flag is never part of the request. Over-window / missing-input /
 * incomplete drafts are produced by documented test-only document mutations, never by product paths.
 */
class SplitConfirmApiTest extends AbstractSplitApiTest {

    private static final String UNKNOWN_TRIP = "00000000-0000-0000-0000-000000000000";

    @Test
    @DisplayName("confirmDraft_organizerWithFeasiblePair_returns200ConfirmedAndLocksEditing")
    void confirmDraft_organizerWithFeasiblePair_returns200ConfirmedAndLocksEditing() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        confirm(memberId("Alice"), version)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.status").value("confirmed"))
                .andExpect(jsonPath("$.data.draftVersion").value(version))
                .andExpect(jsonPath("$.data.routes.length()").value(2));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("confirmed");
        assertThat(draftVersionColumn()).isEqualTo(version);

        String boundaries = objectMapper.writeValueAsString(Map.of(
                "departureStopId", stopId("City Hall MRT"),
                "reunionStopId", stopId("Merlion Park"),
                "draftVersion", version));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/trips/{tripId}/split-draft/boundaries", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(boundaries))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/routes:generate", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", version))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("confirmDraft_routeOverWindow_returns409TimingInfeasibleWithPerRouteDetails")
    void confirmDraft_routeOverWindow_returns409TimingInfeasibleWithPerRouteDetails() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        setRouteLastTravelLeg("A", 80);
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_TIMING_INFEASIBLE"))
                .andExpect(jsonPath("$.error.details.routes.length()").value(2))
                .andExpect(jsonPath("$.error.details.routes[0].groupLabel").value("A"))
                .andExpect(jsonPath("$.error.details.routes[0].totalMinutes").value(215))
                .andExpect(jsonPath("$.error.details.routes[0].overrunMinutes").value(65))
                .andExpect(jsonPath("$.error.details.routes[0].missingInputs.length()").value(0))
                .andExpect(jsonPath("$.error.details.routes[1].groupLabel").value("B"))
                .andExpect(jsonPath("$.error.details.routes[1].totalMinutes").value(110))
                .andExpect(jsonPath("$.error.details.routes[1].overrunMinutes").value(0));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
        assertThat(draftVersionColumn()).isEqualTo(version);
    }

    @Test
    @DisplayName("confirmDraft_missingActivityInput_returns409TimingInfeasibleWithMissingFields")
    void confirmDraft_missingActivityInput_returns409TimingInfeasibleWithMissingFields() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        setRouteActivityMinutes("A", null);
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_TIMING_INFEASIBLE"))
                .andExpect(jsonPath("$.error.details.routes[0].missingInputs[0]").value("activityMinutes"))
                .andExpect(jsonPath("$.error.details.routes[1].missingInputs.length()").value(0));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
    }

    @Test
    @DisplayName("confirmDraft_routesNotGenerated_returns409IncompleteWithMissingRoutes")
    void confirmDraft_routesNotGenerated_returns409IncompleteWithMissingRoutes() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        clearDocumentRoutes();
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"))
                .andExpect(jsonPath("$.error.details.missing[0]").value("routes"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
    }

    @Test
    @DisplayName("confirmDraft_halfBoundary_returns409IncompleteWithMissingBoundaries")
    void confirmDraft_halfBoundary_returns409IncompleteWithMissingBoundaries() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        clearReunionStopId();
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"))
                .andExpect(jsonPath("$.error.details.missing[0]").value("boundaries"));
    }

    @Test
    @DisplayName("confirmDraft_staleVersion_returns409StaleDraftVersion")
    void confirmDraft_staleVersion_returns409StaleDraftVersion() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        confirm(memberId("Alice"), version - 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
        assertThat(draftVersionColumn()).isEqualTo(version);
    }

    @Test
    @DisplayName("confirmDraft_nonOrganizerMember_returns403NotSplitOrganizer")
    void confirmDraft_nonOrganizerMember_returns403NotSplitOrganizer() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        confirm(memberId("Ben"), version)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_SPLIT_ORGANIZER"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
    }

    @Test
    @DisplayName("confirmDraft_noDraft_returns409DraftNotActive")
    void confirmDraft_noDraft_returns409DraftNotActive() throws Exception {
        confirm(memberId("Alice"), 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("confirmDraft_secondConfirmOnConfirmedDraft_returns409DraftNotActive")
    void confirmDraft_secondConfirmOnConfirmedDraft_returns409DraftNotActive() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        confirm(memberId("Alice"), version).andExpect(status().isOk());
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("confirmed");
    }

    @Test
    @DisplayName("confirmDraft_afterCancellation_returns409DraftNotActive")
    void confirmDraft_afterCancellation_returns409DraftNotActive() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", version))))
                .andExpect(status().isOk());
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("confirmDraft_identityTripMembershipGuards_areEnforced")
    void confirmDraft_identityTripMembershipGuards_areEnforced() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("draftVersion", 1));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                        .with(TestAuth.csrfOnly())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", UNKNOWN_TRIP)
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("TRIP_NOT_FOUND"));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                        .with(TestAuth.asUser(eveId()))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("confirmDraft_emptyGroup_returns409IncompleteWithGroupsB")
    void confirmDraft_emptyGroup_returns409IncompleteWithGroupsB() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        Map<String, java.util.List<String>> groups = new java.util.LinkedHashMap<>();
        groups.put("A", java.util.List.of(memberId("Alice"), memberId("Ben"), memberId("Chloe"), memberId("Daniel")));
        groups.put("B", java.util.List.of());
        updateGroups(groups);
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"))
                .andExpect(jsonPath("$.error.details.missing[0]").value("groups.B"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
    }

    @Test
    @DisplayName("confirmDraft_unassignedAndDuplicateGroups_reportGroupProblems")
    void confirmDraft_unassignedAndDuplicateGroups_reportGroupProblems() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        Map<String, java.util.List<String>> groups = new java.util.LinkedHashMap<>();
        groups.put("A", java.util.List.of(memberId("Alice"), memberId("Ben"), memberId("Chloe")));
        groups.put("B", java.util.List.of(memberId("Chloe")));
        updateGroups(groups);
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"))
                .andExpect(jsonPath("$.error.details.missing[0]").value("groups.unassigned"))
                .andExpect(jsonPath("$.error.details.missing[1]").value("groups.duplicate"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
    }

    @Test
    @DisplayName("confirmDraft_afterRouteEdit_usesEditedDerivedTotals")
    void confirmDraft_afterRouteEdit_usesEditedDerivedTotals() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        int edited = saveRoutesAs("Ben", version, 20, 15);
        confirm(memberId("Alice"), edited)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("confirmed"))
                .andExpect(jsonPath("$.data.routes[0].activityMinutes").value(65))
                .andExpect(jsonPath("$.data.routes[0].steps[1].minutes").value(20));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("confirmed");
    }

    @Test
    @DisplayName("confirmDraft_editedRouteOverWindow_returns409WithEditedTotals")
    void confirmDraft_editedRouteOverWindow_returns409WithEditedTotals() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        int edited = saveRoutesAs("Ben", version, 30, 40);
        confirm(memberId("Alice"), edited)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_TIMING_INFEASIBLE"))
                .andExpect(jsonPath("$.error.details.routes[0].totalMinutes").value(175))
                .andExpect(jsonPath("$.error.details.routes[0].overrunMinutes").value(25));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
    }

    @Test
    @DisplayName("confirmDraft_slashFormPath_isNotRouted")
    void confirmDraft_slashFormPath_isNotRouted() throws Exception {
        int status = mockMvc.perform(post("/api/trips/{tripId}/split-draft/confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", 1))))
                .andReturn().getResponse().getStatus();
        assertThat(status).isIn(404, 405);
        assertThat(activeDraftCount()).isZero();
    }

    /** Saves an A step-minute edit and returns the resulting draft version (CF9). */
    private int saveRoutesAs(String actor, int draftVersion, int secondStay, int thirdStay) throws Exception {
        Map<String, Object> routeA = new java.util.LinkedHashMap<>();
        routeA.put("groupLabel", "A");
        routeA.put("activityName", "沿主线方案");
        routeA.put("locationName", "Singapore");
        routeA.put("stepMinutes", java.util.List.of(30, secondStay, thirdStay));
        routeA.put("travelLegsMinutes", java.util.List.of(30, 30, 15));
        Map<String, Object> routeB = new java.util.LinkedHashMap<>();
        routeB.put("groupLabel", "B");
        routeB.put("activityName", "Gardens by the Bay");
        routeB.put("locationName", "滨海湾");
        routeB.put("activityMinutes", 60);
        routeB.put("travelLegsMinutes", java.util.List.of(20, 20));
        routeB.put("bufferMinutes", 10);
        var result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/trips/{tripId}/split-draft/routes", sgfTripId())
                        .with(TestAuth.asUser(memberId(actor)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "draftVersion", draftVersion,
                                "routes", java.util.List.of(routeA, routeB)))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("draftVersion").asInt();
    }

    /** Confirm call helper: POST .../split-draft:confirm as the given actor with the given draft version. */
    private ResultActions confirm(String actorId, int draftVersion) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                .with(TestAuth.asUser(actorId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("draftVersion", draftVersion))));
    }
}
