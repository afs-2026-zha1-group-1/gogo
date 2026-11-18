package com.gogo.hello.splits.dto;

import com.gogo.hello.splits.domain.PlanStop;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Member-only consistent draft snapshot (spec detail D1, design D14/D6/D7). Combines the saved document fields
 * (initiator/versions/status/groups/timestamps), the selectable main-plan stops at the draft's main-plan version,
 * the derived boundary times/window (null before selection) and the route pair (empty before generation). Route
 * views join plan_node split activity names with the draft's duration breakdown so the client can build the timing
 * snapshot without guesses. Read-only: assembling this never mutates the draft or bumps the version.
 */
public record SplitDraftDetailResponse(
        String initiatorMemberId,
        int mainPlanVersion,
        int draftVersion,
        String status,
        Map<String, List<String>> groups,
        String createdAt,
        String updatedAt,
        List<PlanStop> mainPlanStops,
        String departureStopId,
        String reunionStopId,
        Instant departureAt,
        Instant reunionAt,
        Long windowMinutes,
        List<GroupRoute> routes,
        String destination) {
}