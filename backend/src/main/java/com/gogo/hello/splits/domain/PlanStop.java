package com.gogo.hello.splits.domain;

import java.time.Instant;

/**
 * A confirmed main-plan stop (design D7), the single source of truth for boundary times: departure uses
 * {@code endAt} (scheduled end), reunion uses {@code startAt} (scheduled start). Pure domain value object
 * mapped from a {@code plan_node} row with {@code branch_id = main}; no HTTP/DB dependencies.
 */
public record PlanStop(String id, String name, Instant startAt, Instant endAt) {
}