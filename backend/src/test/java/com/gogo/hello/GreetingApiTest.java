package com.gogo.hello;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

// REQ-002
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:file:greeting-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
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
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Hello World"));
    }

    @Test
    void returnsTheStoredMessageWhenItChanges() throws Exception {
        jdbcTemplate.update("UPDATE greeting SET message = ? WHERE id = 1", "Guten Tag");
        try {
            mockMvc.perform(get("/api/greeting"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Guten Tag"));
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
                .andExpect(jsonPath("$.message").value("Hello World"));
    }
}