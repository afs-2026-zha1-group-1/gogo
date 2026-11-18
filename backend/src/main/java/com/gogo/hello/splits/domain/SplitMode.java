package com.gogo.hello.splits.domain;

/**
 * How the split window is bounded (US-095). {@code MIDDLE} keeps the original stop-to-stop pair; {@code FROM_START}
 * starts splitting at the trip's first main-plan stop and still reunites at a chosen stop. Pure enum, no HTTP/DB.
 */
public enum SplitMode {
    MIDDLE,
    FROM_START;

    /** Derives the persisted mode: an explicit stored value wins, legacy saved pairs are MIDDLE, else unsaved. */
    public static SplitMode of(String storedMode, String departureStopId, String reunionStopId) {
        if (storedMode != null && !storedMode.isBlank()) {
            return valueOf(storedMode);
        }
        if (departureStopId != null && reunionStopId != null) {
            return MIDDLE;
        }
        return null;
    }
}
