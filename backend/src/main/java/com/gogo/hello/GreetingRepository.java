package com.gogo.hello;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GreetingRepository {

    private static final int GREETING_ID = 1;

    private final JdbcTemplate jdbcTemplate;

    public GreetingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String findMessage() {
        return jdbcTemplate.queryForObject(
                "SELECT message FROM greeting WHERE id = ?", String.class, GREETING_ID);
    }
}
