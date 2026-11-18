package com.gogo.hello.splits.provider;

import java.time.Instant;
import java.util.List;

/**
 * Extra context for one split round (US-096). {@code excludeActivityNames} carries activities already used by
 * other non-cancelled rounds so a second round's group B does not repeat the first round's place. Pure value
 * object; providers may ignore it.
 */
public record BranchCandidateContext(
        int roundIndex,
        Instant windowStart,
        Instant windowEnd,
        List<String> excludeActivityNames) {

    public BranchCandidateContext {
        excludeActivityNames = excludeActivityNames == null ? List.of() : List.copyOf(excludeActivityNames);
    }

    public static BranchCandidateContext empty() {
        return new BranchCandidateContext(1, null, null, List.of());
    }
}
