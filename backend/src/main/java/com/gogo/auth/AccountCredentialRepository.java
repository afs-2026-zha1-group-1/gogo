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
        var rows = jdbc.query(
                "SELECT u.id, u.display_name, c.email, c.password_hash "
                        + "FROM account_credential c JOIN app_user u ON u.id = c.user_id "
                        + "WHERE c.email = ?",
                (rs, rowNum) -> new AccountPrincipal(
                        rs.getLong("id"),
                        rs.getString("display_name"),
                        rs.getString("email"),
                        rs.getString("password_hash")),
                normalized);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }
}
