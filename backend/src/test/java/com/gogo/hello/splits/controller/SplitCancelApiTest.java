package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gogo.auth.TestAuth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for cancelling an unconfirmed split draft (US-050, delta CN1 / CN2-N / CN3-N / CN4-N /
 * CN5-N / CN6-N, design D2/D3/D4/D6/D9/D10/D11). Cancelling keeps the main plan row-by-row unchanged, clears the
 * split route nodes and the document routes (so a cancelled detail never shows ghost routes), and lets the same row
 * be rebuilt as a fresh v1 draft by any member.
 */
class SplitCancelApiTest extends AbstractSplitApiTest {

    private static final String UNKNOWN_TRIP = "00000000-0000-0000-0000-000000000000";

    @Test
    @DisplayName("cancelDraft_initiator_returns200CancelledAndAllowsRebuild")
    void cancelDraft_initiator_returns200CancelledAndAllowsRebuild() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        List<Map<String, Object>> mainBefore = mainRows();

        cancel(memberId("Ben"), version)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.status").value("cancelled"))
                .andExpect(jsonPath("$.data.routes.length()").value(0));

        assertThat(mainRows()).isEqualTo(mainBefore);
        assertThat(splitRouteCount()).isZero();
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("cancelled");
        assertThat(objectMapper.readTree(draftJson()).get("routes") == null
                || objectMapper.readTree(draftJson()).get("routes").isNull()).isTrue();

        mockMvc.perform(get("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Chloe"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("cancelled"))
                .andExpect(jsonPath("$.data.routes.length()").value(0));

        String alice = memberId("Alice");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(alice)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.initiatorMemberId").value(alice))
                .andExpect(jsonPath("$.data.draftVersion").value(1))
                .andExpect(jsonPath("$.data.status").value("active"));
        assertThat(activeDraftCount()).isEqualTo(1);
        assertThat(draftVersionColumn()).isEqualTo(1);
    }

    @Test
    @DisplayName("cancelDraft_confirmedDraft_returns409DraftNotActiveAndKeepsConfirmedState")
    void cancelDraft_confirmedDraft_returns409DraftNotActiveAndKeepsConfirmedState() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("draftVersion", version))))
                .andExpect(status().isOk());

        cancel(memberId("Ben"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("confirmed");
        assertThat(splitRouteCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("cancelDraft_nonInitiator_returns403NotSplitInitiator")
    void cancelDraft_nonInitiator_returns403NotSplitInitiator() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        cancel(memberId("Chloe"), version)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_SPLIT_INITIATOR"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
        assertThat(splitRouteCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("cancelDraft_noDraft_returns409DraftNotActive")
    void cancelDraft_noDraft_returns409DraftNotActive() throws Exception {
        cancel(memberId("Ben"), 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("cancelDraft_identityTripMembershipGuards_areEnforced")
    void cancelDraft_identityTripMembershipGuards_areEnforced() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("draftVersion", 1));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                        .with(TestAuth.csrfOnly())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", UNKNOWN_TRIP)
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("TRIP_NOT_FOUND"));
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                        .with(TestAuth.asUser(eveId()))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
    }

    @Test
    @DisplayName("cancelDraft_staleVersionAfterRebuild_returns409StaleAndKeepsNewDraft")
    void cancelDraft_staleVersionAfterRebuild_returns409StaleAndKeepsNewDraft() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        cancel(memberId("Ben"), version).andExpect(status().isOk());
        String alice = memberId("Alice");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(alice)))
                .andExpect(status().isCreated());

        cancel(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
        assertThat(objectMapper.readTree(draftJson()).get("initiatorMemberId").asText()).isEqualTo(alice);
        assertThat(activeDraftCount()).isEqualTo(1);
    }

    private ResultActions cancel(String actorId, int draftVersion) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                .with(TestAuth.asUser(actorId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("draftVersion", draftVersion))));
    }

    /** Row-by-row snapshot of the main-line plan nodes (US-050 AC1 "main plan remains unchanged"). */
    private List<Map<String, Object>> mainRows() {
        return jdbc.queryForList(
                "SELECT id, branch_id, title, start_at, end_at, sort_order, plan_version FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id = 'main' ORDER BY id",
                sgfTripId());
    }
}
