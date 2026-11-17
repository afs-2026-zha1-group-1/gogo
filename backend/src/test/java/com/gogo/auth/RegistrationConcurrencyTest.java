package com.gogo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

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
        "spring.datasource.url=jdbc:sqlite:file:register-concurrency-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class RegistrationConcurrencyTest {

    private static final String EMAIL = "race@example.com";
    private static final String BODY = """
            {"email":"race@example.com","name":"Race","password":"nina2026"}""";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void concurrentDuplicateSubmissionsCreateOneAccount() throws Exception {
        removeAccount();

        MvcResult csrf = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn();
        Cookie cookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        Assertions.assertNotNull(cookie);

        int users = userCount();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit(() -> {
                    start.await(5, TimeUnit.SECONDS);
                    MvcResult result = mockMvc.perform(post("/api/auth/register")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(BODY)
                                    .cookie(cookie)
                                    .header("X-XSRF-TOKEN", cookie.getValue()))
                            .andReturn();
                    return result.getResponse().getStatus();
                }));
            }
            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(20, TimeUnit.SECONDS));
            }
            Assertions.assertTrue(statuses.contains(200), "one submission must succeed: " + statuses);
            Assertions.assertTrue(statuses.contains(409), "the duplicate must be rejected: " + statuses);
        } finally {
            pool.shutdownNow();
        }

        Assertions.assertEquals(users + 1, userCount(), "exactly one account must be created");
        Integer rows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM account_credential WHERE email = ?", Integer.class, EMAIL);
        Assertions.assertEquals(1, rows);
        removeAccount();
    }

    private int userCount() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM app_user", Integer.class);
        return count == null ? 0 : count;
    }

    private void removeAccount() {
        List<Long> ids = jdbc.queryForList(
                "SELECT user_id FROM account_credential WHERE email = ?", Long.class, EMAIL);
        jdbc.update("DELETE FROM account_credential WHERE email = ?", EMAIL);
        for (Long id : ids) {
            jdbc.update("DELETE FROM app_user WHERE id = ?", id);
        }
    }
}
