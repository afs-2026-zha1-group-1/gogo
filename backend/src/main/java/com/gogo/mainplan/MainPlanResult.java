package com.gogo.mainplan;

import java.util.List;

// Provider output (design D3): ordered stops with local HH:MM times, integer
// minute legs (null on the last stop), provider tags, and the per-person cost
// in integer cents.
public record MainPlanResult(List<PlannedStop> stops, int costPerPersonCents) {

    public record PlannedStop(
            int seq,
            String name,
            String startTime,
            String endTime,
            Integer travelMinutesToNext,
            List<String> interests) {
    }
}