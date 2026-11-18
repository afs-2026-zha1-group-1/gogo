package com.gogo.preference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

/**
 * US-045 follow-up: the members page roster projection and organizing reads/writes of another member's preferences.
 * Fixtures are the V2 seed: trip 1 organizer = Alice (1), members Alice..Daniel, Eve (5) outside the trip.
 */
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:member-preference-test?mode=memory&cache=shared&foreign_keys=on",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class MemberPreferenceApiTest {

    private static final String ALICE = "1";
    private static final String BEN = "2";
    private static final String CHLOE = "3";
    private static final String EVE = "5";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void clearPreferences() {
        jdbcClient.sql("DELETE FROM member_preference").update();
    }

    @Test
    @DisplayName("profiles_listEveryoneWithInterestsBudgetAndEditableFlags")
    void profiles_listEveryoneWithInterestsBudgetAndEditableFlags() throws Exception {
        saveInterests(ALICE, null, "{\"interests\":[\"美食\",\"摄影\"]}");
        saveBudget(ALICE, BEN, "{\"amount\":800,\"currency\":\"CNY\",\"limitType\":\"soft\"}");

        JsonNode organizerView = body(perform(get(path("/preferences/members")), null, ALICE).andReturn());
        assertEquals(4, organizerView.get("members").size());
        JsonNode alice = memberOf(organizerView, 1);
        assertTrue(alice.get("organizer").asBoolean());
        assertEquals("美食", alice.get("interests").get(0).asText());
        assertTrue(alice.get("editable").asBoolean());
        JsonNode ben = memberOf(organizerView, 2);
        assertEquals(800, ben.get("budget").get("amount").asInt());
        assertEquals("CNY", ben.get("budget").get("currency").asText());
        assertTrue(ben.get("editable").asBoolean());

        JsonNode memberView = body(perform(get(path("/preferences/members")), null, BEN).andReturn());
        assertTrue(memberOf(memberView, 2).get("editable").asBoolean());
        assertFalse(memberOf(memberView, 3).get("editable").asBoolean());
        assertTrue(memberOf(memberView, 3).get("budget").isNull());
    }

    @Test
    @DisplayName("organizer_canWriteAnotherMembersBudgetAndInterests")
    void organizer_canWriteAnotherMembersBudgetAndInterests() throws Exception {
        saveInterests(ALICE, CHLOE, "{\"interests\":[\"咖啡\",\"慢游\"]}")
                .andExpect(status().isOk());
        saveBudget(ALICE, CHLOE, "{\"amount\":1200,\"currency\":\"SGD\",\"limitType\":\"hard\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budget.amount").value(1200))
                .andExpect(jsonPath("$.budget.limitType").value("hard"));

        JsonNode profiles = body(perform(get(path("/preferences/members")), null, BEN).andReturn());
        JsonNode chloe = memberOf(profiles, 3);
        assertEquals("咖啡", chloe.get("interests").get(0).asText());
        assertEquals(1200, chloe.get("budget").get("amount").asInt());
        assertEquals("SGD", chloe.get("budget").get("currency").asText());
    }

    @Test
    @DisplayName("organizer_canWriteAnotherMembersMustDos")
    void organizer_canWriteAnotherMembersMustDos() throws Exception {
        String body = "{\"items\":[{\"activity\":\"爬大蜀山\",\"location\":\"大蜀山\",\"time\":null}]}";
        perform(put(path("/preferences/must-dos")).param("memberId", CHLOE), body, ALICE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].activity").value("爬大蜀山"));
        JsonNode read = body(perform(get(path("/preferences/must-dos")), null, ALICE).andReturn());
        JsonNode chloe = memberOfMustDos(read, 3);
        assertNotNull(chloe);
        assertEquals("爬大蜀山", chloe.get("mustDos").get(0).get("activity").asText());
    }

    @Test
    @DisplayName("nonOrganizer_cannotWriteAnotherMemberAndNothingChanges")
    void nonOrganizer_cannotWriteAnotherMemberAndNothingChanges() throws Exception {
        perform(put(path("/preferences/budget")).param("memberId", CHLOE),
                "{\"amount\":500,\"currency\":\"SGD\",\"limitType\":\"hard\"}", BEN)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ORGANIZER"));
        JsonNode profiles = body(perform(get(path("/preferences/members")), null, ALICE).andReturn());
        assertTrue(memberOf(profiles, 3).get("budget").isNull());
    }

    @Test
    @DisplayName("targetOutsideTrip_isRejected")
    void targetOutsideTrip_isRejected() throws Exception {
        perform(put(path("/preferences/budget")).param("memberId", EVE),
                "{\"amount\":500,\"currency\":\"SGD\",\"limitType\":\"hard\"}", ALICE)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
    }

    @Test
    @DisplayName("ownMemberId_isTreatedAsSelf")
    void ownMemberId_isTreatedAsSelf() throws Exception {
        saveBudget(BEN, BEN, "{\"amount\":300,\"currency\":\"SGD\",\"limitType\":\"soft\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budget.amount").value(300));
    }

    private org.springframework.test.web.servlet.ResultActions saveInterests(String actor, String target,
            String body) throws Exception {
        return perform(put(path("/preferences")).param("memberId", target == null ? actor : target), body, actor);
    }

    private org.springframework.test.web.servlet.ResultActions saveBudget(String actor, String target, String body)
            throws Exception {
        return perform(put(path("/preferences/budget")).param("memberId", target), body, actor);
    }

    private String path(String suffix) {
        return "/api/trips/" + seededTripId() + suffix;
    }

    private long seededTripId() {
        return jdbcClient.sql("SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'")
                .query(Long.class).single();
    }

    private org.springframework.test.web.servlet.ResultActions perform(MockHttpServletRequestBuilder request,
            String body, String userId) throws Exception {
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mockMvc.perform(request.with(TestAuth.asUser(userId)));
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode memberOf(JsonNode response, long userId) {
        for (JsonNode member : response.get("members")) {
            if (member.get("userId").asLong() == userId) {
                return member;
            }
        }
        return null;
    }

    private JsonNode memberOfMustDos(JsonNode response, long userId) {
        for (JsonNode member : response.get("members")) {
            if (member.get("userId").asLong() == userId) {
                return member;
            }
        }
        return null;
    }
}
