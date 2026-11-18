package com.gogo.hello.splits.dto;

import java.time.Instant;

/**
 * Response for a successful boundary save (spec REQ-005 B1, design D7). {@code splitMode} names the boundary shape
 * (US-095: MIDDLE / FROM_START); times are derived from the main-plan stops: {@code departureAt} is the departure
 * stop start (or the first stop for FROM_START), {@code reunionAt} is the reunion stop start;
 * {@code windowMinutes} = reunionAt - departureAt.
 */
public record BoundaryResponse(
        String splitMode,
        String departureStopId,
        String reunionStopId,
        Instant departureAt,
        Instant reunionAt,
        long windowMinutes,
        int draftVersion) {
}