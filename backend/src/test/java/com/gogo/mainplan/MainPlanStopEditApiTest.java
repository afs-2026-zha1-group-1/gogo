package com.gogo.mainplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.auth.TestAuth;

/**
 * US-090 「我的方案」stop edit (spec 第 2 段): any trip member edits one stop's start/end time and location. The
 * endpoint keeps the edited rows in place (stable plan_node ids), rejects illegal windows and neighbour clashes
 * without writing, and drops a generated split pair while leaving the draft active.
 */
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:main-plan-stop-edit?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class MainPlanStopEditApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long tripId;
    private int version;

    @BeforeEach
    void seedConfirmedPlan() throws Exception {
        tripId = jdbc.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
        jdbc.update("DELETE FROM split_draft WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM plan_node WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbc.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbc.update("UPDATE trip_member SET ready = 1, preference_revision = 1 "
                + "WHERE trip_id = ? AND user_id IN (1, 2, 3, 4)", tripId);
        jdbc.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'budget'", tripId);
        jdbc.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'submission'", tripId);
        jdbc.update("UPDATE trip SET start_location = 'City Hall MRT', end_location = 'Merlion Park', "
                + "main_plan_confirmed = 0 WHERE id = ?", tripId);
        jdbc.update("DELETE FROM trip_invitation WHERE trip_id = ?", tripId);
        jdbc.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);

        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan").with(TestAuth.asUser("1")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/trips/" + tripId + "/main-plan/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isOk());
        version = jdbc.queryForObject("SELECT version FROM main_plan_draft WHERE trip_id = ? "
                + "AND status = 'confirmed'", Integer.class, tripId);
    }

    @Test
    void memberEditsStopTimeAndLocationInPlace() throws Exception {
        long stopId = stopId("City Hall MRT");
        mockMvc.perform(edit(stopId, "08:20", "08:50", "Marina Bay Pier", version, "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stops[0].seq").value(1))
                .andExpect(jsonPath("$.stops[0].startTime").value("08:20"))
                .andExpect(jsonPath("$.stops[0].endTime").value("08:50"))
                .andExpect(jsonPath("$.stops[0].locationName").value("Marina Bay Pier"));

        Map<String, Object> saved = jdbc.queryForMap(
                "SELECT start_local, end_local, location_name FROM main_plan_stop WHERE id = ?", stopId);
        assertThat(saved.get("start_local")).isEqualTo("08:20");
        assertThat(saved.get("end_local")).isEqualTo("08:50");
        assertThat(saved.get("location_name")).isEqualTo("Marina Bay Pier");

        // The projection keeps the main-line row id, so a saved split boundary stays resolvable.
        Map<String, Object> node = jdbc.queryForMap("SELECT id, start_at, end_at, location_name FROM plan_node "
                + "WHERE trip_id = ? AND branch_id = 'main' AND sort_order = 1", tripId);
        assertThat(node.get("id")).isEqualTo("mn-" + tripId + "-" + version + "-1");
        assertThat(node.get("start_at")).isEqualTo("2026-12-05T00:20:00Z");
        assertThat(node.get("end_at")).isEqualTo("2026-12-05T00:50:00Z");
        assertThat(node.get("location_name")).isEqualTo("Marina Bay Pier");
    }

    @Test
    void memberRenamesStopAndStoresNoteWithoutClearingLocation() throws Exception {
        long stopId = stopId("City Hall MRT");
        mockMvc.perform(edit(stopId, "08:20", "08:50", "Marina Bay Pier", version, "2"))
                .andExpect(status().isOk());

        // 「编辑站点」弹窗提交名称/时间/备注，不再携带地点：既有地点必须原样保留。
        mockMvc.perform(editStop(stopId, "旧城早餐", "08:20", "08:50", "记得带现金", version, "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stops[0].name").value("旧城早餐"))
                .andExpect(jsonPath("$.stops[0].note").value("记得带现金"))
                .andExpect(jsonPath("$.stops[0].locationName").value("Marina Bay Pier"));

        Map<String, Object> saved = jdbc.queryForMap(
                "SELECT name, note, location_name FROM main_plan_stop WHERE id = ?", stopId);
        assertThat(saved.get("name")).isEqualTo("旧城早餐");
        assertThat(saved.get("note")).isEqualTo("记得带现金");
        assertThat(saved.get("location_name")).isEqualTo("Marina Bay Pier");
        // 改名同步到主线投影，分队边界按新标题展示。
        assertThat(jdbc.queryForObject("SELECT title FROM plan_node WHERE trip_id = ? AND branch_id = 'main' "
                + "AND sort_order = 1", String.class, tripId)).isEqualTo("旧城早餐");

        // 显式提交空串才清空备注；名称同样保留刚改的值。
        mockMvc.perform(editStop(stopId, "旧城早餐", "08:20", "08:50", "", version, "2"))
                .andExpect(status().isOk());
        Map<String, Object> cleared = jdbc.queryForMap("SELECT name, note FROM main_plan_stop WHERE id = ?", stopId);
        assertThat(cleared.get("name")).isEqualTo("旧城早餐");
        assertThat(cleared.get("note")).isNull();
    }

    @Test
    void nonMemberCannotEdit() throws Exception {
        mockMvc.perform(edit(stopId("City Hall MRT"), "08:20", "08:50", "", version, "5"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        assertThat(startLocal(stopId("City Hall MRT"))).isEqualTo("09:00");
    }

    @Test
    void unknownStopIsNotFound() throws Exception {
        mockMvc.perform(edit(987654L, "08:20", "08:50", "", version, "2"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("STOP_NOT_FOUND"));
    }

    @Test
    void stalePlanVersionIsRejected() throws Exception {
        mockMvc.perform(edit(stopId("City Hall MRT"), "08:20", "08:50", "", version + 5, "2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_PLAN_VERSION"));
        assertThat(startLocal(stopId("City Hall MRT"))).isEqualTo("09:00");
    }

    @Test
    void endNotAfterStartIsRejectedWithoutWriting() throws Exception {
        long stopId = stopId("National Gallery Singapore");
        mockMvc.perform(edit(stopId, "10:30", "10:30", "", version, "2"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[0].type").value("END_BEFORE_START"));
        assertThat(startLocal(stopId)).isEqualTo("10:00");
    }

    @Test
    void neighbourClashIsRejectedWithoutWriting() throws Exception {
        long stopId = stopId("National Gallery Singapore");
        // 09:00 starts before the previous stop (City Hall MRT) ends at 09:30.
        mockMvc.perform(edit(stopId, "09:00", "10:30", "", version, "2"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[0].type").value("NEIGHBOUR_CONFLICT"));
        assertThat(startLocal(stopId)).isEqualTo("10:00");
    }

    @Test
    void editDropsTheGeneratedSplitPairAndKeepsTheDraftActive() throws Exception {
        seedActiveDraftWithRoutes();
        // Keeps the 15-minute leg to Merlion Park (11:15 + 15 = 11:30) so only the pair reset is exercised.
        mockMvc.perform(edit(stopId("Gardens by the Bay"), "11:05", "11:15", "Gardens", version, "3"))
                .andExpect(status().isOk());

        Integer routes = jdbc.queryForObject("SELECT COUNT(*) FROM plan_node WHERE trip_id = ? "
                + "AND branch_id IN ('split-a', 'split-b')", Integer.class, tripId);
        assertThat(routes).isZero();
        Map<String, Object> draft = jdbc.queryForMap(
                "SELECT document, draft_version FROM split_draft WHERE trip_id = ?", tripId);
        assertThat(((Number) draft.get("draft_version")).intValue()).isEqualTo(4);
        JsonNode document = objectMapper.readTree(String.valueOf(draft.get("document")));
        assertThat(document.get("status").asText()).isEqualTo("active");
        assertThat(document.get("routes").isNull()).isTrue();
        assertThat(document.get("departureStopId").asText()).isEqualTo("mn-" + tripId + "-" + version + "-2");
    }

    @Test
    void memberAppendsStopAtTheEnd() throws Exception {
        mockMvc.perform(addStop("Haw Par Villa", "12:30", "13:15", "Haw Par Villa", version, "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stops.length()").value(5))
                .andExpect(jsonPath("$.stops[4].name").value("Haw Par Villa"))
                .andExpect(jsonPath("$.stops[4].seq").value(5))
                .andExpect(jsonPath("$.stops[4].locationName").value("Haw Par Villa"));

        Map<String, Object> node = jdbc.queryForMap("SELECT id, start_at, location_name FROM plan_node "
                + "WHERE trip_id = ? AND branch_id = 'main' AND sort_order = 5", tripId);
        assertThat(node.get("id")).isEqualTo("mn-" + tripId + "-" + version + "-5");
        assertThat(node.get("start_at")).isEqualTo("2026-12-05T04:30:00Z");
        assertThat(node.get("location_name")).isEqualTo("Haw Par Villa");
    }

    @Test
    void appendBeforeTheLastStopEndsIsRejected() throws Exception {
        mockMvc.perform(addStop("Too Early", "11:00", "12:30", "", version, "2"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.scheduleErrors[0].type").value("NEIGHBOUR_CONFLICT"));
        Integer rows = jdbc.queryForObject("SELECT COUNT(*) FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", Integer.class, tripId);
        assertThat(rows).isEqualTo(4);
    }

    @Test
    void appendRejectsBlankName() throws Exception {
        mockMvc.perform(addStop("  ", "12:30", "13:15", "", version, "2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STOP_NAME"));
    }

    @Test
    void memberDeletesStopAndOtherIdsStayStable() throws Exception {
        long gardens = stopId("Gardens by the Bay");
        mockMvc.perform(deleteStop(gardens, "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stops.length()").value(3));

        Integer removed = jdbc.queryForObject("SELECT COUNT(*) FROM plan_node WHERE trip_id = ? "
                + "AND branch_id = 'main' AND sort_order = 3", Integer.class, tripId);
        assertThat(removed).isZero();
        // The later stop keeps its position, so its plan_node id (a saved split boundary) does not change.
        Map<String, Object> merlion = jdbc.queryForMap("SELECT id, title FROM plan_node WHERE trip_id = ? "
                + "AND branch_id = 'main' AND sort_order = 4", tripId);
        assertThat(merlion.get("id")).isEqualTo("mn-" + tripId + "-" + version + "-4");
        assertThat(merlion.get("title")).isEqualTo("Merlion Park");
    }

    @Test
    void deletingTheLastRemainingStopIsRejected() throws Exception {
        jdbc.update("DELETE FROM main_plan_stop WHERE seq > 1 AND draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        long cityHall = stopId("City Hall MRT");
        mockMvc.perform(deleteStop(cityHall, "2"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.scheduleErrors[0].type").value("LAST_STOP"));
        assertThat(startLocal(cityHall)).isEqualTo("09:00");
    }

    @Test
    void appendingDropsTheGeneratedSplitPair() throws Exception {
        seedActiveDraftWithRoutes();
        mockMvc.perform(addStop("Haw Par Villa", "12:30", "13:15", "Haw Par Villa", version, "3"))
                .andExpect(status().isOk());

        Integer routes = jdbc.queryForObject("SELECT COUNT(*) FROM plan_node WHERE trip_id = ? "
                + "AND branch_id IN ('split-a', 'split-b')", Integer.class, tripId);
        assertThat(routes).isZero();
        JsonNode document = objectMapper.readTree(String.valueOf(jdbc.queryForMap(
                "SELECT document FROM split_draft WHERE trip_id = ?", tripId).get("document")));
        assertThat(document.get("routes").isNull()).isTrue();
        assertThat(document.get("status").asText()).isEqualTo("active");
    }

    @Test
    void appendingFillsTheLegOfThePreviousLastStop() throws Exception {
        mockMvc.perform(addStop("Haw Par Villa", "12:30", "13:15", "Haw Par Villa", version, "2"))
                .andExpect(status().isOk());
        // Merlion Park stops being last, so it needs the leg that confirmation checks (MISSING_LEG otherwise).
        assertThat(legOf("Merlion Park")).isEqualTo(30);
        assertThat(legOf("Haw Par Villa")).isNull();
    }

    @Test
    void movingAStopIntoTheTravelLegIsRejected() throws Exception {
        long stopId = stopId("National Gallery Singapore");
        // 09:45 starts after City Hall ends (09:30) but the 30-minute leg no longer fits before it.
        mockMvc.perform(edit(stopId, "09:45", "10:30", "", version, "2"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.scheduleErrors[0].type").value("TRAVEL_EXCEEDS_GAP"));
        assertThat(startLocal(stopId)).isEqualTo("10:00");
    }

    @Test
    void deletingABoundaryStopClearsTheDraftBoundaries() throws Exception {
        seedActiveDraftWithRoutes();
        mockMvc.perform(deleteStop(stopId("National Gallery Singapore"), "3"))
                .andExpect(status().isOk());

        Map<String, Object> draft = jdbc.queryForMap(
                "SELECT document, draft_version FROM split_draft WHERE trip_id = ?", tripId);
        JsonNode document = objectMapper.readTree(String.valueOf(draft.get("document")));
        assertThat(document.get("departureStopId").isNull()).isTrue();
        assertThat(document.get("reunionStopId").isNull()).isTrue();
        assertThat(document.get("routes").isNull()).isTrue();
        assertThat(((Number) draft.get("draft_version")).intValue()).isEqualTo(4);
    }

    @Test
    void legacyColonConfirmRequiresAConfirmedDraft() throws Exception {
        mockMvc.perform(post("/api/trips").with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Legacy Guard Trip\",\"destination\":\"Singapore\","
                                + "\"startDate\":\"2026-12-05\",\"endDate\":\"2026-12-05\"}"))
                .andExpect(status().isCreated());
        long newTrip = jdbc.queryForObject("SELECT id FROM trip WHERE name = 'Legacy Guard Trip'", Long.class);
        // The colon shortcut delegates to the validated confirmation, so it can never flip the flag on its own.
        mockMvc.perform(post("/api/trips/" + newTrip + "/main-plan:confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NO_DRAFT"));
        Integer flag = jdbc.queryForObject(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, newTrip);
        assertThat(flag).isZero();
    }

    private Integer legOf(String name) {
        return jdbc.queryForObject("SELECT travel_minutes_to_next FROM main_plan_stop WHERE name = ? "
                + "AND draft_id IN (SELECT id FROM main_plan_draft WHERE trip_id = ?)", Integer.class, name, tripId);
    }

    private MockHttpServletRequestBuilder addStop(String name, String start, String end, String location,
            int planVersion, String userId) {
        String body = "{\"name\":\"" + name + "\",\"startTime\":\"" + start + "\",\"endTime\":\"" + end
                + "\",\"locationName\":\"" + location + "\",\"mainPlanVersion\":" + planVersion + "}";
        return post("/api/trips/" + tripId + "/main-plan/stops")
                .with(TestAuth.asUser(userId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private MockHttpServletRequestBuilder deleteStop(long stopId, String userId) {
        return delete("/api/trips/" + tripId + "/main-plan/stops/" + stopId).with(TestAuth.asUser(userId));
    }

    private MockHttpServletRequestBuilder edit(long stopId, String start, String end, String location,
            int planVersion, String userId) {
        String body = "{\"startTime\":\"" + start + "\",\"endTime\":\"" + end + "\",\"locationName\":\""
                + location + "\",\"mainPlanVersion\":" + planVersion + "}";
        return put("/api/trips/" + tripId + "/main-plan/stops/" + stopId)
                .with(TestAuth.asUser(userId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private MockHttpServletRequestBuilder editStop(long stopId, String name, String start, String end, String note,
            int planVersion, String userId) {
        String body = "{\"name\":\"" + name + "\",\"startTime\":\"" + start + "\",\"endTime\":\"" + end
                + "\",\"note\":\"" + note + "\",\"mainPlanVersion\":" + planVersion + "}";
        return put("/api/trips/" + tripId + "/main-plan/stops/" + stopId)
                .with(TestAuth.asUser(userId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private long stopId(String name) {
        return jdbc.queryForObject("SELECT id FROM main_plan_stop WHERE name = ? AND draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", Long.class, name, tripId);
    }

    private String startLocal(long stopId) {
        return jdbc.queryForObject("SELECT start_local FROM main_plan_stop WHERE id = ?", String.class, stopId);
    }

    private void seedActiveDraftWithRoutes() {
        String departure = "mn-" + tripId + "-" + version + "-2";
        String reunion = "mn-" + tripId + "-" + version + "-4";
        String document = "{\"initiatorMemberId\":\"1\",\"mainPlanVersion\":" + version + ",\"draftVersion\":3,"
                + "\"status\":\"active\",\"departureStopId\":\"" + departure + "\",\"reunionStopId\":\""
                + reunion + "\",\"groups\":{\"A\":[\"1\"],\"B\":[\"2\",\"3\"]},"
                + "\"routes\":{\"A\":{\"activityMinutes\":60,\"travelLegsMinutes\":[30],\"bufferMinutes\":0,"
                + "\"steps\":[{\"name\":\"National Gallery Singapore\",\"minutes\":60}]},"
                + "\"B\":{\"activityMinutes\":30,\"travelLegsMinutes\":[5,5],\"bufferMinutes\":0,\"steps\":[]}},"
                + "\"createdAt\":\"2026-12-05T00:00:00Z\",\"updatedAt\":\"2026-12-05T00:00:00Z\"}";
        jdbc.update("INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at) "
                + "VALUES ('split-under-test', ?, ?, 3, '2026-12-05T00:00:00Z', '2026-12-05T00:00:00Z')",
                tripId, document);
        insertRouteRow("route-a", "split-a", 1);
        insertRouteRow("route-b", "split-b", 2);
    }

    private void insertRouteRow(String id, String branchId, int order) {
        jdbc.update("INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, "
                + "start_at, end_at, location_name, lat, lng, sort_order, created_at) "
                + "VALUES (?, ?, ?, NULL, ?, 'activity', 'route', '2026-12-05T02:00:00Z', "
                + "'2026-12-05T03:30:00Z', 'route', NULL, NULL, ?, '2026-12-05T00:00:00Z')",
                id, tripId, version, branchId, order);
    }
}
