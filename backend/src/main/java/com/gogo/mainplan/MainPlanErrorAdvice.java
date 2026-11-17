package com.gogo.mainplan;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// Mirrors InvitationErrorAdvice but builds Map<String, Object> so the
// precedent {code, message} body can carry the contractual detail fields
// (pendingMembers / scheduleErrors / overruns) for the two codes that define
// them (design D10).
@RestControllerAdvice(basePackages = "com.gogo.mainplan")
public class MainPlanErrorAdvice {

    @ExceptionHandler(MainPlanApiException.class)
    public ResponseEntity<Map<String, Object>> handle(MainPlanApiException cause) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", cause.code());
        body.put("message", cause.getMessage());
        body.putAll(cause.detail());
        return ResponseEntity.status(cause.status()).body(body);
    }
}