package com.gogo.hello.common;

import java.util.Map;

/**
 * Unified response envelope {@code {data,error}} (design D3, spec chain convention). Success carries
 * {@code data} with {@code error=null}; rejection carries {@code data=null} with a stable
 * {@code error.code}, non-contract {@code error.message} and optional machine-readable
 * {@code error.details} (US-049-050: per-route timing values and the incomplete-draft missing list).
 * Leaf shared kernel type with no dependency on the {@code splits} module.
 *
 * @param <T> the payload type
 */
public record ApiResponse<T>(T data, ApiError error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode code, String message) {
        return error(code, message, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode code, String message, Map<String, Object> details) {
        return new ApiResponse<>(null, new ApiError(code.name(), message, details));
    }

    /**
     * Error detail; {@code code} is the stable contract, {@code message} is implementation text and
     * {@code details} carries optional machine-readable values (omitted when null).
     */
    public record ApiError(String code, String message, Map<String, Object> details) {
    }
}
