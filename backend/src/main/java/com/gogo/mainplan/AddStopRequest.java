package com.gogo.mainplan;

// US-090 「我的方案」new stop body: the stop is appended after the current last stop (local HH:MM times plus name and
// display location). mainPlanVersion pins the plan the client rendered so a stale form cannot append to a newer plan.
public record AddStopRequest(
        String name,
        String startTime,
        String endTime,
        String locationName,
        int mainPlanVersion) {
}
