package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * One editable group route in a {@code PUT .../split-draft/routes} request (spec US-087 S2/S2b). Group A submits the
 * ordered stay minutes and the travel legs (its stop names stay read-only and come from the existing steps); group B
 * submits the single activity breakdown and an optional location. Nullable components let the service report a
 * missing/illegal input instead of silently treating it as zero.
 */
public record RouteEditInput(
        String groupLabel,
        String activityName,
        String locationName,
        List<Integer> stepMinutes,
        List<Integer> travelLegsMinutes,
        Integer activityMinutes,
        Integer bufferMinutes) {
}
