package com.gogo.mainplan;

import java.util.List;

// Degraded draft (design D6): the trip's own start and end locations, nothing
// else. It is built from the already-completed TripContext, so supplied values
// stay untouched and blank values use the completion result.
final class MinimalFallbackPlan {

    private MinimalFallbackPlan() {
    }

    static MainPlanResult build(TripContext trip) {
        return new MainPlanResult(List.of(
                new MainPlanResult.PlannedStop(1, trip.startLocation(), "09:00", "09:30", 30, List.of()),
                new MainPlanResult.PlannedStop(2, trip.endLocation(), "17:00", "17:30", null, List.of())),
                0);
    }
}
