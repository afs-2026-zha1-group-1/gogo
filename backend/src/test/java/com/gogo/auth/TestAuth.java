package com.gogo.auth;

import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Test-only identity helper. Business tests exercise authorization with a real principal without
 * repeating session/CSRF setup; AuthApiTest covers the real login/session/CSRF flow.
 */
public final class TestAuth {

    private TestAuth() {
    }

    public static AccountPrincipal principal(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        long id;
        try {
            id = Long.parseLong(userId.trim());
        } catch (NumberFormatException cause) {
            return null;
        }
        if (id < 1 || id > 5) {
            return null;
        }
        return new AccountPrincipal(id, "user" + id, "user" + id + "@example.com", "");
    }

    public static RequestPostProcessor asUser(String userId) {
        AccountPrincipal principal = principal(userId);
        RequestPostProcessor csrf = SecurityMockMvcRequestPostProcessors.csrf();
        return request -> {
            if (principal != null) {
                SecurityMockMvcRequestPostProcessors.user(principal).postProcessRequest(request);
            }
            csrf.postProcessRequest(request);
            return request;
        };
    }

    public static RequestPostProcessor csrfOnly() {
        return SecurityMockMvcRequestPostProcessors.csrf();
    }
}
