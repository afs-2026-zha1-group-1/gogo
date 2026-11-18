package com.gogo.hello.splits.dto;

/**
 * One editable stop of a route pair (spec US-087 Revision 3): both groups are edited as an ordered station list with
 * a stay in minutes; the stop names are user-owned and no longer read-only for group A.
 */
public record RouteStepInput(String name, Integer minutes) {
}
