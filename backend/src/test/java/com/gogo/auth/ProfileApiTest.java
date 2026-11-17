package com.gogo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
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
        "spring.datasource.url=jdbc:sqlite:file:profile-api-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class ProfileApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private record Login(MockHttpSession session, Cookie cookie) {
    }

    @BeforeEach
    void resetAlice() {
        jdbc.update("UPDATE app_user SET display_name = 'Alice' WHERE id = 1");
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

    private MvcResult updateName(Login login, String body) throws Exception {
        return mockMvc.perform(patch("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .session(login.session())
                        .cookie(login.cookie())
                        .header("X-XSRF-TOKEN", login.cookie().getValue()))
                .andReturn();
    }

    @Test
    void readsOwnProfile() throws Exception {
        Login login = login();
        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void updatesTrimmedDisplayNameAndPersists() throws Exception {
        Login login = login();
        MvcResult result = updateName(login, "{\"name\":\"  Alice Smith  \"}");
        Assertions.assertEquals(200, result.getResponse().getStatus());

        Assertions.assertEquals("Alice Smith",
                jdbc.queryForObject("SELECT display_name FROM app_user WHERE id = 1", String.class));
        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice Smith"));
    }

    @Test
    void anotherSessionSeesTheUpdatedName() throws Exception {
        Login first = login();
        Login second = login();
        Assertions.assertEquals(200, updateName(first, "{\"name\":\"Alice Fresh\"}")
                .getResponse().getStatus());

        mockMvc.perform(get("/api/auth/me").session(second.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice Fresh"));
    }

    @Test
    void rejectsBlankAndOverLengthNames() throws Exception {
        Login login = login();
        assertBadName(login, "{\"name\":\"   \"}");
        assertBadName(login, "{\"name\":\"" + "a".repeat(31) + "\"}");
        Assertions.assertEquals("Alice",
                jdbc.queryForObject("SELECT display_name FROM app_user WHERE id = 1", String.class));
    }

    @Test
    void keepsAccountIdentityAndMemberships() throws Exception {
        Login login = login();
        Integer memberships = jdbc.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE user_id = 1", Integer.class);
        Long organizer = jdbc.queryForObject(
                "SELECT organizer_id FROM trip WHERE name = 'Singapore Friends Day'", Long.class);

        Assertions.assertEquals(200, updateName(login, "{\"name\":\"Renamed Alice\"}")
                .getResponse().getStatus());

        Assertions.assertEquals(memberships, jdbc.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE user_id = 1", Integer.class));
        Assertions.assertEquals(organizer, jdbc.queryForObject(
                "SELECT organizer_id FROM trip WHERE name = 'Singapore Friends Day'", Long.class));
    }

    @Test
    void cannotTargetAnotherAccount() throws Exception {
        Login login = login();
        String benBefore = jdbc.queryForObject(
                "SELECT display_name FROM app_user WHERE id = 2", String.class);

        MvcResult result = updateName(login, "{\"name\":\"Nina\",\"id\":2,\"userId\":2}");
        Assertions.assertEquals(200, result.getResponse().getStatus());

        Assertions.assertEquals("Nina",
                jdbc.queryForObject("SELECT display_name FROM app_user WHERE id = 1", String.class));
        Assertions.assertEquals(benBefore,
                jdbc.queryForObject("SELECT display_name FROM app_user WHERE id = 2", String.class));
    }

    @Test
    void failedUpdateKeepsPreviousName() throws Exception {
        Login login = login();
        jdbc.execute("DROP TRIGGER IF EXISTS fail_profile");
        jdbc.execute("""
                CREATE TRIGGER fail_profile BEFORE UPDATE OF display_name ON app_user
                WHEN NEW.id = 1 AND NEW.display_name = 'Explode'
                BEGIN SELECT RAISE(ABORT, 'forced profile failure'); END""");
        try {
            MvcResult result = updateName(login, "{\"name\":\"Explode\"}");
            Assertions.assertTrue(result.getResponse().getStatus() >= 500,
                    "expected a 5xx, got " + result.getResponse().getStatus());
            Assertions.assertEquals("Alice",
                    jdbc.queryForObject("SELECT display_name FROM app_user WHERE id = 1", String.class));
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS fail_profile");
        }
    }

    @Test
    void patchWithoutSessionIsUnauthorized() throws Exception {
        Cookie cookie = csrfCookie();
        mockMvc.perform(patch("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nobody\"}")
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void patchWithoutCsrfIsRejected() throws Exception {
        Login login = login();
        mockMvc.perform(patch("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"No Token\"}")
                        .session(login.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    private void assertBadName(Login login, String body) throws Exception {
        MvcResult result = updateName(login, body);
        Assertions.assertEquals(400, result.getResponse().getStatus(), body);
        Assertions.assertTrue(result.getResponse().getContentAsString().contains("INVALID_NAME"),
                body + " -> " + result.getResponse().getContentAsString());
    }
}
