package com.gogo.hello.splits.domain;

import java.time.Instant;
import java.util.List;

/**
 * Resolved split window for the persisted boundary shape (US-095). The mode decides which stops bound the
 * window: MIDDLE = departure start → reunion start; FROM_START = first stop start → reunion start.
 * {@code fromIndex} is inclusive and {@code toIndexExclusive} is the reunion index, so route derivation never
 * has to special-case the start. Pure domain value object, no HTTP/DB.
 */
public record SplitBoundaries(
        SplitMode mode,
        PlanStop departure,
        PlanStop reunion,
        int fromIndex,
        int toIndexExclusive,
        Instant startAt,
        Instant endAt) {

    public long windowMinutes() {
        return SplitWindow.between(startAt, endAt).minutes();
    }

    /**
     * Resolves a boundary shape against the ordered confirmed main-plan stops. Missing or out-of-order stops
     * raise {@link IllegalArgumentException}; the service maps that to the existing 400 rejection codes.
     */
    public static SplitBoundaries resolve(
            SplitMode mode, PlanStop departure, PlanStop reunion, List<PlanStop> stops) {
        if (mode == null) {
            return null;
        }
        if (stops == null || stops.isEmpty()) {
            throw new IllegalArgumentException("the confirmed main plan has no stops");
        }
        return switch (mode) {
            case MIDDLE -> {
                int from = indexOf(stops, departure);
                int to = indexOf(stops, reunion);
                if (from < 0 || to < 0 || to <= from) {
                    throw new IllegalArgumentException("boundaries are not an ordered main-plan pair");
                }
                yield new SplitBoundaries(mode, departure, reunion, from, to,
                        departure.startAt(), reunion.startAt());
            }
            case FROM_START -> {
                int to = indexOf(stops, reunion);
                if (to <= 0) {
                    throw new IllegalArgumentException("the reunion stop must follow the first stop");
                }
                yield new SplitBoundaries(mode, null, reunion, 0, to,
                        stops.get(0).startAt(), reunion.startAt());
            }
        };
    }

    private static int indexOf(List<PlanStop> stops, PlanStop stop) {
        if (stop == null) {
            return -1;
        }
        for (int index = 0; index < stops.size(); index++) {
            if (stops.get(index).id().equals(stop.id())) {
                return index;
            }
        }
        return -1;
    }
}
