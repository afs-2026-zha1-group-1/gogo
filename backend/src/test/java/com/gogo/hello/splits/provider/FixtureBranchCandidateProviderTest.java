package com.gogo.hello.splits.provider;

import static org.assertj.core.api.Assertions.assertThat;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the fixed in-process branch candidate provider (design D12, US-089). Group A keeps the confirmed
 * itinerary: its steps, activity minutes and legs are derived from the main-plan stops inside the boundary pair.
 * Group B keeps the destination-keyed synthetic activity (Singapore default, 香港/伦敦 city fixtures).
 */
class FixtureBranchCandidateProviderTest {

    private final FixtureBranchCandidateProvider provider = new FixtureBranchCandidateProvider();

    private final List<PlanStop> mainPlanStops = List.of(
            stop("s1", "City Hall MRT", "2026-12-05T01:00:00Z", "2026-12-05T01:30:00Z"),
            stop("s2", "National Gallery Singapore", "2026-12-05T02:00:00Z", "2026-12-05T02:30:00Z"),
            stop("s3", "Gardens by the Bay", "2026-12-05T03:00:00Z", "2026-12-05T03:15:00Z"),
            stop("s4", "Merlion Park", "2026-12-05T03:30:00Z", "2026-12-05T04:00:00Z"));

    private final PlanStop departure = mainPlanStops.get(0);
    private final PlanStop reunion = mainPlanStops.get(3);

    private static PlanStop stop(String id, String title, String start, String end) {
        return new PlanStop(id, title, Instant.parse(start), Instant.parse(end), title);
    }

    @Test
    @DisplayName("candidateFor_groupA_followsMainPlanInsideBoundaries")
    void candidateFor_groupA_followsMainPlanInsideBoundaries() {
        RouteCandidate candidate = provider.candidateFor("A", departure, reunion, "Singapore", mainPlanStops);
        assertThat(candidate.groupLabel()).isEqualTo("A");
        assertThat(candidate.activityName()).isEqualTo("City Hall MRT → Gardens by the Bay");
        assertThat(candidate.locationName()).isEqualTo("City Hall MRT");
        assertThat(candidate.activityMinutes()).isEqualTo(75);
        assertThat(candidate.travelLegsMinutes()).containsExactly(30, 30, 15);
        assertThat(candidate.bufferMinutes()).isZero();
        assertThat(candidate.steps()).extracting("name")
                .containsExactly("City Hall MRT", "National Gallery Singapore", "Gardens by the Bay");
        assertThat(candidate.steps()).extracting("minutes").containsExactly(30, 30, 15);
    }

    @Test
    @DisplayName("candidateFor_groupB_keepsSingaporeFixture")
    void candidateFor_groupB_keepsSingaporeFixture() {
        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "Singapore", mainPlanStops);
        assertThat(candidate.groupLabel()).isEqualTo("B");
        assertThat(candidate.activityName()).isEqualTo("Gardens by the Bay");
        assertThat(candidate.locationName()).isEqualTo("Singapore");
        assertThat(candidate.activityMinutes()).isEqualTo(60);
        assertThat(candidate.travelLegsMinutes()).containsExactly(20, 20);
        assertThat(candidate.bufferMinutes()).isEqualTo(10);
        assertThat(candidate.steps()).isEmpty();
    }

    @Test
    @DisplayName("candidateFor_groupB_returnsCityFixture")
    void candidateFor_groupB_returnsCityFixture() {
        assertThat(provider.candidateFor("B", departure, reunion, "香港", mainPlanStops).activityName())
                .isEqualTo("香港故宫文化博物馆");
        assertThat(provider.candidateFor("B", departure, reunion, "伦敦", mainPlanStops).activityName())
                .isEqualTo("博罗市场美食探索");
    }

    @Test
    @DisplayName("candidateFor_groupA_ignoresDestination")
    void candidateFor_groupA_ignoresDestination() {
        assertThat(provider.candidateFor("A", departure, reunion, "香港", mainPlanStops))
                .isEqualTo(provider.candidateFor("A", departure, reunion, "Singapore", mainPlanStops));
    }
}
