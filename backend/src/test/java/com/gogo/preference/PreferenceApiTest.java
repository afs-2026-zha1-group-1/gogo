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
import com.gogo.auth.TestAuth;

// REQ-019: US-019 interests; delta scenarios ID-1..5, CAT-1..4, SAVE-1..8, READ-1..5
// plus the API-level reverse checks of the ATDD design section 5. US-066 replaced the
// `X-User-Id` header with the session, so identity comes from TestAuth.asUser here.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:preference-test?mode=memory&cache=shared&foreign_keys=on",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class PreferenceApiTest {

    private static final String ALL_TEN =
            "{\"interests\":[\"水上运动\",\"潜水\",\"摄影\",\"美食\",\"咖啡\",\"历史人文\",\"手作\",\"自然风景\",\"冒险\",\"慢游\"]}";

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
        // A null userId posts only the CSRF token, so anonymous calls stay anonymous.
        return mockMvc.perform(request.with(TestAuth.asUser(userId))).andReturn();
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
        assertRejected(save("{\"interests\":[\"摄影\"]}", null), 401, "USER_REQUIRED");
        assertEquals(0, rowCount(2));
    }

    @Test
    void rejectsAnonymousCallerEvenWhenTheRetiredHeaderIsPresent() throws Exception {
        // US-066 made the session the only identity, so a stale header authenticates nothing.
        MvcResult readResult = mockMvc.perform(get(path("/preferences"))
                .header("X-User-Id", "2")).andReturn();
        assertRejected(readResult, 401, "USER_REQUIRED");
        assertNull(body(readResult).get("members"));

        MvcResult saveResult = mockMvc.perform(put(path("/preferences"))
                        .with(TestAuth.csrfOnly())
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"interests\":[\"摄影\"]}"))
                .andReturn();
        assertRejected(saveResult, 401, "USER_REQUIRED");
        assertEquals(0, rowCount(2));
    }

    @Test
    void ignoresTheRetiredIdentityHeader() throws Exception {
        // The session wins: a conflicting header must not change which member is stored.
        MvcResult result = mockMvc.perform(put(path("/preferences"))
                        .with(TestAuth.asUser("2"))
                        .header("X-User-Id", "5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"interests\":[\"摄影\"]}"))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus());
        assertNotNull(storedPayload(2));
        assertNull(storedPayload(5));
    }

    @Test
    void deniesNonMemberWithoutLeakingInterests() throws Exception {
        assertEquals(200, save("{\"interests\":[\"摄影\"]}", "2").getResponse().getStatus());
        String before = storedPayload(2);

        MvcResult readResult = read("5");
        assertRejected(readResult, 403, "NOT_A_MEMBER");
        assertNull(body(readResult).get("members"));

        MvcResult saveResult = save("{\"interests\":[\"摄影\"]}", "5");
        assertRejected(saveResult, 403, "NOT_A_MEMBER");
        assertEquals(0, rowCount(5));
        assertEquals(before, storedPayload(2));
    }

    @Test
    void reportsUnknownTripBeforeMembership() throws Exception {
        for (String userId : List.of("2", "5")) {
            MvcResult result = mockMvc.perform(get("/api/trips/999999/preferences")
                    .with(TestAuth.asUser(userId))).andReturn();
            assertRejected(result, 404, "TRIP_NOT_FOUND");
        }
        MvcResult write = mockMvc.perform(put("/api/trips/999999/preferences")
                        .with(TestAuth.asUser("2")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"interests\":[\"摄影\"]}"))
                .andReturn();
        assertRejected(write, 404, "TRIP_NOT_FOUND");
    }

    // --- catalogue (CAT-1..CAT-4) -----------------------------------------

    @Test
    void acceptsAllTenInterestsInSubmittedOrder() throws Exception {
        MvcResult result = save(ALL_TEN, "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("水上运动", "潜水", "摄影", "美食", "咖啡", "历史人文", "手作",
                "自然风景", "冒险", "慢游"), responseInterests(body(result)));
        assertEquals(List.of("water", "diving", "photo", "food", "coffee", "heritage", "craft",
                "nature", "adventure", "slow"), storedCodes(2));
    }

    @Test
    void rejectsEnglishLabelsAndCaseVariants() throws Exception {
        for (String value : List.of("\"Art\"", "\"art\"", "\"ART\"", "\"Food\"", "\"Water\"")) {
            assertRejected(save("{\"interests\":[" + value + "]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        }
        assertEquals(0, rowCount(2));
    }

    @Test
    void rejectsSurroundingWhitespace() throws Exception {
        assertRejected(save("{\"interests\":[\" 潜水 \"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        assertRejected(save("{\"interests\":[\"潜水 \"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
    }

    @Test
    void rejectsEmptyStringsAndNearMatches() throws Exception {
        for (String value : List.of("\"\"", "\" \"", "\"浮潜\"", "\"美食家\"")) {
            assertRejected(save("{\"interests\":[" + value + "]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        }
        assertEquals(0, rowCount(2));
    }

    // --- save (SAVE-1..SAVE-8) --------------------------------------------

    @Test
    void collapsesDuplicatesKeepingFirstOccurrence() throws Exception {
        MvcResult result = save("{\"interests\":[\"摄影\",\"自然风景\",\"摄影\"]}", "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("摄影", "自然风景"), responseInterests(body(result)));
        assertEquals(List.of("photo", "nature"), storedCodes(2));
        assertEquals(1, rowCount(2));
    }

    @Test
    void repeatingTheSameSetIsIdempotent() throws Exception {
        save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2");
        String payload = storedPayload(2);
        MvcResult again = save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2");
        assertEquals(200, again.getResponse().getStatus());
        assertEquals(List.of("摄影", "自然风景"), responseInterests(body(again)));
        assertEquals(payload, storedPayload(2));
        assertEquals(1, rowCount(2));
    }

    @Test
    void saveReplacesInsteadOfMerging() throws Exception {
        save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2");
        MvcResult result = save("{\"interests\":[\"美食\"]}", "2");
        assertEquals(List.of("美食"), responseInterests(body(result)));
        assertEquals(List.of("food"), storedCodes(2));
    }

    @Test
    void emptyArrayClearsButKeepsRow() throws Exception {
        save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2");
        MvcResult result = save("{\"interests\":[]}", "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of(), responseInterests(body(result)));
        assertEquals(1, rowCount(2));
        assertEquals("{\"codes\":[]}", storedPayload(2));
    }

    @Test
    void rejectsUnknownValueWithoutWriting() throws Exception {
        save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2");
        String payload = storedPayload(2);
        String updatedAt = storedUpdatedAt(2);

        assertRejected(save("{\"interests\":[\"蹦极\"]}", "2"), 400, "INTEREST_NOT_ALLOWED");
        assertEquals(payload, storedPayload(2));
        assertEquals(updatedAt, storedUpdatedAt(2));
    }

    @Test
    void rejectsMixedRequestAsWhole() throws Exception {
        save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2");
        assertRejected(save("{\"interests\":[\"摄影\",\"蹦极\"]}", "2"), 400,
                "INTEREST_NOT_ALLOWED");
        assertEquals(List.of("photo", "nature"), storedCodes(2));
    }

    @Test
    void firstSaveCreatesExactlyOneRow() throws Exception {
        assertEquals(0, rowCount(2));
        assertEquals(200, save("{\"interests\":[\"摄影\"]}", "2").getResponse().getStatus());
        assertEquals(1, rowCount(2));
        assertEquals(1, rowsOfKind("interest"));
    }

    @Test
    void rejectsMalformedBodies() throws Exception {
        assertEquals(200, save("{\"interests\":[\"摄影\"]}", "2").getResponse().getStatus());
        String payload = storedPayload(2);

        List<String> bodies = List.of(
                "[\"摄影\"]",
                "{\"interest\":[\"摄影\"]}",
                "{\"interests\":\"摄影\"}",
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
        assertEquals(200, save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2").getResponse().getStatus());
        MvcResult result = read("2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("摄影", "自然风景"), responseInterests(memberOf(body(result), 2)));
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
        save("{\"interests\":[\"摄影\"]}", "2");
        save("{\"interests\":[\"美食\"]}", "3");
        JsonNode response = body(read("2"));
        assertEquals(List.of("摄影"), responseInterests(memberOf(response, 2)));
        assertEquals(List.of("美食"), responseInterests(memberOf(response, 3)));
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
        save("{\"interests\":[\"摄影\"]}", "2");
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
        MvcResult result = save("{\"interests\":[\"摄影\"],\"kind\":\"budget\",\"userId\":3}", "2");
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
        save("{\"interests\":[\"美食\"]}", "3");
        String chloePayload = storedPayload(3);
        save("{\"interests\":[\"摄影\"]}", "2");
        assertEquals(chloePayload, storedPayload(3));
        assertEquals(List.of("photo"), storedCodes(2));
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
        MvcResult result = save("{\"interests\":[\"摄影\"]}", "2");
        assertEquals(200, result.getResponse().getStatus());
        assertEquals(List.of("photo"), storedCodes(2));
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
        // US-003 adds the trip full-form PUT; the preferences capability does not own it,
        // so an empty body is still rejected by the trip validation (400), never handled here.
        mockMvc.perform(put("/api/trips/" + seededTripId()).with(TestAuth.asUser("1"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void savedSetSurvivesAReloadOfTheReader() throws Exception {
        save("{\"interests\":[\"摄影\",\"自然风景\"]}", "2");
        String first = read("2").getResponse().getContentAsString();
        String second = read("2").getResponse().getContentAsString();
        assertEquals(List.of("摄影", "自然风景"), responseInterests(memberOf(objectMapper.readTree(first), 2)));
        assertEquals(first, second);
        assertFalse(first.isEmpty());
        assertNotEquals(0, storedCodes(2).size());
    }
}
