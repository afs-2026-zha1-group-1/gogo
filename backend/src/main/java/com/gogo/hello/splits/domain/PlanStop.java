package com.gogo.hello.splits.domain;

import java.time.Instant;

/**
 * A confirmed main-plan stop (design D7, US-089), the single source of truth for boundary times: the split
 * starts when the departure stop starts and the group must be together by the reunion stop's start. Pure domain
 * value object mapped from a {@code plan_node} row with {@code branch_id = main}; no HTTP/DB dependencies.
 */
public record PlanStop(String id, String name, Instant startAt, Instant endAt) {
}