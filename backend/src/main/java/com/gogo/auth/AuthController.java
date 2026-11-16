package com.gogo.auth;

import java.util.Locale;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/api/auth/login")
    public AccountResponse login(@RequestBody(required = false) LoginRequest request,
            HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        if (request == null || isBlank(request.email()) || isBlank(request.password())) {
            throw new AuthApiException(401, "INVALID_CREDENTIALS", "Invalid credentials");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password()));
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);
        return AccountResponse.from((AccountPrincipal) authentication.getPrincipal());
    }

    @GetMapping("/api/auth/me")
    public AccountResponse me(@AuthenticationPrincipal AccountPrincipal principal) {
        if (principal == null) {
            throw new AuthApiException(401, "USER_REQUIRED", "Authentication required");
        }
        return AccountResponse.from(principal);
    }

    @GetMapping("/api/auth/csrf")
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
