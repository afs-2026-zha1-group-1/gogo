package com.gogo.mainplan;

// US-090 「我的方案」stop edit body: local HH:MM times plus the display location. mainPlanVersion pins the plan the
// client rendered, so an edit computed against an older plan is rejected instead of overwriting newer stops.
public record UpdateStopRequest(
        String startTime,
        String endTime,
        String locationName,
        int mainPlanVersion) {
}
