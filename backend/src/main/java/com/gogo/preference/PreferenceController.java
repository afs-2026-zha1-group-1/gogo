package com.gogo.preference;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long tripId) {
        caller(userIdHeader, tripId);
        return new PreferenceMembersResponse(service.members(tripId));
    }

    @PutMapping
    public PreferenceSaveResponse save(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long tripId,
            @RequestBody @Valid PreferenceSaveRequest request) {
        long userId = caller(userIdHeader, tripId);
        return new PreferenceSaveResponse(service.save(tripId, userId, request.interests()));
    }

    // Identity, then trip existence, then membership (DD5).
    private long caller(String headerValue, long tripId) {
        if (headerValue == null) {
            throw new PreferenceApiException(401, "USER_REQUIRED", "X-User-Id header is required");
        }
        long userId = trips.findUserId(headerValue)
                .orElseThrow(() -> new PreferenceApiException(401, "USER_REQUIRED",
                        "X-User-Id must name a seeded user"));
        trips.findById(tripId)
                .orElseThrow(() -> new PreferenceApiException(404, "TRIP_NOT_FOUND",
                        "No trip with id " + tripId));
        if (!trips.isMember(tripId, userId)) {
            throw new PreferenceApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        return userId;
    }
}
