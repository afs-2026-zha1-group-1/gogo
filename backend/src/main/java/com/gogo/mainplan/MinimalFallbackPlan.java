package com.gogo.mainplan;

import java.util.ArrayList;
import java.util.List;

// Degraded draft (design D6): the trip's own start and end locations on every
// trip day, nothing else. It is built from the already-completed TripContext, so
// supplied values stay untouched and blank values use the completion result.
final class MinimalFallbackPlan {

    private MinimalFallbackPlan() {
    }

    static MainPlanResult build(TripContext trip) {
        List<MainPlanResult.PlannedStop> stops = new ArrayList<>();
        int seq = 1;
        for (int day = 1; day <= trip.dayCount(); day++) {
            stops.add(new MainPlanResult.PlannedStop(seq++, trip.startLocation(), "09:00", "09:30", 30,
                    List.of(), null, null, 0, day));
            stops.add(new MainPlanResult.PlannedStop(seq++, trip.endLocation(), "17:00", "17:30", null,
                    List.of(), null, null, 0, day));
        }
        return new MainPlanResult(stops, 0);
    }
}
