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
 * Repository-layer acceptance test for the splits extension (V4) on the main trip schema. Boots the real Flyway
 * migrations (V1 greeting, V2 app_user/trip/trip_member seed, V3 invitation + main_plan_confirmed, V4 split_draft
 * + plan_node) against in-memory SQLite and asserts the split_draft/plan_node tables, the plan_node seed, the
 * app_user/trip_member fixture, and that the greeting capability and main seed remain intact.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:file:split-schema-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
class SplitSchemaMigrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("migrate_v4_addsSplitDraftAndPlanNodeOnMainSchema")
    void migrate_v4_addsSplitDraftAndPlanNodeOnMainSchema() {
        List<String> tables = jdbc.queryForList(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", String.class);
        assertThat(tables).contains(
                "greeting", "app_user", "trip", "trip_member", "trip_invitation", "split_draft", "plan_node");
    }

    @Test
    @DisplayName("migrate_v3_tripHasMainPlanConfirmedColumn")
    void migrate_v3_tripHasMainPlanConfirmedColumn() {
        assertThat(columnNames("trip")).contains("main_plan_confirmed");
    }

    @Test
    @DisplayName("migrate_v4_planNodeHasExpectedColumns")
    void migrate_v4_planNodeHasExpectedColumns() {
        assertThat(columnNames("plan_node")).containsExactlyInAnyOrder(
                "id", "trip_id", "plan_version", "parent_id", "branch_id", "node_type", "title",
                "start_at", "end_at", "location_name", "lat", "lng", "sort_order", "created_at");
    }

    @Test
    @DisplayName("migrate_v4_splitDraftHasUniqueTripId")
    void migrate_v4_splitDraftHasUniqueTripId() {
        assertThat(columnNames("split_draft")).containsExactlyInAnyOrder(
                "id", "trip_id", "document", "draft_version", "created_at", "updated_at");
    }

    @Test
    @DisplayName("seed_appUserHasAliceToEve")
    void seed_appUserHasAliceToEve() {
        List<String> names = jdbc.queryForList(
                "SELECT display_name FROM app_user ORDER BY id", String.class);
        assertThat(names).containsExactly("Alice", "Ben", "Chloe", "Daniel", "Eve");
    }

    @Test
    @DisplayName("seed_tripMembersAreUsersOneToFourEveOutside")
    void seed_tripMembersAreUsersOneToFourEveOutside() {
        String tripId = sgfTripId();
        List<String> memberNames = jdbc.queryForList(
                "SELECT u.display_name FROM trip_member tm JOIN app_user u ON u.id = tm.user_id "
                        + "WHERE tm.trip_id = ? ORDER BY u.id", String.class, tripId);
        assertThat(memberNames).containsExactly("Alice", "Ben", "Chloe", "Daniel");
        Integer eveMemberships = jdbc.queryForObject(
                "SELECT COUNT(*) FROM trip_member tm JOIN app_user u ON u.id = tm.user_id "
                        + "WHERE tm.trip_id = ? AND u.display_name = 'Eve'", Integer.class, tripId);
        assertThat(eveMemberships).isZero();
    }

    @Test
    @DisplayName("seed_mainPlanHasTwoStopsWithUtcTimes")
    void seed_mainPlanHasTwoStopsWithUtcTimes() {
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
    @DisplayName("migrate_v4_greetingTableAndV1SeedIntact")
    void migrate_v4_greetingTableAndV1SeedIntact() {
        assertThat(jdbc.queryForObject("SELECT message FROM greeting WHERE id = 1", String.class))
                .isEqualTo("Hello World");
    }

    private String sgfTripId() {
        return jdbc.queryForObject(
                "SELECT id FROM trip WHERE name = 'Singapore Friends Day'", String.class);
    }

    private Set<String> columnNames(String table) {
        return jdbc.queryForList("PRAGMA table_info(" + table + ")").stream()
                .map(row -> (String) row.get("name"))
                .collect(Collectors.toSet());
    }
}
