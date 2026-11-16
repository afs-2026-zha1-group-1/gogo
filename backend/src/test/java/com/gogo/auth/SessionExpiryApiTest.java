package com.gogo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Covers the no-longer-valid-session branch (invalidated/expired): protected requests return 401
 * and a fresh login restores access. Tomcat enforces session timeouts in whole minutes, so the test
 * invalidates the session explicitly instead of sleeping for a container timeout.
 */
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:session-expiry-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class SessionExpiryApiTest {

    @Autowired
    private MockMvc mockMvc;

    private record Login(MockHttpSession session, Cookie csrf) {
    }

    private Login login() throws Exception {
        MvcResult csrf = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn();
        Cookie cookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue())
                        .content("""
                                {"email":"alice@example.com","password":"gogo-demo-2026"}"""))
                .andExpect(status().isOk())
                .andReturn();
        return new Login((MockHttpSession) result.getRequest().getSession(false), cookie);
    }

    @Test
    void invalidatedSessionIsRejectedAndReLoginRestoresAccess() throws Exception {
        Login first = login();
        org.junit.jupiter.api.Assertions.assertNotNull(first.session());
        first.session().invalidate();

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));

        Login second = login();
        mockMvc.perform(get("/api/auth/me").session(second.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }
}
