package com.gogo.invitation;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.gogo.trip.TripRepository;

@RestController
public class InvitationController {

    private final InvitationRepository repository;
    private final TripRepository trips;

    public InvitationController(InvitationRepository repository, TripRepository trips) {
        this.repository = repository;
        this.trips = trips;
    }

    @PostMapping("/api/trips/{id}/invitation")
    public IssuedInvitation issue(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable long id) {
        long caller = caller(userIdHeader);
        return repository.issue(id, caller);
    }

    @GetMapping("/api/invitations/{token}")
    public InvitationPreview preview(@PathVariable String token) {
        return repository.preview(token);
    }

    @PostMapping("/api/invitations/{token}/accept")
    public JoinResult accept(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable String token) {
        long caller = caller(userIdHeader);
        return repository.accept(token, caller);
    }

    private long caller(String headerValue) {
        if (headerValue == null) {
            throw new InvitationApiException(401, "USER_REQUIRED", "X-User-Id header is required");
        }
        return trips.findUserId(headerValue)
                .orElseThrow(() -> new InvitationApiException(401, "USER_REQUIRED",
                        "X-User-Id must name a seeded user"));
    }
}
