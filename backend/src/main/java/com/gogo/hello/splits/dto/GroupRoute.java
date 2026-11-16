package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * One group's route view (design D6): group label, activity name, the shared departure/reunion stop ids and the
 * structured duration breakdown. Shared by the generation response and the draft detail snapshot so the client
 * can build the timing snapshot without guesses (spec D1).
 */
public record GroupRoute(
        String groupLabel,
        String activityName,
        String departureStopId,
        String reunionStopId,
        int activityMinutes,
        List<Integer> travelLegsMinutes,
        int bufferMinutes) {
}