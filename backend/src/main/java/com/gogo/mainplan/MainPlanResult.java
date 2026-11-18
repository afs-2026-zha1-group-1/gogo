package com.gogo.mainplan;

import java.util.List;

// Provider output (design D3, US-045): ordered stops with local HH:MM times,
// integer minute legs (null on the last stop), provider tags, the per-person
// cost in integer cents and that stop's own per-person cost (0 = free). The
// total is the sum of the stop costs, so the split budget check can subtract
// a replaced stop without guessing. US-079: address/city are the AI-generation
// contract fields; coordinates are NOT provider output - the service completes
// them from place_cache / programmatic geocoding at persist time.
public record MainPlanResult(List<PlannedStop> stops, int costPerPersonCents) {

    public record PlannedStop(
            int seq,
            String name,
            String startTime,
            String endTime,
            Integer travelMinutesToNext,
            List<String> interests,
            String address,
            String city,
            int costCents) {
    }

    /** Sum of the fixture stop costs; providers build the total from their stops. */
    public static int totalCost(List<PlannedStop> stops) {
        return stops.stream().mapToInt(PlannedStop::costCents).sum();
    }
}
