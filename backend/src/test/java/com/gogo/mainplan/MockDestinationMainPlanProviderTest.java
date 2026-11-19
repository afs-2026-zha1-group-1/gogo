package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

class MockDestinationMainPlanProviderTest {

    private final TripContext zhuhai = new TripContext(1, "珠海", "2026-11-21", "2026-11-22", "起点", "终点");
    private final TripContext singapore = new TripContext(1, "Singapore", "2026-12-05", "2026-12-05",
            "起点", "终点");

    @Test
    void mockDestinationsSkipThePrimaryProvider() {
        MainPlanProvider primary = (trip, inputs) -> {
            throw new AssertionError("the primary provider must not be called for 珠海");
        };
        MainPlanProvider provider = new MockDestinationMainPlanProvider(new FakeMainPlanProvider(), primary);

        MainPlanResult result = provider.plan(zhuhai, List.of());

        assertEquals(11, result.stops().size());
        assertEquals("日月贝（珠海大剧院）", result.stops().get(0).name());
    }

    @Test
    void otherDestinationsUseThePrimaryProvider() {
        MainPlanProvider primary = (trip, inputs) -> new MainPlanResult(List.of(
                new MainPlanResult.PlannedStop(1, "Primary", "09:00", "10:00", null, List.of(), null, null, 0)),
                0);
        MainPlanProvider provider = new MockDestinationMainPlanProvider(new FakeMainPlanProvider(), primary);

        MainPlanResult result = provider.plan(singapore, List.of());

        assertEquals("Primary", result.stops().get(0).name());
    }
}
