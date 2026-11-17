package com.gogo.preference;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gogo.auth.AccountPrincipal;
import com.gogo.trip.TripRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trips/{tripId}/preferences")
public class PreferenceController {

    private final PreferenceService service;
    private final TripRepository trips;

    public PreferenceController(PreferenceService service, TripRepository trips) {
        this.service = service;
        this.trips = trips;
    }

    @GetMapping
    public PreferenceMembersResponse read(
            @PathVariable long tripId,
            Authentication authentication) {
        caller(authentication, tripId);
        return new PreferenceMembersResponse(service.members(tripId));
    }

    @PutMapping
    public PreferenceSaveResponse save(
            @PathVariable long tripId,
            Authentication authentication,
            @RequestBody @Valid PreferenceSaveRequest request) {
        long userId = caller(authentication, tripId);
        return new PreferenceSaveResponse(service.save(tripId, userId, request.interests()));
    }

    // Session identity, then trip existence, then membership (DD5). US-066 replaced the
    // scaffold `X-User-Id` header with the authenticated session, so the header is ignored.
    private long caller(Authentication authentication, long tripId) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AccountPrincipal principal)) {
            throw new PreferenceApiException(401, "USER_REQUIRED", "a signed-in account is required");
        }
        long userId = principal.id();
        trips.findById(tripId)
                .orElseThrow(() -> new PreferenceApiException(404, "TRIP_NOT_FOUND",
                        "No trip with id " + tripId));
        if (!trips.isMember(tripId, userId)) {
            throw new PreferenceApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        return userId;
    }
}
