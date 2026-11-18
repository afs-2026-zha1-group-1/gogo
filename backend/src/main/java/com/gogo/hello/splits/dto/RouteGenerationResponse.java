package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * Response for a successful paired route generation (spec REQ-006 G1): the incremented {@code draftVersion} and
 * exactly the two group routes (A/B) with activity names, shared endpoints and duration breakdowns.
 */
public record RouteGenerationResponse(int roundIndex, int draftVersion, List<GroupRoute> routes) {
}