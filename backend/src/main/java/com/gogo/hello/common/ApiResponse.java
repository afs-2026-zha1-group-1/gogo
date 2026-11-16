package com.gogo.hello.common;

/**
 * Unified response envelope {@code {data,error}} (design D3, spec chain convention).
 * Success carries {@code data} with {@code error=null}; rejection carries {@code data=null} with a
 * stable {@code error.code} and non-contract {@code error.message}. Leaf shared kernel type with no
 * dependency on the {@code splits} module.
 *
 * @param <T> the payload type
 */
public record ApiResponse<T>(T data, ApiError error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode code, String message) {
        return new ApiResponse<>(null, new ApiError(code.name(), message));
    }

    /** Error detail; {@code code} is the stable contract, {@code message} is implementation text. */
    public record ApiError(String code, String message) {
    }
}