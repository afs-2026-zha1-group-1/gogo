package com.gogo.trip;

public record TripListItem(
        long id,
        String name,
        String destination,
        String startDate,
        String endDate,
        boolean organizer,
        boolean mainPlanConfirmed) {
}
