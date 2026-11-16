package com.gogo.hello.splits.dto;

/**
 * Request body for {@code PUT /api/trips/{tripId}/split-draft/boundaries} (spec REQ-005). The initiator supplies
 * a complete departure/reunion stop pair plus the current {@code draftVersion} for optimistic conditional update
 * (design D9). A null stop id is rejected as not-in-main-plan (no half boundaries).
 */
public record SaveBoundariesRequest(String departureStopId, String reunionStopId, int draftVersion) {
}