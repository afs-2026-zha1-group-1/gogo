package com.gogo.trip;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gogo.auth.TestAuth;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:trip-dashboard-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
@Transactional
class TripDashboardApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void createTrips() {
        jdbc.update("INSERT INTO trip (name, destination, start_date, end_date, organizer_id) "
                + "VALUES ('Trip B', 'Penang', '2026-12-10', '2026-12-12', 1)");
        jdbc.update("INSERT INTO trip (name, destination, start_date, end_date, organizer_id) "
                + "VALUES ('Trip C', 'Malacca', '2026-12-14', '2026-12-15', 1)");
        jdbc.update("INSERT INTO trip (name, destination, start_date, end_date, organizer_id) "
                + "VALUES ('Private D', 'Private destination', '2026-12-16', '2026-12-17', 1)");
        jdbc.update("INSERT INTO trip_member (trip_id, user_id) SELECT id, 2 FROM trip "
                + "WHERE name IN ('Trip B', 'Trip C')");
        jdbc.update("INSERT INTO trip_member (trip_id, user_id) SELECT id, 1 FROM trip "
                + "WHERE name IN ('Trip B', 'Trip C', 'Private D')");
    }

    @Test
    void listsOnlyMemberTripsWithSavedCardFields() throws Exception {
        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trips.length()").value(3))
                .andExpect(jsonPath("$.trips[*].name").value(containsInAnyOrder(
                        "Singapore Friends Day", "Trip B", "Trip C")))
                .andExpect(jsonPath("$.trips[?(@.name == 'Trip B')].destination").value("Penang"))
                .andExpect(jsonPath("$.trips[?(@.name == 'Trip B')].startDate").value("2026-12-10"))
                .andExpect(jsonPath("$.trips[?(@.name == 'Trip B')].endDate").value("2026-12-12"))
                .andExpect(jsonPath("$.trips[?(@.name == 'Trip B')].id").isNotEmpty())
                .andExpect(content().string(not(containsString("Private D"))))
                .andExpect(content().string(not(containsString("Private destination"))));
    }

    @Test
    void emptyMembershipReturnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/trips").with(TestAuth.asUser("5")))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"trips\":[]}"));
    }

    @Test
    void signedOutAndLegacyHeaderCannotReadTrips() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "2"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_REQUIRED"))
                .andExpect(content().string(not(containsString("Trip B"))));
    }
}
