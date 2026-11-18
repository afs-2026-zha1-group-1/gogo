package com.gogo.mainplan;

// US-090: published inside the stop-edit transaction so the splits module can drop a route pair that was generated
// against the previous stop times. mainplan stays unaware of splits (the listener lives there), which keeps the
// module dependency one-way.
public record MainPlanStopsChanged(long tripId) {
}
