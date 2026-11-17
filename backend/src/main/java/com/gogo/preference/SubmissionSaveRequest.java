package com.gogo.preference;

/** {@code {"noPreference": true|false}} for the submit-and-mark-ready action (US-026). */
public record SubmissionSaveRequest(Boolean noPreference) {
}
