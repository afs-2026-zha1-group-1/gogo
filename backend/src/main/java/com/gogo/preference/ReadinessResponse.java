package com.gogo.preference;

import java.util.List;

public record ReadinessResponse(List<SubmissionMember> members, int readyCount, int memberCount,
        boolean allReady) {
}
