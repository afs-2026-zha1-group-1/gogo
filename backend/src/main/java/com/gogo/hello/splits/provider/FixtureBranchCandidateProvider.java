package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Fixed in-process fixture provider (design D12): A -> National Gallery Singapore (60/[15,20]/10),
 * B -> Gardens by the Bay (60/[20,20]/10). No external network call and no HTTP client dependency; the boundary
 * stops are accepted for interface compatibility but the MVP returns fixed values. The failing-provider double
 * for G2-N replaces this bean in tests.
 */
@Component
public class FixtureBranchCandidateProvider implements BranchCandidateProvider {

    @Override
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion) {
        return switch (groupLabel) {
            case "A" -> new RouteCandidate("A", "National Gallery Singapore", 60, List.of(15, 20), 10);
            case "B" -> new RouteCandidate("B", "Gardens by the Bay", 60, List.of(20, 20), 10);
            default -> throw new IllegalArgumentException("unknown group label: " + groupLabel);
        };
    }
}