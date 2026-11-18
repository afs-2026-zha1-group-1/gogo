package com.gogo.hello.splits.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.hello.splits.domain.SplitDraftDocument.RouteDurations;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the split draft document state machine (design D4/D7/D8). Confirmation and cancellation never move
 * the document version; only boundary/route edits and rebuilds do. Durations are nullable so a missing activity,
 * buffer or travel leg can be expressed (CF3-N) instead of being silently read as zero.
 */
class SplitDraftDocumentStatusTest {

    private static final String NOW = "2026-11-16T00:00:00Z";

    @Test
    @DisplayName("initial_isActiveV1_withNoBoundariesAndNoRoutes")
    void initial_isActiveV1_withNoBoundariesAndNoRoutes() {
        SplitDraftDocument draft = SplitDraftDocument.initial("2", 1, groups(), NOW);
        assertThat(draft.status()).isEqualTo("active");
        assertThat(draft.draftVersion()).isEqualTo(1);
        assertThat(draft.departureStopId()).isNull();
        assertThat(draft.reunionStopId()).isNull();
        assertThat(draft.routes()).isNull();
    }

    @Test
    @DisplayName("withBoundaries_andWithRoutes_bumpDocumentVersion")
    void withBoundaries_andWithRoutes_bumpDocumentVersion() {
        SplitDraftDocument draft = SplitDraftDocument.initial("2", 1, groups(), NOW)
                .withBoundaries("MIDDLE", "stop-a", "stop-b", NOW)
                .withRoutes(routes(), null, NOW);
        assertThat(draft.draftVersion()).isEqualTo(3);
        assertThat(draft.status()).isEqualTo("active");
        assertThat(draft.routes()).containsKeys("A", "B");
    }

    @Test
    @DisplayName("confirmed_keepsVersionAndRoutes")
    void confirmed_keepsVersionAndRoutes() {
        SplitDraftDocument draft = activeWithRoutes();
        SplitDraftDocument confirmed = draft.confirmed(NOW);
        assertThat(confirmed.status()).isEqualTo("confirmed");
        assertThat(confirmed.draftVersion()).isEqualTo(draft.draftVersion());
        assertThat(confirmed.routes()).containsKeys("A", "B");
        assertThat(confirmed.departureStopId()).isEqualTo("stop-a");
    }

    @Test
    @DisplayName("cancelled_clearsRoutesAndKeepsVersion")
    void cancelled_clearsRoutesAndKeepsVersion() {
        SplitDraftDocument draft = activeWithRoutes();
        SplitDraftDocument cancelled = draft.cancelled(NOW);
        assertThat(cancelled.status()).isEqualTo("cancelled");
        assertThat(cancelled.draftVersion()).isEqualTo(draft.draftVersion());
        assertThat(cancelled.routes()).isNull();
        assertThat(cancelled.groups()).isEqualTo(draft.groups());
    }

    @Test
    @DisplayName("initialRebuilt_resetsToV1ActiveWithoutBoundariesOrRoutes")
    void initialRebuilt_resetsToV1ActiveWithoutBoundariesOrRoutes() {
        SplitDraftDocument rebuilt = SplitDraftDocument.initialRebuilt("1", 1, groups(), NOW);
        assertThat(rebuilt.initiatorMemberId()).isEqualTo("1");
        assertThat(rebuilt.status()).isEqualTo("active");
        assertThat(rebuilt.draftVersion()).isEqualTo(1);
        assertThat(rebuilt.mainPlanVersion()).isEqualTo(1);
        assertThat(rebuilt.departureStopId()).isNull();
        assertThat(rebuilt.reunionStopId()).isNull();
        assertThat(rebuilt.routes()).isNull();
    }

    @Test
    @DisplayName("nullableDurations_roundTripThroughJsonKeepingNulls")
    void nullableDurations_roundTripThroughJsonKeepingNulls() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        SplitDraftDocument draft = new SplitDraftDocument("2", 1, 3, "active", "stop-a", "stop-b", "MIDDLE", groups(),
                Map.of("A", new RouteDurations(null, List.of(15, 20), null, null),
                        "B", new RouteDurations(60, List.of(20, 20), 10, null)),
                null, NOW, NOW);
        String json = mapper.writeValueAsString(draft);
        SplitDraftDocument parsed = mapper.readValue(json, SplitDraftDocument.class);
        assertThat(parsed.routes().get("A").activityMinutes()).isNull();
        assertThat(parsed.routes().get("A").bufferMinutes()).isNull();
        assertThat(parsed.routes().get("B").activityMinutes()).isEqualTo(60);
    }

    private SplitDraftDocument activeWithRoutes() {
        return SplitDraftDocument.initial("2", 1, groups(), NOW)
                .withBoundaries("MIDDLE", "stop-a", "stop-b", NOW)
                .withRoutes(routes(), null, NOW);
    }

    private Map<String, List<String>> groups() {
        Map<String, List<String>> groups = new LinkedHashMap<>();
        groups.put("A", List.of("1", "2"));
        groups.put("B", List.of("3", "4"));
        return groups;
    }

    private Map<String, RouteDurations> routes() {
        return Map.of("A", new RouteDurations(60, List.of(15, 20), 10, null),
                "B", new RouteDurations(60, List.of(20, 20), 10, null));
    }
}
