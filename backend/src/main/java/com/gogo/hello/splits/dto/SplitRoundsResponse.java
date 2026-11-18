package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * Round overview (US-096). Each round is returned as a full detail snapshot so the overview graph, route cards and
 * personal route can be built from one response. {@code aggregateStatus} is derived, never stored.
 */
public record SplitRoundsResponse(
        String aggregateStatus,
        int maxRounds,
        boolean canStartNextRound,
        String nextRoundBlockedReason,
        List<SplitDraftDetailResponse> rounds) {
}
