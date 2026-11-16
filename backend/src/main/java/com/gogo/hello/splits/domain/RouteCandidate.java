package com.gogo.hello.splits.domain;

import java.util.List;

/**
 * A generated branch route candidate for one group (design D6/D12): the activity name plus the structured
 * duration breakdown (activity + every travel leg + buffer, whole minutes). Produced by a
 * {@code BranchCandidateProvider}; the service attaches the shared boundary stops and persists structure to
 * {@code plan_node} split rows and durations to the draft document. Pure domain value object, no HTTP/DB.
 */
public record RouteCandidate(
        String groupLabel,
        String activityName,
        int activityMinutes,
        List<Integer> travelLegsMinutes,
        int bufferMinutes) {
}