package com.gogo.trip;

import java.util.List;

public record TripMemberListResponse(long tripId, List<TripMember> members) {
}
