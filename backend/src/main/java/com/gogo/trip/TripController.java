package com.gogo.trip;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gogo.auth.AccountPrincipal;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ofPattern("uuuu-MM-dd");

    private final TripRepository repository;

    public TripController(TripRepository repository) {
        this.repository = repository;
    }

    @PostMapping
    public ResponseEntity<TripResponse> create(
            @AuthenticationPrincipal AccountPrincipal principal,
            @RequestBody TripCreateRequest request) {
        TripCreateRequest normalized = validate(request);
        return ResponseEntity.status(201).body(repository.create(normalized, principal.id()));
    }

    /** US-003: members edit planning basics; the name stays organizer-only (design D1-D3). */
    @PutMapping("/{id}")
    public TripResponse update(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id,
            @RequestBody TripCreateRequest request) {
        return repository.updateBasics(id, principal.id(), validate(request));
    }

    /** Only the organizer may delete a trip; the whole trip graph goes with it. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        repository.deleteTrip(id, principal.id());
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public TripListResponse list(@AuthenticationPrincipal AccountPrincipal principal) {
        return repository.findTripsForUser(principal.id());
    }

    @GetMapping("/current")
    public CurrentTripResponse currentTrip(@AuthenticationPrincipal AccountPrincipal principal) {
        return repository.findCurrentTrip(principal.id());
    }

    @PutMapping("/current")
    public CurrentTripResponse selectCurrentTrip(
            @AuthenticationPrincipal AccountPrincipal principal,
            @RequestBody(required = false) CurrentTripRequest request) {
        if (request == null || request.tripId() == null) {
            throw new TripApiException(400, "TRIP_REQUIRED", "tripId is required");
        }
        return repository.selectCurrentTrip(principal.id(), request.tripId());
    }

    @GetMapping("/{id}")
    public TripResponse read(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        long userId = principal.id();
        TripResponse trip = repository.findById(id)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + id));
        if (!repository.isMember(id, userId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        return trip;
    }

    @GetMapping("/{id}/members")
    public TripMemberListResponse members(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        long userId = principal.id();
        repository.findById(id)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + id));
        if (!repository.isMember(id, userId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        return repository.findMembers(id);
    }

    private static TripCreateRequest validate(TripCreateRequest request) {
        LocalDate start = parseDate(request.startDate());
        LocalDate end = parseDate(request.endDate());
        if (isBlank(request.name())) {
            throw new TripApiException(400, "NAME_REQUIRED", "Trip name must not be blank");
        }
        if (isBlank(request.destination())) {
            throw new TripApiException(400, "DESTINATION_REQUIRED", "Trip destination must not be blank");
        }
        if (start.isAfter(end)) {
            throw new TripApiException(400, "INVALID_DATE_RANGE", "Start date must not be after end date");
        }
        return new TripCreateRequest(request.name(), request.destination(),
                request.startDate(), request.endDate(), blankToNull(request.startLocation()),
                blankToNull(request.endLocation()));
    }

    private static LocalDate parseDate(String value) {
        if (value == null) {
            throw new TripApiException(400, "INVALID_DATE", "Dates must be YYYY-MM-DD strings");
        }
        try {
            return LocalDate.parse(value, ISO_DATE);
        } catch (DateTimeParseException cause) {
            throw new TripApiException(400, "INVALID_DATE", "Date is not a valid YYYY-MM-DD value: " + value);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value;
    }
}
