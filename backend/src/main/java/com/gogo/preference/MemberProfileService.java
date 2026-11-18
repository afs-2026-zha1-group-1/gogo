package com.gogo.preference;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.gogo.trip.TripMember;
import com.gogo.trip.TripRepository;
import com.gogo.trip.TripResponse;

/**
 * Members-page projection (US-045 follow-up): joins the trip roster with each member's interest labels and budget.
 * The caller's identity decides {@code editable}: a member may edit their own preferences, the organizer may edit
 * anyone's. This service only reads; the writes go through the existing preference services with a target member id.
 */
@Service
public class MemberProfileService {

    private final TripRepository trips;
    private final PreferenceService preferences;
    private final BudgetService budgets;

    public MemberProfileService(TripRepository trips, PreferenceService preferences, BudgetService budgets) {
        this.trips = trips;
        this.preferences = preferences;
        this.budgets = budgets;
    }

    public MemberProfilesResponse profiles(long tripId, long callerId) {
        TripResponse trip = trips.findById(tripId)
                .orElseThrow(() -> new PreferenceApiException(404, "TRIP_NOT_FOUND", "No trip with id " + tripId));
        boolean callerIsOrganizer = trip.organizerId() == callerId;

        Map<Long, List<String>> interests = new LinkedHashMap<>();
        for (PreferenceMember member : preferences.members(tripId)) {
            interests.put(member.userId(), member.interests());
        }
        Map<Long, Budget> memberBudgets = new LinkedHashMap<>();
        for (BudgetMember member : budgets.members(tripId)) {
            memberBudgets.put(member.userId(), member.budget());
        }

        List<MemberProfile> profiles = new ArrayList<>();
        for (TripMember member : trips.findMembers(tripId).members()) {
            long userId = member.userId();
            profiles.add(new MemberProfile(userId, member.displayName(), member.organizer(),
                    List.copyOf(interests.getOrDefault(userId, List.of())),
                    memberBudgets.get(userId),
                    userId == callerId || callerIsOrganizer));
        }
        return new MemberProfilesResponse(List.copyOf(profiles));
    }
}
