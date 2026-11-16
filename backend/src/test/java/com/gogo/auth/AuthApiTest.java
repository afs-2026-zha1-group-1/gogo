package com.gogo.auth;

import static org.hamcrest.Matchers.containsString;
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

@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:auth-api-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class AuthApiTest {

    private static final String LOGIN_BODY = """
            {"email":"alice@example.com","password":"gogo-demo-2026"}""";

    @Autowired
    private MockMvc mockMvc;

    private record Login(MockHttpSession session, String token) {
    }

    private Cookie csrfCookie() throws Exception {
        MvcResult csrf = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn();
        Cookie cookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        org.junit.jupiter.api.Assertions.assertNotNull(cookie, "CSRF cookie must be issued");
        return cookie;
    }

    private Login login(String body) throws Exception {
        Cookie cookie = csrfCookie();
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        return new Login(session, cookie.getValue());
    }

    @Test
    void validCredentialsEstablishSessionAndMe() throws Exception {
        Login login = login(LOGIN_BODY);
        org.junit.jupiter.api.Assertions.assertNotNull(login.session());
        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void emailIsTrimmedAndCaseInsensitive() throws Exception {
        Login login = login("""
                {"email":"  Alice@Example.COM  ","password":"gogo-demo-2026"}""");
        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void unknownEmailAndWrongPasswordAreIndistinguishable() throws Exception {
        Cookie cookie = csrfCookie();
        MvcResult unknown = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue())
                        .content("""
                                {"email":"nobody@example.com","password":"gogo-demo-2026"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andReturn();
        MvcResult wrong = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue())
                        .content("""
                                {"email":"alice@example.com","password":"wrong"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(
                unknown.getResponse().getStatus(), wrong.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(
                unknown.getResponse().getContentAsString(),
                wrong.getResponse().getContentAsString());
    }

    @Test
    void blankCredentialsFailGenerically() throws Exception {
        Cookie cookie = csrfCookie();
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue())
                        .content("""
                                {"email":"","password":""}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void sessionIdRotatesOnLogin() throws Exception {
        Cookie cookie = csrfCookie();
        MockHttpSession anonymous = new MockHttpSession();
        String before = anonymous.getId();
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY)
                        .session(anonymous)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession authenticated = (MockHttpSession) result.getRequest().getSession(false);
        org.junit.jupiter.api.Assertions.assertNotNull(authenticated);
        org.junit.jupiter.api.Assertions.assertNotEquals(before, authenticated.getId());
    }

    @Test
    void publicSurfacesStayAvailableWithoutSession() throws Exception {
        mockMvc.perform(get("/api/greeting"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/invitations/no-such-invitation"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("INVITATION_NOT_FOUND"));
        Cookie cookie = csrfCookie();
        mockMvc.perform(post("/api/invitations/no-such-invitation/accept")
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void legacyHeaderAloneDoesNotAuthenticate() throws Exception {
        mockMvc.perform(get("/api/trips/1").header("X-User-Id", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void splitsKeepMemberRequiredEnvelopeWithoutSession() throws Exception {
        mockMvc.perform(get("/api/trips/1/split-draft"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"));
    }

    @Test
    void stateChangingRequestWithoutCsrfIsRejected() throws Exception {
        Login login = login(LOGIN_BODY);
        mockMvc.perform(post("/api/trips")
                        .session(login.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"No CSRF","destination":"Singapore","startDate":"2026-12-05","endDate":"2026-12-05"}"""))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @Test
    void authenticatedStateChangingRequestWithCsrfSucceeds() throws Exception {
        Login login = login(LOGIN_BODY);
        mockMvc.perform(post("/api/trips")
                        .session(login.session())
                        .cookie(new Cookie("XSRF-TOKEN", login.token()))
                        .header("X-XSRF-TOKEN", login.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"With CSRF","destination":"Singapore","startDate":"2026-12-05","endDate":"2026-12-05"}"""))
                .andExpect(status().isCreated());
    }

    @Test
    void loginFailureDoesNotLeakAccountDetails() throws Exception {
        Cookie cookie = csrfCookie();
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue())
                        .content("""
                                {"email":"alice@example.com","password":"wrong"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value(containsString("Invalid credentials")));
    }
}
