package com.gogo.hello.common;

import java.util.Map;

/**
 * Business rejection carrying a stable {@link ErrorCode} (design D3). Thrown by guards, services and
 * domain validation; translated to the {@code {data:null,error}} envelope and HTTP status by
 * {@link GlobalExceptionHandler}. An optional {@code details} map carries machine-readable values for
 * codes that need them (US-049-050: {@code SPLIT_TIMING_INFEASIBLE.routes[]} and
 * {@code SPLIT_DRAFT_INCOMPLETE.missing[]}). Leaf shared kernel type with no dependency on {@code splits}.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Map<String, Object> details;

    public ApiException(ErrorCode errorCode, String message) {
        this(errorCode, message, null);
    }

    public ApiException(ErrorCode errorCode, String message, Map<String, Object> details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    /** Optional machine-readable detail body; null means the error carries no extra fields. */
    public Map<String, Object> details() {
        return details;
    }
}
