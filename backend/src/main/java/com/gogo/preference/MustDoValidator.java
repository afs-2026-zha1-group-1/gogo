package com.gogo.preference;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Steps 3-7 of the signed validation order (MD5), all of it before the first write (UT-5):
 * activity present after trim, location or time present after trim, the trimmed `time` matching
 * HH:mm, duplicate ids inside one request (step 6 before step 7, MDS-14), then id ownership —
 * an id outside the caller's current list is unknown, and a foreign member's id therefore
 * reports as unknown too (MDS-13). Body and item types (steps 1-2) were already answered by
 * Jackson as INVALID_REQUEST (MD6). A first code thrown means nothing is normalised, no id is
 * issued and the repository is never reached.
 */
final class MustDoValidator {

    private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

    private MustDoValidator() {
    }

    static boolean isValidTime(String trimmed) {
        return trimmed != null && TIME.matcher(trimmed).matches();
    }

    static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Runs steps 3-7 against the request items and the caller's currently stored ids. */
    static void validate(List<MustDoItem> requested, Set<Long> currentIds) {
        for (MustDoItem item : requested) {
            if (trimToNull(item.activity()) == null) {
                throw new MustDoApiException(400, "MUST_DO_ACTIVITY_REQUIRED",
                        "Each must-do item needs an activity");
            }
        }
        for (MustDoItem item : requested) {
            if (trimToNull(item.location()) == null && trimToNull(item.time()) == null) {
                throw new MustDoApiException(400, "MUST_DO_PLACE_OR_TIME_REQUIRED",
                        "Each must-do item needs a location or a time");
            }
        }
        for (MustDoItem item : requested) {
            String time = trimToNull(item.time());
            if (time != null && !isValidTime(time)) {
                throw new MustDoApiException(400, "MUST_DO_TIME_INVALID",
                        "Must-do time must use the 24-hour HH:mm format: " + item.time());
            }
        }
        Set<Long> seen = new HashSet<>();
        for (MustDoItem item : requested) {
            if (item.id() != null && !seen.add(item.id())) {
                throw new MustDoApiException(400, "MUST_DO_ITEM_DUPLICATE_ID",
                        "Duplicated item id in one request: " + item.id());
            }
        }
        for (MustDoItem item : requested) {
            if (item.id() != null && !currentIds.contains(item.id())) {
                throw new MustDoApiException(400, "MUST_DO_ITEM_UNKNOWN",
                        "Unknown item id for this member: " + item.id());
            }
        }
    }
}
