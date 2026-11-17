package com.gogo.preference;

import java.util.List;

/**
 * `{"members": [{userId, mustDos}]}` keyed by trip member, ascending userId, every member
 * present even without a saved row (MD9, MDR-2, MDR-4).
 */
public record MustDoMembersResponse(List<MustDoMember> members) {
}
