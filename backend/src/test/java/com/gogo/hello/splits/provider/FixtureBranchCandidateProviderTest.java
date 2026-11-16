package com.gogo.hello.splits.provider;

import static org.assertj.core.api.Assertions.assertThat;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the fixed in-process branch candidate provider (design D12, task 4.2). Verifies the fixture
 * candidates A -> National Gallery Singapore (60/[15,20]/10) and B -> Gardens by the Bay (60/[20,20]/10) with
 * no external network dependency. The boundary stops are accepted for the replaceable interface (R2 seam) but
 * the MVP fixture returns fixed values.
 */
class FixtureBranchCandidateProviderTest {

    private final FixtureBranchCandidateProvider provider = new FixtureBranchCandidateProvider();
    private final PlanStop departure = new PlanStop(
            "dep", "City Hall MRT", Instant.parse("2026-12-05T01:00:00Z"), Instant.parse("2026-12-05T01:30:00Z"));
    private final PlanStop reunion = new PlanStop(
            "reu", "Merlion Park", Instant.parse("2026-12-05T03:30:00Z"), Instant.parse("2026-12-05T04:00:00Z"));

    @Test
    @DisplayName("candidateFor_groupA_nationalGalleryFixedDurations")
    void candidateFor_groupA_nationalGalleryFixedDurations() {
        RouteCandidate candidate = provider.candidateFor("A", departure, reunion);
        assertThat(candidate.groupLabel()).isEqualTo("A");
        assertThat(candidate.activityName()).isEqualTo("National Gallery Singapore");
        assertThat(candidate.activityMinutes()).isEqualTo(60);
        assertThat(candidate.travelLegsMinutes()).containsExactly(15, 20);
        assertThat(candidate.bufferMinutes()).isEqualTo(10);
    }

    @Test
    @DisplayName("candidateFor_groupB_gardensByTheBayFixedDurations")
    void candidateFor_groupB_gardensByTheBayFixedDurations() {
        RouteCandidate candidate = provider.candidateFor("B", departure, reunion);
        assertThat(candidate.groupLabel()).isEqualTo("B");
        assertThat(candidate.activityName()).isEqualTo("Gardens by the Bay");
        assertThat(candidate.activityMinutes()).isEqualTo(60);
        assertThat(candidate.travelLegsMinutes()).containsExactly(20, 20);
        assertThat(candidate.bufferMinutes()).isEqualTo(10);
    }
}