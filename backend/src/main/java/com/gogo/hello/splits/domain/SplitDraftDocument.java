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
    public record RouteDurations(Integer activityMinutes, List<Integer> travelLegsMinutes, Integer bufferMinutes) {
    }

    /**
     * Builds the initial active draft (draftVersion=1, no boundaries, no routes) with a fixture-guaranteed
     * complete/disjoint A/B group partition (design D16).
     */
    public static SplitDraftDocument initial(
            String initiatorMemberId, int mainPlanVersion, Map<String, List<String>> groups, String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, 1, "active", null, null, groups, null, now, now);
    }

    /**
     * Partitions ordered member ids into two complete, disjoint groups: first half A, remainder B (design D16).
     * With the fixture's four members ordered by display name this yields A=Alice+Ben, B=Chloe+Daniel.
     */
    public static Map<String, List<String>> partitionGroups(List<String> orderedMemberIds) {
        int half = (orderedMemberIds.size() + 1) / 2;
        Map<String, List<String>> groups = new LinkedHashMap<>();
        groups.put("A", new ArrayList<>(orderedMemberIds.subList(0, half)));
        groups.put("B", new ArrayList<>(orderedMemberIds.subList(half, orderedMemberIds.size())));
        return groups;
    }

    /**
     * Returns a new document with the saved boundary stop ids and {@code draftVersion + 1} (design D7/D9): any
     * draft change bumps the version. Groups, routes, initiator and createdAt are preserved; updatedAt advances.
     */
    public SplitDraftDocument withBoundaries(String departureStopId, String reunionStopId, String now) {
        return new SplitDraftDocument(
                initiatorMemberId, mainPlanVersion, draftVersion + 1, status,
                departureStopId, reunionStopId, groups, routes, createdAt, now);
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