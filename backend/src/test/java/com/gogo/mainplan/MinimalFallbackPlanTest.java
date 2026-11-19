package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class MinimalFallbackPlanTest {

    @Test
    void buildsTheStartAndEndTwoStopPlan() {
        TripContext trip = new TripContext(1, "Singapore", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park");

        MainPlanResult result = MinimalFallbackPlan.build(trip);

        assertEquals(2, result.stops().size());
        MainPlanResult.PlannedStop first = result.stops().get(0);
        assertEquals(1, first.seq());
        assertEquals("City Hall MRT", first.name());
        assertEquals("09:00", first.startTime());
        assertEquals("09:30", first.endTime());
        assertEquals(30, first.travelMinutesToNext());
        MainPlanResult.PlannedStop last = result.stops().get(1);
        assertEquals(2, last.seq());
        assertEquals("Merlion Park", last.name());
        assertEquals("17:00", last.startTime());
        assertEquals("17:30", last.endTime());
        assertNull(last.travelMinutesToNext());
        assertEquals(0, result.costPerPersonCents());
    }

    @Test
    void usesTheCompletedLocationsExactlyAsSupplied() {
        TripContext trip = new TripContext(2, "London", "2026-11-23", "2026-11-29",
                "大英博物馆", "伦敦眼");

        MainPlanResult result = MinimalFallbackPlan.build(trip);

        assertEquals("大英博物馆", result.stops().get(0).name());
        assertEquals("伦敦眼", result.stops().get(1).name());
        assertEquals(14, result.stops().size());
        assertEquals(7, result.stops().get(12).dayIndex());
        assertEquals("大英博物馆", result.stops().get(12).name());
    }
}
