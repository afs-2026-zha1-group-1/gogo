package com.gogo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:logout-api-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class LogoutApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private record Login(MockHttpSession session, Cookie cookie) {
    }

    private Cookie csrfCookie() throws Exception {
        MvcResult csrf = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn();
        Cookie cookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        Assertions.assertNotNull(cookie, "CSRF cookie must be issued");
        return cookie;
    }

    private Login login() throws Exception {
        Cookie cookie = csrfCookie();
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"alice@example.com","password":"gogo-demo-2026"}""")
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        Assertions.assertNotNull(session);
        return new Login(session, cookie);
    }

    private MvcResult logout(Login login) throws Exception {
        return mockMvc.perform(post("/api/auth/logout")
                        .session(login.session())
                        .cookie(login.cookie())
                        .header("X-XSRF-TOKEN", login.cookie().getValue()))
                .andReturn();
    }

    @Test
    void logoutInvalidatesTheSession() throws Exception {
        Login login = login();
        MvcResult result = logout(login);

        Assertions.assertEquals(204, result.getResponse().getStatus());
        Assertions.assertTrue(login.session().isInvalid(), "the server-side session must be invalidated");

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(get("/api/trips/1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void logoutWithoutSessionIsUnauthorized() throws Exception {
        Cookie cookie = csrfCookie();
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void logoutWithoutCsrfKeepsTheSession() throws Exception {
        Login login = login();
        mockMvc.perform(post("/api/auth/logout").session(login.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    void logoutPreservesAccountAndMembershipData() throws Exception {
        Integer memberships = jdbc.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE user_id = 1", Integer.class);
        Login login = login();
        Assertions.assertEquals(204, logout(login).getResponse().getStatus());
        Assertions.assertEquals("Alice",
                jdbc.queryForObject("SELECT display_name FROM app_user WHERE id = 1", String.class));
        Assertions.assertEquals(memberships, jdbc.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE user_id = 1", Integer.class));

        Login again = login();
        mockMvc.perform(get("/api/auth/me").session(again.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice"));
    }
}
