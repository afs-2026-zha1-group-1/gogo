package com.gogo.hello.splits.dto;

/**
 * Request body for the group assignment endpoint (US-040 A1-A3 / revision 2026-11-17, design DD1).
 * {@code memberId} is the member being moved and is optional: when omitted the caller moves themselves.
 * Any trip member may move any trip member (user ruling 2026-11-17); a target outside the trip is rejected.
 * {@code draftVersion} makes the write a conditional update; a stale version is rejected.
 */
public record AssignmentRequest(String memberId, String groupLabel, int draftVersion) {
}
