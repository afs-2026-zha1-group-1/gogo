package com.gogo.mainplan;

import java.util.List;

import org.springframework.stereotype.Component;

// The fake provider IS the MVP production implementation (design D3, OQ-2
// ruling): the four fixture stops with supplied times, legs 30/30/15 and a
// 50 SGD per-person cost, deterministic. No external HTTP client anywhere.
@Component
public class FakeMainPlanProvider implements MainPlanProvider {

    @Override
    public MainPlanResult plan(TripContext trip, List<MemberInput> inputs) {
        List<MainPlanResult.PlannedStop> stops = List.of(
                new MainPlanResult.PlannedStop(1, "City Hall MRT", "09:00", "09:30", 30,
                        List.of("culture")),
                new MainPlanResult.PlannedStop(2, "National Gallery Singapore", "10:00", "10:30", 30,
                        List.of("art", "culture")),
                new MainPlanResult.PlannedStop(3, "Gardens by the Bay", "11:00", "11:15", 15,
                        List.of("nature")),
                new MainPlanResult.PlannedStop(4, "Merlion Park", "11:30", "12:00", null,
                        List.of("culture")));
        return new MainPlanResult(stops, 5000);
    }
}