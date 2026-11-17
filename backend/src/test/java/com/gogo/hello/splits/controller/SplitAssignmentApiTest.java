package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.gogo.auth.TestAuth;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for member group assignment (US-040 A1-A9-N, design DD1/DD2/DD4/DD7). MockMvc + real
 * in-memory SQLite, reset to seed before each test. The caller is always the authenticated session, so every case
 * also proves that no request shape can move another member.
 */
class SplitAssignmentApiTest extends AbstractSplitApiTest {

    private static final String UNKNOWN_TRIP = "00000000-0000-0000-0000-000000000000";

    @Test
    @DisplayName("assign_callerMovesIntoOtherGroup_bumpsVersionAndKeepsOwnMembership")
    void assign_callerMovesIntoOtherGroup_bumpsVersionAndKeepsOwnMembership() throws Exception {
        startDraftAs("Ben");
        putAssignment("Chloe", "B", 1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.draftVersion").value(2))
                .andExpect(jsonPath("$.data.status").value("active"))
                .andExpect(jsonPath("$.data.groups.A.length()").value(3))
                .andExpect(jsonPath("$.data.groups.B.length()").value(1))
                .andExpect(jsonPath("$.data.groups.B[0]").value(memberId("Chloe")));
    }

    @Test
    @DisplayName("assign_memberSwitchesBack_onlyInTargetGroup")
    void assign_memberSwitchesBack_onlyInTargetGroup() throws Exception {
        startDraftAs("Ben");
        putAssignment("Chloe", "B", 1).andExpect(status().isOk());
        putAssignment("Chloe", "A", 2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draftVersion").value(3))
                .andExpect(jsonPath("$.data.groups.A.length()").value(4))
                .andExpect(jsonPath("$.data.groups.B.length()").value(0));
    }

    @Test
    @DisplayName("assign_sameGroupIsIdempotent_noWriteNoVersionBump")
    void assign_sameGroupIsIdempotent_noWriteNoVersionBump() throws Exception {
        startDraftAs("Ben");
        String before = draftJson();
        putAssignment("Ben", "A", 1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draftVersion").value(1))
                .andExpect(jsonPath("$.data.groups.A.length()").value(4))
                .andExpect(jsonPath("$.data.groups.B.length()").value(0));
        assertThat(draftJson()).isEqualTo(before);
    }

    @Test
    @DisplayName("assign_afterRoutesKeepPairAndBoundaries_bumpsVersionOnly")
    void assign_afterRoutesKeepPairAndBoundaries_bumpsVersionOnly() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        JsonNode before = objectMapper.readTree(draftJson());
        putAssignment("Ben", "B", version)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draftVersion").value(version + 1))
                .andExpect(jsonPath("$.data.routes.length()").value(2));
        JsonNode after = objectMapper.readTree(draftJson());
        assertThat(after.get("routes")).isEqualTo(before.get("routes"));
        assertThat(after.get("departureStopId")).isEqualTo(before.get("departureStopId"));
        assertThat(after.get("reunionStopId")).isEqualTo(before.get("reunionStopId"));
        assertThat(after.get("initiatorMemberId")).isEqualTo(before.get("initiatorMemberId"));
        assertThat(splitRouteCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("assign_confirmedDraft_returns409NotActiveAndKeepsEverything")
    void assign_confirmedDraft_returns409NotActiveAndKeepsEverything() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        confirmAs("Alice", version);
        String confirmed = draftJson();
        putAssignment("Chloe", "B", version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        assertThat(draftJson()).isEqualTo(confirmed);
    }

    @Test
    @DisplayName("assign_cancelledDraft_returns409NotActive")
    void assign_cancelledDraft_returns409NotActive() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        cancelAs("Ben", version);
        putAssignment("Chloe", "B", version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("assign_staleVersion_returns409AndKeepsGroups")
    void assign_staleVersion_returns409AndKeepsGroups() throws Exception {
        startDraftAs("Ben");
        putAssignment("Chloe", "B", 1).andExpect(status().isOk());
        String before = draftJson();
        putAssignment("Chloe", "A", 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        assertThat(draftJson()).isEqualTo(before);
    }

    @Test
    @DisplayName("assign_guards_missingIdentityUnknownTripOutsider")
    void assign_guards_missingIdentityUnknownTripOutsider() throws Exception {
        startDraftAs("Ben");
        mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", sgfTripId())
                        .with(TestAuth.csrfOnly())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("B", 1)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));

        mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", UNKNOWN_TRIP)
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("B", 1)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("TRIP_NOT_FOUND"));

        mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", sgfTripId())
                        .with(TestAuth.asUser(eveId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("B", 1)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
    }

    @Test
    @DisplayName("assign_invalidGroupLabel_returns400InvalidGroupLabel")
    void assign_invalidGroupLabel_returns400InvalidGroupLabel() throws Exception {
        startDraftAs("Ben");
        String before = draftJson();
        putAssignment("Chloe", "C", 1)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("INVALID_GROUP_LABEL"));
        assertThat(draftJson()).isEqualTo(before);
    }

    @Test
    @DisplayName("assign_bodyCannotMoveAnotherMember")
    void assign_bodyCannotMoveAnotherMember() throws Exception {
        startDraftAs("Ben");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("groupLabel", "B");
        payload.put("draftVersion", 1);
        payload.put("memberId", memberId("Chloe"));
        payload.put("userId", memberId("Chloe"));
        int status = mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andReturn().getResponse().getStatus();
        assertThat(status).isIn(200, 400);
        JsonNode draft = objectMapper.readTree(draftJson());
        JsonNode groupA = draft.get("groups").get("A");
        JsonNode groupB = draft.get("groups").get("B");
        String chloe = memberId("Chloe");
        assertThat(contains(groupA, chloe)).isTrue();
        assertThat(contains(groupB, chloe)).isFalse();
        if (status == 200) {
            assertThat(contains(groupB, memberId("Ben"))).isTrue();
        }
    }

    private ResultActions putAssignment(String displayName, String groupLabel, int draftVersion) throws Exception {
        return mockMvc.perform(put("/api/trips/{tripId}/split-draft/assignment", sgfTripId())
                .with(TestAuth.asUser(memberId(displayName)))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(groupLabel, draftVersion)));
    }

    private String body(String groupLabel, int draftVersion) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("groupLabel", groupLabel);
        payload.put("draftVersion", draftVersion);
        return objectMapper.writeValueAsString(payload);
    }

    private void confirmAs(String displayName, int version) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId(displayName)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"draftVersion\":" + version + "}"))
                .andExpect(status().isOk());
    }

    private void cancelAs(String displayName, int version) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                        .with(TestAuth.asUser(memberId(displayName)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"draftVersion\":" + version + "}"))
                .andExpect(status().isOk());
    }

    private static boolean contains(JsonNode array, String value) {
        for (JsonNode item : array) {
            if (value.equals(item.asText())) {
                return true;
            }
        }
        return false;
    }
}
