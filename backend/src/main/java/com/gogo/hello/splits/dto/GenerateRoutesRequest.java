package com.gogo.hello.splits.dto;

/**
 * Request body for {@code POST /api/trips/{tripId}/split-draft/routes:generate} (spec REQ-006). The initiator
 * supplies the current {@code draftVersion}; generation captures it and conditionally updates so a concurrent
 * boundary re-selection makes the result stale (design D9/D11).
 */
public record GenerateRoutesRequest(int draftVersion) {
}