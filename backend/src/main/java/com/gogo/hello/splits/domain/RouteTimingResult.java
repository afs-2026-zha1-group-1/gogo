package com.gogo.hello.splits.domain;

import java.util.List;

/**
 * One group's timing outcome (design D13). {@code totalMinutes}/{@code overrunMinutes} are null when an input is
 * missing (the route cannot be summed); {@code missingInputs} names each absent field (e.g. {@code activityMinutes},
 * {@code travelLegsMinutes[1]}). {@code feasible} is true only when every input is present and the total fits the
 * window. Pure domain value: no HTTP/DB.
 */
public record RouteTimingResult(
        String groupLabel,
        Integer totalMinutes,
        Integer overrunMinutes,
        List<String> missingInputs,
        boolean feasible) {
}