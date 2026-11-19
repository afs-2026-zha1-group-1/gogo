package com.gogo.mainplan;

import java.util.List;

// The single plan projection (design D6, P2 wire contract): the draft read,
// the generate 201 body and the confirm 200 body share this one shape.
public record PlanResponse(
        long tripId,
        int version,
        boolean confirmed,
        boolean stale,
        int costPerPersonCents,
        List<InputRevision> inputRevisions,
        List<Stop> stops) {

    public record InputRevision(long userId, int revision) {
    }

    public record Stop(
            long id,
            int seq,
            int dayIndex,
            String name,
            String startTime,
            String endTime,
            String locationName,
            String note,
            Integer travelMinutesToNext,
            List<String> interests,
            String address,
            Double lat,
            Double lng) {

        /** Single-day callers keep day 1. */
        public Stop(long id, int seq, String name, String startTime, String endTime, String locationName,
                String note, Integer travelMinutesToNext, List<String> interests, String address,
                Double lat, Double lng) {
            this(id, seq, 1, name, startTime, endTime, locationName, note, travelMinutesToNext, interests,
                    address, lat, lng);
        }
    }
}