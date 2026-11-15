package com.gogo.invitation;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.gogo.invitation")
public class InvitationErrorAdvice {

    @ExceptionHandler(InvitationApiException.class)
    public ResponseEntity<Map<String, String>> invitationError(InvitationApiException cause) {
        return ResponseEntity.status(cause.status())
                .body(Map.of("code", cause.code(), "message", cause.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> unreadableBody(HttpMessageNotReadableException cause) {
        return ResponseEntity.badRequest()
                .body(Map.of("code", "INVALID_REQUEST", "message", "Request body is not readable JSON"));
    }
}
