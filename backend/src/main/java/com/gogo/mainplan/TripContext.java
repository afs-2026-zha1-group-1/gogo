package com.gogo.mainplan;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

// Provider port inputs (design D3): the trip facts and each ready member's
// preference snapshot. The fake MVP provider ignores them; the port is the R2
// replacement seam for a real provider.
public record TripContext(
        long tripId,
        String destination,
        String startDate,
        String endDate,
        String startLocation,
        String endLocation) {

    /** Inclusive trip length in days; unparseable or inverted dates degrade to one day. */
    public int dayCount() {
        try {
            long days = ChronoUnit.DAYS.between(LocalDate.parse(startDate), LocalDate.parse(endDate)) + 1;
            return days < 1 ? 1 : (int) days;
        } catch (DateTimeParseException | NullPointerException cause) {
            return 1;
        }
    }
}