package com.gogo.preference;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.gogo.preference")
public class PreferenceErrorAdvice {

    @ExceptionHandler(PreferenceApiException.class)
    public ResponseEntity<Map<String, String>> preferenceError(PreferenceApiException cause) {
        return ResponseEntity.status(cause.status())
                .body(Map.of("code", cause.code(), "message", cause.getMessage()));
    }

    // REQ-020 (MD2, MD6): the only advice edit this change makes — one more branch, mirroring
    // the preference family, so MUST_DO_* codes keep their own type without widening the scope.
    @ExceptionHandler(MustDoApiException.class)
    public ResponseEntity<Map<String, String>> mustDoError(MustDoApiException cause) {
        return ResponseEntity.status(cause.status())
                .body(Map.of("code", cause.code(), "message", cause.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> invalidBody(MethodArgumentNotValidException cause) {
        return ResponseEntity.badRequest()
                .body(Map.of("code", "INVALID_REQUEST", "message", "Request body is not a valid preference payload"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> unreadableBody(HttpMessageNotReadableException cause) {
        return ResponseEntity.badRequest()
                .body(Map.of("code", "INVALID_REQUEST", "message", "Request body is not readable JSON"));
    }
}
