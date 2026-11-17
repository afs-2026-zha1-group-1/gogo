package com.gogo.hello.splits.dto;

/**
 * Request body for the member group assignment endpoint (US-040 A1-A3, design DD1). It deliberately carries only the
 * target {@code groupLabel} and the caller's current {@code draftVersion}: the moved member is always the authenticated
 * caller, so impersonating another member is impossible at the contract boundary. The version makes the write a
 * conditional update; a stale version is rejected instead of overwriting a newer draft.
 */
public record AssignmentRequest(String groupLabel, int draftVersion) {
}
