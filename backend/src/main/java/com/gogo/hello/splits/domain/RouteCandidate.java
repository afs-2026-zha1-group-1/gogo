package com.gogo.hello.splits.domain;

import java.util.List;

/**
 * A generated branch route candidate for one group (design D6/D12, US-089): the activity name plus the
 * structured duration breakdown (activity + every travel leg + buffer, whole minutes). {@code steps} carries the
 * main-plan stops when the group keeps following the confirmed plan (group A); synthetic fixtures leave it empty. Produced by a
 * {@code BranchCandidateProvider}; the service attaches the shared boundary stops and persists structure to
 * {@code plan_node} split rows and durations to the draft document. Pure domain value object, no HTTP/DB.
 */
public record RouteCandidate(
        String groupLabel,
        String activityName,
        String locationName,
        int activityMinutes,
        List<Integer> travelLegsMinutes,
        int bufferMinutes,
        List<RouteStep> steps) {
}