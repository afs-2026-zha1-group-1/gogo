package com.gogo.hello.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Centralised translation of {@link ApiException} to the {@code {data:null,error:{code,message}}}
 * envelope and its declared HTTP status (design D3). Keeps controllers thin and the error contract
 * consistent across all five splits endpoints. Leaf shared kernel; no dependency on {@code splits}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        ErrorCode code = ex.errorCode();
        return ResponseEntity.status(code.httpStatus())
                .body(ApiResponse.error(code, ex.getMessage(), ex.details()));
    }
}