package com.gogo.hello.splits.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the draft JSON document model (US-040 DD6/DD7, design D5/D6). Verifies the initial all-A partition,
 * the group-assignment transition (move without duplicating, routes preserved, version bumped) and a lossless Jackson
 * JSON round-trip (the document is persisted as TEXT in {@code split_draft.document}).
 */
class SplitDraftDocumentTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("initialGroups_allOrderedMembersInA_emptyBWithBothKeys")
    void initialGroups_allOrderedMembersInA_emptyBWithBothKeys() {
        Map<String, List<String>> groups =
                SplitDraftDocument.initialGroups(List.of("alice", "ben", "chloe", "daniel"));
        assertThat(groups).containsOnlyKeys("A", "B");
        assertThat(groups.get("A")).containsExactly("alice", "ben", "chloe", "daniel");
        assertThat(groups.get("B")).isEmpty();
    }

    @Test
    @DisplayName("withAssignment_movesMemberKeepsRoutesAndBoundariesBumpsVersion")
    void withAssignment_movesMemberKeepsRoutesAndBoundariesBumpsVersion() {
        Map<String, List<String>> groups =
                SplitDraftDocument.initialGroups(List.of("alice", "ben", "chloe", "daniel"));
        Map<String, SplitDraftDocument.RouteDurations> routes = Map.of(
                "A", new SplitDraftDocument.RouteDurations(60, List.of(15, 20), 10, null));
        SplitDraftDocument draft = new SplitDraftDocument("ben", 1, 2, "active", "stop-a", "stop-b", groups, routes,
                "2026-12-05T00:00:00Z", "2026-12-05T00:00:00Z");

        SplitDraftDocument moved = draft.withAssignment("B", "chloe", "2026-12-05T01:00:00Z");

        assertThat(moved.groups().get("A")).containsExactly("alice", "ben", "daniel");
        assertThat(moved.groups().get("B")).containsExactly("chloe");
        assertThat(moved.draftVersion()).isEqualTo(3);
        assertThat(moved.routes()).isEqualTo(routes);
        assertThat(moved.departureStopId()).isEqualTo("stop-a");
        assertThat(moved.reunionStopId()).isEqualTo("stop-b");
        assertThat(moved.status()).isEqualTo("active");
        assertThat(moved.updatedAt()).isEqualTo("2026-12-05T01:00:00Z");
        assertThat(draft.groups().get("A")).containsExactly("alice", "ben", "chloe", "daniel");
    }

    @Test
    @DisplayName("withAssignment_memberMovesBack_neverDuplicated")
    void withAssignment_memberMovesBack_neverDuplicated() {
        Map<String, List<String>> groups =
                SplitDraftDocument.initialGroups(List.of("alice", "ben", "chloe"));
        SplitDraftDocument draft = SplitDraftDocument.initial("ben", 1, groups, "2026-12-05T00:00:00Z")
                .withAssignment("B", "chloe", "2026-12-05T00:01:00Z")
                .withAssignment("A", "chloe", "2026-12-05T00:02:00Z");
        assertThat(draft.groups().get("A")).containsExactly("alice", "ben", "chloe");
        assertThat(draft.groups().get("B")).isEmpty();
        assertThat(draft.draftVersion()).isEqualTo(3);
    }

    @Test
    @DisplayName("initialDraft_versionOneActiveNoBoundariesNoRoutes")
    void initialDraft_versionOneActiveNoBoundariesNoRoutes() {
        Map<String, List<String>> groups = SplitDraftDocument.initialGroups(List.of("alice", "ben", "chloe", "daniel"));
        SplitDraftDocument draft = SplitDraftDocument.initial("ben", 1, groups, "2026-12-05T00:00:00Z");
        assertThat(draft.initiatorMemberId()).isEqualTo("ben");
        assertThat(draft.mainPlanVersion()).isEqualTo(1);
        assertThat(draft.draftVersion()).isEqualTo(1);
        assertThat(draft.status()).isEqualTo("active");
        assertThat(draft.departureStopId()).isNull();
        assertThat(draft.reunionStopId()).isNull();
        assertThat(draft.routes()).isNull();
        assertThat(draft.createdAt()).isEqualTo("2026-12-05T00:00:00Z");
    }

    @Test
    @DisplayName("jsonRoundTrip_preservesAllFields")
    void jsonRoundTrip_preservesAllFields() throws Exception {
        Map<String, List<String>> groups = SplitDraftDocument.initialGroups(List.of("alice", "ben", "chloe", "daniel"));
        SplitDraftDocument draft = SplitDraftDocument.initial("ben", 1, groups, "2026-12-05T00:00:00Z");
        String json = objectMapper.writeValueAsString(draft);
        SplitDraftDocument restored = objectMapper.readValue(json, SplitDraftDocument.class);
        assertThat(restored).isEqualTo(draft);
        assertThat(json).contains("\"draftVersion\":1", "\"status\":\"active\"", "\"groups\"");
    }
}