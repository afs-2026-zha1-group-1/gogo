package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.RouteCandidate;
import com.gogo.hello.splits.domain.RoutePairEdit;
import com.gogo.hello.splits.domain.RouteStep;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Fixed in-process fixture provider (design D12, US-089). Group A keeps following the confirmed main plan, so its
 * candidate is derived from the main-plan stops inside the boundary pair (names, scheduled durations and the gaps
 * between them); group B receives a destination-keyed synthetic activity so the two lanes differ. No external
 * network call; the failing-provider double for G2-N replaces this bean in tests.
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
    public RouteCandidate candidateFor(String groupLabel, PlanStop departure, PlanStop reunion, String destination,
            List<PlanStop> mainPlanStops) {
        if ("A".equals(groupLabel)) {
            return mainLineCandidate(groupLabel, departure, reunion, mainPlanStops);
        }
        Branch branch = branchFor(cityOf(destination), groupLabel);
        String activityName = RoutePairEdit.cleanStationName(branch.activityName());
        String location = destination == null || destination.isBlank() ? activityName : destination.trim();
        List<RouteStep> steps = List.of(new RouteStep(activityName, branch.activityMinutes()));
        // A null departure means the groups never travel together (US-095 FROM_START): group B is already
        // at its own activity when the window opens, so it has no outbound leg, only the trip back.
        List<Integer> legs = departure == null
                ? branch.travelLegsMinutes().subList(1, branch.travelLegsMinutes().size())
                : branch.travelLegsMinutes();
        return new RouteCandidate(groupLabel, activityName, location, branch.activityMinutes(), legs, 0, steps);
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
        return new RouteCandidate(groupLabel, activityName, location, activityMinutes, legs, 0, steps);
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
