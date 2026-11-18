package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

// UT (ATDD UT-1/UT-2 deferred to apply): the fake provider is the MVP
// production implementation (D3) — deterministic fixture stops, legs, cost.
class FakeMainPlanProviderTest {

    private final FakeMainPlanProvider provider = new FakeMainPlanProvider();

    private MainPlanResult plan() {
        TripContext trip = new TripContext(1, "Singapore", "2026-12-05", "2026-12-05",
                "City Hall MRT", "Merlion Park");
        return provider.plan(trip, List.of());
    }

    private MainPlanResult planFor(String destination, String startDate, String endDate) {
        return provider.plan(new TripContext(2, destination, startDate, endDate,
                "起点", "终点"), List.of());
    }

    @Test
    void suppliesTheFourFixtureStopsInOrder() {
        MainPlanResult result = plan();
        assertEquals(4, result.stops().size());
        assertEquals("City Hall MRT", result.stops().get(0).name());
        assertEquals("National Gallery Singapore", result.stops().get(1).name());
        assertEquals("Gardens by the Bay", result.stops().get(2).name());
        assertEquals("Merlion Park", result.stops().get(3).name());
        for (int i = 0; i < 4; i++) {
            assertEquals(i + 1, result.stops().get(i).seq());
        }
    }

    @Test
    void suppliesTheFixtureTimesAndLegs() {
        List<MainPlanResult.PlannedStop> stops = plan().stops();
        assertEquals("09:00", stops.get(0).startTime());
        assertEquals("09:30", stops.get(0).endTime());
        assertEquals("10:00", stops.get(1).startTime());
        assertEquals("10:30", stops.get(1).endTime());
        assertEquals("11:00", stops.get(2).startTime());
        assertEquals("11:15", stops.get(2).endTime());
        assertEquals("11:30", stops.get(3).startTime());
        assertEquals("12:00", stops.get(3).endTime());
        assertEquals(30, stops.get(0).travelMinutesToNext());
        assertEquals(30, stops.get(1).travelMinutesToNext());
        assertEquals(15, stops.get(2).travelMinutesToNext());
        assertNull(stops.get(3).travelMinutesToNext());
    }

    @Test
    void costsFiftySgdPerPersonAndIsDeterministic() {
        assertEquals(5000, plan().costPerPersonCents());
        assertEquals(plan(), plan());
    }

    @Test
    void hongKongDestinationReturnsCityFixtures() {
        MainPlanResult result = planFor("香港", "2026-11-21", "2026-11-22");
        assertEquals(6, result.stops().size());
        assertEquals("西九文化区 M+ 博物馆", result.stops().get(0).name());
        assertEquals("尖沙咀海滨长廊与星光大道", result.stops().get(5).name());
        assertEquals(68000, result.costPerPersonCents());
    }

    @Test
    void londonDestinationReturnsCityFixtures() {
        MainPlanResult result = planFor("伦敦", "2026-11-23", "2026-11-29");
        assertEquals(7, result.stops().size());
        assertEquals("大英博物馆", result.stops().get(0).name());
        assertEquals("伦敦眼与南岸夜景", result.stops().get(6).name());
        assertEquals(9500, result.costPerPersonCents());
    }

    @Test
    void hefeiDestinationReturnsTheRequestedPlanAndCosts() {
        MainPlanResult result = planFor("合肥", "2026-12-05", "2026-12-05");
        assertEquals(4, result.stops().size());
        assertEquals("大蜀山森林公园", result.stops().get(0).name());
        assertEquals("09:00", result.stops().get(0).startTime());
        assertEquals("11:00", result.stops().get(0).endTime());
        assertEquals(0, result.stops().get(0).costCents());
        assertEquals("红星路步行街披萨店", result.stops().get(1).name());
        assertEquals("11:00", result.stops().get(1).startTime());
        assertEquals("13:00", result.stops().get(1).endTime());
        assertEquals(10000, result.stops().get(1).costCents());
        assertEquals("之心城购物中心", result.stops().get(2).name());
        assertEquals("14:00", result.stops().get(2).startTime());
        assertEquals("17:00", result.stops().get(2).endTime());
        assertEquals(100000, result.stops().get(2).costCents());
        assertEquals("官亭路步行街小吃", result.stops().get(3).name());
        assertEquals("18:00", result.stops().get(3).startTime());
        assertEquals("20:00", result.stops().get(3).endTime());
        assertEquals(10000, result.stops().get(3).costCents());
        assertNull(result.stops().get(3).travelMinutesToNext());
        // 0 + 100 + 1000 + 100 = 1200 元 = 120000 分
        assertEquals(120000, result.costPerPersonCents());
    }

    @Test
    void hefeiFixtureSatisfiesTheScheduleRules() {
        List<MainPlanRepository.StopRow> rows = planFor("合肥", "2026-12-05", "2026-12-05")
                .stops().stream()
                .map(stop -> new MainPlanRepository.StopRow(stop.seq(), stop.name(), stop.startTime(),
                        stop.endTime(), stop.travelMinutesToNext(), null, null, null, null, stop.costCents()))
                .toList();
        assertTrue(new ScheduleValidator().validate(rows).isEmpty());
    }
}