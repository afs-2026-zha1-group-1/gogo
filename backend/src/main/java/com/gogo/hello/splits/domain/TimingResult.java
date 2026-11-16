package com.gogo.hello.splits.domain;

import java.util.List;

/**
 * Whole-pair reunion timing outcome (design D13, spec REQ-007). {@code feasible} is the aggregate: true only when
 * every group route fits the window. The window minutes are echoed back so the client can render the budget. Pure
 * domain value returned directly by the check-timing endpoint: no HTTP/DB.
 */
public record TimingResult(long windowMinutes, boolean feasible, List<RouteTimingResult> routes) {
}