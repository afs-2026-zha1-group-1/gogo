package com.gogo.hello.splits.controller;

import com.gogo.auth.TestAuth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Shared base for splits API acceptance tests on the main trip schema. Boots one in-memory SQLite context with
 * the real Flyway migrations (V1 greeting, V2 app_user/trip/trip_member seed, V3 invitation + main_plan_confirmed,
 * V4 split_draft + plan_node). Before each test it resets to a split-ready seed state: no active draft, no
 * generated split route pairs, and the fixture trip's main plan confirmed. Identity is app_user via X-User-Id;
 * fixtures are resolved by natural keys so tests never hardcode ids.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:file:split-api-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
abstract class AbstractSplitApiTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected ObjectMapper objectMapper;

    @BeforeEach
    void resetToSeed() {
        jdbc.update("DELETE FROM split_draft");
        jdbc.update("DELETE FROM plan_node WHERE branch_id IN ('split-a', 'split-b')");
        jdbc.update("UPDATE trip SET main_plan_confirmed = 1");
    }

    protected String sgfTripId() {
        return jdbc.queryForObject(
                "SELECT id FROM trip WHERE name = 'Singapore Friends Day'", String.class);
    }

    protected String memberId(String displayName) {
        return jdbc.queryForObject(
                "SELECT id FROM app_user WHERE display_name = ?", String.class, displayName);
    }

    protected String eveId() {
        return jdbc.queryForObject("SELECT id FROM app_user WHERE display_name = 'Eve'", String.class);
    }

    protected String stopId(String title) {
        return jdbc.queryForObject(
                "SELECT id FROM plan_node WHERE trip_id = ? AND title = ?", String.class, sgfTripId(), title);
    }

    protected int activeDraftCount() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM split_draft WHERE trip_id = ?", Integer.class, sgfTripId());
        return count == null ? 0 : count;
    }

    protected String draftJson() {
        var docs = jdbc.queryForList(
                "SELECT document FROM split_draft WHERE trip_id = ?", String.class, sgfTripId());
        return docs.isEmpty() ? null : docs.get(0);
    }
}
