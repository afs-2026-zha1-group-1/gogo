package com.gogo.invitation;

import com.gogo.auth.TestAuth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// REQ-004: US-008 issue, US-010 preview/accept, US-012 unusable; fixtures I1-I5, J1-J7, U1-U2, R-1, R-2
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:invitation-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class InvitationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long tripId;

    @BeforeEach
    void resetFixtureState() {
        tripId = jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
        jdbcTemplate.update("DELETE FROM trip_invitation WHERE trip_id = ?", tripId);
        jdbcTemplate.update("DELETE FROM trip_member WHERE trip_id = ? AND user_id = 5", tripId);
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 0, joining_closed = 0 WHERE id = ?", tripId);
    }

    private long invitationCount() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_invitation WHERE trip_id = ?", Long.class, tripId);
    }

    private long memberCount() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ?", Long.class, tripId);
    }

    private boolean isMember(long userId) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ? AND user_id = ?",
                Long.class, tripId, userId);
        return count != null && count > 0;
    }

    private void setMainPlanConfirmed(boolean confirmed) {
        // US-003 D8: confirmation closes joining permanently; test-only setup mirrors both flags.
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = ?, joining_closed = ? WHERE id = ?",
                confirmed ? 1 : 0, confirmed ? 1 : 0, tripId);
    }

    private MvcResult issue(String userId) throws Exception {
        var request = post("/api/trips/" + tripId + "/invitation");
        request = request.with(TestAuth.asUser(userId));
        return mockMvc.perform(request).andReturn();
    }

    private String issueToken() throws Exception {
        MvcResult result = issue("1");
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private MvcResult accept(String token, String userId) throws Exception {
        var request = post("/api/invitations/" + token + "/accept");
        request = request.with(TestAuth.asUser(userId));
        return mockMvc.perform(request).andReturn();
    }

    // I1: organizer obtains an invitation and exactly one row is stored.
    @Test
    void organizerObtainsOneInvitation() throws Exception {
        MvcResult result = issue("1");
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        String token = body.get("token").asText();
        org.junit.jupiter.api.Assertions.assertFalse(token.isBlank());
        org.junit.jupiter.api.Assertions.assertEquals("/join/" + token, body.get("joinPath").asText());
        org.junit.jupiter.api.Assertions.assertEquals(tripId, body.get("tripId").asLong());
        org.junit.jupiter.api.Assertions.assertEquals("Singapore Friends Day", body.get("tripName").asText());
        org.junit.jupiter.api.Assertions.assertEquals(1, invitationCount());
    }

    // I2: repeated issuance returns the same token and still one row.
    @Test
    void repeatedIssuanceReturnsSameInvitation() throws Exception {
        String first = issueToken();
        String second = issueToken();
        org.junit.jupiter.api.Assertions.assertEquals(first, second);
        org.junit.jupiter.api.Assertions.assertEquals(1, invitationCount());
    }

    @Test
    void memberCanIssueFirstAndOrganizerAndMemberReuseTheToken() throws Exception {
        MvcResult first = issue("2");
        org.junit.jupiter.api.Assertions.assertEquals(200, first.getResponse().getStatus());
        JsonNode body = objectMapper.readTree(first.getResponse().getContentAsString());
        String token = body.get("token").asText();
        org.junit.jupiter.api.Assertions.assertFalse(token.isBlank());
        org.junit.jupiter.api.Assertions.assertEquals("/join/" + token, body.get("joinPath").asText());
        org.junit.jupiter.api.Assertions.assertEquals(token, issueToken());
        MvcResult repeated = issue("2");
        org.junit.jupiter.api.Assertions.assertEquals(200, repeated.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(token,
                objectMapper.readTree(repeated.getResponse().getContentAsString()).get("token").asText());
        org.junit.jupiter.api.Assertions.assertEquals(1, invitationCount());
    }

    @Test
    void nonMemberCannotCreateOrReadAnInvitation() throws Exception {
        mockMvc.perform(post("/api/trips/" + tripId + "/invitation").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.token").doesNotExist());
        org.junit.jupiter.api.Assertions.assertEquals(0, invitationCount());
        String token = issueToken();
        mockMvc.perform(post("/api/trips/" + tripId + "/invitation").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString(token))));
        org.junit.jupiter.api.Assertions.assertEquals(1, invitationCount());
    }

    // I4-N: missing or unknown caller identity creates nothing.
    @Test
    void issuanceRequiresKnownIdentity() throws Exception {
        issue(null);
        mockMvc.perform(post("/api/trips/" + tripId + "/invitation").with(TestAuth.csrfOnly()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(post("/api/trips/" + tripId + "/invitation").with(TestAuth.asUser("999999")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        org.junit.jupiter.api.Assertions.assertEquals(0, invitationCount());
    }

    // I5-N: an unknown trip id is reported as TRIP_NOT_FOUND.
    @Test
    void unknownTripIsReported() throws Exception {
        mockMvc.perform(post("/api/trips/999999/invitation").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    // J1/U1: public preview exposes the five whitelisted fields only.
    @Test
    void previewShowsOnlyPublicBasics() throws Exception {
        String token = issueToken();
        mockMvc.perform(get("/api/invitations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripName").value("Singapore Friends Day"))
                .andExpect(jsonPath("$.destination").value("Singapore"))
                .andExpect(jsonPath("$.startDate").value("2026-12-05"))
                .andExpect(jsonPath("$.endDate").value("2026-12-05"))
                .andExpect(jsonPath("$.mainPlanConfirmed").value(false))
                .andExpect(jsonPath("$.members").doesNotExist())
                .andExpect(jsonPath("$.memberCount").doesNotExist())
                .andExpect(jsonPath("$.itinerary").doesNotExist())
                .andExpect(jsonPath("$.preferences").doesNotExist());
    }

    // User ruling 2026-11-17: a signed-in member's preview reports viewerMember
    // and tripId so the join page can land them on the already-in-team notice;
    // guests and non-members keep viewerMember=false.
    @Test
    void memberPreviewReportsViewerMember() throws Exception {
        String token = issueToken();
        mockMvc.perform(get("/api/invitations/" + token).with(TestAuth.asUser("5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewerMember").value(false));
        mockMvc.perform(get("/api/invitations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewerMember").value(false));
        accept(token, "5");
        mockMvc.perform(get("/api/invitations/" + token).with(TestAuth.asUser("5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewerMember").value(true))
                .andExpect(jsonPath("$.tripId").value(tripId));
    }

    // J2: an invited outsider joins once and can then read the trip.
    @Test
    void outsiderJoinsOnceAndCanReadTrip() throws Exception {
        String token = issueToken();
        long before = memberCount();
        MvcResult result = accept(token, "5");
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(body.get("joined").asBoolean());
        org.junit.jupiter.api.Assertions.assertFalse(body.get("alreadyMember").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(tripId, body.get("tripId").asLong());
        org.junit.jupiter.api.Assertions.assertTrue(isMember(5));
        org.junit.jupiter.api.Assertions.assertEquals(before + 1, memberCount());
        mockMvc.perform(get("/api/trips/" + tripId).with(TestAuth.asUser("5")))
                .andExpect(status().isOk());
    }

    // J3: double acceptance still stores exactly one membership.
    @Test
    void doubleAcceptanceKeepsSingleMembership() throws Exception {
        String token = issueToken();
        accept(token, "5");
        MvcResult second = accept(token, "5");
        org.junit.jupiter.api.Assertions.assertEquals(200, second.getResponse().getStatus());
        JsonNode body = objectMapper.readTree(second.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(body.get("joined").asBoolean());
        org.junit.jupiter.api.Assertions.assertTrue(body.get("alreadyMember").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trip_member WHERE trip_id = ? AND user_id = 5", Long.class, tripId));
    }

    // J4/R-1: a confirmed main plan closes joining for non-members and no api sets the state.
    @Test
    void joiningClosesAfterMainPlanConfirmation() throws Exception {
        String token = issueToken();
        long before = memberCount();
        setMainPlanConfirmed(true);
        mockMvc.perform(post("/api/invitations/" + token + "/accept").with(TestAuth.asUser("5")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("JOINING_CLOSED"));
        org.junit.jupiter.api.Assertions.assertEquals(before, memberCount());
        org.junit.jupiter.api.Assertions.assertFalse(isMember(5));
    }

    // J5-N: acceptance requires a known caller identity.
    @Test
    void acceptanceRequiresKnownIdentity() throws Exception {
        String token = issueToken();
        accept(token, null);
        mockMvc.perform(post("/api/invitations/" + token + "/accept").with(TestAuth.csrfOnly()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(post("/api/invitations/" + token + "/accept").with(TestAuth.asUser("999999")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        org.junit.jupiter.api.Assertions.assertFalse(isMember(5));
    }

    // J6: an existing member succeeds before and after closure without a new row.
    @Test
    void existingMemberAcceptsBeforeAndAfterClosure() throws Exception {
        String token = issueToken();
        long before = memberCount();
        MvcResult open = accept(token, "2");
        org.junit.jupiter.api.Assertions.assertEquals(200, open.getResponse().getStatus());
        JsonNode openBody = objectMapper.readTree(open.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(openBody.get("alreadyMember").asBoolean());
        setMainPlanConfirmed(true);
        MvcResult closed = accept(token, "2");
        org.junit.jupiter.api.Assertions.assertEquals(200, closed.getResponse().getStatus());
        JsonNode closedBody = objectMapper.readTree(closed.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(closedBody.get("joined").asBoolean());
        org.junit.jupiter.api.Assertions.assertTrue(closedBody.get("alreadyMember").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(before, memberCount());
    }

    // J7: identity errors take precedence over an invalid token.
    @Test
    void identityErrorsPrecedeInvalidToken() throws Exception {
        mockMvc.perform(post("/api/invitations/no-such-invitation/accept").with(TestAuth.csrfOnly()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(post("/api/invitations/no-such-invitation/accept").with(TestAuth.asUser("999999")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        mockMvc.perform(post("/api/invitations/no-such-invitation/accept").with(TestAuth.asUser("5")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("INVITATION_NOT_FOUND"));
        org.junit.jupiter.api.Assertions.assertFalse(isMember(5));
    }

    // U1: an invalid preview returns a generic unusable outcome with no trip values.
    @Test
    void invalidPreviewExposesNothing() throws Exception {
        mockMvc.perform(get("/api/invitations/no-such-invitation"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("INVITATION_NOT_FOUND"))
                .andExpect(jsonPath("$.tripName").doesNotExist())
                .andExpect(jsonPath("$.destination").doesNotExist())
                .andExpect(content().string(not(containsString("Singapore Friends Day"))))
                .andExpect(content().string(not(containsString("Singapore"))));
    }

    // U2: accepting an invalid invitation creates no membership.
    @Test
    void invalidAcceptanceCreatesNothing() throws Exception {
        mockMvc.perform(post("/api/invitations/no-such-invitation/accept").with(TestAuth.asUser("5")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("INVITATION_NOT_FOUND"));
        org.junit.jupiter.api.Assertions.assertFalse(isMember(5));
    }

    // R-1/R-2: no confirmation or revocation/expiry route or field exists.
    @Test
    void noConfirmationOrRevocationSurfaceExists() throws Exception {
        String token = issueToken();
        mockMvc.perform(post("/api/trips/" + tripId + "/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/trips/" + tripId).with(TestAuth.asUser("1")))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(post("/api/invitations/" + token + "/confirm").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/invitations/" + token + "/revoke").with(TestAuth.asUser("1")))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/invitations/" + token).with(TestAuth.asUser("1")))
                .andExpect(status().isMethodNotAllowed());
        Integer confirmed = jdbcTemplate.queryForObject(
                "SELECT main_plan_confirmed FROM trip WHERE id = ?", Integer.class, tripId);
        org.junit.jupiter.api.Assertions.assertEquals(0, confirmed);
        mockMvc.perform(get("/api/invitations/" + token))
                .andExpect(jsonPath("$.expiresAt").doesNotExist())
                .andExpect(jsonPath("$.expiryDate").doesNotExist())
                .andExpect(jsonPath("$.revoked").doesNotExist());
    }
}
