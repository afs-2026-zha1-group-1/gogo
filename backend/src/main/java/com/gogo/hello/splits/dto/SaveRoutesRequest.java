package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * Request body for {@code PUT /api/trips/{tripId}/split-draft/routes} (spec US-087 S2/S2b, design DD1/DD3). The
 * caller supplies the current {@code draftVersion} and the full A/B pair; any trip member may save while the draft is
 * active. A version mismatch is rejected with 409 STALE_DRAFT_VERSION and nothing is written.
 */
public record SaveRoutesRequest(int draftVersion, List<RouteEditInput> routes) {
}
