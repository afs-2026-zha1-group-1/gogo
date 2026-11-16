package com.gogo.mainplan;

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
}