package com.gogo.hello.splits.dto;

/**
 * Request body for the two draft terminal transitions (US-049 confirm / US-050 cancel, design D5/D6). Both endpoints
 * carry the caller's current {@code draftVersion} so the write is a conditional update: a stale version is rejected
 * instead of overwriting a newer draft (including a rebuilt replacement draft).
 */
public record DraftVersionRequest(int draftVersion) {
}
