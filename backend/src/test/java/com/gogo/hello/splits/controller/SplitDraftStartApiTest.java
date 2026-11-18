package com.gogo.hello.splits.controller;

import com.gogo.auth.TestAuth;

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
                        .with(TestAuth.asUser(ben)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.data.initiatorMemberId").value(ben))
                .andExpect(jsonPath("$.data.mainPlanVersion").value(1))
                .andExpect(jsonPath("$.data.draftVersion").value(1))
                .andExpect(jsonPath("$.data.status").value("active"));
        assertThat(activeDraftCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("startDraft_mainPlanVersionTwo_pinsTheRealVersionAndKeepsThoseStops")
    void startDraft_mainPlanVersionTwo_pinsTheRealVersionAndKeepsThoseStops() throws Exception {
        seedConfirmedMainPlan(2);
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mainPlanVersion").value(2))
                .andExpect(jsonPath("$.data.draftVersion").value(1));
        Integer projectedAtVersion = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plan_node WHERE trip_id = ? AND branch_id = 'main' AND plan_version = 2",
                Integer.class, sgfTripId());
        assertThat(projectedAtVersion).isEqualTo(4);
        assertThat(mainStopCount()).isEqualTo(4);
    }

    @Test
    @DisplayName("startDraft_confirmedFlagWithoutConfirmedDraft_returns409AndWritesNoStops")
    void startDraft_confirmedFlagWithoutConfirmedDraft_returns409AndWritesNoStops() throws Exception {
        jdbc.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", sgfTripId());
        jdbc.update("DELETE FROM main_plan_draft WHERE trip_id = ?", sgfTripId());
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MAIN_PLAN_NOT_CONFIRMED"));
        assertThat(activeDraftCount()).isZero();
        // The previously projected rows stay untouched; nothing new is invented for a missing plan.
        assertThat(mainStopCount()).isEqualTo(4);
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
                            .with(TestAuth.asUser(member))).andReturn();
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
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MAIN_PLAN_NOT_CONFIRMED"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("startDraft_repeatWhileActive_returns409AndKeepsOriginalDraft")
    void startDraft_repeatWhileActive_returns409AndKeepsOriginalDraft() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isCreated());
        String original = draftJson();
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_CONFLICT"));
        assertThat(draftJson()).isEqualTo(original);
        assertThat(activeDraftCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("startDraft_outsiderEve_returns403NotAMember")
    void startDraft_outsiderEve_returns403NotAMember() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(eveId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("startDraft_missingIdentity_returns401MemberRequired")
    void startDraft_missingIdentity_returns401MemberRequired() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId()).with(TestAuth.csrfOnly()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
        assertThat(activeDraftCount()).isZero();
    }

    @Test
    @DisplayName("startDraft_unknownTrip_returns404TripNotFound")
    void startDraft_unknownTrip_returns404TripNotFound() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", UNKNOWN_TRIP)
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    @DisplayName("startDraft_afterCancel_rebuildsSameRowAsNewInitiator")
    void startDraft_afterCancel_rebuildsSameRowAsNewInitiator() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("draftVersion", version))))
                .andExpect(status().isOk());

        String alice = memberId("Alice");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(alice)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.initiatorMemberId").value(alice))
                .andExpect(jsonPath("$.data.mainPlanVersion").value(1))
                .andExpect(jsonPath("$.data.draftVersion").value(1))
                .andExpect(jsonPath("$.data.status").value("active"))
                .andExpect(jsonPath("$.data.departureStopId").doesNotExist())
                .andExpect(jsonPath("$.data.routes").doesNotExist());
        assertThat(activeDraftCount()).isEqualTo(1);
        assertThat(draftVersionColumn()).isEqualTo(1);
    }

    @Test
    @DisplayName("startDraft_concurrentRebuildAfterCancel_atMostOneSucceeds")
    void startDraft_concurrentRebuildAfterCancel_atMostOneSucceeds() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:cancel", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("draftVersion", version))))
                .andExpect(status().isOk());

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<MvcResult>> futures = new ArrayList<>();
            for (String member : List.of(memberId("Alice"), memberId("Ben"))) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    go.await();
                    return mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                            .with(TestAuth.asUser(member))).andReturn();
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<MvcResult> future : futures) {
                statuses.add(future.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            }
            assertThat(statuses).containsExactlyInAnyOrder(201, 409);
            assertThat(activeDraftCount()).isEqualTo(1);
            assertThat(draftVersionColumn()).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("startDraft_confirmedDraft_returns409ConflictAndKeepsConfirmedDocument")
    void startDraft_confirmedDraft_returns409ConflictAndKeepsConfirmedDocument() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice")))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("draftVersion", version))))
                .andExpect(status().isOk());
        String confirmed = draftJson();

        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Alice"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_CONFLICT"));
        assertThat(draftJson()).isEqualTo(confirmed);
        assertThat(activeDraftCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("startDraft_initialGroups_allMembersInAEmptyB")
    void startDraft_initialGroups_allMembersInAEmptyB() throws Exception {
        String alice = memberId("Alice");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.groups.A.length()").value(4))
                .andExpect(jsonPath("$.data.groups.A[0]").value(alice))
                .andExpect(jsonPath("$.data.groups.B.length()").value(0));
    }

    @Test
    @DisplayName("startDraft_singleMemberTrip_returns409SplitMembersInsufficient")
    void startDraft_singleMemberTrip_returns409SplitMembersInsufficient() throws Exception {
        String alice = memberId("Alice");
        jdbc.update("INSERT INTO trip (name, destination, start_date, end_date, start_location, end_location, organizer_id) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                "Solo Trip", "Singapore", "2026-12-05", "2026-12-05", "Home", "Zoo", alice);
        Integer soloTripId = jdbc.queryForObject("SELECT id FROM trip WHERE name = 'Solo Trip'", Integer.class);
        jdbc.update("UPDATE trip SET main_plan_confirmed = 1 WHERE id = ?", soloTripId);
        jdbc.update("INSERT INTO trip_member (trip_id, user_id) VALUES (?, ?)", soloTripId, alice);

        mockMvc.perform(post("/api/trips/{tripId}/split-draft", String.valueOf(soloTripId))
                        .with(TestAuth.asUser(alice)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("SPLIT_MEMBERS_INSUFFICIENT"));
        assertThat(activeDraftCount()).isZero();
    }
}