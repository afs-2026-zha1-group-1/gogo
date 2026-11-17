package com.gogo.hello.splits.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.zaxxer.hikari.HikariDataSource;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Acceptance test for the SQLite three iron rules (spec hard constraint, design D4, task 1.4):
 * pool=1, WAL, busy_timeout=5000, foreign_keys=on. Boots Flyway V1+V2 on a file-backed SQLite database
 * under {@code target/} (gitignored) so WAL can take effect, asserts the pragmas are live, that the
 * production {@code application.yml} declares them, and that the greeting capability remains intact (R5).
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:./target/iron-rules-test.db?journal_mode=WAL&busy_timeout=5000&foreign_keys=on"
})
class SqliteThreeIronRulesTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("dataSource_hikariMaximumPoolSize_isOne")
    void dataSource_hikariMaximumPoolSize_isOne() {
        assertThat(((HikariDataSource) dataSource).getMaximumPoolSize()).isEqualTo(1);
    }

    @Test
    @DisplayName("connection_pragmas_walBusyTimeoutForeignKeysOn")
    void connection_pragmas_walBusyTimeoutForeignKeysOn() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            assertThat(pragma(connection, "journal_mode")).isEqualTo("wal");
            assertThat(pragma(connection, "busy_timeout")).isEqualTo("5000");
            assertThat(pragma(connection, "foreign_keys")).isEqualTo("1");
        }
    }

    @Test
    @DisplayName("applicationYml_declaresThreeIronRules")
    void applicationYml_declaresThreeIronRules() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/application.yml")) {
            assertThat(in).isNotNull();
            String yml = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(yml).contains("journal_mode=WAL", "busy_timeout=5000", "foreign_keys=on", "maximum-pool-size: 1");
        }
    }

    @Test
    @DisplayName("greeting_withIronRules_remainsHelloWorld")
    void greeting_withIronRules_remainsHelloWorld() {
        assertThat(jdbc.queryForObject("SELECT message FROM greeting WHERE id = 1", String.class))
                .isEqualTo("Hello World");
    }

    private String pragma(Connection connection, String name) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("PRAGMA " + name)) {
            resultSet.next();
            return resultSet.getString(1);
        }
    }
}