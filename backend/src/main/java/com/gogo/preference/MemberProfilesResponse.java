package com.gogo.preference;

import java.util.List;

/** GET /api/trips/{tripId}/preferences/members: every trip member with interests, budget and edit permission. */
public record MemberProfilesResponse(List<MemberProfile> members) {
}
