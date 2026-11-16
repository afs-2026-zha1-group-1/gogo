package com.gogo.hello.splits.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the pure split-window calculation (design D7, Defer-UT window minutes). The window is
 * {@code reunion.start - departure.end} in whole minutes and must be positive to be selectable. Pure domain,
 * no HTTP/DB (orchestration-execution-separation).
 */
class SplitWindowTest {

    @Test
    @DisplayName("between_reunionAfterDepartureEnd_positive120Minutes")
    void between_reunionAfterDepartureEnd_positive120Minutes() {
        SplitWindow window = SplitWindow.between(
                Instant.parse("2026-12-05T01:30:00Z"), Instant.parse("2026-12-05T03:30:00Z"));
        assertThat(window.minutes()).isEqualTo(120);
        assertThat(window.isPositive()).isTrue();
    }

    @Test
    @DisplayName("between_reunionEqualsDepartureEnd_zeroNotPositive")
    void between_reunionEqualsDepartureEnd_zeroNotPositive() {
        SplitWindow window = SplitWindow.between(
                Instant.parse("2026-12-05T01:30:00Z"), Instant.parse("2026-12-05T01:30:00Z"));
        assertThat(window.minutes()).isZero();
        assertThat(window.isPositive()).isFalse();
    }

    @Test
    @DisplayName("between_reunionBeforeDepartureEnd_negativeNotPositive")
    void between_reunionBeforeDepartureEnd_negativeNotPositive() {
        SplitWindow window = SplitWindow.between(
                Instant.parse("2026-12-05T04:00:00Z"), Instant.parse("2026-12-05T01:00:00Z"));
        assertThat(window.minutes()).isEqualTo(-180);
        assertThat(window.isPositive()).isFalse();
    }
}