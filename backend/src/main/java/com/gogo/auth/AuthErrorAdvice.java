package com.gogo.auth;

import java.util.Map;

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
    public ResponseEntity<Map<String, String>> unreadableLoginBody(HttpMessageNotReadableException cause) {
        return ResponseEntity.status(401)
                .body(Map.of("code", "INVALID_CREDENTIALS", "message", "Invalid credentials"));
    }
}
