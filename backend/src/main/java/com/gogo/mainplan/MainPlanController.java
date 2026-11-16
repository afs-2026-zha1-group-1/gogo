package com.gogo.mainplan;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gogo.auth.AccountPrincipal;

// Four contractual routes (design D2); identity is the authenticated session principal.
@RestController
public class MainPlanController {

    private final MainPlanService service;

    public MainPlanController(MainPlanService service) {
        this.service = service;
    }

    @PostMapping("/api/trips/{id}/main-plan")
    public ResponseEntity<PlanResponse> generate(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        return ResponseEntity.status(201).body(service.generate(id, principal.id()));
    }

    @PostMapping("/api/trips/{id}/main-plan/confirm")
    public PlanResponse confirm(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        return service.confirm(id, principal.id());
    }

    @GetMapping("/api/trips/{id}/main-plan")
    public PlanResponse read(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        return service.readPlan(id, principal.id());
    }

    @GetMapping("/api/trips/{id}/main-plan/inputs")
    public InputsResponse inputs(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        return service.readInputs(id, principal.id());
    }
}