package com.gogo.hello.splits.domain;

import com.gogo.hello.splits.domain.SplitDraftDocument.RouteDurations;
import com.gogo.hello.splits.dto.RouteStepInput;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure derivation for a manually edited station list (spec US-087 Revision 3, design DD2). Both groups are ordered
 * stops with a stay in minutes; activity is their sum and the buffer is zero. Group A has one travel leg after every
 * stop, while group B surrounds the stations with an outbound and a return leg (legs = stops + 1). Stop names are
 * user-owned; the route name is the first→last join. Illegal shapes raise {@link IllegalArgumentException}; the
 * service maps them to 400 INVALID_ROUTE_INPUT.
 */
public final class RoutePairEdit {

    private RoutePairEdit() {
    }

    /** Rebuilds one group's duration breakdown from its station list and travel legs. */
    public static RouteDurations derive(String groupLabel, List<RouteStepInput> submittedSteps,
            List<Integer> travelLegsMinutes) {
        boolean groupB = "B".equals(groupLabel);
        if (submittedSteps == null || submittedSteps.isEmpty()) {
            throw new IllegalArgumentException("a route needs at least one station");
        }
        int expectedLegs = groupB ? submittedSteps.size() + 1 : submittedSteps.size();
        if (travelLegsMinutes == null || travelLegsMinutes.size() != expectedLegs) {
            throw new IllegalArgumentException(groupB
                    ? "group B travel legs must be stops + 1"
                    : "group A travel legs must match the stop count");
        }
        int activity = 0;
        List<RouteStep> steps = new ArrayList<>();
        for (RouteStepInput step : submittedSteps) {
            if (step == null || step.name() == null || step.name().isBlank()) {
                throw new IllegalArgumentException("station names are required");
            }
            if (step.minutes() == null || step.minutes() < 0) {
                throw new IllegalArgumentException("stay minutes must be non-negative integers");
            }
            activity += step.minutes();
            steps.add(new RouteStep(step.name().trim(), step.minutes()));
        }
        List<Integer> legs = new ArrayList<>();
        for (Integer leg : travelLegsMinutes) {
            if (leg == null || leg < 0) {
                throw new IllegalArgumentException("travel minutes must be non-negative integers");
            }
            legs.add(leg);
        }
        return new RouteDurations(activity, legs, 0, steps);
    }

    /** Derived route name: first→last station names (a single station keeps its name). */
    public static String deriveActivityName(List<RouteStep> steps) {
        String first = steps.get(0).name();
        String last = steps.get(steps.size() - 1).name();
        return first.equals(last) ? first : first + " → " + last;
    }
}
