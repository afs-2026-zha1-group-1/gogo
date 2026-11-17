package com.gogo.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

final class AccountValidation {

    static final int NAME_MIN = 1;
    static final int NAME_MAX = 30;
    static final int PASSWORD_MIN_BYTES = 6;
    static final int PASSWORD_MAX_BYTES = 72;

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private AccountValidation() {
    }

    static String normalizeEmail(String raw) {
        return raw == null ? null : raw.strip().toLowerCase(Locale.ROOT);
    }

    static boolean isValidEmail(String normalized) {
        return normalized != null && EMAIL.matcher(normalized).matches();
    }

    static String normalizeName(String raw) {
        return raw == null ? null : raw.strip();
    }

    static int nameLength(String normalized) {
        return normalized == null ? 0 : normalized.codePointCount(0, normalized.length());
    }

    static int passwordBytes(String password) {
        return password == null ? 0 : password.getBytes(StandardCharsets.UTF_8).length;
    }
}
