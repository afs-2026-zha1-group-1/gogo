package com.gogo.hello.splits.domain;

/**
 * One visible step of a branch route (spec US-089): the group-A branch follows the confirmed main plan, so its
 * route is a sequence of the main-plan stops between the boundaries instead of a single synthetic activity.
 * Whole minutes; the transport gaps are carried by {@code RouteCandidate.travelLegsMinutes}.
 */
public record RouteStep(String name, int minutes) {
}
