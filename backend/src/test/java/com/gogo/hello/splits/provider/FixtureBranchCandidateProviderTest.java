package com.gogo.hello.splits.provider;

import static org.assertj.core.api.Assertions.assertThat;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the fixed in-process branch candidate provider (design D12, US-089/US-045). Group A keeps the
 * confirmed itinerary: its steps, activity minutes, legs and mirrored activity costs are derived from the main-plan
 * stops inside the boundary pair. Group B keeps the destination-keyed synthetic activity (Singapore default, 香港/伦敦
 * city fixtures) with its own mock cost.
 */
class FixtureBranchCandidateProviderTest {

    private final FixtureBranchCandidateProvider provider = new FixtureBranchCandidateProvider();

    private final List<PlanStop> mainPlanStops = List.of(
            stop("s1", "City Hall MRT", "2026-12-05T01:00:00Z", "2026-12-05T01:30:00Z", 500),
            stop("s2", "National Gallery Singapore", "2026-12-05T02:00:00Z", "2026-12-05T02:30:00Z", 1500),
            stop("s3", "Gardens by the Bay", "2026-12-05T03:00:00Z", "2026-12-05T03:15:00Z", 2000),
            stop("s4", "Merlion Park", "2026-12-05T03:30:00Z", "2026-12-05T04:00:00Z", 1000));

    private final PlanStop departure = mainPlanStops.get(0);
    private final PlanStop reunion = mainPlanStops.get(3);

    private static PlanStop stop(String id, String title, String start, String end, int costCents) {
        return new PlanStop(id, title, Instant.parse(start), Instant.parse(end), costCents, title);
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
        assertThat(candidate.activities()).extracting("name")
                .containsExactly("City Hall MRT", "National Gallery Singapore", "Gardens by the Bay");
        assertThat(candidate.activities()).extracting("costCents").containsExactly(500, 1500, 2000);
        assertThat(candidate.activities()).extracting("source").containsOnly("main");
    }

    @Test
    @DisplayName("candidateFor_groupA_nullDepartureStartsAtFirstStop")
    void candidateFor_groupA_nullDepartureStartsAtFirstStop() {
        RouteCandidate candidate = provider.candidateFor("A", null, reunion, "Singapore", mainPlanStops);
        assertThat(candidate.activityName()).isEqualTo("City Hall MRT → Gardens by the Bay");
        assertThat(candidate.locationName()).isEqualTo("City Hall MRT");
        assertThat(candidate.activityMinutes()).isEqualTo(75);
        assertThat(candidate.travelLegsMinutes()).containsExactly(30, 30, 15);
        assertThat(candidate.steps()).extracting("name")
                .containsExactly("City Hall MRT", "National Gallery Singapore", "Gardens by the Bay");
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
        assertThat(candidate.bufferMinutes()).isZero();
        assertThat(candidate.steps()).extracting("name").containsExactly("Gardens by the Bay");
        assertThat(candidate.steps()).extracting("minutes").containsExactly(60);
        assertThat(candidate.activities()).hasSize(1);
        assertThat(candidate.activities().get(0).costCents()).isEqualTo(2500);
        assertThat(candidate.activities().get(0).source()).isEqualTo("ai");
    }

    @Test
    @DisplayName("candidateFor_groupB_nullDepartureKeepsOnlyTheReturnLeg")
    void candidateFor_groupB_nullDepartureKeepsOnlyTheReturnLeg() {
        RouteCandidate candidate = provider.candidateFor("B", null, reunion, "Singapore", mainPlanStops);
        assertThat(candidate.activityName()).isEqualTo("Gardens by the Bay");
        assertThat(candidate.travelLegsMinutes()).containsExactly(20);
        assertThat(candidate.steps()).extracting("name").containsExactly("Gardens by the Bay");
        assertThat(candidate.steps()).extracting("minutes").containsExactly(60);
    }

    @Test
    @DisplayName("candidateFor_groupB_returnsCityFixture")
    void candidateFor_groupB_returnsCityFixture() {
        assertThat(provider.candidateFor("B", departure, reunion, "香港", mainPlanStops).activityName())
                .isEqualTo("香港迪士尼乐园 → 星光大道");
        assertThat(provider.candidateFor("B", departure, reunion, "伦敦", mainPlanStops).activityName())
                .isEqualTo("博罗市场美食探索");
        assertThat(provider.candidateFor("B", departure, reunion, "合肥", mainPlanStops).activityName())
                .isEqualTo("合柴 1972 文创园");
    }

    @Test
    @DisplayName("candidateFor_groupB_zhuhaiAddsTheRemainingTwoPlaces")
    void candidateFor_groupB_zhuhaiAddsTheRemainingTwoPlaces() {
        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "珠海", mainPlanStops);

        assertThat(candidate.activityName()).isEqualTo("珠海长隆海洋王国 → 野狸岛");
        assertThat(candidate.activityMinutes()).isEqualTo(90);
        assertThat(candidate.steps()).extracting("name")
                .containsExactly("珠海长隆海洋王国", "野狸岛");
        assertThat(candidate.steps()).extracting("minutes").containsExactly(60, 30);
        assertThat(candidate.travelLegsMinutes()).containsExactly(20, 20, 20);
        assertThat(candidate.activities()).extracting("name")
                .containsExactly("珠海长隆海洋王国", "野狸岛");
    }

    @Test
    @DisplayName("candidateFor_groupB_hongKongAddsTheRemainingTwoPlaces")
    void candidateFor_groupB_hongKongAddsTheRemainingTwoPlaces() {
        RouteCandidate candidate = provider.candidateFor("B", departure, reunion, "香港", mainPlanStops);

        assertThat(candidate.activityName()).isEqualTo("香港迪士尼乐园 → 星光大道");
        assertThat(candidate.activityMinutes()).isEqualTo(90);
        assertThat(candidate.steps()).extracting("name")
                .containsExactly("香港迪士尼乐园", "星光大道");
        assertThat(candidate.travelLegsMinutes()).containsExactly(20, 20, 20);
    }

    @Test
    @DisplayName("candidateFor_groupA_ignoresDestination")
    void candidateFor_groupA_ignoresDestination() {
        assertThat(provider.candidateFor("A", departure, reunion, "香港", mainPlanStops))
                .isEqualTo(provider.candidateFor("A", departure, reunion, "Singapore", mainPlanStops));
    }
}
