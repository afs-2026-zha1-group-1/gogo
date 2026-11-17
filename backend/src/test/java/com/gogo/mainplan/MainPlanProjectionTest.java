package com.gogo.mainplan;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * MainPlanProjection time mapping (trip-local HH:MM -> ISO UTC). The trip timezone is Asia/Singapore
 * (UTC+8), the same zone the preference submission timestamps use, so 09:00 local is 01:00Z.
 */
class MainPlanProjectionTest {

    @Test
    void instant_placesLocalClockOnTripDateInTripZone() {
        assertThat(MainPlanProjection.instant("2026-12-05", "09:00"))
                .isEqualTo(Instant.parse("2026-12-05T01:00:00Z"));
        assertThat(MainPlanProjection.instant("2026-12-05", "11:30"))
                .isEqualTo(Instant.parse("2026-12-05T03:30:00Z"));
        assertThat(MainPlanProjection.instant("2026-12-05", "23:30"))
                .isEqualTo(Instant.parse("2026-12-05T15:30:00Z"));
    }

    @Test
    void instant_missingOrUnparseableInputsStayNull() {
        assertThat(MainPlanProjection.instant(null, "09:00")).isNull();
        assertThat(MainPlanProjection.instant("2026-12-05", null)).isNull();
        assertThat(MainPlanProjection.instant("not-a-date", "09:00")).isNull();
        assertThat(MainPlanProjection.instant("2026-12-05", "25:00")).isNull();
    }
}
