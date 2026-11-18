package com.gogo.hello.splits.dto;

import com.gogo.hello.splits.domain.RouteActivity;
import com.gogo.hello.splits.domain.RouteStep;
import java.util.List;

/**
 * One group's route view (design D6/D8, US-045): group label, activity name, the shared departure/reunion stop ids,
 * the structured duration breakdown and the costed activities the group pays for during the window. Shared by the
 * generation response and the draft detail snapshot so the client can build the timing snapshot without guesses
 * (spec D1). Duration components are nullable: a missing estimate is reported as null instead of zero so
 * confirmation can list it as a missing input. {@code steps} lists the main-plan stops for the group that keeps
 * following the confirmed plan (group A); empty for synthetic routes.
 * {@code locationName} is the editable display location (additive, US-087): legacy generated rows carry the activity
 * name backfill, so the client suppresses duplicates.
 */
public record GroupRoute(
        String groupLabel,
        String activityName,
        String locationName,
        String departureStopId,
        String reunionStopId,
        Integer activityMinutes,
        List<Integer> travelLegsMinutes,
        Integer bufferMinutes,
        List<RouteStep> steps,
        List<RouteActivity> activities) {
}
