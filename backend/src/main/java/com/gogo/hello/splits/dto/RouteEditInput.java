package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * One editable group route in a {@code PUT .../split-draft/routes} request (spec US-087 Revision 3). Both groups are
 * ordered station lists: group A has one travel leg after every stop (stops size == legs size), group B adds the
 * outbound and return travel legs around the stations (legs size == stops size + 1). Activity totals, the derived
 * route name and the location are computed by the service, never trusted from the client.
 */
public record RouteEditInput(
        String groupLabel,
        List<RouteStepInput> steps,
        List<Integer> travelLegsMinutes) {
}
