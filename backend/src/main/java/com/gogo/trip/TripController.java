package com.gogo.trip;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody TripCreateRequest request) {
        long userId = caller(userIdHeader);
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

    @GetMapping("/{id}")
    public TripResponse read(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long id) {
        long userId = caller(userIdHeader);
        TripResponse trip = repository.findById(id)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + id));
        if (!repository.isMember(id, userId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        return trip;
    }

    @GetMapping("/{id}/members")
    public TripMemberListResponse members(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long id) {
        long userId = caller(userIdHeader);
        repository.findById(id)
                .orElseThrow(() -> new TripApiException(404, "TRIP_NOT_FOUND", "No trip with id " + id));
        if (!repository.isMember(id, userId)) {
            throw new TripApiException(403, "NOT_A_MEMBER", "Caller is not a member of this trip");
        }
        return repository.findMembers(id);
    }

    private long caller(String headerValue) {
        if (headerValue == null) {
            throw new TripApiException(401, "USER_REQUIRED", "X-User-Id header is required");
        }
        return repository.findUserId(headerValue)
                .orElseThrow(() -> new TripApiException(401, "USER_REQUIRED", "X-User-Id must name a seeded user"));
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