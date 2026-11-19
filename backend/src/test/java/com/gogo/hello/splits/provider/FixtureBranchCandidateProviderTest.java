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
                .isEqualTo("香港迪士尼乐园");
        assertThat(provider.candidateFor("B", departure, reunion, "伦敦", mainPlanStops).activityName())
                .isEqualTo("博罗市场美食探索");
        assertThat(provider.candidateFor("B", departure, reunion, "合肥", mainPlanStops).activityName())
                .isEqualTo("合柴 1972 文创园");
    }

    @Test
    @DisplayName("candidateFor_groupB_zhuhaiStartsWithTheLovePostOfficeThenAlternates")
    void candidateFor_groupB_zhuhaiStartsWithTheLovePostOfficeThenAlternates() {
        RouteCandidate first = provider.candidateFor("B", departure, reunion, "珠海", mainPlanStops);
        assertThat(first.activityName()).isEqualTo("爱情邮局");
        assertThat(first.locationName()).isEqualTo("珠海市香洲区情侣中路爱情邮局（海滨公园旁）");
        assertThat(first.activityMinutes()).isEqualTo(60);
        assertThat(first.travelLegsMinutes()).containsExactly(20, 20);

        BranchCandidateContext secondRound = new BranchCandidateContext(
                2, null, null, List.of("爱情邮局"));
        RouteCandidate second = provider.candidateFor("B", departure, reunion, "珠海", mainPlanStops, secondRound);
        assertThat(second.activityName()).isEqualTo("珠海长隆海洋王国");
        assertThat(second.locationName()).isEqualTo("珠海市香洲区横琴新区富祥湾长隆旅游度假区");
        assertThat(second.activityMinutes()).isEqualTo(60);
        assertThat(second.travelLegsMinutes()).containsExactly(20, 20);

        BranchCandidateContext thirdRound = new BranchCandidateContext(
                3, null, null, List.of("爱情邮局", "珠海长隆海洋王国"));
        RouteCandidate third = provider.candidateFor("B", departure, reunion, "珠海", mainPlanStops, thirdRound);
        assertThat(third.activityName()).isEqualTo("野狸岛");
        assertThat(third.locationName()).isEqualTo("珠海市香洲区野狸岛（名亭公园）");
        assertThat(third.activityMinutes()).isEqualTo(30);
        assertThat(third.steps()).extracting("name").containsExactly("野狸岛");
        assertThat(third.travelLegsMinutes()).containsExactly(20, 20);
    }

    @Test
    @DisplayName("candidateFor_groupB_hongKongAlternatesTheRemainingTwoPlaces")
    void candidateFor_groupB_hongKongAlternatesTheRemainingTwoPlaces() {
        RouteCandidate first = provider.candidateFor("B", departure, reunion, "香港", mainPlanStops);
        assertThat(first.activityName()).isEqualTo("香港迪士尼乐园");
        assertThat(first.locationName()).isEqualTo("香港新界大屿山竹篙湾香港迪士尼乐园度假区");
        assertThat(first.activityMinutes()).isEqualTo(60);

        BranchCandidateContext secondRound = new BranchCandidateContext(
                2, null, null, List.of("香港迪士尼乐园"));
        RouteCandidate second = provider.candidateFor("B", departure, reunion, "香港", mainPlanStops, secondRound);
        assertThat(second.activityName()).isEqualTo("星光大道");
        assertThat(second.activityMinutes()).isEqualTo(30);
    }

    @Test
    @DisplayName("candidateFor_groupA_ignoresDestination")
    void candidateFor_groupA_ignoresDestination() {
        assertThat(provider.candidateFor("A", departure, reunion, "香港", mainPlanStops))
                .isEqualTo(provider.candidateFor("A", departure, reunion, "Singapore", mainPlanStops));
    }
}
