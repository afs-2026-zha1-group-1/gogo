package com.gogo.trip;

import com.gogo.auth.TestAuth;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// REQ-003: US-001 create, US-002 read; fixtures C1-C7, R1-R3-N
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:trip-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class TripApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String FULL_BODY = """
            {"name":"Singapore Friends Day","destination":"Singapore",
             "startDate":"2026-12-05","endDate":"2026-12-05",
             "startLocation":"City Hall MRT","endLocation":"Merlion Park"}""";

    private long tripCount() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM trip", Long.class);
    }

    private long memberCount(long tripId) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ?", Long.class, tripId);
    }

    private long seededTripId() {
        return jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
    }

    private MvcResult create(String body, String userId) throws Exception {
        var request = post("/api/trips").contentType(MediaType.APPLICATION_JSON).content(body);
        request = request.with(TestAuth.asUser(userId));
        return mockMvc.perform(request).andReturn();
    }

    @Test
    void createsTripWithSameDayDatesAndCreatorMembership() throws Exception {
        long before = tripCount();
        MvcResult result = create(FULL_BODY, "1");
        org.junit.jupiter.api.Assertions.assertEquals(201, result.getResponse().getStatus());
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        long id = node.get("id").asLong();
        org.junit.jupiter.api.Assertions.assertEquals("Singapore Friends Day", node.get("name").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Singapore", node.get("destination").asText());
        org.junit.jupiter.api.Assertions.assertEquals("2026-12-05", node.get("startDate").asText());
        org.junit.jupiter.api.Assertions.assertEquals("2026-12-05", node.get("endDate").asText());
        org.junit.jupiter.api.Assertions.assertEquals("City Hall MRT", node.get("startLocation").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Merlion Park", node.get("endLocation").asText());
        org.junit.jupiter.api.Assertions.assertEquals(1, node.get("organizerId").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(before + 1, tripCount());
        org.junit.jupiter.api.Assertions.assertEquals(1, memberCount(id));
    }

    @Test
    void rejectsInvertedDateRangeWithoutWriting() throws Exception {
        long before = tripCount();
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON)
                        .with(TestAuth.asUser("1"))
                        .content(FULL_BODY.replace("\"startDate\":\"2026-12-05\"", "\"startDate\":\"2026-12-06\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
        org.junit.jupiter.api.Assertions.assertEquals(before, tripCount());
    }

    @Test
    void rejectsBlankNameWithoutWriting() throws Exception {
        long before = tripCount();
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON)
                        .with(TestAuth.asUser("1"))
                        .content(FULL_BODY.replace("\"name\":\"Singapore Friends Day\"", "\"name\":\"   \"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NAME_REQUIRED"));
        org.junit.jupiter.api.Assertions.assertEquals(before, tripCount());
    }

    @Test
    void rejectsMissingNullAndBlankDestinationWithoutWriting() throws Exception {
        long before = tripCount();
        String[] bodies = {
                FULL_BODY.replace("\"destination\":\"Singapore\",", ""),
                FULL_BODY.replace("\"destination\":\"Singapore\"", "\"destination\":null"),
                FULL_BODY.replace("\"destination\":\"Singapore\"", "\"destination\":\"  \"")
        };
        for (String body : bodies) {
            mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON)
                            .with(TestAuth.asUser("1")).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("DESTINATION_REQUIRED"));
        }
        org.junit.jupiter.api.Assertions.assertEquals(before, tripCount());
    }

    @Test
    void normalizesUnspecifiedLocationsToNullAndPreservesSupplied() throws Exception {
        String body = """
                {"name":"Null Locations Trip","destination":"Singapore",
                 "startDate":"2026-12-05","endDate":"2026-12-05",
                 "startLocation":"  ","endLocation":null}""";
        MvcResult result = create(body, "1");
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals(201, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(node.get("startLocation").isNull());
        org.junit.jupiter.api.Assertions.assertTrue(node.get("endLocation").isNull());
        long id = node.get("id").asLong();
        mockMvc.perform(get("/api/trips/" + id).with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startLocation").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.endLocation").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.name").value("Null Locations Trip"));

        String omitted = """
                {"name":"Omitted Locations Trip","destination":"Singapore",
                 "startDate":"2026-12-05","endDate":"2026-12-05"}""";
        MvcResult omittedResult = create(omitted, "1");
        JsonNode omittedNode = objectMapper.readTree(omittedResult.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals(201, omittedResult.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(omittedNode.get("startLocation").isNull());
        org.junit.jupiter.api.Assertions.assertTrue(omittedNode.get("endLocation").isNull());
    }

    @Test
    void rejectsMalformedDate() throws Exception {
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON)
                        .with(TestAuth.asUser("1"))
                        .content(FULL_BODY.replace("\"startDate\":\"2026-12-05\"", "\"startDate\":\"2026-13-01\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE"));
    }

    @Test
    void rejectsCreateWithoutOrWithUnknownIdentity() throws Exception {
        long before = tripCount();
        create(FULL_BODY, null);
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON).with(TestAuth.csrfOnly()).content(FULL_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON)
                        .with(TestAuth.asUser("99")).content(FULL_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        org.junit.jupiter.api.Assertions.assertEquals(before, tripCount());
    }

    @Test
    void memberReadsSavedTrip() throws Exception {
        long id = seededTripId();
        mockMvc.perform(get("/api/trips/" + id).with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Singapore Friends Day"))
                .andExpect(jsonPath("$.destination").value("Singapore"))
                .andExpect(jsonPath("$.startDate").value("2026-12-05"))
                .andExpect(jsonPath("$.endDate").value("2026-12-05"))
                .andExpect(jsonPath("$.startLocation").value("City Hall MRT"))
                .andExpect(jsonPath("$.endLocation").value("Merlion Park"));
    }

    @Test
    void nonMemberIsDeniedWithoutTripValues() throws Exception {
        long id = seededTripId();
        mockMvc.perform(get("/api/trips/" + id).with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"))
                .andExpect(jsonPath("$.name").doesNotExist())
                .andExpect(jsonPath("$.destination").doesNotExist())
                .andExpect(content().string(not(containsString("Singapore Friends Day"))));
    }

    @Test
    void readWithoutIdentityIsRejected() throws Exception {
        long id = seededTripId();
        mockMvc.perform(get("/api/trips/" + id))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void unknownTripIdIsReportedSeparately() throws Exception {
        mockMvc.perform(get("/api/trips/999999").with(TestAuth.asUser("2")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void deleteStaysUnsupportedAndListIsReadOnly() throws Exception {
        long id = seededTripId();
        // US-003 supersedes the former "no edit route" rule: the full-form PUT now exists.
        mockMvc.perform(put("/api/trips/" + id).with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON).content(FULL_BODY))
                .andExpect(status().isOk());
        // US-071 supersedes the former "no list route" rule: the collection is now a
        // read-only member list. Deleting is the organizer's separate, confirmed action below.
        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips").isArray());
    }

    @Test
    void organizerDeletesTripAndItsMemberships() throws Exception {
        MvcResult created = create("""
                {"name":"Delete Me","destination":"Bintan",
                 "startDate":"2027-02-01","endDate":"2027-02-02"}""", "1");
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        org.junit.jupiter.api.Assertions.assertEquals(1, memberCount(id));

        mockMvc.perform(delete("/api/trips/" + id).with(TestAuth.asUser("1")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/trips/" + id).with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
        org.junit.jupiter.api.Assertions.assertEquals(0, memberCount(id));
    }

    @Test
    void nonOrganizerMemberCannotDeleteTrip() throws Exception {
        long id = seededTripId();
        long before = tripCount();
        mockMvc.perform(delete("/api/trips/" + id).with(TestAuth.asUser("2")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ORGANIZER"));
        org.junit.jupiter.api.Assertions.assertEquals(before, tripCount());
    }

    @Test
    void nonMemberCannotDeleteTripAndUnknownTripIsReported() throws Exception {
        long id = seededTripId();
        mockMvc.perform(delete("/api/trips/" + id).with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        mockMvc.perform(delete("/api/trips/999999").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void deleteWithoutIdentityIsRejected() throws Exception {
        long id = seededTripId();
        mockMvc.perform(delete("/api/trips/" + id).with(TestAuth.csrfOnly()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
    }

    @Test
    void organizerDeleteRemovesTripGraphAndClearsCurrentTrip() throws Exception {
        MvcResult created = create("""
                {"name":"Graph Trip","destination":"Batam",
                 "startDate":"2027-03-01","endDate":"2027-03-02"}""", "1");
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        jdbcTemplate.update("INSERT INTO trip_member (trip_id, user_id) VALUES (?, 2)", id);
        jdbcTemplate.update("INSERT INTO trip_invitation (trip_id, token) VALUES (?, ?)", id, "tok-" + id);
        jdbcTemplate.update("INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at) "
                + "VALUES (?, 1, 'interest', '{\"codes\":[]}', datetime('now'))", id);
        jdbcTemplate.update("INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, "
                + "input_revisions_json) VALUES (?, 1, 'current', 0, '[]')", id);
        long draftId = jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM main_plan_draft WHERE trip_id = ?", Long.class, id);
        jdbcTemplate.update("INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local) "
                + "VALUES (?, 1, 'Stop', '09:00', '10:00')", draftId);
        jdbcTemplate.update("INSERT INTO split_draft (id, trip_id, document, draft_version, created_at, updated_at) "
                + "VALUES (?, ?, NULL, 1, datetime('now'), datetime('now'))", "split-" + id, id);
        jdbcTemplate.update("INSERT INTO plan_node (id, trip_id, plan_version, branch_id, node_type, title, "
                + "sort_order, created_at) VALUES (?, ?, 1, 'main', 'activity', 'Node', 1, datetime('now'))",
                "node-" + id, id);
        jdbcTemplate.update("UPDATE app_user SET current_trip_id = ? WHERE id = 1", id);

        mockMvc.perform(delete("/api/trips/" + id).with(TestAuth.asUser("1")))
                .andExpect(status().isNoContent());

        long[] remaining = {
                count("SELECT COUNT(*) FROM trip WHERE id = ?", id),
                count("SELECT COUNT(*) FROM trip_member WHERE trip_id = ?", id),
                count("SELECT COUNT(*) FROM trip_invitation WHERE trip_id = ?", id),
                count("SELECT COUNT(*) FROM member_preference WHERE trip_id = ?", id),
                count("SELECT COUNT(*) FROM main_plan_draft WHERE trip_id = ?", id),
                count("SELECT COUNT(*) FROM main_plan_stop WHERE draft_id = ?", draftId),
                count("SELECT COUNT(*) FROM split_draft WHERE trip_id = ?", id),
                count("SELECT COUNT(*) FROM plan_node WHERE trip_id = ?", id),
                count("SELECT COUNT(*) FROM app_user WHERE current_trip_id = ?", id),
        };
        for (long value : remaining) {
            org.junit.jupiter.api.Assertions.assertEquals(0, value);
        }
    }

    private long count(String sql, long id) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, id);
        return value == null ? 0 : value;
    }

    @Test
    void greetingRemainsUnchanged() throws Exception {
        mockMvc.perform(get("/api/greeting"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Hello World"));
    }
}