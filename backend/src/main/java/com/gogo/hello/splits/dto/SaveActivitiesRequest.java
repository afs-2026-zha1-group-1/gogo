package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * PUT .../split-draft/activities body (US-045): replaces one group's costed activities. A whole-list write keeps the
 * contract as small as the US-020 must-do write; {@code draftVersion} carries the optimistic concurrency guard.
 */
public record SaveActivitiesRequest(String groupLabel, List<ActivityInput> activities, int draftVersion) {

    /**
     * One activity the group pays for; {@code costCents} is per person in the trip currency's minor unit. {@code
     * source} defaults to {@code manual}; {@code ai} keeps an accepted mock-AI suggestion labelled as such, and
     * {@code main} is reserved for the route generator.
     */
    public record ActivityInput(String name, String location, Integer costCents, String source) {
    }
}
