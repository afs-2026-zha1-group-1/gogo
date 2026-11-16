package com.gogo.hello.common;

/**
 * Business rejection carrying a stable {@link ErrorCode} (design D3). Thrown by guards, services and
 * domain validation; translated to the {@code {data:null,error}} envelope and HTTP status by
 * {@link GlobalExceptionHandler}. Leaf shared kernel type with no dependency on {@code splits}.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }
}