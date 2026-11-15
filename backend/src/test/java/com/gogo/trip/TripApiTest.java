package com.gogo.trip;

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
        if (userId != null) {
            request = request.header("X-User-Id", userId);
        }
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
                        .header("X-User-Id", "1")
                        .content(FULL_BODY.replace("\"startDate\":\"2026-12-05\"", "\"startDate\":\"2026-12-06\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
        org.junit.jupiter.api.Assertions.assertEquals(before, tripCount());
    }

    @Test
    void rejectsBlankNameWithoutWriting() throws Exception {
        long before = tripCount();
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "1")
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
                            .header("X-User-Id", "1").content(body))
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
        mockMvc.perform(get("/api/trips/" + id).header("X-User-Id", "1"))
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
                        .header("X-User-Id", "1")
                        .content(FULL_BODY.replace("\"startDate\":\"2026-12-05\"", "\"startDate\":\"2026-13-01\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE"));
    }

    @Test
    void rejectsCreateWithoutOrWithUnknownIdentity() throws Exception {
        long before = tripCount();
        create(FULL_BODY, null);
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON).content(FULL_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(post("/api/trips").contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "99").content(FULL_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        org.junit.jupiter.api.Assertions.assertEquals(before, tripCount());
    }

    @Test
    void memberReadsSavedTrip() throws Exception {
        long id = seededTripId();
        mockMvc.perform(get("/api/trips/" + id).header("X-User-Id", "2"))
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
        mockMvc.perform(get("/api/trips/" + id).header("X-User-Id", "5"))
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
        mockMvc.perform(get("/api/trips/999999").header("X-User-Id", "2"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void noEditDeleteListOrInvitationRoutesExist() throws Exception {
        long id = seededTripId();
        mockMvc.perform(put("/api/trips/" + id).header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON).content(FULL_BODY))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete("/api/trips/" + id).header("X-User-Id", "1"))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1"))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(post("/api/trips/" + id + "/invitation").header("X-User-Id", "1"))
                .andExpect(status().isNotFound());
    }

    @Test
    void greetingRemainsUnchanged() throws Exception {
        mockMvc.perform(get("/api/greeting"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Hello World"));
    }
}