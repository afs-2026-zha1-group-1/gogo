package com.gogo.trip;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
        long userId = principal.id();
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
        TripCreateRequest normalized = new TripCreateRequest(request.name(), request.destination(),
                request.startDate(), request.endDate(), blankToNull(request.startLocation()),
                blankToNull(request.endLocation()));
        return ResponseEntity.status(201).body(repository.create(normalized, userId));
    }

    @GetMapping
    public TripListResponse list(@AuthenticationPrincipal AccountPrincipal principal) {
        return repository.findTripsForUser(principal.id());
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

    @PostMapping("/{id}/main-plan:confirm")
    public TripResponse confirmMainPlan(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        long userId = principal.id();
        repository.findById(id)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + id));
        if (!repository.isMember(id, userId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        repository.confirmMainPlan(id);
        return repository.findById(id)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + id));
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