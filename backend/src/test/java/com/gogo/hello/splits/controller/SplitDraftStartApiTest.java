package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/**
 * API acceptance tests for split draft start (spec REQ-004 S1/S2/S3-N/S7 + shared guards S4-N/S5-N/S6-N,
 * design D5/D8/D9/D16, tasks 2.1/2.4). MockMvc + real in-memory SQLite, reset to seed before each test.
 */
class SplitDraftStartApiTest extends AbstractSplitApiTest {

    private static final String UNKNOWN_TRIP = "00000000-0000-0000-0000-000000000000";

    @Test
    @DisplayName("startDraft_confirmedMainPlanMember_returns201AndPersistsSingleActiveDraft")
    void startDraft_confirmedMainPlanMember_returns201AndPersistsSingleActiveDraft() throws Exception {
        String ben = memberId("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-User-Id", ben))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.initiatorMemberId").value(ben))
                .andExpect(jsonPath("$.data.mainPlanVersion").value(1))
                .andExpect(jsonPath("$.data.draftVersion").value(1))
                .andExpect(jsonPath("$.data.status").value("active"));
        assertThat(activeDraftCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("startDraft_concurrentAliceAndBen_atMostOneActiveDraft")
    void startDraft_concurrentAliceAndBen_atMostOneActiveDraft() throws Exception {
        String alice = memberId("Alice");
        String ben = memberId("Ben");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<MvcResult>> futures = new ArrayList<>();
            for (String member : List.of(alice, ben)) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    go.await();
                    return mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                            .header("X-User-Id", member)).andReturn();
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<Integer> statuses = new ArrayList<>();
            String conflictBody = null;
            for (Future<MvcResult> future : futures) {
                MvcResult result = future.get(10, TimeUnit.SECONDS);
                statuses.add(result.getResponse().getStatus());
                if (result.getResponse().getStatus() == 409) {
                    conflictBody = result.getResponse().getContentAsString();
                }
            }
            assertThat(statuses).containsExactlyInAnyOrder(201, 409);
            assertThat(conflictBody).isNotNull();
            JsonNode error = objectMapper.readTree(conflictBody).get("error");
            assertThat(error.get("code").asText()).isEqualTo("SPLIT_DRAFT_CONFLICT");
            assertThat(activeDraftCount()).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("startDraft_mainPlanNotConfirmed_returns409AndCreatesNoDraft")
    void startDraft_mainPlanNotConfirmed_returns409AndCreatesNoDraft() throws Exception {
        jdbc.update("UPDATE trip SET main_plan_confirmed = 0 WHERE id = ?", sgfTripId());
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-User-Id", memberId("Ben")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MAIN_PLAN_NOT_CONFIRMED"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("startDraft_repeatWhileActive_returns409AndKeepsOriginalDraft")
    void startDraft_repeatWhileActive_returns409AndKeepsOriginalDraft() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-User-Id", memberId("Ben")))
                .andExpect(status().isCreated());
        String original = draftJson();
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-User-Id", memberId("Alice")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_CONFLICT"));
        assertThat(draftJson()).isEqualTo(original);
        assertThat(activeDraftCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("startDraft_outsiderEve_returns403NotAMember")
    void startDraft_outsiderEve_returns403NotAMember() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .header("X-User-Id", eveId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("startDraft_missingIdentity_returns401MemberRequired")
    void startDraft_missingIdentity_returns401MemberRequired() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("startDraft_unknownTrip_returns404TripNotFound")
    void startDraft_unknownTrip_returns404TripNotFound() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", UNKNOWN_TRIP)
                        .header("X-User-Id", memberId("Ben")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    @DisplayName("startDraft_confirmAndCancelEndpoints_notImplemented")
    void startDraft_confirmAndCancelEndpoints_notImplemented() throws Exception {
        String ben = memberId("Ben");
        int confirm = mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                .header("X-User-Id", ben)).andReturn().getResponse().getStatus();
        int cancel = mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                .header("X-User-Id", ben)).andReturn().getResponse().getStatus();
        assertThat(confirm).isIn(404, 405);
        assertThat(cancel).isIn(404, 405);
        assertThat(activeDraftCount()).isZero();
    }
}