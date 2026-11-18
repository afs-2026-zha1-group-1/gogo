package com.gogo.mainplan;

// AI calls and AI output share one failure type so the provider can fall back
// without leaking model or transport details to the API contract. Public so the
// split branch provider and the main-plan provider observe the same contract.
public class PlanAiException extends RuntimeException {

    public enum Reason {
        TIMEOUT,
        HTTP,
        EMPTY,
        INVALID_OUTPUT
    }

    private final Reason reason;

    public PlanAiException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public PlanAiException(Reason reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }
}
