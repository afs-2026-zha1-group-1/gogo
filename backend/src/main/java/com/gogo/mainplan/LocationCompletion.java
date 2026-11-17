package com.gogo.mainplan;

import java.util.List;
import java.util.Locale;
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

    public static final List<String> HONG_KONG_CANDIDATES = List.of(
            "西九文化区", "中环街市", "太平山顶", "尖沙咀海滨长廊");

    public static final List<String> LONDON_CANDIDATES = List.of(
            "大英博物馆", "考文特花园", "博罗市场", "伦敦眼");

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
        List<String> candidates = candidatesFor(destination);
        return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
    }

    private static List<String> candidatesFor(String destination) {
        String value = destination == null ? "" : destination.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        if (value.contains("香港") || lower.contains("hong kong")) {
            return HONG_KONG_CANDIDATES;
        }
        if (value.contains("伦敦") || lower.contains("london")) {
            return LONDON_CANDIDATES;
        }
        return "singapore".equals(lower) ? SINGAPORE_CANDIDATES : GENERIC_CANDIDATES;
    }
}