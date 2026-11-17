package com.gogo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:register-api-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class RegisterApiTest {

    private static final String NEXT_LOGIN = "{\"next\":\"login\"}";
    private static final String EMAIL = "nina@example.com";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private Cookie csrfCookie() throws Exception {
        MvcResult csrf = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn();
        Cookie cookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        Assertions.assertNotNull(cookie, "CSRF cookie must be issued");
        return cookie;
    }

    private MvcResult register(String body, Cookie cookie) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andReturn();
    }

    private int userCount() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM app_user", Integer.class);
        return count == null ? 0 : count;
    }

    private int credentialCount() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM account_credential", Integer.class);
        return count == null ? 0 : count;
    }

    private void removeAccount(String email) {
        List<Long> ids = jdbc.queryForList(
                "SELECT user_id FROM account_credential WHERE email = ?", Long.class, email);
        jdbc.update("DELETE FROM account_credential WHERE email = ?", email);
        for (Long id : ids) {
            jdbc.update("DELETE FROM app_user WHERE id = ?", id);
        }
    }

    @Test
    void validRegistrationCreatesOneAccountAndNoSession() throws Exception {
        removeAccount(EMAIL);
        int users = userCount();
        int credentials = credentialCount();

        MvcResult result = register("""
                {"email":"  Nina@Example.COM  ","name":"  Nina  ","password":"nina2026"}""",
                csrfCookie());

        Assertions.assertEquals(200, result.getResponse().getStatus());
        Assertions.assertEquals(NEXT_LOGIN, result.getResponse().getContentAsString());
        Assertions.assertEquals(users + 1, userCount());
        Assertions.assertEquals(credentials + 1, credentialCount());
        Assertions.assertNull(result.getRequest().getSession(false), "registration must not create a session");

        var row = jdbc.queryForMap(
                "SELECT u.display_name, c.email, c.password_hash FROM app_user u "
                        + "JOIN account_credential c ON c.user_id = u.id WHERE c.email = ?",
                EMAIL);
        Assertions.assertEquals("Nina", row.get("display_name"));
        Assertions.assertEquals(EMAIL, row.get("email"));
        Assertions.assertTrue(((String) row.get("password_hash")).startsWith("$2"));
        Assertions.assertFalse(((String) row.get("password_hash")).contains("nina2026"));
    }

    @Test
    void duplicateEmailIsRejectedWithEmailTaken() throws Exception {
        removeAccount(EMAIL);
        int users = userCount();
        int credentials = credentialCount();

        MvcResult first = register("""
                {"email":"nina@example.com","name":"Nina","password":"nina2026"}""",
                csrfCookie());
        MvcResult second = register("""
                {"email":"  NINA@Example.COM  ","name":"Nina Again","password":"other-pass-2026"}""",
                csrfCookie());

        Assertions.assertEquals(200, first.getResponse().getStatus());
        Assertions.assertEquals(NEXT_LOGIN, first.getResponse().getContentAsString());
        Assertions.assertEquals(409, second.getResponse().getStatus());
        Assertions.assertTrue(second.getResponse().getContentAsString().contains("EMAIL_TAKEN"));
        Assertions.assertEquals(users + 1, userCount());
        Assertions.assertEquals(credentials + 1, credentialCount());
    }

    @Test
    void invalidInputsCreateNoAccount() throws Exception {
        int users = userCount();
        int credentials = credentialCount();

        assertBadRequest("{\"email\":\"nina.example.com\",\"name\":\"Nina\",\"password\":\"nina2026\"}",
                "INVALID_EMAIL");
        assertBadRequest("{\"email\":\"" + EMAIL + "\",\"name\":\"   \",\"password\":\"nina2026\"}",
                "INVALID_NAME");
        assertBadRequest("{\"email\":\"" + EMAIL + "\",\"name\":\"" + "a".repeat(31)
                + "\",\"password\":\"nina2026\"}", "INVALID_NAME");
        assertBadRequest("{\"email\":\"" + EMAIL + "\",\"name\":\"Nina\",\"password\":\"abcde\"}",
                "INVALID_PASSWORD");
        assertBadRequest("{\"email\":\"" + EMAIL + "\",\"name\":\"Nina\",\"password\":\""
                + "a".repeat(73) + "\"}", "INVALID_PASSWORD");

        Assertions.assertEquals(users, userCount());
        Assertions.assertEquals(credentials, credentialCount());
    }

    @Test
    void malformedJsonIsInvalidRequest() throws Exception {
        MvcResult result = register("{not-json", csrfCookie());
        Assertions.assertEquals(400, result.getResponse().getStatus());
        Assertions.assertTrue(result.getResponse().getContentAsString().contains("INVALID_REQUEST"));
    }

    @Test
    void registrationDoesNotSignTheTravelerIn() throws Exception {
        removeAccount(EMAIL);
        register("""
                {"email":"nina@example.com","name":"Nina","password":"nina2026"}""", csrfCookie());

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void registeredAccountCanLogIn() throws Exception {
        removeAccount(EMAIL);
        register("""
                {"email":"nina@example.com","name":"  Nina  ","password":"nina2026"}""", csrfCookie());

        Cookie cookie = csrfCookie();
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nina@example.com\",\"password\":\"nina2026\"}")
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nina"))
                .andExpect(jsonPath("$.email").value("nina@example.com"))
                .andReturn();
        var session = login.getRequest().getSession(false);
        Assertions.assertNotNull(session);

        mockMvc.perform(get("/api/auth/me").session((org.springframework.mock.web.MockHttpSession) session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nina"));
    }

    @Test
    void persistenceFailureRollsBackBothRows() throws Exception {
        removeAccount("fail@example.com");
        int users = userCount();
        int credentials = credentialCount();
        jdbc.execute("DROP TRIGGER IF EXISTS fail_register");
        jdbc.execute("""
                CREATE TRIGGER fail_register BEFORE INSERT ON account_credential
                WHEN NEW.email = 'fail@example.com'
                BEGIN SELECT RAISE(ABORT, 'forced registration failure'); END""");
        try {
            MvcResult result = register("""
                    {"email":"fail@example.com","name":"Fail","password":"nina2026"}""", csrfCookie());
            Assertions.assertTrue(result.getResponse().getStatus() >= 500,
                    "expected a 5xx, got " + result.getResponse().getStatus());
            Assertions.assertTrue(result.getResponse().getContentAsString().contains("INTERNAL_ERROR"));
            Assertions.assertEquals(users, userCount());
            Assertions.assertEquals(credentials, credentialCount());
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS fail_register");
            removeAccount("fail@example.com");
        }
    }

    private void assertBadRequest(String body, String code) throws Exception {
        MvcResult result = register(body, csrfCookie());
        Assertions.assertEquals(400, result.getResponse().getStatus(), body);
        Assertions.assertTrue(result.getResponse().getContentAsString().contains(code),
                body + " -> " + result.getResponse().getContentAsString());
    }
}
