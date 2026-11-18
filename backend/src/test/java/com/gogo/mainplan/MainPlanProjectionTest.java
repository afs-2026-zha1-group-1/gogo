package com.gogo.mainplan;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

/**
 * MainPlanProjection time mapping (trip-local HH:MM -> ISO UTC) per destination zone: Singapore/Hong Kong are
 * UTC+8 (09:00 local is 01:00Z), London is UTC+0 in November (09:00 local is 09:00Z).
 */
class MainPlanProjectionTest {

    @Test
    void instant_placesLocalClockOnTripDateInTripZone() {
        ZoneId singapore = ZoneId.of("Asia/Singapore");
        assertThat(MainPlanProjection.instant("2026-12-05", "09:00", singapore))
                .isEqualTo(Instant.parse("2026-12-05T01:00:00Z"));
        assertThat(MainPlanProjection.instant("2026-12-05", "11:30", singapore))
                .isEqualTo(Instant.parse("2026-12-05T03:30:00Z"));
        assertThat(MainPlanProjection.instant("2026-12-05", "23:30", singapore))
                .isEqualTo(Instant.parse("2026-12-05T15:30:00Z"));
        assertThat(MainPlanProjection.instant("2026-11-23", "09:00", ZoneId.of("Europe/London")))
                .isEqualTo(Instant.parse("2026-11-23T09:00:00Z"));
    }

    @Test
    void instant_missingOrUnparseableInputsStayNull() {
        ZoneId zone = ZoneId.of("Asia/Singapore");
        assertThat(MainPlanProjection.instant(null, "09:00", zone)).isNull();
        assertThat(MainPlanProjection.instant("2026-12-05", null, zone)).isNull();
        assertThat(MainPlanProjection.instant("not-a-date", "09:00", zone)).isNull();
        assertThat(MainPlanProjection.instant("2026-12-05", "25:00", zone)).isNull();
    }
}
