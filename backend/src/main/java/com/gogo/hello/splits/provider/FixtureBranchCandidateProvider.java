package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Fixed in-process fixture provider (design D12). Candidates are keyed by destination so a demo selecting 香港
 * or 伦敦 gets branch activities that belong to that city; any other destination keeps the original Singapore
 * pair A -> National Gallery Singapore (60/[15,20]/10) and B -> Gardens by the Bay (60/[20,20]/10). No external
 * network call and no HTTP client dependency; the boundary stops are accepted for interface compatibility but
 * the MVP returns fixed values. The failing-provider double for G2-N replaces this bean in tests.
 */
@Component
public class FixtureBranchCandidateProvider implements BranchCandidateProvider {

    private record Branch(String activityName, int activityMinutes, List<Integer> travelLegsMinutes,
            int bufferMinutes) {
    }

    private static final String SINGAPORE = "Singapore";
    private static final String HONG_KONG = "香港";
    private static final String LONDON = "伦敦";

    @Override
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination) {
        String city = cityOf(destination);
        Branch branch = branchFor(city, groupLabel);
        return new RouteCandidate(groupLabel, branch.activityName(), branch.activityMinutes(),
                branch.travelLegsMinutes(), branch.bufferMinutes());
    }

    private static Branch branchFor(String city, String groupLabel) {
        if (HONG_KONG.equals(city)) {
            return switch (groupLabel) {
                case "A" -> new Branch("PMQ 元创方（手作市集）", 50, List.of(15, 20), 10);
                case "B" -> new Branch("香港故宫文化博物馆", 50, List.of(20, 10), 10);
                default -> throw new IllegalArgumentException("unknown group label: " + groupLabel);
            };
        }
        if (LONDON.equals(city)) {
            return switch (groupLabel) {
                case "A" -> new Branch("泰特现代美术馆", 50, List.of(15, 15), 10);
                case "B" -> new Branch("博罗市场美食探索", 50, List.of(20, 20), 10);
                default -> throw new IllegalArgumentException("unknown group label: " + groupLabel);
            };
        }
        return switch (groupLabel) {
            case "A" -> new Branch("National Gallery Singapore", 60, List.of(15, 20), 10);
            case "B" -> new Branch("Gardens by the Bay", 60, List.of(20, 20), 10);
            default -> throw new IllegalArgumentException("unknown group label: " + groupLabel);
        };
    }

    private static String cityOf(String destination) {
        String value = destination == null ? "" : destination.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        if (value.contains("香港") || lower.contains("hong kong")) {
            return HONG_KONG;
        }
        if (value.contains("伦敦") || lower.contains("london")) {
            return LONDON;
        }
        return SINGAPORE;
    }
}
