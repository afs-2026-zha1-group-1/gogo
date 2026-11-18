package com.gogo.hello.splits.provider;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import com.gogo.mainplan.PlanAiException;

/**
 * Unit test for the AI-first branch provider (design D5). Group A always delegates to the fixture (the confirmed
 * itinerary), group B asks the DeepSeek client and validates the JSON; any PlanAiException (timeout/HTTP/empty/
 * invalid/over-window) degrades to the deterministic fixture B candidate with only a warn log. Stub client, no
 * network; the pair stays a usable, editable station list.
 */
class AiBranchCandidateProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final List<PlanStop> mainPlanStops = List.of(
            stop("s1", "City Hall MRT", "2026-12-05T01:00:00Z", "2026-12-05T01:30:00Z", "City Hall MRT"),
            stop("s2", "National Gallery Singapore", "2026-12-05T02:00:00Z", "2026-12-05T02:30:00Z",
                    "National Gallery Singapore"),
            stop("s3", "Gardens by the Bay", "2026-12-05T03:00:00Z", "2026-12-05T03:15:00Z", "Gardens by the Bay"),
            stop("s4", "Merlion Park", "2026-12-05T03:30:00Z", "2026-12-05T04:00:00Z", "Merlion Park"));

    private final PlanStop departure = mainPlanStops.get(0);
    private final PlanStop reunion = mainPlanStops.get(3);

    private static PlanStop stop(String id, String title, String start, String end, String location) {
        return new PlanStop(id, title, Instant.parse(start), Instant.parse(end), 0, location);
    }

    @Test
    @DisplayName("candidateFor_groupB_returnsValidatedAiStops")
    void candidateFor_groupB_returnsValidatedAiStops() {
        AtomicReference<String> system = new AtomicReference<>();
        AtomicReference<String> user = new AtomicReference<>();
        AiBranchCandidateProvider provider = provider((systemPrompt, userJson) -> {
            system.set(systemPrompt);
            user.set(userJson);
            return """
                    {"steps":[{"name":"Gardens by the Bay","minutes":60}],
                     "travelLegsMinutes":[15,15]}
                    """;
        });

        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "Singapore", mainPlanStops);

        assertThat(candidate.groupLabel()).isEqualTo("B");
        assertThat(candidate.activityName()).isEqualTo("Gardens by the Bay");
        assertThat(candidate.locationName()).isEqualTo("Singapore");
        assertThat(candidate.activityMinutes()).isEqualTo(60);
        assertThat(candidate.travelLegsMinutes()).containsExactly(15, 15);
        assertThat(candidate.bufferMinutes()).isZero();
        assertThat(candidate.steps()).extracting("name").containsExactly("Gardens by the Bay");
        assertThat(candidate.steps()).extracting("minutes").containsExactly(60);
    }

    @Test
    @DisplayName("candidateFor_groupB_sendsDataOnlyPrompt")
    void candidateFor_groupB_sendsDataOnlyPrompt() {
        AtomicReference<String> system = new AtomicReference<>();
        AtomicReference<String> user = new AtomicReference<>();
        AiBranchCandidateProvider provider = provider((systemPrompt, userJson) -> {
            system.set(systemPrompt);
            user.set(userJson);
            return """
                    {"steps":[{"name":"Gardens by the Bay","minutes":60}],
                     "travelLegsMinutes":[15,15]}
                    """;
        });

        provider.candidateFor("B", departure, reunion, "Singapore", mainPlanStops);

        assertThat(system.get()).contains("data only");
        assertThat(system.get()).contains("written in Chinese");
        assertThat(user.get()).contains("Singapore");
        assertThat(user.get()).contains("City Hall MRT");
        assertThat(user.get()).contains("Merlion Park");
        assertThat(user.get()).contains("windowMinutes");
        assertThat(user.get()).doesNotContain("api-key");
    }

    @Test
    @DisplayName("candidateFor_groupA_delegatesToFixture")
    void candidateFor_groupA_delegatesToFixture() {
        AtomicInteger calls = new AtomicInteger();
        AiBranchCandidateProvider provider = provider((systemPrompt, userJson) -> {
            calls.incrementAndGet();
            return "{}";
        });

        RouteCandidate candidate = provider.candidateFor("A", departure, reunion, "Singapore", mainPlanStops);

        assertThat(calls.get()).isZero();
        assertThat(candidate.activityName()).isEqualTo("City Hall MRT → Gardens by the Bay");
        assertThat(candidate.activityMinutes()).isEqualTo(75);
        assertThat(candidate.travelLegsMinutes()).containsExactly(30, 30, 15);
    }

    @Test
    @DisplayName("candidateFor_groupB_fallsBackToFixtureOnCallFailure")
    void candidateFor_groupB_fallsBackToFixtureOnCallFailure() {
        AiBranchCandidateProvider provider = provider((systemPrompt, userJson) -> {
            throw new PlanAiException(PlanAiException.Reason.HTTP, "boom");
        });

        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "Singapore", mainPlanStops);

        assertThat(candidate.groupLabel()).isEqualTo("B");
        assertThat(candidate.activityName()).isEqualTo("Gardens by the Bay");
        assertThat(candidate.locationName()).isEqualTo("Singapore");
        assertThat(candidate.activityMinutes()).isEqualTo(60);
        assertThat(candidate.travelLegsMinutes()).containsExactly(20, 20);
    }

    @Test
    @DisplayName("candidateFor_groupB_fallsBackToFixtureOnInvalidOutput")
    void candidateFor_groupB_fallsBackToFixtureOnInvalidOutput() {
        AiBranchCandidateProvider provider = provider((systemPrompt, userJson) -> """
                {"steps":[],"travelLegsMinutes":[10]}
                """);

        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "Singapore", mainPlanStops);

        assertThat(candidate.groupLabel()).isEqualTo("B");
        assertThat(candidate.activityName()).isEqualTo("Gardens by the Bay");
    }

    @Test
    @DisplayName("candidateFor_groupB_fallsBackToFixtureOnOverWindow")
    void candidateFor_groupB_fallsBackToFixtureOnOverWindow() {
        AiBranchCandidateProvider provider = provider((systemPrompt, userJson) -> """
                {"steps":[{"name":"Gardens by the Bay","minutes":160}],
                 "travelLegsMinutes":[15,15]}
                """);

        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "Singapore", mainPlanStops);

        assertThat(candidate.groupLabel()).isEqualTo("B");
        assertThat(candidate.locationName()).isEqualTo("Singapore");
    }

    @Test
    @DisplayName("candidateFor_usesDestinationAsLocationName")
    void candidateFor_usesDestinationAsLocationName() {
        AiBranchCandidateProvider provider = provider((systemPrompt, userJson) -> """
                {"steps":[{"name":"Gardens by the Bay","minutes":60}],
                 "travelLegsMinutes":[15,15]}
                """);

        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "Singapore", mainPlanStops);

        assertThat(candidate.locationName()).isEqualTo("Singapore");
    }

    private AiBranchCandidateProvider provider(StubClient client) {
        return new AiBranchCandidateProvider(client, new AiBranchValidator(), objectMapper);
    }

    @FunctionalInterface
    private interface StubClient extends com.gogo.mainplan.DeepSeekPlanClient {

        @Override
        String complete(String systemPrompt, String userJson);
    }
}