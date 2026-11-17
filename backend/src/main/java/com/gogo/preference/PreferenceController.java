package com.gogo.preference;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.gogo.auth.AccountPrincipal;
import com.gogo.trip.TripRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trips/{tripId}/preferences")
public class PreferenceController {

    private final PreferenceService service;
    private final MustDoService mustDos;
    private final BudgetService budget;
    private final SubmissionService submission;
    private final TripRepository trips;

    public PreferenceController(PreferenceService service, MustDoService mustDos, BudgetService budget,
            SubmissionService submission, TripRepository trips) {
        this.service = service;
        this.mustDos = mustDos;
        this.budget = budget;
        this.submission = submission;
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

    // REQ-020: the must-do endpoints sit under the same mapping and reuse the same caller gate,
    // so identity -> trip -> membership is written once (MD2, MD5).
    @GetMapping("/must-dos")
    public MustDoMembersResponse readMustDos(
            @PathVariable long tripId,
            Authentication authentication) {
        caller(authentication, tripId);
        return new MustDoMembersResponse(mustDos.members(tripId));
    }

    @PutMapping("/must-dos")
    public MustDoSaveResponse saveMustDos(
            @PathVariable long tripId,
            Authentication authentication,
            @RequestBody @Valid MustDoSaveRequest request) {
        long userId = caller(authentication, tripId);
        return new MustDoSaveResponse(mustDos.save(tripId, userId, request.items()));
    }

    // US-024 (revised): per-member budget, own sub-resource. The body is read raw so a missing
    // amount key is INVALID_REQUEST while an explicit null amount is a clear.
    @GetMapping("/budget")
    public BudgetMembersResponse readBudgets(
            @PathVariable long tripId,
            Authentication authentication) {
        caller(authentication, tripId);
        return new BudgetMembersResponse(budget.members(tripId));
    }

    @PutMapping("/budget")
    public BudgetSaveResponse saveBudget(
            @PathVariable long tripId,
            Authentication authentication,
            @RequestBody JsonNode body) {
        long userId = caller(authentication, tripId);
        return new BudgetSaveResponse(budget.save(tripId, userId, body));
    }

    // US-026: submit readiness (its own submission row) and read readiness / effective inputs.
    @PutMapping("/submission")
    public SubmissionResponse submit(
            @PathVariable long tripId,
            Authentication authentication,
            @RequestBody(required = false) SubmissionSaveRequest request) {
        long userId = caller(authentication, tripId);
        return submission.save(tripId, userId, request == null ? null : request.noPreference());
    }

    @GetMapping("/readiness")
    public ReadinessResponse readiness(
            @PathVariable long tripId,
            Authentication authentication) {
        caller(authentication, tripId);
        return submission.readiness(tripId);
    }

    @GetMapping("/effective")
    public EffectiveResponse effective(
            @PathVariable long tripId,
            Authentication authentication) {
        caller(authentication, tripId);
        return submission.effective(tripId);
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
