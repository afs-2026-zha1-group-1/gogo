package com.gogo.auth;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.gogo.auth")
public class AuthErrorAdvice {

    @ExceptionHandler(AuthApiException.class)
    public ResponseEntity<Map<String, String>> authError(AuthApiException cause) {
        return ResponseEntity.status(cause.status())
                .body(Map.of("code", cause.code(), "message", cause.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> invalidCredentials(AuthenticationException cause) {
        return ResponseEntity.status(401)
                .body(Map.of("code", "INVALID_CREDENTIALS", "message", "Invalid credentials"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> unreadableBody(HttpMessageNotReadableException cause,
            HttpServletRequest request) {
        if (request.getRequestURI().endsWith("/api/auth/login")) {
            return ResponseEntity.status(401)
                    .body(Map.of("code", "INVALID_CREDENTIALS", "message", "Invalid credentials"));
        }
        return ResponseEntity.status(400)
                .body(Map.of("code", "INVALID_REQUEST", "message", "Request body is invalid"));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> dataAccessFailure(DataAccessException cause) {
        return ResponseEntity.status(500)
                .body(Map.of("code", "INTERNAL_ERROR", "message", "The account request could not be completed"));
    }
}
