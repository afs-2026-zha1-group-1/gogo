package com.gogo.preference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// REQ-019: US-019 interests; delta scenarios ID-1..5, CAT-1..4, SAVE-1..8, READ-1..5
// plus the API-level reverse checks of the ATDD design section 5.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:preference-test?mode=memory&cache=shared&foreign_keys=on",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class PreferenceApiTest {

    private static final String ALL_SEVEN =
            "{\"interests\":[\"Art\",\"Nature\",\"Culture\",\"History\",\"Food\",\"Shopping\",\"Adventure\"]}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void clearPreferences() {
        jdbcClient.sql("DELETE FROM member_preference").update();
    }

    @AfterEach
    void restoreTripFlags() {
        jdbcClient.sql("UPDATE trip SET main_plan_confirmed = 0").update();
    }

    // --- helpers -----------------------------------------------------------

    private long seededTripId() {
        return jdbcClient.sql("SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'")
                .query(Long.class).single();
    }

    private MvcResult save(String body, String userId) throws Exception {
        return perform(put(path("/preferences")), body, userId);
    }

    private MvcResult read(String userId) throws Exception {
        return perform(get(path("/preferences")), null, userId);
    }

    private String path(String suffix) {
        return "/api/trips/" + seededTripId() + suffix;
    }

    private MvcResult perform(MockHttpServletRequestBuilder request, String body, String userId)
            throws Exception {
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        if (userId != null) {
            request = request.header("X-User-Id", userId);
        }
        return mockMvc.perform(request).andReturn();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private List<String> strings(JsonNode array) {
        List<String> values = new ArrayList<>();
        array.forEach(element -> values.add(element.asText()));
        return values;
    }

    private List<String> responseInterests(JsonNode node) {
        return strings(node.get("interests"));
    }

    private JsonNode memberOf(JsonNode response, long userId) {
        for (JsonNode member : response.get("members")) {
            if (member.get("userId").asLong() == userId) {
                return member;
            }
        }
        return null;
    }

    private String storedPayload(long userId) {
        return jdbcClient.sql("SELECT payload FROM member_preference "
                        + "WHERE trip_id = ? AND user_id = ? AND kind = 'interest'")
                .params(seededTripId(), userId).query(String.class).optional().orElse(null);
    }

    private String storedUpdatedAt(long userId) {
        return jdbcClient.sql("SELECT updated_at FROM member_preference "
                        + "WHERE trip_id = ? AND user_id = ? AND kind = 'interest'")
                .params(seededTripId(), userId).query(String.class).optional().orElse(null);
    }

    private List<String> storedCodes(long userId) {
        String payload = storedPayload(userId);
        if (payload == null) {
            return List.of();
        }
        try {
            return strings(objectMapper.readTree(payload).get("codes"));
        } catch (Exception cause) {
            throw new IllegalStateException("payload is not readable JSON: " + payload, cause);
        }
    }

    private long rowCount(long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM member_preference WHERE trip_id = ? AND user_id = ?")
                .params(seededTripId(), userId).query(Long.class).single();
    }

    private long rowsOfKind(String kind) {
        return jdbcClient.sql("SELECT COUNT(*) FROM member_preference WHERE kind = ?")
                .param(kind).query(Long.class).single();
    }

    private void assertRejected(MvcResult result, int status, String code) throws Exception {
        assertEquals(status, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        assertEquals(code, body(result).get("code").asText());
    }

    // --- identity and membership (ID-1..ID-5) ------------------------------

    @Test
    void rejectsMissingIdentityWithoutReadingOrWriting() throws Exception {
        assertRejected(read(null), 401, "USER_REQUIRED");
        assertRejected(save("{\"interests\":[\"Art\"]}", null), 401, "USER_REQUIRED");
        assertEquals(0, rowCount(2));
    }

    @Test
    void rejectsUnusableIdentity() throws Exception {
        assertRejected(read("99"), 401, "USER_REQUIRED");
        assertRejected(read("abc"), 401, "USER_REQUIRED");
        assertRejected(save("{\"interests\":[\"Art\"]}", "99"), 401, "USER_REQUIRED");
        assertTrue(body(read("abc")).get("members") == null);
    }

    @Test
    void toleratesWhitespaceAroundIdentity() throws Exception {
        assertEquals(200, save("{\"interests\":[\"Art\"]}", " 2 ").getResponse().getStatus());
        String padded = read(" 2 ").getResponse().getContentAsString();
        String plain = read("2").getResponse().getContentAsString();
        assertEquals(plain, padded);
    }

    @Test
    void deniesNonMemberWithoutLeakingInterests() throws Exception {
        assertEquals(200, save("{\"interests\":[\"Art\"]}", "2").getResponse().getStatus());
        String before = storedPayload(2);

        MvcResult readResult = read("5");
        assertRejected(readResult, 403, "NOT_A_MEMBER");
        assertNull(body(readResult).get("members"));

        MvcResult saveResult = save("{\"interests\":[\"Art\"]}", "5");
        assertRejected(saveResult, 403, "NOT_A_MEMBER");
        assertEquals(0, rowCount(5));
        assertEquals(before, storedPayload(2));
    }

    @Test
    void reportsUnknownTripBeforeMembership() throws Exception {
        for (String userId : List.of("2", "5")) {
            MvcResult result = mockMvc.perform(get("/api/trips/999999/preferences")
                    .header("X-User-Id", userId)).andReturn();
            assertRejected(result, 404, "TRIP_NOT_FOUND");
        }
        MvcResult write = mockMvc.perform(put("/api/trips/999999/preferences")
                        .header("X-User-Id", "2").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"interests\":[\"Art\"]}"))
                .andReturn();
        assertRejected(write, 404, "TRIP_NOT_FOUND");
    }

    // --- catalogue (CAT-1..CAT-4) -----------------------------------------

    @Test
    void acceptsAllSevenInterestsInSubmittedOrder() throws Exception {
        MvcResult result = save(ALL_SEVEN, "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("Art", "Nature", "Culture", "History", "Food", "Shopping", "Adventure"),
                responseInterests(body(result)));
        assertEquals(List.of("art", "nature", "culture", "history", "food", "shopping", "adventure"),
                storedCodes(2));
    }

    @Test
    void rejectsWrongCase() throws Exception {
        assertRejected(save("{\"interests\":[\"art\"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        assertRejected(save("{\"interests\":[\"ART\"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        assertEquals(0, rowCount(2));
    }

    @Test
    void rejectsSurroundingWhitespace() throws Exception {
        assertRejected(save("{\"interests\":[\" Art \"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        assertRejected(save("{\"interests\":[\"Art \"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
    }

    @Test
    void rejectsEmptyStringsAndNearMatches() throws Exception {
        for (String value : List.of("\"\"", "\" \"", "\"teleport\"", "\"foodie\"")) {
            assertRejected(save("{\"interests\":[" + value + "]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        }
        assertEquals(0, rowCount(2));
    }

    // --- save (SAVE-1..SAVE-8) --------------------------------------------

    @Test
    void collapsesDuplicatesKeepingFirstOccurrence() throws Exception {
        MvcResult result = save("{\"interests\":[\"Art\",\"Nature\",\"Art\"]}", "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("Art", "Nature"), responseInterests(body(result)));
        assertEquals(List.of("art", "nature"), storedCodes(2));
        assertEquals(1, rowCount(2));
    }

    @Test
    void repeatingTheSameSetIsIdempotent() throws Exception {
        save("{\"interests\":[\"Art\",\"Nature\"]}", "2");
        String payload = storedPayload(2);
        MvcResult again = save("{\"interests\":[\"Art\",\"Nature\"]}", "2");
        assertEquals(200, again.getResponse().getStatus());
        assertEquals(List.of("Art", "Nature"), responseInterests(body(again)));
        assertEquals(payload, storedPayload(2));
        assertEquals(1, rowCount(2));
    }

    @Test
    void saveReplacesInsteadOfMerging() throws Exception {
        save("{\"interests\":[\"Art\",\"Nature\"]}", "2");
        MvcResult result = save("{\"interests\":[\"Food\"]}", "2");
        assertEquals(List.of("Food"), responseInterests(body(result)));
        assertEquals(List.of("food"), storedCodes(2));
    }

    @Test
    void emptyArrayClearsButKeepsRow() throws Exception {
        save("{\"interests\":[\"Art\",\"Nature\"]}", "2");
        MvcResult result = save("{\"interests\":[]}", "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of(), responseInterests(body(result)));
        assertEquals(1, rowCount(2));
        assertEquals("{\"codes\":[]}", storedPayload(2));
    }

    @Test
    void rejectsUnknownValueWithoutWriting() throws Exception {
        save("{\"interests\":[\"Art\",\"Nature\"]}", "2");
        String payload = storedPayload(2);
        String updatedAt = storedUpdatedAt(2);

        assertRejected(save("{\"interests\":[\"teleportation\"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        assertEquals(payload, storedPayload(2));
        assertEquals(updatedAt, storedUpdatedAt(2));
    }

    @Test
    void rejectsMixedRequestAsWhole() throws Exception {
        save("{\"interests\":[\"Art\",\"Nature\"]}", "2");
        assertRejected(save("{\"interests\":[\"Art\",\"teleportation\"]}", "2"), 400,
                "INTEREST_NOT_ALLOWED");
        assertEquals(List.of("art", "nature"), storedCodes(2));
    }

    @Test
    void firstSaveCreatesExactlyOneRow() throws Exception {
        assertEquals(0, rowCount(2));
        assertEquals(200, save("{\"interests\":[\"Art\"]}", "2").getResponse().getStatus());
        assertEquals(1, rowCount(2));
        assertEquals(1, rowsOfKind("interest"));
    }

    @Test
    void rejectsMalformedBodies() throws Exception {
        assertEquals(200, save("{\"interests\":[\"Art\"]}", "2").getResponse().getStatus());
        String payload = storedPayload(2);

        List<String> bodies = List.of(
                "[\"Art\"]",
                "{\"interest\":[\"Art\"]}",
                "{\"interests\":\"Art\"}",
                "{\"interests\":[null]}",
                "{\"interests\":[42]}",
                "{}");
        for (String malformed : bodies) {
            assertRejected(save(malformed, "2"), 400, "INVALID_REQUEST");
        }
        assertEquals(payload, storedPayload(2));
    }

    // --- read (READ-1..READ-5) --------------------------------------------

    @Test
    void memberReadsBackSavedSet() throws Exception {
        assertEquals(200, save("{\"interests\":[\"Art\",\"Nature\"]}", "2").getResponse().getStatus());
        MvcResult result = read("2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("Art", "Nature"), responseInterests(memberOf(body(result), 2)));
    }

    @Test
    void memberWithoutSavedInterestsReadsEmptyArray() throws Exception {
        JsonNode response = body(read("2"));
        JsonNode chloe = memberOf(response, 3);
        assertNotNull(chloe);
        assertEquals(List.of(), responseInterests(chloe));
    }

    @Test
    void membersDoNotOverwriteEachOther() throws Exception {
        save("{\"interests\":[\"Art\"]}", "2");
        save("{\"interests\":[\"Food\"]}", "3");
        JsonNode response = body(read("2"));
        assertEquals(List.of("Art"), responseInterests(memberOf(response, 2)));
        assertEquals(List.of("Food"), responseInterests(memberOf(response, 3)));
    }

    @Test
    void responseCarriesOnlyAgreedFieldsOrderedByUserId() throws Exception {
        JsonNode response = body(read("2"));
        long previous = 0;
        for (JsonNode member : response.get("members")) {
            List<String> keys = new ArrayList<>();
            member.fieldNames().forEachRemaining(keys::add);
            assertEquals(List.of("userId", "interests"), keys);
            assertTrue(member.get("userId").asLong() > previous);
            previous = member.get("userId").asLong();
        }
        assertEquals(1, response.get("members").get(0).get("userId").asLong());
    }

    @Test
    void readingChangesNothing() throws Exception {
        save("{\"interests\":[\"Art\"]}", "2");
        String payload = storedPayload(2);
        String updatedAt = storedUpdatedAt(2);
        String first = read("2").getResponse().getContentAsString();
        String second = read("2").getResponse().getContentAsString();
        assertEquals(first, second);
        assertEquals(payload, storedPayload(2));
        assertEquals(updatedAt, storedUpdatedAt(2));
    }

    // --- reverse checks (ATDD design section 5) ---------------------------

    @Test
    void extraBodyFieldsAreIgnoredAndOnlyInterestKindIsWritten() throws Exception {
        MvcResult result = save("{\"interests\":[\"Art\"],\"kind\":\"budget\",\"userId\":3}", "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(1, rowsOfKind("interest"));
        assertEquals(0, rowsOfKind("budget"));
        JsonNode response = body(read("2"));
        assertNull(response.get("mustDos"));
        assertNull(response.get("budget"));
        assertEquals(0, rowCount(3));
    }

    @Test
    void savesOnlyTheCallersOwnRow() throws Exception {
        save("{\"interests\":[\"Food\"]}", "3");
        String chloePayload = storedPayload(3);
        save("{\"interests\":[\"Art\"]}", "2");
        assertEquals(chloePayload, storedPayload(3));
        assertEquals(List.of("art"), storedCodes(2));
    }

    @Test
    void emptySaveAddsNoExplicitNoPreferenceFields() throws Exception {
        save("{\"interests\":[]}", "2");
        JsonNode member = memberOf(body(read("2")), 2);
        assertNull(member.get("noPreference"));
        assertNull(member.get("declaredAt"));
        assertNull(member.get("ready"));
        assertNull(member.get("required"));
    }

    @Test
    void savingStillWorksAfterMainPlanConfirmed() throws Exception {
        jdbcClient.sql("UPDATE trip SET main_plan_confirmed = 1 WHERE id = ?")
                .param(seededTripId()).update();
        MvcResult result = save("{\"interests\":[\"Art\"]}", "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("art"), storedCodes(2));
    }

    @Test
    void preferenceCapabilityAddsNoTagOrPlanRoutes() throws Exception {
        mockMvc.perform(get("/api/tags")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(path("/plan"))).andExpect(status().is4xxClientError());
        mockMvc.perform(get(path("/plans"))).andExpect(status().is4xxClientError());
    }

    @Test
    void greetingAndTripWriteRoutesRemainUnchanged() throws Exception {
        mockMvc.perform(get("/api/greeting"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Hello World"));
        mockMvc.perform(put("/api/trips/" + seededTripId()).header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void savedSetSurvivesAReloadOfTheReader() throws Exception {
        save("{\"interests\":[\"Art\",\"Nature\"]}", "2");
        String first = read("2").getResponse().getContentAsString();
        String second = read("2").getResponse().getContentAsString();
        assertEquals(List.of("Art", "Nature"), responseInterests(memberOf(objectMapper.readTree(first), 2)));
        assertEquals(first, second);
        assertFalse(first.isEmpty());
        assertNotEquals(0, storedCodes(2).size());
    }
}
