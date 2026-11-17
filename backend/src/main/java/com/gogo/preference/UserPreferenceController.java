package com.gogo.preference;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gogo.auth.AccountPrincipal;

import jakarta.validation.Valid;

/**
 * US-019 personal default interests, scoped to the signed-in user (not to a trip). {@code /api/me/**}
 * is authenticated by the shared security config, so identity comes from the session only.
 */
@RestController
@RequestMapping("/api/me/preferences")
public class UserPreferenceController {

    private final UserDefaultInterestService service;

    public UserPreferenceController(UserDefaultInterestService service) {
        this.service = service;
    }

    @GetMapping
    public UserInterestsResponse read(Authentication authentication) {
        return new UserInterestsResponse(service.interests(caller(authentication)));
    }

    @PutMapping
    public UserInterestsResponse save(Authentication authentication,
            @RequestBody @Valid UserInterestSaveRequest request) {
        return new UserInterestsResponse(service.save(caller(authentication), request.interests()));
    }

    private long caller(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AccountPrincipal principal)) {
            throw new PreferenceApiException(401, "USER_REQUIRED", "a signed-in account is required");
        }
        return principal.id();
    }
}
