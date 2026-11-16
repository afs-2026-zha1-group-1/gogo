package com.gogo.hello.splits.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Repository-layer acceptance test for the V2 migration and self-contained seed (spec "V2 迁移与自包含种子",
 * design D4/D5, tasks 1.2/1.3). Boots the real Flyway migrations against an in-memory SQLite database and
 * asserts exactly four splits tables, the {@code trip.split_draft} column, no extra {@code plan_node}
 * columns, the fixture seed, and that the greeting capability and V1 seed remain intact.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:file:split-schema-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
class SplitSchemaMigrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("migrate_v2_createsExactlyFourSplitsTables")
    void migrate_v2_createsExactlyFourSplitsTables() {
        List<String> tables = jdbc.queryForList(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", String.class);
        List<String> splitsTables = tables.stream()
                .filter(t -> !t.equals("greeting") && !t.equals("flyway_schema_history"))
                .toList();
        assertThat(splitsTables)
                .containsExactlyInAnyOrder("trip", "trip_member", "member_preference", "plan_node");
    }

    @Test
    @DisplayName("migrate_v2_tripHasNullableSplitDraftTextColumn")
    void migrate_v2_tripHasNullableSplitDraftTextColumn() {
        Map<String, Object> splitDraft = columnInfo("trip", "split_draft");
        assertThat(splitDraft.get("type")).isEqualTo("TEXT");
        assertThat(((Number) splitDraft.get("notnull")).intValue()).isZero();
    }

    @Test
    @DisplayName("migrate_v2_planNodeHasNoExtraColumns")
    void migrate_v2_planNodeHasNoExtraColumns() {
        assertThat(columnNames("plan_node")).containsExactlyInAnyOrder(
                "id", "trip_id", "plan_version", "parent_id", "branch_id", "node_type", "title",
                "start_at", "end_at", "location_name", "lat", "lng", "sort_order", "created_at");
    }

    @Test
    @DisplayName("seed_v2_singaporeFriendsDayTripConfirmedAndNoDraft")
    void seed_v2_singaporeFriendsDayTripConfirmedAndNoDraft() {
        Map<String, Object> trip = jdbc.queryForMap("SELECT * FROM trip WHERE invite_code = 'SGF26A'");
        assertThat(trip.get("id")).isNotNull();
        assertThat(trip.get("title")).isEqualTo("Singapore Friends Day");
        assertThat(trip.get("destination")).isEqualTo("Singapore");
        assertThat(((Number) trip.get("plan_version")).intValue()).isEqualTo(1);
        assertThat(trip.get("split_draft")).isNull();
    }

    @Test
    @DisplayName("seed_v2_fourMembersAllAcknowledgedAliceOwner")
    void seed_v2_fourMembersAllAcknowledgedAliceOwner() {
        List<Map<String, Object>> members = jdbc.queryForList(
                "SELECT display_name, role, plan_ack_version FROM trip_member WHERE trip_id = ?", sgfTripId());
        assertThat(members).hasSize(4);
        Map<String, Map<String, Object>> byName = members.stream()
                .collect(Collectors.toMap(m -> (String) m.get("display_name"), m -> m));
        assertThat(byName.keySet()).containsExactlyInAnyOrder("Alice", "Ben", "Chloe", "Daniel");
        assertThat(byName.get("Alice").get("role")).isEqualTo("owner");
        assertThat(byName.get("Ben").get("role")).isEqualTo("member");
        assertThat(byName.get("Chloe").get("role")).isEqualTo("member");
        assertThat(byName.get("Daniel").get("role")).isEqualTo("member");
        assertThat(members).allSatisfy(m ->
                assertThat(((Number) m.get("plan_ack_version")).intValue()).isEqualTo(1));
    }

    @Test
    @DisplayName("seed_v2_eveBelongsToAnotherTrip")
    void seed_v2_eveBelongsToAnotherTrip() {
        Map<String, Object> eve = jdbc.queryForMap(
                "SELECT trip_id FROM trip_member WHERE display_name = 'Eve'");
        assertThat(eve.get("trip_id")).isNotNull();
        assertThat(eve.get("trip_id")).isNotEqualTo(sgfTripId());
    }

    @Test
    @DisplayName("seed_v2_mainPlanHasTwoStopsWithUtcTimes")
    void seed_v2_mainPlanHasTwoStopsWithUtcTimes() {
        List<Map<String, Object>> stops = jdbc.queryForList(
                "SELECT title, start_at, end_at, plan_version FROM plan_node "
                        + "WHERE trip_id = ? AND branch_id = 'main' ORDER BY start_at", sgfTripId());
        assertThat(stops).hasSize(2);
        assertThat(stops.get(0).get("title")).isEqualTo("City Hall MRT");
        assertThat(stops.get(0).get("start_at")).isEqualTo("2026-12-05T01:00:00Z");
        assertThat(stops.get(0).get("end_at")).isEqualTo("2026-12-05T01:30:00Z");
        assertThat(stops.get(1).get("title")).isEqualTo("Merlion Park");
        assertThat(stops.get(1).get("start_at")).isEqualTo("2026-12-05T03:30:00Z");
        assertThat(stops.get(1).get("end_at")).isEqualTo("2026-12-05T04:00:00Z");
        assertThat(stops).allSatisfy(s ->
                assertThat(((Number) s.get("plan_version")).intValue()).isEqualTo(1));
    }

    @Test
    @DisplayName("migrate_v2_greetingTableAndV1SeedIntact")
    void migrate_v2_greetingTableAndV1SeedIntact() {
        assertThat(jdbc.queryForObject("SELECT message FROM greeting WHERE id = 1", String.class))
                .isEqualTo("Hello World");
    }

    private String sgfTripId() {
        return jdbc.queryForObject("SELECT id FROM trip WHERE invite_code = 'SGF26A'", String.class);
    }

    private Set<String> columnNames(String table) {
        return jdbc.queryForList("PRAGMA table_info(" + table + ")").stream()
                .map(row -> (String) row.get("name"))
                .collect(Collectors.toSet());
    }

    private Map<String, Object> columnInfo(String table, String column) {
        return jdbc.queryForList("PRAGMA table_info(" + table + ")").stream()
                .filter(row -> column.equals(row.get("name")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("column not found: " + table + "." + column));
    }
}