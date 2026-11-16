package com.gogo.hello.splits.domain;

import java.util.Collection;

/**
 * Pure domain predicate for "main plan confirmed" (spec chain convention, design D16): a trip's main plan is
 * confirmed iff it has members and every member's {@code plan_ack_version} equals {@code trip.plan_version}.
 * No HTTP, no database access (orchestration-execution-separation).
 */
public final class MainPlanConfirmation {

    private MainPlanConfirmation() {
    }

    public static boolean isConfirmed(int planVersion, Collection<Integer> memberAckVersions) {
        if (memberAckVersions.isEmpty()) {
            return false;
        }
        return memberAckVersions.stream()
                .allMatch(ack -> ack != null && ack.intValue() == planVersion);
    }
}