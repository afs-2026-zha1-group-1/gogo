package com.gogo.mainplan;

import java.util.List;

import com.gogo.hello.common.MockDestinations;

/**
 * 珠海/香港 demos must stay deterministic even when an LLM key is configured. This decorator routes those two
 * destinations to the fixed fixture and every other destination to the primary provider (AI or fixture).
 */
class MockDestinationMainPlanProvider implements MainPlanProvider {

    private final MainPlanProvider mock;
    private final MainPlanProvider primary;

    MockDestinationMainPlanProvider(MainPlanProvider mock, MainPlanProvider primary) {
        this.mock = mock;
        this.primary = primary;
    }

    @Override
    public MainPlanResult plan(TripContext trip, List<MemberInput> inputs) {
        return MockDestinations.isMock(trip.destination())
                ? mock.plan(trip, inputs)
                : primary.plan(trip, inputs);
    }
}
