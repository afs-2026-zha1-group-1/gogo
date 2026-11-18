package com.gogo.trip;

import java.time.ZoneId;
import java.util.Locale;

/**
 * Trip-local wall clock for demo destinations. Persisted instants are rendered in this zone by the split
 * screens, and main-plan stop times are converted to instants with it. Anything unknown keeps the
 * Singapore default the product shipped with.
 */
public final class TripZones {

    private static final String DEFAULT_ZONE = "Asia/Singapore";

    private TripZones() {
    }

    public static ZoneId of(String destination) {
        String value = destination == null ? "" : destination.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        if (value.contains("香港") || lower.contains("hong kong")) {
            return ZoneId.of("Asia/Hong_Kong");
        }
        if (value.contains("伦敦") || lower.contains("london")) {
            return ZoneId.of("Europe/London");
        }
        return ZoneId.of(DEFAULT_ZONE);
    }
}
