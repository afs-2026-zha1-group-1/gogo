package com.gogo.hello.splits.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the draft JSON document model (design D5/D6/D16, Defer-UT serialization + group partition).
 * Verifies the fixture-guaranteed complete/disjoint A/B partition, the initial draft invariants, and a lossless
 * Jackson JSON round-trip (the document is persisted as {@code trip.split_draft} TEXT).
 */
class SplitDraftDocumentTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("partitionGroups_fourOrderedMembers_completeDisjointHalfSplit")
    void partitionGroups_fourOrderedMembers_completeDisjointHalfSplit() {
        Map<String, List<String>> groups = SplitDraftDocument.partitionGroups(List.of("alice", "ben", "chloe", "daniel"));
        assertThat(groups.get("A")).containsExactly("alice", "ben");
        assertThat(groups.get("B")).containsExactly("chloe", "daniel");
    }

    @Test
    @DisplayName("initialDraft_versionOneActiveNoBoundariesNoRoutes")
    void initialDraft_versionOneActiveNoBoundariesNoRoutes() {
        Map<String, List<String>> groups = SplitDraftDocument.partitionGroups(List.of("alice", "ben", "chloe", "daniel"));
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
        Map<String, List<String>> groups = SplitDraftDocument.partitionGroups(List.of("alice", "ben", "chloe", "daniel"));
        SplitDraftDocument draft = SplitDraftDocument.initial("ben", 1, groups, "2026-12-05T00:00:00Z");
        String json = objectMapper.writeValueAsString(draft);
        SplitDraftDocument restored = objectMapper.readValue(json, SplitDraftDocument.class);
        assertThat(restored).isEqualTo(draft);
        assertThat(json).contains("\"draftVersion\":1", "\"status\":\"active\"", "\"groups\"");
    }
}