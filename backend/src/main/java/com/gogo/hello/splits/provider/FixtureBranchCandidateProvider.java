package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteActivity;
import com.gogo.hello.splits.domain.RouteCandidate;
import com.gogo.hello.splits.domain.RouteStep;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Fixed in-process fixture provider (design D12, US-089/US-045). Group A keeps following the confirmed main plan, so
 * its candidate is derived from the main-plan stops inside the boundary pair (names, scheduled durations, the gaps
 * between them and each stop's per-person cost); group B receives a destination-keyed synthetic activity with its own
 * mock cost so the two lanes differ. The costed activities tell the budget check exactly what each group pays inside
 * the window; the replaced shared stops are therefore never counted twice. No external network call; the
 * failing-provider double for G2-N replaces this bean in tests.
 */
@Component
public class FixtureBranchCandidateProvider implements BranchCandidateProvider {

    private record Branch(String activityName, int activityMinutes, List<Integer> travelLegsMinutes,
            int bufferMinutes, int costCents) {
    }

    private static final String SINGAPORE = "Singapore";
    private static final String HONG_KONG = "香港";
    private static final String LONDON = "伦敦";
    private static final String HEFEI = "合肥";

    @Override
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination,
            List<PlanStop> mainPlanStops) {
        if ("A".equals(groupLabel)) {
            return mainLineCandidate(groupLabel, departure, reunion, mainPlanStops);
        }
        Branch branch = branchFor(cityOf(destination), groupLabel);
        return new RouteCandidate(groupLabel, branch.activityName(), branch.activityMinutes(),
                branch.travelLegsMinutes(), branch.bufferMinutes(), List.of(),
                List.of(new RouteActivity(branch.activityName(), branch.activityName(), branch.costCents(),
                        RouteActivity.SOURCE_AI)));
    }

    // Group A follows the confirmed itinerary: every main-plan stop from the departure (inclusive) to the reunion
    // (exclusive), with the scheduled gaps as legs. The totals therefore equal the window exactly, and the activity
    // costs mirror the shared stops the group keeps, so its total stays the full main-plan cost.
    private static RouteCandidate mainLineCandidate(String groupLabel, PlanStop departure, PlanStop reunion,
            List<PlanStop> mainPlanStops) {
        int from = indexOf(mainPlanStops, departure.id());
        int to = indexOf(mainPlanStops, reunion.id());
        if (from < 0 || to <= from) {
            throw new IllegalArgumentException("boundaries are not an ordered main-plan pair");
        }
        List<RouteStep> steps = new ArrayList<>();
        List<RouteActivity> activities = new ArrayList<>();
        List<Integer> legs = new ArrayList<>();
        int activityMinutes = 0;
        for (int index = from; index < to; index++) {
            PlanStop stop = mainPlanStops.get(index);
            int stayMinutes = minutes(stop.startAt(), stop.endAt());
            steps.add(new RouteStep(stop.name(), stayMinutes));
            activities.add(new RouteActivity(stop.name(), stop.name(), stop.costCents(), RouteActivity.SOURCE_MAIN));
            activityMinutes += stayMinutes;
            PlanStop next = index + 1 < to ? mainPlanStops.get(index + 1) : reunion;
            legs.add(Math.max(0, minutes(stop.endAt(), next.startAt())));
        }
        return new RouteCandidate(groupLabel, "沿主线方案", activityMinutes, legs, 0, steps, activities);
    }

    private static int indexOf(List<PlanStop> stops, String id) {
        for (int index = 0; index < stops.size(); index++) {
            if (stops.get(index).id().equals(id)) {
                return index;
            }
        }
        return -1;
    }

    private static int minutes(Instant from, Instant to) {
        if (from == null || to == null) {
            return 0;
        }
        return (int) Duration.between(from, to).toMinutes();
    }

    private static Branch branchFor(String city, String groupLabel) {
        if (HONG_KONG.equals(city)) {
            return switch (groupLabel) {
                case "A" -> new Branch("PMQ 元创方（手作市集）", 50, List.of(15, 20), 10, 6000);
                case "B" -> new Branch("香港故宫文化博物馆", 50, List.of(20, 10), 10, 12000);
                default -> throw new IllegalArgumentException("unknown group label: " + groupLabel);
            };
        }
        if (LONDON.equals(city)) {
            return switch (groupLabel) {
                case "A" -> new Branch("泰特现代美术馆", 50, List.of(15, 15), 10, 0);
                case "B" -> new Branch("博罗市场美食探索", 50, List.of(20, 20), 10, 3000);
                default -> throw new IllegalArgumentException("unknown group label: " + groupLabel);
            };
        }
        if (HEFEI.equals(city)) {
            return switch (groupLabel) {
                case "A" -> new Branch("天鹅湖漫步", 50, List.of(15, 15), 10, 0);
                case "B" -> new Branch("合柴 1972 文创园", 50, List.of(20, 20), 10, 4000);
                default -> throw new IllegalArgumentException("unknown group label: " + groupLabel);
            };
        }
        return switch (groupLabel) {
            case "A" -> new Branch("National Gallery Singapore", 60, List.of(15, 20), 10, 1500);
            case "B" -> new Branch("Gardens by the Bay", 60, List.of(20, 20), 10, 2500);
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
        if (value.contains("合肥") || lower.contains("hefei")) {
            return HEFEI;
        }
        return SINGAPORE;
    }
}
