package com.gogo.preference;

/**
 * Must-do rejection carrying the HTTP status and the `MUST_DO_*` code (MD2). Mirrors
 * {@link PreferenceApiException}; {@code PreferenceErrorAdvice} maps it the same way, so the
 * advice keeps one scope per exception family (MD6).
 */
public class MustDoApiException extends RuntimeException {

    private final int status;
    private final String code;

    public MustDoApiException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public int status() {
        return status;
    }

    public String code() {
        return code;
    }
}
