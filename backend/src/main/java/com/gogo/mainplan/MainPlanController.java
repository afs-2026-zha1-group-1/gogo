package com.gogo.mainplan;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.gogo.trip.TripRepository;

// Four contractual routes (design D2); identity follows the
// InvitationController precedent exactly — trusted X-User-Id over seeded
// users, package-specific 401 USER_REQUIRED.
@RestController
public class MainPlanController {

    private final MainPlanService service;
    private final TripRepository trips;

    public MainPlanController(MainPlanService service, TripRepository trips) {
        this.service = service;
        this.trips = trips;
    }

    @PostMapping("/api/trips/{id}/main-plan")
    public ResponseEntity<PlanResponse> generate(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long id) {
        return ResponseEntity.status(201).body(service.generate(id, caller(userIdHeader)));
    }

    @PostMapping("/api/trips/{id}/main-plan/confirm")
    public PlanResponse confirm(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long id) {
        return service.confirm(id, caller(userIdHeader));
    }

    @GetMapping("/api/trips/{id}/main-plan")
    public PlanResponse read(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long id) {
        return service.readPlan(id, caller(userIdHeader));
    }

    @GetMapping("/api/trips/{id}/main-plan/inputs")
    public InputsResponse inputs(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long id) {
        return service.readInputs(id, caller(userIdHeader));
    }

    private long caller(String headerValue) {
        if (headerValue == null) {
            throw new MainPlanApiException(401, "USER_REQUIRED", "X-User-Id header is required");
        }
        return trips.findUserId(headerValue)
                .orElseThrow(() -> new MainPlanApiException(401, "USER_REQUIRED",
                        "X-User-Id must name a seeded user"));
    }
}