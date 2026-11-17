package com.gogo.auth;

import java.util.Locale;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountCredentialRepository {

    private final JdbcTemplate jdbc;

    public AccountCredentialRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<AccountPrincipal> findByEmail(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return findOne("WHERE c.email = ?", normalized);
    }

    public Optional<AccountPrincipal> findById(long userId) {
        return findOne("WHERE u.id = ?", userId);
    }

    public long insertUser(String displayName) {
        jdbc.update("INSERT INTO app_user (display_name) VALUES (?)", displayName);
        Long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        if (id == null) {
            throw new IllegalStateException("SQLite did not return a generated app_user id");
        }
        return id;
    }

    public void insertCredential(long userId, String email, String passwordHash) {
        jdbc.update(
                "INSERT INTO account_credential (user_id, email, password_hash) VALUES (?, ?, ?)",
                userId, email, passwordHash);
    }

    public int updateDisplayName(long userId, String displayName) {
        return jdbc.update("UPDATE app_user SET display_name = ? WHERE id = ?", displayName, userId);
    }

    private Optional<AccountPrincipal> findOne(String where, Object value) {
        var rows = jdbc.query(
                "SELECT u.id, u.display_name, c.email, c.password_hash "
                        + "FROM account_credential c JOIN app_user u ON u.id = c.user_id "
                        + where,
                (rs, rowNum) -> new AccountPrincipal(
                        rs.getLong("id"),
                        rs.getString("display_name"),
                        rs.getString("email"),
                        rs.getString("password_hash")),
                value);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }
}
