package com.gogo.hello.splits.dto;

import com.gogo.hello.splits.domain.RouteTimingInput;
import java.util.List;

/**
 * Request body for the reunion timing check (spec REQ-007, design D13). Carries an explicit window budget and the
 * paired route snapshot supplied by the client; the calculator consumes only these values and reads no draft from
 * the DB. A null/empty/non-pair {@code routes} list is rejected with 400 INVALID_ROUTE_PAIR after the entry guard.
 */
public record CheckTimingRequest(long windowMinutes, List<RouteTimingInput> routes) {
}