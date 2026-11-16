package com.gogo.hello.common;

import org.springframework.http.HttpStatus;

/**
 * Stable machine-readable error codes for the splits capability (design D3, spec chain convention).
 * Each code carries its HTTP status mapping; {@code error.code} is the contract while
 * {@code error.message} is implementation text. This enum is a leaf shared kernel type and must not
 * depend on the {@code splits} module (no-circular-dependency).
 */
public enum ErrorCode {

    MEMBER_REQUIRED(HttpStatus.UNAUTHORIZED),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND),
    NOT_A_MEMBER(HttpStatus.FORBIDDEN),
    NOT_SPLIT_INITIATOR(HttpStatus.FORBIDDEN),
    NONPOSITIVE_SPLIT_WINDOW(HttpStatus.BAD_REQUEST),
    BOUNDARY_NOT_IN_MAIN_PLAN(HttpStatus.BAD_REQUEST),
    INVALID_ROUTE_PAIR(HttpStatus.BAD_REQUEST),
    MAIN_PLAN_NOT_CONFIRMED(HttpStatus.CONFLICT),
    SPLIT_DRAFT_CONFLICT(HttpStatus.CONFLICT),
    SPLIT_DRAFT_NOT_ACTIVE(HttpStatus.CONFLICT),
    STALE_DRAFT_VERSION(HttpStatus.CONFLICT),
    SPLIT_BOUNDARIES_REQUIRED(HttpStatus.CONFLICT),
    ROUTE_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus httpStatus;

    ErrorCode(HttpStatus httpStatus) {
        this.httpStatus = httpStatus;
    }

    public HttpStatus httpStatus() {
        return httpStatus;
    }
}