package com.gogo.hello.splits;

/**
 * Authorized caller context returned by {@link MemberGuard} after identity, trip and membership checks pass
 * (design D8). Carries only the validated member id and trip id; no private trip or draft values.
 */
public record MemberContext(String memberId, String tripId) {
}