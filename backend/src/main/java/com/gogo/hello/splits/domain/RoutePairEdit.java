package com.gogo.hello.splits.domain;

import com.gogo.hello.splits.domain.SplitDraftDocument.RouteDurations;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure derivation for a manual group-A route edit (spec US-087 S2b, design DD2). Group A keeps the confirmed
 * itinerary's stop names (read-only) and only the stay/travel minutes are editable; the activity total is the sum of
 * the stays and the buffer is zero, so the persisted breakdown can never disagree with the step list. Illegal shapes
 * raise {@link IllegalArgumentException}; the service maps them to 400 INVALID_ROUTE_INPUT.
 */
public final class RoutePairEdit {

    private RoutePairEdit() {
    }

    /**
     * Rebuilds group A's duration breakdown from the existing ordered steps and the submitted minutes. The stop names
     * are carried over unchanged; the caller may not add, remove or rename stops.
     */
    public static RouteDurations deriveForGroupA(
            List<RouteStep> existingSteps, List<Integer> stepMinutes, List<Integer> travelLegsMinutes) {
        if (existingSteps == null || existingSteps.isEmpty()) {
            throw new IllegalArgumentException("group A has no existing steps to edit");
        }
        if (stepMinutes == null || stepMinutes.size() != existingSteps.size()) {
            throw new IllegalArgumentException("group A stay minutes must cover every existing step");
        }
        if (travelLegsMinutes == null || travelLegsMinutes.size() != existingSteps.size()) {
            throw new IllegalArgumentException("group A travel legs must match the step count");
        }
        int activity = 0;
        List<RouteStep> steps = new ArrayList<>();
        for (int index = 0; index < existingSteps.size(); index += 1) {
            Integer minutes = stepMinutes.get(index);
            if (minutes == null || minutes < 0) {
                throw new IllegalArgumentException("group A stay minutes must be non-negative integers");
            }
            activity += minutes;
            steps.add(new RouteStep(existingSteps.get(index).name(), minutes));
        }
        List<Integer> legs = new ArrayList<>();
        for (Integer leg : travelLegsMinutes) {
            if (leg == null || leg < 0) {
                throw new IllegalArgumentException("group A travel minutes must be non-negative integers");
            }
            legs.add(leg);
        }
        return new RouteDurations(activity, legs, 0, steps);
    }
}
