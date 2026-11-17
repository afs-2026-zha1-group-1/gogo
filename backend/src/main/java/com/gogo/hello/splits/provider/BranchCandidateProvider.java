package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import java.util.List;

/**
 * Replaceable source of branch route candidates (design D12, R2 seam). The MVP binds a fixed in-process fixture
 * implementation with no external network call; a future real routing provider can replace it without changing
 * the use-case layer. The shared boundary stops are supplied so a real provider could derive travel legs from
 * the endpoints; the trip destination lets the fixture pick a city-appropriate activity and the ordered main-plan
 * stops let the group that keeps the confirmed itinerary derive its route.
 */
public interface BranchCandidateProvider {

    RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination,
            List<PlanStop> mainPlanStops);
}