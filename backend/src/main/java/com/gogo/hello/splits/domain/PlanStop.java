package com.gogo.hello.splits.domain;

import java.time.Instant;

/**
 * A confirmed main-plan stop (design D7, US-089/US-045), the single source of truth for boundary times: the split
 * starts when the departure stop starts and the group must be together by the reunion stop's start. {@code
 * costCents} is that stop's per-person cost; the split budget check uses it to compute the shared cost that remains
 * outside the split window and the cost of the activities the branch replaced. {@code locationName} carries the row's
 * real location so a manually editable group-A route can prefill it. Pure domain value object mapped from a
 * {@code plan_node} row with {@code branch_id = main}; no HTTP/DB dependencies.
 */
public record PlanStop(String id, String name, Instant startAt, Instant endAt, int costCents, String locationName) {
}
