package com.gogo.hello.splits.domain;

import java.time.Duration;
import java.time.Instant;

/**
 * The split window in whole minutes (design D7): {@code reunion.start - departure.start}, derived from the
 * confirmed main-plan stop rows. A selectable boundary pair must yield a strictly positive window. Pure domain
 * value object, no HTTP/DB (orchestration-execution-separation).
 */
public record SplitWindow(long minutes) {

    public static SplitWindow between(Instant departureEnd, Instant reunionStart) {
        return new SplitWindow(Duration.between(departureEnd, reunionStart).toMinutes());
    }

    public boolean isPositive() {
        return minutes > 0;
    }
}