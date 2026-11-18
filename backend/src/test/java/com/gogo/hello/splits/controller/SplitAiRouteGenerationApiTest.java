package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.JsonNode;
import com.gogo.auth.TestAuth;
import com.gogo.mainplan.DeepSeekPlanClient;
import com.gogo.mainplan.PlanAiException;

/**
 * AI branch generation at the API layer (spec AI1/AI2-N/AI3-N + gate no-call, design D2/D5). Setting
 * {@code gogo.plan.ai.api-key} switches the BranchCandidateProvider config to AiBranchCandidateProvider while the
 * stubbed DeepSeekPlanClient keeps every request offline; the split base seeds the confirmed main plan directly, so
 * the main-plan AiMainPlanProvider is never invoked. G4-N/G5-N/G6-N must reject before any AI call.
 */
@TestPropertySource(properties = "gogo.plan.ai.api-key=test-key")
@Import(SplitAiRouteGenerationApiTest.StubConfig.class)
class SplitAiRouteGenerationApiTest extends AbstractSplitApiTest {

    private static final AtomicInteger CALLS = new AtomicInteger();
    private static final AtomicReference<DeepSeekPlanClient> DELEGATE = new AtomicReference<>();

    private static final String VALID_B = """
            {"steps":[{"name":"Singapore Botanic Gardens","minutes":75}],
             "travelLegsMinutes":[25,35]}
            """;

    @TestConfiguration
    static class StubConfig {

        @Bean
        DeepSeekPlanClient deepSeekPlanClient() {
            return (systemPrompt, userJson) -> {
                CALLS.incrementAndGet();
                return DELEGATE.get().complete(systemPrompt, userJson);
            };
        }
    }

    @BeforeEach
    void resetStub() {
        CALLS.set(0);
        DELEGATE.set((systemPrompt, userJson) -> VALID_B);
    }

    @Test
    @DisplayName("generateRoutes_aiSuccess_persistsAiBGroupAndAFollowsMain")
    void generateRoutes_aiSuccess_persistsAiBGroupAndAFollowsMain() throws Exception {
        startDraft();
        saveBoundaries(1);
        assignAs("Chloe", "B", 2);
        String cityHall = stopId("City Hall MRT");
        String merlion = stopId("Merlion Park");
        postGenerate(memberId("Ben"), 3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draftVersion").value(4))
                .andExpect(jsonPath("$.data.routes[1].groupLabel").value("B"))
                .andExpect(jsonPath("$.data.routes[1].activityName").value("Singapore Botanic Gardens"))
                .andExpect(jsonPath("$.data.routes[1].locationName").value("Singapore"))
                .andExpect(jsonPath("$.data.routes[1].departureStopId").value(cityHall))
                .andExpect(jsonPath("$.data.routes[1].reunionStopId").value(merlion))
                .andExpect(jsonPath("$.data.routes[1].activityMinutes").value(75))
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[0]").value(25))
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[1]").value(35))
                .andExpect(jsonPath("$.data.routes[1].bufferMinutes").value(0))
                .andExpect(jsonPath("$.data.routes[1].steps[0].name").value("Singapore Botanic Gardens"));
        assertThat(CALLS.get()).isEqualTo(1);
        JsonNode draft = objectMapper.readTree(draftJson());
        assertThat(draft.get("routes").get("A").get("activityMinutes").asInt()).isEqualTo(75);
        assertThat(draft.get("routes").get("B").get("steps").get(0).get("name").asText())
                .isEqualTo("Singapore Botanic Gardens");
    }

    @Test
    @DisplayName("generateRoutes_overWindow_degradesToFixtureB")
    void generateRoutes_overWindow_degradesToFixtureB() throws Exception {
        DELEGATE.set((systemPrompt, userJson) -> """
                {"steps":[{"name":"Gardens by the Bay","minutes":120}],
                 "travelLegsMinutes":[20,20]}
                """);
        startDraft();
        saveBoundaries(1);
        assignAs("Chloe", "B", 2);
        postGenerate(memberId("Ben"), 3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.routes[1].activityName").value("Gardens by the Bay"))
                .andExpect(jsonPath("$.data.routes[1].activityMinutes").value(60))
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[0]").value(20))
                .andExpect(jsonPath("$.data.routes[1].travelLegsMinutes[1]").value(20));
        assertThat(CALLS.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("generateRoutes_aiFailure_degradesToFixtureB")
    void generateRoutes_aiFailure_degradesToFixtureB() throws Exception {
        DELEGATE.set((systemPrompt, userJson) -> {
            throw new PlanAiException(PlanAiException.Reason.HTTP, "boom");
        });
        startDraft();
        saveBoundaries(1);
        assignAs("Chloe", "B", 2);
        postGenerate(memberId("Ben"), 3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.routes[1].activityName").value("Gardens by the Bay"))
                .andExpect(jsonPath("$.data.routes[1].locationName").value("Singapore"));
        assertThat(CALLS.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("generateRoutes_emptyGroup_doesNotCallAi")
    void generateRoutes_emptyGroup_doesNotCallAi() throws Exception {
        startDraft();
        saveBoundaries(1);
        postGenerate(memberId("Ben"), 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_INCOMPLETE"));
        assertThat(CALLS.get()).isZero();
    }

    @Test
    @DisplayName("generateRoutes_nonInitiator_doesNotCallAi")
    void generateRoutes_nonInitiator_doesNotCallAi() throws Exception {
        startDraft();
        saveBoundaries(1);
        postGenerate(memberId("Chloe"), 2)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_SPLIT_INITIATOR"));
        assertThat(CALLS.get()).isZero();
    }

    @Test
    @DisplayName("generateRoutes_noBoundaries_doesNotCallAi")
    void generateRoutes_noBoundaries_doesNotCallAi() throws Exception {
        startDraft();
        postGenerate(memberId("Ben"), 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_BOUNDARIES_REQUIRED"));
        assertThat(CALLS.get()).isZero();
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