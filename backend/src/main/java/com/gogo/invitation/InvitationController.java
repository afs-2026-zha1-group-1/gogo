package com.gogo.invitation;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gogo.auth.AccountPrincipal;

@RestController
public class InvitationController {

    private final InvitationRepository repository;

    public InvitationController(InvitationRepository repository) {
        this.repository = repository;
    }

    @PostMapping("/api/trips/{id}/invitation")
    public IssuedInvitation issue(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable long id) {
        return repository.issue(id, principal.id());
    }

    @GetMapping("/api/invitations/{token}")
    public InvitationPreview preview(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable String token) {
        // Guest preview stays public; a signed-in viewer additionally learns
        // whether they are already a member (user ruling 2026-11-17).
        return repository.preview(token, principal == null ? null : principal.id());
    }

    @PostMapping("/api/invitations/{token}/accept")
    public JoinResult accept(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable String token) {
        return repository.accept(token, principal.id());
    }
}
