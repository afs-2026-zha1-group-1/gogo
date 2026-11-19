package com.gogo.hello.splits.provider;

import java.util.List;

import com.gogo.hello.common.MockDestinations;
import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;

/**
 * 珠海/香港 demos must stay deterministic even when an LLM key is configured. This decorator routes those two
 * destinations to the fixed fixture and every other destination to the primary provider (AI or fixture).
 */
class MockDestinationBranchCandidateProvider implements BranchCandidateProvider {

    private final BranchCandidateProvider mock;
    private final BranchCandidateProvider primary;

    MockDestinationBranchCandidateProvider(BranchCandidateProvider mock, BranchCandidateProvider primary) {
        this.mock = mock;
        this.primary = primary;
    }

    @Override
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination,
            List<PlanStop> mainPlanStops) {
        return delegate(destination).candidateFor(groupLabel, departure, reunion, destination, mainPlanStops);
    }

    @Override
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination,
            List<PlanStop> mainPlanStops, BranchCandidateContext context) {
        return delegate(destination).candidateFor(groupLabel, departure, reunion, destination, mainPlanStops, context);
    }

    private BranchCandidateProvider delegate(String destination) {
        return MockDestinations.isMock(destination) ? mock : primary;
    }
}
