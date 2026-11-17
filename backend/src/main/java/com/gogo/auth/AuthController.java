package com.gogo.auth;

import java.util.List;
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
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final AccountService accountService;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    public AuthController(AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            AccountService accountService) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.accountService = accountService;
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

    @PostMapping("/api/auth/register")
    public RegisterResponse register(@RequestBody(required = false) RegisterRequest request) {
        accountService.register(request);
        return RegisterResponse.toLogin();
    }

    @GetMapping("/api/auth/me")
    public AccountResponse me(@AuthenticationPrincipal AccountPrincipal principal) {
        if (principal == null) {
            throw new AuthApiException(401, "USER_REQUIRED", "Authentication required");
        }
        return AccountResponse.from(accountService.getAccount(principal.id()));
    }

    @PatchMapping("/api/auth/me")
    public AccountResponse updateMe(@RequestBody(required = false) UpdateProfileRequest request,
            @AuthenticationPrincipal AccountPrincipal principal,
            HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        if (principal == null) {
            throw new AuthApiException(401, "USER_REQUIRED", "Authentication required");
        }
        AccountPrincipal updated = accountService.updateName(principal.id(), request);
        Authentication existing = SecurityContextHolder.getContext().getAuthentication();
        Authentication refreshed = new UsernamePasswordAuthenticationToken(
                updated,
                existing == null ? null : existing.getCredentials(),
                existing == null ? List.of() : existing.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(refreshed);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);
        return AccountResponse.from(updated);
    }

    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        logoutHandler.logout(httpRequest, httpResponse,
                SecurityContextHolder.getContext().getAuthentication());
        return ResponseEntity.noContent().build();
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
