package com.gogo.mainplan;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Component;

// Location completion at generation only (design D5, signed 2026-11-14
// ruling). Preference locations arrive ordered by user id then payload order;
// start takes the first nonblank, end the last. Nothing usable -> random pick
// from a fixed candidate list keyed to the destination. Supplied nonblank
// values are never touched.
@Component
public class LocationCompletion {

    public static final List<String> SINGAPORE_CANDIDATES = List.of(
            "City Hall MRT", "Merlion Park", "Gardens by the Bay",
            "National Gallery Singapore", "Clarke Quay", "Chinatown");

    private static final List<String> GENERIC_CANDIDATES = List.of(
            "City Center", "Old Town", "Central Park", "Main Station");

    public record CompletedLocations(String startLocation, String endLocation) {
    }

    public CompletedLocations complete(String startLocation, String endLocation,
            List<String> preferenceLocations, String destination) {
        List<String> usable = preferenceLocations.stream()
                .filter(location -> location != null && !location.isBlank())
                .toList();
        String start = isBlank(startLocation) ? pick(usable, true, destination) : startLocation;
        String end = isBlank(endLocation) ? pick(usable, false, destination) : endLocation;
        return new CompletedLocations(start, end);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String pick(List<String> usable, boolean first, String destination) {
        if (!usable.isEmpty()) {
            return first ? usable.get(0) : usable.get(usable.size() - 1);
        }
        List<String> candidates = "Singapore".equalsIgnoreCase(destination)
                ? SINGAPORE_CANDIDATES
                : GENERIC_CANDIDATES;
        return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
    }
}