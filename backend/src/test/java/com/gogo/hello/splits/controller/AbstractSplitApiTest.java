package com.gogo.hello.splits.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Shared base for splits API acceptance tests (atdd-design §2/§4). Boots one in-memory SQLite context
 * (shared-cache, pool=1) with the real Flyway V1+V2 seed and centrally resets to seed state before each test:
 * {@code split_draft=NULL}, generated split route pairs removed, all members re-acknowledged. Fixture ids are
 * resolved by natural key (invite_code / display_name / title) so tests never hardcode seed UUIDs.
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
        jdbc.update("UPDATE trip SET split_draft = NULL");
        jdbc.update("DELETE FROM plan_node WHERE branch_id IN ('split-a', 'split-b')");
        jdbc.update("UPDATE trip_member SET plan_ack_version = 1");
    }

    protected String sgfTripId() {
        return jdbc.queryForObject("SELECT id FROM trip WHERE invite_code = 'SGF26A'", String.class);
    }

    protected String memberId(String displayName) {
        return jdbc.queryForObject(
                "SELECT id FROM trip_member WHERE display_name = ? AND trip_id = ?",
                String.class, displayName, sgfTripId());
    }

    protected String eveId() {
        return jdbc.queryForObject("SELECT id FROM trip_member WHERE display_name = 'Eve'", String.class);
    }

    protected String stopId(String title) {
        return jdbc.queryForObject(
                "SELECT id FROM plan_node WHERE trip_id = ? AND title = ?", String.class, sgfTripId(), title);
    }

    protected int activeDraftCount() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM trip WHERE id = ? AND split_draft IS NOT NULL", Integer.class, sgfTripId());
        return count == null ? 0 : count;
    }

    protected String draftJson() {
        return jdbc.queryForObject("SELECT split_draft FROM trip WHERE id = ?", String.class, sgfTripId());
    }
}