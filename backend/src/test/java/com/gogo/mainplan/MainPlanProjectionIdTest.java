package com.gogo.mainplan;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * US-090 R1 acceptance: the confirmed main-plan projection reconciles the main-line rows in place so every stop
 * keeps its {@code plan_node.id}. A split draft stores the departure/reunion stop ids, so re-projecting after a
 * "my plan" save must leave those pointers resolvable instead of rewriting every id.
 */
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:main-plan-projection-id?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
class MainPlanProjectionIdTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private MainPlanProjection projection;

    private long tripId;
    private int version;
    private long draftId;

    @BeforeEach
    void seedConfirmedPlan() {
        tripId = jdbc.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
        version = 1;
        jdbc.update("DELETE FROM split_draft WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM plan_node WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbc.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbc.update("UPDATE trip SET start_date = '2026-12-05', destination = 'Singapore' WHERE id = ?", tripId);
        jdbc.update("INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, "
                + "input_revisions_json) VALUES (?, ?, 'confirmed', 0, '[]')", tripId, version);
        draftId = jdbc.queryForObject("SELECT id FROM main_plan_draft WHERE trip_id = ? AND version = ?",
                Long.class, tripId, version);
        insertStop(1, "City Hall MRT", "09:00", "09:30", 30);
        insertStop(2, "National Gallery Singapore", "10:00", "10:30", 30);
        insertStop(3, "Gardens by the Bay", "11:00", "11:15", 15);
        insertStop(4, "Merlion Park", "11:30", "12:00", null);
    }

    @Test
    void reprojectionKeepsStopIdsAndAppliesEditedTimes() {
        assertThat(projection.projectConfirmed(tripId)).contains(version);
        List<Map<String, Object>> first = mainRows();
        assertThat(first).hasSize(4);
        String cityHallId = idByTitle("City Hall MRT");

        // What "my plan" will write: the confirmed draft stop is the source, the projection must follow.
        jdbc.update("UPDATE main_plan_stop SET name = 'Marina Bay Pier', start_local = '08:20', "
                + "end_local = '08:50' WHERE draft_id = ? AND seq = 1", draftId);
        assertThat(projection.projectConfirmed(tripId)).contains(version);

        List<Map<String, Object>> second = mainRows();
        assertThat(second).hasSameSizeAs(first);
        assertThat(ids(second)).isEqualTo(ids(first));
        assertThat(second.get(0).get("title")).isEqualTo("Marina Bay Pier");
        assertThat(second.get(0).get("start_at")).isEqualTo("2026-12-05T00:20:00Z");
        assertThat(second.get(0).get("end_at")).isEqualTo("2026-12-05T00:50:00Z");
        // The id a split draft would have stored still resolves to a main-line stop of that version.
        assertThat(mainRowCount(cityHallId)).isEqualTo(1);
    }

    @Test
    void reprojectionDropsStopsTheConfirmedPlanNoLongerHas() {
        assertThat(projection.projectConfirmed(tripId)).contains(version);
        jdbc.update("DELETE FROM main_plan_stop WHERE draft_id = ? AND seq = 4", draftId);
        assertThat(projection.projectConfirmed(tripId)).contains(version);
        assertThat(mainRows()).hasSize(3);
        Integer leftovers = jdbc.queryForObject("SELECT COUNT(*) FROM plan_node WHERE trip_id = ? "
                + "AND branch_id = 'main' AND plan_version = ? AND sort_order = 4",
                Integer.class, tripId, version);
        assertThat(leftovers).isZero();
    }

    @Test
    void reprojectionCollapsesDuplicatedOrdersOntoTheSurvivingRow() {
        assertThat(projection.projectConfirmed(tripId)).contains(version);
        String keptId = idByTitle("National Gallery Singapore");
        jdbc.update("INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, "
                + "start_at, end_at, location_name, lat, lng, sort_order, created_at) "
                + "VALUES ('zz-duplicate-order-2', ?, ?, NULL, 'main', 'stop', 'Stale Duplicate', NULL, NULL, "
                + "NULL, NULL, NULL, 2, '2026-12-05T00:00:00Z')", tripId, version);
        assertThat(projection.projectConfirmed(tripId)).contains(version);
        assertThat(mainRows()).hasSize(4);
        assertThat(idByTitle("National Gallery Singapore")).isEqualTo(keptId);
        assertThat(mainRowCount("zz-duplicate-order-2")).isZero();
    }

    private void insertStop(int seq, String name, String start, String end, Integer travelMinutes) {
        jdbc.update("INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, "
                + "travel_minutes_to_next, interests_json) VALUES (?, ?, ?, ?, ?, ?, '[]')",
                draftId, seq, name, start, end, travelMinutes);
    }

    private List<Map<String, Object>> mainRows() {
        return jdbc.queryForList("SELECT id, title, start_at, end_at, sort_order FROM plan_node "
                + "WHERE trip_id = ? AND branch_id = 'main' AND plan_version = ? ORDER BY sort_order",
                tripId, version);
    }

    private List<String> ids(List<Map<String, Object>> rows) {
        return rows.stream().map(row -> (String) row.get("id")).toList();
    }

    private String idByTitle(String title) {
        return jdbc.queryForObject("SELECT id FROM plan_node WHERE trip_id = ? AND branch_id = 'main' "
                + "AND plan_version = ? AND title = ?", String.class, tripId, version, title);
    }

    private int mainRowCount(String id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM plan_node WHERE id = ?", Integer.class, id);
        return count == null ? 0 : count;
    }
}
