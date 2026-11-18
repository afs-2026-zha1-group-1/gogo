package com.gogo.mainplan;

// AI calls and AI output share one failure type so the provider can fall back
// without leaking model or transport details to the API contract.
class PlanAiException extends RuntimeException {

    enum Reason {
        TIMEOUT,
        HTTP,
        EMPTY,
        INVALID_OUTPUT
    }

    private final Reason reason;

    PlanAiException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    PlanAiException(Reason reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    Reason reason() {
        return reason;
    }
}
