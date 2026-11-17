package com.gogo.preference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.util.ArrayList;
import java.util.List;

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

// REQ-020 P4 red-first acceptance checks for GET/PUT /api/trips/{tripId}/preferences/must-dos.
// Rows are the signed delta's 25 API scenarios, named after the ATDD design table
// (MDS-1..MDS-19 save, MDR-1..MDR-6 read) plus the API-level reverse rows of ATDD §5 and the
// reused identity gate (USER_REQUIRED / TRIP_NOT_FOUND / NOT_A_MEMBER from the Living Spec).
// P3-4: own test class on its own in-memory database (`mustdo-test`); PreferenceApiTest and
// MainPlanApiTest stay untouched. Identity comes from the session (TestAuth); the retired
// X-User-Id header only appears as a stale-input reverse check.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:mustdo-test?mode=memory&cache=shared&foreign_keys=on",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class MustDoApiTest {

    private static final String BEN = "2";
    private static final String CHLOE = "3";
    private static final String NG_ACTIVITY = "National Gallery Singapore visit";
    private static final String NG_LOCATION = "National Gallery Singapore";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void clearPreferences() {
        // Also removes the V5 `must_do` and `interest` seeds (P3-3): every case starts clean.
        jdbcClient.sql("DELETE FROM member_preference").update();
    }

    // --- helpers ----------------------------------------------------------

    private long seededTripId() {
        return jdbcClient.sql("SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'")
                .query(Long.class).single();
    }

    private String path(String suffix) {
        return "/api/trips/" + seededTripId() + suffix;
    }

    private MvcResult saveMustDos(String body, String userId) throws Exception {
        return perform(put(path("/preferences/must-dos")), body, userId);
    }

    private MvcResult readMustDos(String userId) throws Exception {
        return perform(get(path("/preferences/must-dos")), null, userId);
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

    private static String items(String... itemJson) {
        return "{\"items\":[" + String.join(",", itemJson) + "]}";
    }

    /** The one-item save body used by most scenarios: an add without an id. */
    private static String oneItem(String activity, String location, String time) {
        List<String> fields = new ArrayList<>();
        fields.add("\"activity\":\"" + activity + "\"");
        if (location != null) {
            fields.add("\"location\":\"" + location + "\"");
        }
        if (time != null) {
            fields.add("\"time\":\"" + time + "\"");
        }
        return items("{" + String.join(",", fields) + "}");
    }

    private JsonNode responseItems(MvcResult result) throws Exception {
        return body(result).get("items");
    }

    private JsonNode memberNode(JsonNode response, long userId) {
        for (JsonNode member : response.get("members")) {
            if (member.get("userId").asLong() == userId) {
                return member;
            }
        }
        return null;
    }

    private String storedPayload(String userId) {
        return jdbcClient.sql("SELECT payload FROM member_preference "
                        + "WHERE trip_id = ? AND user_id = ? AND kind = 'must_do'")
                .params(seededTripId(), Long.parseLong(userId)).query(String.class).optional().orElse(null);
    }

    private String storedUpdatedAt(String userId) {
        return jdbcClient.sql("SELECT updated_at FROM member_preference "
                        + "WHERE trip_id = ? AND user_id = ? AND kind = 'must_do'")
                .params(seededTripId(), Long.parseLong(userId)).query(String.class).optional().orElse(null);
    }

    private JsonNode storedItems(String userId) {
        String payload = storedPayload(userId);
        assertNotNull(payload, "expected a stored must_do payload for user " + userId);
        try {
            return objectMapper.readTree(payload).get("items");
        } catch (Exception cause) {
            throw new IllegalStateException("payload is not readable JSON: " + payload, cause);
        }
    }

    private long mustDoRows(String userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM member_preference "
                        + "WHERE trip_id = ? AND user_id = ? AND kind = 'must_do'")
                .params(seededTripId(), Long.parseLong(userId)).query(Long.class).single();
    }

    private long rowsOfKind(String kind) {
        return jdbcClient.sql("SELECT COUNT(*) FROM member_preference WHERE kind = ?")
                .param(kind).query(Long.class).single();
    }

    private void assertRejected(MvcResult result, int status, String code) throws Exception {
        assertEquals(status, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        assertEquals(code, body(result).get("code").asText());
    }

    private static List<String> keySet(JsonNode node) {
        List<String> keys = new ArrayList<>();
        node.fieldNames().forEachRemaining(keys::add);
        java.util.Collections.sort(keys);
        return keys;
    }

    /** Asserts no node in this items array carries the storage-only `name` mirror. */
    private static void assertNoMirrorKey(JsonNode items) {
        for (JsonNode item : items) {
            assertFalse(item.has("name"), "response item leaked the storage mirror: " + item);
        }
    }

    // --- save: replace semantics (MDS-1..MDS-9) ----------------------------

    // MDS-1: An item is added and read back.
    @Test
    void addItemIsReturnedWithServerIssuedIdAndStored() throws Exception {
        MvcResult result = saveMustDos(oneItem(NG_ACTIVITY, NG_LOCATION, "10:00"), BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        JsonNode items = responseItems(result);
        assertEquals(1, items.size());
        JsonNode item = items.get(0);
        assertTrue(item.get("id").isIntegralNumber(), "id must be an integer: " + item);
        assertEquals(NG_ACTIVITY, item.get("activity").asText());
        assertEquals(NG_LOCATION, item.get("location").asText());
        assertEquals("10:00", item.get("time").asText());

        assertEquals(1, mustDoRows(BEN));
        JsonNode stored = storedItems(BEN);
        assertEquals(1, stored.size());
        assertEquals(item.get("id").asLong(), stored.get(0).get("id").asLong());
    }

    // MDS-2: An edit keeps the same item.
    @Test
    void editKeepsTheSameIdAndUpdatesInPlace() throws Exception {
        long id = responseItems(saveMustDos(oneItem(NG_ACTIVITY, NG_LOCATION, "10:00"), BEN))
                .get(0).get("id").asLong();

        MvcResult result = saveMustDos(items("{\"id\":" + id + ",\"activity\":\"" + NG_ACTIVITY
                + "\",\"location\":\"" + NG_LOCATION + "\",\"time\":\"10:30\"}"), BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        JsonNode items = responseItems(result);
        assertEquals(1, items.size());
        assertEquals(id, items.get(0).get("id").asLong());
        assertEquals("10:30", items.get(0).get("time").asText());
        assertEquals(1, storedItems(BEN).size());
    }

    // MDS-3: An item missing from the request is deleted; omission is the only delete path.
    @Test
    void omittingAnItemDeletesIt() throws Exception {
        saveMustDos(items("{\"activity\":\"Museum\",\"location\":\"National Museum\"},"
                + "{\"activity\":\"Zoo\",\"location\":\"Singapore Zoo\"}"), BEN);

        JsonNode kept = responseItems(saveMustDos(items("{\"id\":1,\"activity\":\"Museum\","
                + "\"location\":\"National Museum\"}"), BEN));
        assertEquals(1, kept.size());
        assertEquals(1, kept.get(0).get("id").asLong());

        JsonNode stored = storedItems(BEN);
        assertEquals(1, stored.size());
        assertEquals("Museum", stored.get(0).get("activity").asText());

        JsonNode after = memberNode(body(readMustDos(CHLOE)), 2).get("mustDos");
        assertEquals(1, after.size());
        assertEquals(1, after.get(0).get("id").asLong());
    }

    // MDS-4: An empty list clears the list but keeps the record.
    @Test
    void emptyListClearsItemsButKeepsTheRow() throws Exception {
        saveMustDos(items("{\"activity\":\"Museum\",\"location\":\"National Museum\"},"
                + "{\"activity\":\"Zoo\",\"location\":\"Singapore Zoo\"}"), BEN);

        MvcResult result = saveMustDos("{\"items\":[]}", BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode response = body(result);
        assertEquals(List.of("items"), keySet(response));
        assertTrue(response.get("items").isArray());
        assertEquals(0, response.get("items").size());

        assertEquals(1, mustDoRows(BEN), "the row must survive the clear");
        assertEquals(0, storedItems(BEN).size());
    }

    // MDS-5: Items keep the submitted order (C2).
    @Test
    void itemsKeepTheSubmittedOrder() throws Exception {
        MvcResult saved = saveMustDos(items(
                "{\"activity\":\"A\",\"location\":\"La\"}",
                "{\"activity\":\"B\",\"location\":\"Lb\"}",
                "{\"activity\":\"C\",\"location\":\"Lc\"}"), BEN);
        assertEquals(List.of("A", "B", "C"), activities(responseItems(saved)));

        JsonNode readBack = memberNode(body(readMustDos(BEN)), 2).get("mustDos");
        assertEquals(List.of("A", "B", "C"), activities(readBack));

        long idB = readBack.get(1).get("id").asLong();
        MvcResult edited = saveMustDos(items(
                "{\"id\":1,\"activity\":\"A\",\"location\":\"La\"}",
                "{\"id\":" + idB + ",\"activity\":\"B\",\"location\":\"Lb\",\"time\":\"12:00\"}",
                "{\"id\":3,\"activity\":\"C\",\"location\":\"Lc\"}"), BEN);
        assertEquals(List.of("A", "B", "C"), activities(responseItems(edited)));
    }

    // MDS-6: Item ids are list-local and may be reassigned (C1).
    @Test
    void clearedListRestartsIdsAtOne() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        saveMustDos("{\"items\":[]}", BEN);

        JsonNode items = responseItems(saveMustDos(oneItem("Zoo", "Singapore Zoo", null), BEN));
        assertEquals(1, items.get(0).get("id").asLong());
    }

    // MDS-7: A location or a time alone is enough; the absent field reads back as null (C4).
    @Test
    void locationOrTimeAloneIsEnough() throws Exception {
        MvcResult result = saveMustDos(items(
                "{\"activity\":\"Only place\",\"location\":\"Merlion Park\"}",
                "{\"activity\":\"Only time\",\"time\":\"18:00\"}"), BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        JsonNode items = responseItems(result);
        assertTrue(items.get(0).get("time").isNull(), "location-only item must read time as null");
        assertTrue(items.get(1).get("location").isNull(), "time-only item must read location as null");
    }

    // MDS-8: Both location and time may be saved together (C5, overrides the screen's 二选一).
    @Test
    void locationAndTimeMayBeSavedTogether() throws Exception {
        MvcResult result = saveMustDos(oneItem(NG_ACTIVITY, NG_LOCATION, "10:00"), BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        JsonNode item = responseItems(result).get(0);
        assertEquals(NG_LOCATION, item.get("location").asText());
        assertEquals("10:00", item.get("time").asText());
        JsonNode stored = storedItems(BEN).get(0);
        assertEquals(NG_LOCATION, stored.get("location").asText());
        assertEquals("10:00", stored.get("time").asText());
    }

    // MDS-9: Whitespace is trimmed and blank optional fields become null.
    @Test
    void whitespaceIsTrimmedAndBlankOptionalFieldsBecomeNull() throws Exception {
        MvcResult result = saveMustDos(items(
                "{\"activity\":\"  Museum  \",\"location\":\"   \",\"time\":\" 10:00 \"}"), BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        JsonNode item = responseItems(result).get(0);
        assertEquals("Museum", item.get("activity").asText());
        assertTrue(item.get("location").isNull(), "blank location must normalise to null");
        assertEquals("10:00", item.get("time").asText());

        JsonNode stored = storedItems(BEN).get(0);
        assertEquals("Museum", stored.get("activity").asText());
        assertTrue(stored.get("location").isNull());
        assertEquals("10:00", stored.get("time").asText());
    }

    // --- save: validation order and zero-write (MDS-10..MDS-16) ------------

    // MDS-10: A missing activity rejects the whole request (step 3, before steps 4-7).
    @Test
    void missingActivityRejectsWholeRequestWithoutWriting() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        String payload = storedPayload(BEN);
        String updatedAt = storedUpdatedAt(BEN);

        assertRejected(saveMustDos(items("{\"location\":\"Somewhere\"}"), BEN),
                400, "MUST_DO_ACTIVITY_REQUIRED");
        assertRejected(saveMustDos(items("{\"activity\":\"\",\"location\":\"Somewhere\"}"), BEN),
                400, "MUST_DO_ACTIVITY_REQUIRED");
        assertRejected(saveMustDos(items("{\"activity\":\"   \"}"), BEN),
                400, "MUST_DO_ACTIVITY_REQUIRED");

        assertEquals(payload, storedPayload(BEN));
        assertEquals(updatedAt, storedUpdatedAt(BEN));
    }

    // MDS-11: An item without a location and without a time is rejected (step 4).
    @Test
    void itemWithoutLocationAndTimeIsRejected() throws Exception {
        assertRejected(saveMustDos(items("{\"activity\":\"Museum\"}"), BEN),
                400, "MUST_DO_PLACE_OR_TIME_REQUIRED");
        assertRejected(saveMustDos(items("{\"activity\":\"Museum\",\"location\":\"   \"}"), BEN),
                400, "MUST_DO_PLACE_OR_TIME_REQUIRED");
        assertEquals(0, mustDoRows(BEN), "rejection must not write");
    }

    // MDS-12: A malformed time is rejected (step 5, over all six listed values).
    @Test
    void malformedTimesAreRejectedOneByOne() throws Exception {
        for (String time : List.of("10:0", "10:00:00", "25:00", "10am", "1 0:00", "24:00")) {
            assertRejected(saveMustDos(oneItem("Museum", "National Museum", time), BEN),
                    400, "MUST_DO_TIME_INVALID");
        }
        assertEquals(0, mustDoRows(BEN), "rejection must not write");
    }

    // MDS-13: An unknown or foreign item id rejects the whole request (step 7; foreign = unknown).
    @Test
    void foreignItemIdIsUnknownAndNobodyIsWritten() throws Exception {
        saveMustDos(oneItem("Gardens by the Bay", "Gardens by the Bay", null), CHLOE);
        String chloeBefore = storedPayload(CHLOE);

        assertRejected(saveMustDos(items("{\"id\":1,\"activity\":\"Museum\","
                + "\"location\":\"National Museum\"}"), BEN), 400, "MUST_DO_ITEM_UNKNOWN");

        assertEquals(0, mustDoRows(BEN), "Ben owns no item with that id");
        assertEquals(chloeBefore, storedPayload(CHLOE), "Chloe's list must be untouched");
    }

    // MDS-14: A duplicated id in one request is rejected (step 6 runs before step 7).
    @Test
    void duplicatedIdInOneRequestIsRejected() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        String payload = storedPayload(BEN);

        assertRejected(saveMustDos(items(
                "{\"id\":1,\"activity\":\"Museum\",\"location\":\"National Museum\"}",
                "{\"id\":1,\"activity\":\"Zoo\",\"location\":\"Singapore Zoo\"}"), BEN),
                400, "MUST_DO_ITEM_DUPLICATE_ID");
        assertEquals(payload, storedPayload(BEN));
    }

    // MDS-15: A mixed request is rejected as a whole; the valid item is not stored either.
    @Test
    void mixedRequestIsRejectedAsAWhole() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        String payload = storedPayload(BEN);

        assertRejected(saveMustDos(items(
                "{\"activity\":\"Marina Bay Sands\",\"location\":\"Marina Bay\",\"time\":\"09:00\"}",
                "{\"activity\":\"River Woks\",\"time\":\"9:00\"}"), BEN),
                400, "MUST_DO_TIME_INVALID");
        assertEquals(payload, storedPayload(BEN));
        assertEquals(1, storedItems(BEN).size());
        assertEquals("Museum", storedItems(BEN).get(0).get("activity").asText());
    }

    // MDS-16: A malformed body is rejected (steps 1-2 answer INVALID_REQUEST, not the MUST_DO codes).
    @Test
    void malformedBodiesAllAnswerInvalidRequest() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        String payload = storedPayload(BEN);

        for (String bad : List.of(
                "[1,2]",                                     // bare array
                "{}",                                        // items missing
                "{\"items\":null}",                          // items null
                "{\"items\":{\"0\":\"Museum\"}}",            // items as an object
                "{\"items\":[3]}",                           // item is not an object
                "{\"items\":[{\"id\":\"1\",\"activity\":\"Museum\","
                        + "\"location\":\"National Museum\"}]}")) { // string id
            assertRejected(saveMustDos(bad, BEN), 400, "INVALID_REQUEST");
        }
        assertEquals(payload, storedPayload(BEN), "saved items must be unchanged");
    }

    // --- save: idempotence, single row, storage mirror (MDS-17..MDS-19) ----

    // MDS-17: Repeating the same list is idempotent. "The same list" is Ben's current list, so
    // the request carries the server-issued ids; resubmitting it changes nothing (MD8).
    @Test
    void repeatingTheSameListIsIdempotent() throws Exception {
        JsonNode seeded = responseItems(saveMustDos(items(
                "{\"activity\":\"Museum\",\"location\":\"National Museum\"}",
                "{\"activity\":\"Zoo\",\"location\":\"Singapore Zoo\"}"), BEN));
        String list = items(
                "{\"id\":" + seeded.get(0).get("id").asLong()
                        + ",\"activity\":\"Museum\",\"location\":\"National Museum\"}",
                "{\"id\":" + seeded.get(1).get("id").asLong()
                        + ",\"activity\":\"Zoo\",\"location\":\"Singapore Zoo\"}");
        MvcResult first = saveMustDos(list, BEN);
        String payload = storedPayload(BEN);
        MvcResult second = saveMustDos(list, BEN);

        assertEquals(200, second.getResponse().getStatus());
        assertEquals(first.getResponse().getContentAsString(), second.getResponse().getContentAsString(),
                "both responses must be byte-identical");
        assertEquals(payload, storedPayload(BEN), "stored ids, order and payload must be unchanged");
    }

    // MDS-18: The first save creates exactly one row.
    @Test
    void firstSaveCreatesExactlyOneRow() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        assertEquals(1, mustDoRows(BEN));
    }

    // MDS-19: The stored payload mirrors the activity under `name` on create AND edit (R4),
    // while neither response carries the key.
    @Test
    void storedPayloadMirrorsActivityUnderNameAfterCreateAndEdit() throws Exception {
        MvcResult created = saveMustDos(oneItem(NG_ACTIVITY, NG_LOCATION, "10:00"), BEN);
        assertEquals(200, created.getResponse().getStatus());
        assertNoMirrorKey(responseItems(created));
        JsonNode storedCreate = storedItems(BEN).get(0);
        assertEquals(storedCreate.get("activity").asText(), storedCreate.get("name").asText());

        long id = storedCreate.get("id").asLong();
        MvcResult edited = saveMustDos(items("{\"id\":" + id + ",\"activity\":\"Night visit\","
                + "\"location\":\"" + NG_LOCATION + "\"}"), BEN);
        assertEquals(200, edited.getResponse().getStatus());
        assertNoMirrorKey(responseItems(edited));
        JsonNode storedEdit = storedItems(BEN).get(0);
        assertEquals("Night visit", storedEdit.get("activity").asText());
        assertEquals(storedEdit.get("activity").asText(), storedEdit.get("name").asText(),
                "the mirror must follow the edit, not only the create");
    }

    // --- read (MDR-1..MDR-6) ------------------------------------------------

    private static List<String> activities(JsonNode items) {
        List<String> values = new ArrayList<>();
        items.forEach(item -> values.add(item.get("activity").asText()));
        return values;
    }

    // MDR-1: A member reads back the saved list; the fields equal the save response.
    @Test
    void memberReadsBackTheSavedList() throws Exception {
        JsonNode saved = responseItems(saveMustDos(oneItem(NG_ACTIVITY, NG_LOCATION, "10:00"), BEN))
                .get(0);

        JsonNode read = memberNode(body(readMustDos(CHLOE)), 2).get("mustDos").get(0);
        assertEquals(saved.get("id").asLong(), read.get("id").asLong());
        assertEquals(saved.get("activity").asText(), read.get("activity").asText());
        assertEquals(saved.get("location").asText(), read.get("location").asText());
        assertEquals(saved.get("time").asText(), read.get("time").asText());
    }

    // MDR-2: A member without saved items reads an empty array; no member is omitted.
    @Test
    void memberWithoutItemsReadsEmptyArray() throws Exception {
        JsonNode response = body(readMustDos(BEN));
        JsonNode chloe = memberNode(response, 3);
        assertNotNull(chloe, "Chloe must appear even though she never saved");
        assertTrue(chloe.get("mustDos").isArray());
        assertEquals(0, chloe.get("mustDos").size());
        // Every seeded member (1-4) is listed, none omitted.
        assertEquals(4, response.get("members").size());
    }

    // MDR-3: Members do not overwrite each other; the two id spaces are unrelated.
    @Test
    void membersDoNotOverwriteEachOther() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        saveMustDos(oneItem("Gardens by the Bay", "Gardens by the Bay", null), CHLOE);

        JsonNode response = body(readMustDos(BEN));
        JsonNode ben = memberNode(response, 2).get("mustDos");
        JsonNode chloe = memberNode(response, 3).get("mustDos");
        assertEquals(List.of("Museum"), activities(ben));
        assertEquals(List.of("Gardens by the Bay"), activities(chloe));
        // Both lists started at 1: ids are list-local and carry no cross-member meaning (C1).
        assertEquals(1, ben.get(0).get("id").asLong());
        assertEquals(1, chloe.get(0).get("id").asLong());
    }

    // MDR-4: The response carries only the agreed fields, ordered by ascending user id.
    @Test
    void responseCarriesOnlyTheAgreedFieldsOrderedByUserId() throws Exception {
        saveMustDos(oneItem(NG_ACTIVITY, NG_LOCATION, "10:00"), BEN);
        saveMustDos(oneItem("Zoo", "Singapore Zoo", null), CHLOE);

        JsonNode response = body(readMustDos(BEN));
        List<Long> userIds = new ArrayList<>();
        response.get("members").forEach(member -> {
            assertEquals(List.of("mustDos", "userId"), keySet(member));
            userIds.add(member.get("userId").asLong());
            member.get("mustDos").forEach(item ->
                    assertEquals(List.of("activity", "id", "location", "time"), keySet(item)));
        });
        assertEquals(List.of(1L, 2L, 3L, 4L), userIds);
    }

    // MDR-5: The storage mirror never reaches a response, while the merged main-plan reader
    // still sees the activity (R4's positive counterpart).
    @Test
    void storageMirrorNeverReachesAResponseButTheMergedReaderSeesIt() throws Exception {
        String activity = "Marina Bay Sands promenade";
        saveMustDos(oneItem(activity, "Marina Bay Sands", "19:00"), BEN);

        JsonNode response = body(readMustDos(CHLOE));
        response.get("members").forEach(member -> assertNoMirrorKey(member.get("mustDos")));

        MvcResult inputs = perform(get("/api/trips/" + seededTripId() + "/main-plan/inputs"), null, BEN);
        assertEquals(200, inputs.getResponse().getStatus(), inputs.getResponse().getContentAsString());
        List<String> mustDo = new ArrayList<>();
        body(inputs).get("mustDo").forEach(value -> mustDo.add(value.asText()));
        assertTrue(mustDo.contains(activity),
                "the merged reader keys on `name`, so the mirror must list the activity: " + mustDo);
    }

    // MDR-6: Reading changes nothing - identical responses and an untouched row.
    @Test
    void readingChangesNothing() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);

        MvcResult first = readMustDos(BEN);
        String payload = storedPayload(BEN);
        String updatedAt = storedUpdatedAt(BEN);
        MvcResult second = readMustDos(BEN);

        assertEquals(first.getResponse().getContentAsString(), second.getResponse().getContentAsString());
        assertEquals(payload, storedPayload(BEN));
        assertEquals(updatedAt, storedUpdatedAt(BEN));
    }

    // --- API-level reverse rows of ATDD §5 ---------------------------------

    // Non-goal REQ-024: an extra body-level "kind" is ignored; only must_do rows appear.
    @Test
    void extraKindFieldIsIgnoredAndNoBudgetRowOrKeyAppears() throws Exception {
        MvcResult result = perform(put(path("/preferences/must-dos")),
                "{\"items\":[{\"activity\":\"Museum\",\"location\":\"National Museum\"}],"
                        + "\"kind\":\"budget\"}", BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        assertEquals(1, mustDoRows(BEN));
        assertEquals(0, rowsOfKind("budget"));
        assertFalse(body(result).has("budget"));
        assertFalse(body(readMustDos(BEN)).has("budget"));
    }

    // Non-goal OQ-12: an extra item-level "date" is ignored, not stored and not returned.
    @Test
    void extraDateFieldOnAnItemIsIgnored() throws Exception {
        MvcResult result = perform(put(path("/preferences/must-dos")),
                "{\"items\":[{\"activity\":\"Museum\",\"location\":\"National Museum\","
                        + "\"date\":\"2026-12-05\"}]}", BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        assertFalse(responseItems(result).get(0).has("date"));
        assertFalse(storedItems(BEN).get(0).has("date"));
    }

    // Non-goal C3: no count limit, no length limit, no activity+location dedup.
    @Test
    void noCountLengthOrDedupLimitsApply() throws Exception {
        String longActivity = "L".repeat(300);
        MvcResult result = saveMustDos(items(
                "{\"activity\":\"Museum\",\"location\":\"National Museum\"}",
                "{\"activity\":\"Museum\",\"location\":\"National Museum\"}",
                "{\"activity\":\"" + longActivity + "\",\"location\":\"Somewhere\"}"), BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        assertEquals(3, responseItems(result).size());
        assertEquals(3, storedItems(BEN).size());
        assertEquals(longActivity, storedItems(BEN).get(2).get("activity").asText());
    }

    // Only the caller's own list is writable: a body-level "userId" is ignored (session wins).
    @Test
    void bodyLevelUserIdCannotRedirectTheWrite() throws Exception {
        saveMustDos(oneItem("Gardens by the Bay", "Gardens by the Bay", null), CHLOE);
        String chloeBefore = storedPayload(CHLOE);

        MvcResult result = perform(put(path("/preferences/must-dos")),
                "{\"items\":[{\"activity\":\"Museum\",\"location\":\"National Museum\"}],"
                        + "\"userId\":3}", BEN);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        assertEquals(1, mustDoRows(BEN), "the write lands in Ben's own row");
        assertEquals(chloeBefore, storedPayload(CHLOE), "Chloe's payload must be byte-identical");
    }

    // The interest contract is unchanged: same paths, same payload and response shapes,
    // and no mustDos key leaks into it.
    @Test
    void interestContractStaysUnchanged() throws Exception {
        MvcResult saved = perform(put(path("/preferences")), "{\"interests\":[\"摄影\"]}", BEN);
        assertEquals(200, saved.getResponse().getStatus(), saved.getResponse().getContentAsString());
        assertEquals(List.of("interests"), keySet(body(saved)));

        JsonNode response = body(perform(get(path("/preferences")), null, BEN));
        response.get("members").forEach(member -> {
            assertEquals(List.of("interests", "userId"), keySet(member));
            assertFalse(member.has("mustDos"));
        });
        String payload = jdbcClient.sql("SELECT payload FROM member_preference "
                        + "WHERE trip_id = ? AND user_id = ? AND kind = 'interest'")
                .params(seededTripId(), 2).query(String.class).single();
        assertTrue(payload.startsWith("{\"codes\":["), "interests stay code-list payloads: " + payload);
    }

    // No "save all": saving interests never touches the must_do rows.
    @Test
    void interestSaveLeavesMustDoRowsByteIdentical() throws Exception {
        saveMustDos(oneItem("Museum", "National Museum", null), BEN);
        String payload = storedPayload(BEN);
        String updatedAt = storedUpdatedAt(BEN);

        assertEquals(200, perform(put(path("/preferences")), "{\"interests\":[\"摄影\"]}", BEN)
                .getResponse().getStatus());
        assertEquals(payload, storedPayload(BEN));
        assertEquals(updatedAt, storedUpdatedAt(BEN));
    }

    // Non-goal REQ-026: no readiness gating or required-preference keys in the GET.
    @Test
    void getCarriesNoReadinessOrRequiredKeys() throws Exception {
        JsonNode response = body(readMustDos(BEN));
        assertEquals(List.of("members"), keySet(response));
        response.get("members").forEach(member -> assertFalse(member.has("ready")));
    }

    // The reused identity gate (Living Spec preconditions, PAGE-17's API half): one gate for
    // both kinds, written once via PreferenceController.caller(...).
    @Test
    void gateIsReusedForBothEndpoints() throws Exception {
        assertRejected(readMustDos(null), 401, "USER_REQUIRED");
        assertRejected(saveMustDos(oneItem("Museum", "National Museum", null), null),
                401, "USER_REQUIRED");
        assertRejected(readMustDos("5"), 403, "NOT_A_MEMBER");
        assertRejected(saveMustDos(oneItem("Museum", "National Museum", null), "5"),
                403, "NOT_A_MEMBER");

        assertRejected(perform(get("/api/trips/999/preferences/must-dos"), null, BEN),
                404, "TRIP_NOT_FOUND");
        assertRejected(perform(put("/api/trips/999/preferences/must-dos"),
                oneItem("Museum", "National Museum", null), BEN), 404, "TRIP_NOT_FOUND");

        assertEquals(0, rowsOfKind("must_do"), "rejected calls must not write any row");
    }
}
