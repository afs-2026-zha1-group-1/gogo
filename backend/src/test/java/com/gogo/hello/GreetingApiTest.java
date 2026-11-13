package com.gogo.hello;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

// REQ-001
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:greeting-test;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
class GreetingApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void returnsHelloWorldFromDatabase() throws Exception {
        mockMvc.perform(get("/api/greeting"))
                .andExpect(status().isOk())
                .andExpect(content().string("Hello World"));
    }

    @Test
    void returnsTheStoredMessageWhenItChanges() throws Exception {
        jdbcTemplate.update("UPDATE greeting SET message = ? WHERE id = 1", "Guten Tag");
        try {
            mockMvc.perform(get("/api/greeting"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Guten Tag"));
        } finally {
            jdbcTemplate.update("UPDATE greeting SET message = ? WHERE id = 1", "Hello World");
        }
    }

    @Test
    void rejectsWriteMethods() throws Exception {
        mockMvc.perform(post("/api/greeting")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put("/api/greeting")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete("/api/greeting")).andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/greeting"))
                .andExpect(status().isOk())
                .andExpect(content().string("Hello World"));
    }
}