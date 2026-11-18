package com.gogo.preference;

import java.util.List;

/**
 * One roster row for the members page: identity plus the member's saved interest labels and budget, and whether the
 * caller may edit them (self, or the trip organizer editing anyone). Read-only projection over member_preference and
 * the trip roster; no new storage.
 */
public record MemberProfile(long userId, String displayName, boolean organizer, List<String> interests, Budget budget,
        boolean editable) {
}
