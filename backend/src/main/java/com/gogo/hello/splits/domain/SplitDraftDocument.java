package com.gogo.hello.splits.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The split draft JSON document persisted in the {@code split_draft.document} column (design D5/D6). A record so
 * Jackson maps component names directly to the document fields. {@code routes} carries the per-group duration
 * breakdown only after generation (null before); boundary stop ids are null before selection. Pure domain model,
 * no HTTP/DB.
 */
public record SplitDraftDocument(
        String initiatorMemberId,
        int mainPlanVersion,
        int draftVersion,
        String status,
        String departureStopId,
        String reunionStopId,
        Map<String, List<String>> groups,
        Map<String, RouteDurations> routes,
        String createdAt,
        String updatedAt) {

    /**
     * Per-group duration breakdown (design D6/D8): activity + every travel leg + buffer, in whole minutes. The three
     * duration components are nullable so a missing estimate stays expressible (Jackson maps JSON null to null
     * rather than zero), letting confirmation report missing inputs instead of silently treating them as 0.
     */
    public record RouteDurations(Integer activityMinutes, List<Integer> travelLegsMinutes, Integer bufferMinutes,
            List<RouteStep> steps) {
    }

    /**
     * Builds the initial active draft (draftVersion=1, no boundaries, no routes) with the US-040 initial partition:
     * every trip member in group A and an empty group B (design US-040 DD6).
     */
    public static SplitDraftDocument initial(
            String initiatorMemberId, int mainPlanVersion, Map<String, List<String>> groups, String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, 1, "active", null, null, groups, null, now, now);
    }

    /**
     * Partitions ordered member ids into the US-040 initial groups: all members in A, B empty (design US-040 DD6).
     * Both keys always exist so the detail projection never returns a missing group key.
     */
    public static Map<String, List<String>> initialGroups(List<String> orderedMemberIds) {
        Map<String, List<String>> groups = new LinkedHashMap<>();
        groups.put("A", new ArrayList<>(orderedMemberIds));
        groups.put("B", new ArrayList<>());
        return groups;
    }

    /**
     * Returns a new document with the caller moved into {@code groupLabel} (US-040 A1-A4, design DD7): the member is
     * removed from both groups first and appended to the target group, so a member can never be duplicated. The saved
     * boundaries, routes, initiator and status are preserved and {@code draftVersion} bumps by one; route rows are
     * never touched by a group change.
     */
    public SplitDraftDocument withAssignment(String groupLabel, String memberId, String now) {
        Map<String, List<String>> updated = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : groups.entrySet()) {
            List<String> members = new ArrayList<>(entry.getValue());
            members.remove(memberId);
            updated.put(entry.getKey(), members);
        }
        updated.computeIfAbsent(groupLabel, key -> new ArrayList<>()).add(memberId);
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion + 1, status,
                departureStopId, reunionStopId, updated, routes, createdAt, now);
    }

    /**
     * Returns a new document with the saved boundary stop ids and {@code draftVersion + 1} (design D7/D9): any
     * draft change bumps the version. Route durations are cleared because they were computed against the
     * previous window; the pair must be regenerated for the new boundaries.
     */
    public SplitDraftDocument withBoundaries(String departureStopId, String reunionStopId, String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion + 1, status,
                departureStopId, reunionStopId, groups, null, createdAt, now);
    }

    /**
     * Returns a new document with the generated per-group route durations and {@code draftVersion + 1} (design
     * D6/D9). Boundaries, groups, initiator and createdAt are preserved; updatedAt advances.
     */
    public SplitDraftDocument withRoutes(Map<String, RouteDurations> routes, String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion + 1, status,
                departureStopId, reunionStopId, groups, routes, createdAt, now);
    }

    /**
     * Returns a new document with the generated pair cleared and {@code draftVersion + 1} (US-090): a main-plan
     * stop edit changes the times the pair was computed against, so the pair must be regenerated. Boundaries,
     * groups, initiator and status are preserved so the draft stays usable.
     */
    public SplitDraftDocument withClearedRoutes(String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion + 1, status,
                departureStopId, reunionStopId, groups, null, createdAt, now);
    }

    /**
     * Returns a new document with the pair AND the boundary ids cleared and {@code draftVersion + 1} (US-090): the
     * boundary stop was removed from the main plan, so keeping its id would leave the boundary page and the route
     * page bouncing between "saved" and "missing".
     */
    public SplitDraftDocument withClearedBoundariesAndRoutes(String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion + 1, status,
                null, null, groups, null, createdAt, now);
    }

    /**
     * Returns the confirmed document (design D4/D5): status becomes {@code confirmed}, the document version and every
     * saved field (routes, groups, boundaries) are preserved so the confirmed pair stays the effective agreement.
     */
    public SplitDraftDocument confirmed(String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion, "confirmed",
                departureStopId, reunionStopId, groups, routes, createdAt, now);
    }

    /**
     * Returns the cancelled document (design D4/D6/D9): status becomes {@code cancelled}, the document version is
     * preserved and the route breakdown is cleared in the same write, so a cancelled detail can never show ghost
     * routes after the split nodes are deleted.
     */
    public SplitDraftDocument cancelled(String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion, "cancelled",
                departureStopId, reunionStopId, groups, null, createdAt, now);
    }

    /**
     * Builds the replacement draft that overwrites a cancelled row (design D7): a fresh caller becomes the initiator
     * with version 1, no boundaries and no routes; the stored column version is reset separately by the repository.
     */
    public static SplitDraftDocument initialRebuilt(
            String initiatorMemberId, int mainPlanVersion, Map<String, List<String>> groups, String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, 1, "active", null, null, groups, null, now, now);
    }
}