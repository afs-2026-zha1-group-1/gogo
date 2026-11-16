package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

// UT (ATDD UT-2 deferred to apply): location completion selection (D5) —
// preferences first (start = first nonblank, end = last nonblank), random
// fallback, supplied values preserved. Preference locations arrive ordered by
// user id then payload order; the component only selects.
class LocationCompletionTest {

    private final LocationCompletion completion = new LocationCompletion();

    @Test
    void suppliedNonblankLocationsArePreserved() {
        LocationCompletion.CompletedLocations result = completion.complete(
                "City Hall MRT", "Merlion Park", List.of("Gardens by the Bay"), "Singapore");
        assertEquals("City Hall MRT", result.startLocation());
        assertEquals("Merlion Park", result.endLocation());
    }

    @Test
    void nullLocationsTakeFirstAndLastPreference() {
        LocationCompletion.CompletedLocations result = completion.complete(
                null, null,
                List.of("Merlion Park", "Gardens by the Bay", "National Gallery Singapore", "City Hall MRT"),
                "Singapore");
        assertEquals("Merlion Park", result.startLocation());
        assertEquals("City Hall MRT", result.endLocation());
    }

    @Test
    void blankLocationsAndBlankPreferencesAreSkipped() {
        LocationCompletion.CompletedLocations result = completion.complete(
                "   ", "", List.of("  ", "Gardens by the Bay", ""), "Singapore");
        assertEquals("Gardens by the Bay", result.startLocation());
        assertEquals("Gardens by the Bay", result.endLocation());
    }

    @Test
    void onlyOneSideIsCompletedWhenTheOtherIsSupplied() {
        LocationCompletion.CompletedLocations result = completion.complete(
                "City Hall MRT", null, List.of("Merlion Park", "Gardens by the Bay"), "Singapore");
        assertEquals("City Hall MRT", result.startLocation());
        assertEquals("Gardens by the Bay", result.endLocation());
    }

    @Test
    void noPreferencesFallsBackToDestinationCandidates() {
        for (int i = 0; i < 20; i++) {
            LocationCompletion.CompletedLocations result = completion.complete(
                    null, null, List.of(), "Singapore");
            assertFalse(result.startLocation().isBlank());
            assertFalse(result.endLocation().isBlank());
            assertTrue(LocationCompletion.SINGAPORE_CANDIDATES.contains(result.startLocation()));
            assertTrue(LocationCompletion.SINGAPORE_CANDIDATES.contains(result.endLocation()));
        }
    }

    @Test
    void unknownDestinationStillCompletesNonblank() {
        LocationCompletion.CompletedLocations result = completion.complete(
                null, null, List.of(), "Timbuktu");
        assertFalse(result.startLocation().isBlank());
        assertFalse(result.endLocation().isBlank());
    }
}