package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;

/**
 * Replaceable source of branch route candidates (design D12, R2 seam). The MVP binds a fixed in-process fixture
 * implementation with no external network call; a future real routing provider can replace it without changing
 * the use-case layer. The shared boundary stops are supplied so a real provider could derive travel legs from
 * the endpoints.
 */
public interface BranchCandidateProvider {

    RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion);
}