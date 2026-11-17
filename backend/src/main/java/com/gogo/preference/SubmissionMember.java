package com.gogo.preference;

/** One member's readiness state (US-026): {@code status} is {@code ready} or {@code pending}. */
public record SubmissionMember(long userId, String status, boolean noPreference) {
}
