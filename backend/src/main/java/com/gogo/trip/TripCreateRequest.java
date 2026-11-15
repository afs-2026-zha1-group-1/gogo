package com.gogo.trip;

public record TripCreateRequest(
        String name,
        String destination,
        String startDate,
        String endDate,
        String startLocation,
        String endLocation) {
}