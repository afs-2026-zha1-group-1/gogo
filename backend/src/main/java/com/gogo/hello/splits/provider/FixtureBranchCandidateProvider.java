package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteActivity;
import com.gogo.hello.splits.domain.RouteCandidate;
import com.gogo.hello.splits.domain.RoutePairEdit;
import com.gogo.hello.splits.domain.RouteStep;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Fixed in-process fixture provider (design D12, US-089). Group A keeps following the confirmed main plan, so its
 * candidate is derived from the main-plan stops inside the boundary pair (names, scheduled durations and the gaps
 * between them); group B receives a destination-keyed synthetic activity so the two lanes differ. No external
 * network call; the failing-provider double for G2-N replaces this bean in tests. US-045 adds the costed
 * activities of each lane so the budget check can price what the group pays inside the window. Not a Spring
 * component: the {@link BranchCandidateProviderConfig} selects it when no AI key is configured.
 */
public class FixtureBranchCandidateProvider implements BranchCandidateProvider {

    private record Branch(String activityName, int activityMinutes, List<Integer> travelLegsMinutes,
            int bufferMinutes, int costCents) {
    }

    private static final String SINGAPORE = "Singapore";
    private static final String HONG_KONG = "香港";
    private static final String ZHUHAI = "珠海";
    private static final String LONDON = "伦敦";
    private static final String HEFEI = "合肥";

    @Override
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination,
            List<PlanStop> mainPlanStops) {
        return candidateFor(groupLabel, departure, reunion, destination, mainPlanStops,
                BranchCandidateContext.empty());
    }

    @Override
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination,
            List<PlanStop> mainPlanStops, BranchCandidateContext context) {
        if ("A".equals(groupLabel)) {
            return mainLineCandidate(groupLabel, departure, reunion, mainPlanStops);
        }
        List<String> excluded = context == null ? List.of() : context.excludeActivityNames();
        int roundIndex = context == null ? 1 : context.roundIndex();
        Branch branch = branchFor(cityOf(destination), groupLabel, excluded, roundIndex);
        String activityName = RoutePairEdit.cleanStationName(branch.activityName());
        String location = destination == null || destination.isBlank() ? activityName : destination.trim();
        List<RouteStep> steps = List.of(new RouteStep(activityName, branch.activityMinutes()));
        List<RouteActivity> activities = List.of(new RouteActivity(activityName, location,
                branch.costCents(), RouteActivity.SOURCE_AI));
        // US-095 FROM_START: group B starts at its own activity, so there is no outbound leg.
        List<Integer> legs = departure == null
                ? branch.travelLegsMinutes().subList(1, branch.travelLegsMinutes().size())
                : branch.travelLegsMinutes();
        return new RouteCandidate(groupLabel, activityName, location, branch.activityMinutes(), legs, 0, steps,
                activities);
    }

    // Group A follows the confirmed itinerary: every main-plan stop from the departure (inclusive) to the reunion
    // (exclusive), with the scheduled gaps as legs. A null departure starts at the first stop (US-095 FROM_START).
    // The totals equal the window exactly in every mode.
    private static RouteCandidate mainLineCandidate(String groupLabel, PlanStop departure, PlanStop reunion,
            List<PlanStop> mainPlanStops) {
        int from = departure == null ? 0 : indexOf(mainPlanStops, departure.id());
        int to = indexOf(mainPlanStops, reunion.id());
        if (from < 0 || to <= from) {
            throw new IllegalArgumentException("boundaries are not an ordered main-plan pair");
        }
        List<RouteStep> steps = new ArrayList<>();
        List<Integer> legs = new ArrayList<>();
        int activityMinutes = 0;
        for (int index = from; index < to; index++) {
            PlanStop stop = mainPlanStops.get(index);
            int stayMinutes = minutes(stop.startAt(), stop.endAt());
            steps.add(new RouteStep(RoutePairEdit.cleanStationName(stop.name()), stayMinutes));
            activityMinutes += stayMinutes;
            PlanStop next = index + 1 < to ? mainPlanStops.get(index + 1) : reunion;
            legs.add(Math.max(0, minutes(stop.endAt(), next.startAt())));
        }
        String activityName = steps.get(0).name();
        String lastStep = steps.get(steps.size() - 1).name();
        if (!activityName.equals(lastStep)) {
            activityName = activityName + " → " + lastStep;
        }
        PlanStop anchor = departure == null ? mainPlanStops.get(from) : departure;
        String location = anchor.locationName() == null || anchor.locationName().isBlank()
                ? anchor.name()
                : anchor.locationName();
        location = RoutePairEdit.cleanStationName(location);
        List<RouteActivity> activities = new ArrayList<>();
        for (int index = from; index < to; index++) {
            PlanStop stop = mainPlanStops.get(index);
            activities.add(new RouteActivity(stop.name(), stop.name(), stop.costCents(),
                    RouteActivity.SOURCE_MAIN));
        }
        return new RouteCandidate(groupLabel, activityName, location, activityMinutes, legs, 0, steps,
                activities);
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

    private static Branch branchFor(String city, String groupLabel, List<String> excludeActivityNames, int roundIndex) {
        List<Branch> candidates = switch (city) {
            case HONG_KONG -> List.of(
                    new Branch("香港迪士尼乐园", 60, List.of(20, 20), 0, 0),
                    new Branch("星光大道", 30, List.of(20, 20), 0, 0));
            case ZHUHAI -> List.of(
                    new Branch("珠海长隆海洋王国", 60, List.of(20, 20), 0, 0),
                    new Branch("野狸岛", 30, List.of(20, 20), 0, 0));
            case LONDON -> List.of(
                    new Branch("博罗市场美食探索", 50, List.of(20, 20), 10, 3000),
                    new Branch("格林威治市场", 50, List.of(20, 20), 10, 2500));
            case HEFEI -> List.of(
                    new Branch("合柴 1972 文创园", 50, List.of(20, 20), 10, 4000),
                    new Branch("安徽博物院", 50, List.of(20, 20), 10, 3000));
            default -> List.of(
                    new Branch("Gardens by the Bay", 60, List.of(20, 20), 10, 2500),
                    new Branch("新加坡国家博物馆", 60, List.of(20, 20), 10, 2000));
        };
        if (!"B".equals(groupLabel)) {
            throw new IllegalArgumentException("unknown group label: " + groupLabel);
        }
        List<Branch> kept = new ArrayList<>();
        for (Branch candidate : candidates) {
            String cleaned = RoutePairEdit.cleanStationName(candidate.activityName());
            if (!excludeActivityNames.contains(candidate.activityName())
                    && !excludeActivityNames.contains(cleaned)) {
                kept.add(candidate);
            }
        }
        if (HONG_KONG.equals(city) || ZHUHAI.equals(city)) {
            if (!kept.isEmpty()) {
                return kept.get(0);
            }
            return candidates.get(Math.floorMod(roundIndex - 1, candidates.size()));
        }
        return kept.isEmpty() ? candidates.get(0) : kept.get(0);
    }

    private static String cityOf(String destination) {
        String value = destination == null ? "" : destination.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        if (value.contains("香港") || lower.contains("hong kong")) {
            return HONG_KONG;
        }
        if (value.contains("珠海") || lower.contains("zhuhai")) {
            return ZHUHAI;
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
