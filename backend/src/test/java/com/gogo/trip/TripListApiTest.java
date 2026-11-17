package com.gogo.trip;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import com.gogo.auth.TestAuth;

// US-071: fixtures L1-L10; API layer per atdd-design A1-A9. Identity is the
// merged account/session principal (US-066), not the retired X-User-Id scaffold.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:trip-list-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class TripListApiTest {

    private static final String SEEDED_TRIP = "Singapore Friends Day";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long seededTripId() {
        return jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = ?", Long.class, SEEDED_TRIP);
    }

    @BeforeEach
    void resetFixtureTrips() {
        jdbcTemplate.update("DELETE FROM trip WHERE name IN ('Bali Weekend', 'Kyoto Autumn', 'Same-Day Start')");
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 0 WHERE name = ?", SEEDED_TRIP);
        // L3/L6: already finished relative to any date after 2026-11-05.
        insertTrip("Kyoto Autumn", "Kyoto", "2026-11-01", "2026-11-05", 1, 1);
        // L2: same start date as the seeded trip (2026-12-05), larger id -> ordered after it.
        insertTrip("Same-Day Start", "Singapore", "2026-12-05", "2026-12-06", 1, 1);
        // L4: Alice joined a trip she did not create.
        long baliId = insertTrip("Bali Weekend", "Bali", "2026-12-08", "2026-12-10", 2, 2);
        jdbcTemplate.update("INSERT INTO trip_member (trip_id, user_id) VALUES (?, 1)", baliId);
    }

    private long insertTrip(String name, String destination, String startDate, String endDate,
            long organizerId, long memberId) {
        jdbcTemplate.update(
                "INSERT INTO trip (name, destination, start_date, end_date, organizer_id) VALUES (?, ?, ?, ?, ?)",
                name, destination, startDate, endDate, organizerId);
        long tripId = jdbcTemplate.queryForObject("SELECT id FROM trip WHERE name = ?", Long.class, name);
        jdbcTemplate.update("INSERT INTO trip_member (trip_id, user_id) VALUES (?, ?)", tripId, organizerId);
        if (memberId != organizerId) {
            jdbcTemplate.update("INSERT INTO trip_member (trip_id, user_id) VALUES (?, ?)", tripId, memberId);
        }
        return tripId;
    }

    @Test
    void memberReadsOwnTripsOnly() throws Exception {
        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips.length()").value(4))
                .andExpect(jsonPath("$.trips[*].name").value(contains(
                        "Singapore Friends Day", "Same-Day Start", "Bali Weekend", "Kyoto Autumn")))
                .andExpect(jsonPath("$.trips[0].destination").value("Singapore"))
                .andExpect(jsonPath("$.trips[0].startDate").value("2026-12-05"))
                .andExpect(jsonPath("$.trips[0].endDate").value("2026-12-05"))
                .andExpect(jsonPath("$.trips[0].id").isNumber())
                .andExpect(jsonPath("$.trips[0].mainPlanConfirmed").value(false));
    }

    @Test
    void orderingIsDeterministic() throws Exception {
        long seededId = seededTripId();
        long sameDayId = jdbcTemplate.queryForObject(
                "SELECT id FROM trip WHERE name = 'Same-Day Start'", Long.class);
        org.junit.jupiter.api.Assertions.assertTrue(sameDayId > seededId,
                "same-day fixture must have the larger id");

        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips[*].startDate").value(contains(
                        "2026-12-05", "2026-12-05", "2026-12-08", "2026-11-01")))
                .andExpect(jsonPath("$.trips[0].id").value(seededId))
                .andExpect(jsonPath("$.trips[1].id").value(sameDayId))
                .andExpect(jsonPath("$.trips[3].name").value("Kyoto Autumn"));
    }

    @Test
    void organizerFlagIdentifiesCreator() throws Exception {
        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips[0].organizer").value(true))   // seeded (created by Alice)
                .andExpect(jsonPath("$.trips[1].organizer").value(true))   // same-day (created by Alice)
                .andExpect(jsonPath("$.trips[2].organizer").value(false))  // Bali (created by Ben)
                .andExpect(jsonPath("$.trips[3].organizer").value(true));  // Kyoto (created by Alice)
    }

    @Test
    void accountWithoutTripsReadsEmptyList() throws Exception {
        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips.length()").value(0));
    }

    @Test
    void confirmedMainPlanStaysListed() throws Exception {
        jdbcTemplate.update("UPDATE trip SET main_plan_confirmed = 1 WHERE name = ?", SEEDED_TRIP);

        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips[0].name").value(SEEDED_TRIP))
                .andExpect(jsonPath("$.trips[0].mainPlanConfirmed").value(true))
                .andExpect(jsonPath("$.trips[1].mainPlanConfirmed").value(false))
                .andExpect(jsonPath("$.trips.length()").value(4));
    }

    @Test
    void finishedTripStillReturnedWithoutServerStatus() throws Exception {
        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips[3].name").value("Kyoto Autumn"))
                .andExpect(jsonPath("$.trips[3].endDate").value("2026-11-05"))
                .andExpect(jsonPath("$.trips[3].finished").doesNotExist())
                .andExpect(jsonPath("$.trips[3].ended").doesNotExist())
                .andExpect(jsonPath("$.trips[3].status").doesNotExist());
    }

    @Test
    void unauthenticatedRequestRejected() throws Exception {
        mockMvc.perform(get("/api/trips"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"))
                .andExpect(jsonPath("$.trips").doesNotExist());
    }

    @Test
    void retiredIdentityHeaderDoesNotAuthenticate() throws Exception {
        for (String legacy : new String[] {" ", "abc", "1"}) {
            mockMvc.perform(get("/api/trips").header("X-User-Id", legacy))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("USER_REQUIRED"));
        }
    }

    @Test
    void listIsReadOnly() throws Exception {
        long before = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM trip", Long.class);

        mockMvc.perform(post("/api/trips").with(TestAuth.asUser("5"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Fresh Trip","destination":"Osaka","startDate":"2027-01-01","endDate":"2027-01-03"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Fresh Trip"));

        long afterCreate = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM trip", Long.class);
        org.junit.jupiter.api.Assertions.assertEquals(before + 1, afterCreate);

        mockMvc.perform(put("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete("/api/trips").with(TestAuth.asUser("1")))
                .andExpect(status().isMethodNotAllowed());
        org.junit.jupiter.api.Assertions.assertEquals(afterCreate,
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM trip", Long.class));
    }
}
