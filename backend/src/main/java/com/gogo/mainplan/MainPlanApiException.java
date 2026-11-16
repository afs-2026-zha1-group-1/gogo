package com.gogo.mainplan;

import java.util.Map;

// Status + code exception following the InvitationApiException precedent;
// detail carries the contractual extra fields for MEMBERS_NOT_READY and
// VALIDATION_FAILED only (design D10).
public class MainPlanApiException extends RuntimeException {

    private final int status;
    private final String code;
    private final Map<String, Object> detail;

    public MainPlanApiException(int status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public MainPlanApiException(int status, String code, String message, Map<String, Object> detail) {
        super(message);
        this.status = status;
        this.code = code;
        this.detail = detail;
    }

    public int status() {
        return status;
    }

    public String code() {
        return code;
    }

    public Map<String, Object> detail() {
        return detail;
    }
}