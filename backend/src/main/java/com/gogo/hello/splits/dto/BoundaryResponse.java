package com.gogo.hello.splits.dto;

import java.time.Instant;

/**
 * Response for a successful boundary save (spec REQ-005 B1, design D7). Times are derived from the main-plan
 * stops: {@code departureAt} = departure stop scheduled end, {@code reunionAt} = reunion stop scheduled start;
 * {@code windowMinutes} = reunion - departure. Jackson serializes the instants as ISO-8601 UTC strings.
 */
public record BoundaryResponse(
        String departureStopId,
        String reunionStopId,
        Instant departureAt,
        Instant reunionAt,
        long windowMinutes,
        int draftVersion) {
}