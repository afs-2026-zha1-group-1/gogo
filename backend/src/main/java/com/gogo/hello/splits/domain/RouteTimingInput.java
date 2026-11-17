package com.gogo.hello.splits.domain;

import java.util.List;

/**
 * One group's timing inputs supplied explicitly in the check-timing snapshot (design D13). Components are nullable
 * {@link Integer} so the calculator can detect a missing activity/buffer/leg rather than silently treating it as
 * zero. Pure domain value: no HTTP/DB, no repository dependency.
 */
public record RouteTimingInput(
        String groupLabel,
        Integer activityMinutes,
        List<Integer> travelLegsMinutes,
        Integer bufferMinutes) {
}