package com.gogo.trip;

public record TripResponse(
        long id,
        String name,
        String destination,
        String startDate,
        String endDate,
        String startLocation,
        String endLocation,
        long organizerId,
        boolean mainPlanConfirmed) {
}