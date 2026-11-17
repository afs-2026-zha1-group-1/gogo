package com.gogo.auth;

import java.util.Locale;

import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AccountService {

    private final AccountCredentialRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;

    public AccountService(AccountCredentialRepository repository,
            PasswordEncoder passwordEncoder,
            PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void register(RegisterRequest request) {
        if (request == null) {
            throw invalidRequest();
        }
        String email = AccountValidation.normalizeEmail(request.email());
        if (!AccountValidation.isValidEmail(email)) {
            throw new AuthApiException(400, "INVALID_EMAIL", "Enter a valid email address");
        }
        String name = validName(request.name());
        int passwordBytes = AccountValidation.passwordBytes(request.password());
        if (passwordBytes < AccountValidation.PASSWORD_MIN_BYTES
                || passwordBytes > AccountValidation.PASSWORD_MAX_BYTES) {
            throw new AuthApiException(400, "INVALID_PASSWORD", "Password must be 6-72 bytes");
        }

        String passwordHash = passwordEncoder.encode(request.password());
        try {
            transactionTemplate.executeWithoutResult(status -> {
                long userId = repository.insertUser(name);
                repository.insertCredential(userId, email, passwordHash);
            });
        } catch (DataAccessException cause) {
            if (isDuplicateEmail(cause)) {
                // The transaction already rolled back the partially inserted app_user row.
                // The user directed an explicit duplicate prompt (2026-11-17), replacing the
                // earlier non-disclosure response.
                throw new AuthApiException(409, "EMAIL_TAKEN", "This email is already registered");
            }
            throw cause;
        }
    }

    public AccountPrincipal getAccount(long userId) {
        return repository.findById(userId)
                .orElseThrow(() -> new AuthApiException(401, "USER_REQUIRED", "Authentication required"));
    }

    public AccountPrincipal updateName(long userId, UpdateProfileRequest request) {
        if (request == null) {
            throw invalidRequest();
        }
        String name = validName(request.name());
        int updated = repository.updateDisplayName(userId, name);
        if (updated == 0) {
            throw new AuthApiException(401, "USER_REQUIRED", "Authentication required");
        }
        return repository.findById(userId)
                .orElseThrow(() -> new AuthApiException(401, "USER_REQUIRED", "Authentication required"));
    }

    private static String validName(String rawName) {
        String name = AccountValidation.normalizeName(rawName);
        int length = AccountValidation.nameLength(name);
        if (length < AccountValidation.NAME_MIN || length > AccountValidation.NAME_MAX) {
            throw new AuthApiException(400, "INVALID_NAME", "Display name must be 1-30 characters");
        }
        return name;
    }

    private static AuthApiException invalidRequest() {
        return new AuthApiException(400, "INVALID_REQUEST", "Request body is required");
    }

    private static boolean isDuplicateEmail(Throwable cause) {
        Throwable current = cause;
        while (current != null) {
            String message = current.getMessage();
            if (message != null
                    && message.toLowerCase(Locale.ROOT).contains("account_credential.email")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
