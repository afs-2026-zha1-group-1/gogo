package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.gogo.auth.TestAuth;

// AI half of the ATDD API layer (A1-A4, A6-A8, R-A1). The DeepSeek client is a
// stub so the acceptance path never reaches the network.
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:ai-main-plan-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1",
        "gogo.plan.ai.api-key=test-key"
})
@AutoConfigureMockMvc
@Import(AiMainPlanApiTest.StubConfig.class)
class AiMainPlanApiTest {

    private static final AtomicInteger CALLS = new AtomicInteger();
    private static final AtomicReference<DeepSeekPlanClient> DELEGATE = new AtomicReference<>();

    private static final String VALID_PLAN = """
            {"stops":[
              {"seq":1,"name":"Museum","address":"1 Museum Rd, Singapore",
               "startTime":"09:00","endTime":"10:00",
               "travelMinutesToNext":15,"interests":["culture"]},
              {"seq":2,"name":"Lunch","address":"2 Lunch St, Singapore",
               "startTime":"10:15","endTime":"11:15",
               "travelMinutesToNext":10,"interests":["food"]},
              {"seq":3,"name":"Park","address":"3 Park Ave, Singapore",
               "startTime":"11:25","endTime":"12:30",
               "travelMinutesToNext":null,"interests":["nature"]}],
             "costPerPersonCents":4200}
            """;

    @TestConfiguration
    static class StubConfig {

        @Bean
        DeepSeekPlanClient deepSeekPlanClient() {
            return (systemPrompt, userJson) -> {
                CALLS.incrementAndGet();
                return DELEGATE.get().complete(systemPrompt, userJson);
            };
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long tripId;

    @BeforeEach
    void resetFixtureState() {
        tripId = jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
        jdbcTemplate.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbcTemplate.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbcTemplate.update("DELETE FROM plan_node WHERE trip_id = ? AND branch_id = 'main'", tripId);
        jdbcTemplate.update("UPDATE trip_member SET ready = 1, preference_revision = 1 "
                + "WHERE trip_id = ? AND user_id IN (1, 2, 3, 4)", tripId);
        jdbcTemplate.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'budget'", tripId);
        jdbcTemplate.update("DELETE FROM member_preference WHERE trip_id = ? AND kind = 'submission'", tripId);
        jdbcTemplate.update("UPDATE trip SET start_location = 'City Hall MRT', "
                + "end_location = 'Merlion Park', main_plan_confirmed = 0 WHERE id = ?", tripId);
        CALLS.set(0);
        DELEGATE.set((systemPrompt, userJson) -> VALID_PLAN);
    }

    @Test
    void a1AiPlanIsPersistedAsTheDraft() throws Exception {
        generate()
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.stops[0].name").value("Museum"))
                .andExpect(jsonPath("$.stops[2].name").value("Park"))
                .andExpect(jsonPath("$.costPerPersonCents").value(4200))
                .andExpect(jsonPath("$.source").doesNotExist())
                .andExpect(jsonPath("$.degraded").doesNotExist());

        assertEquals(1, CALLS.get());
    }

    @Test
    void a2CallFailureFallsBackToTheTwoStopPlan() throws Exception {
        DELEGATE.set((systemPrompt, userJson) -> {
            throw new PlanAiException(PlanAiException.Reason.HTTP, "boom");
        });

        generate()
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.stops.length()").value(2))
                .andExpect(jsonPath("$.stops[0].name").value("City Hall MRT"))
                .andExpect(jsonPath("$.stops[0].startTime").value("09:00"))
                .andExpect(jsonPath("$.stops[0].endTime").value("09:30"))
                .andExpect(jsonPath("$.stops[0].travelMinutesToNext").value(30))
                .andExpect(jsonPath("$.stops[1].name").value("Merlion Park"))
                .andExpect(jsonPath("$.stops[1].startTime").value("17:00"))
                .andExpect(jsonPath("$.stops[1].endTime").value("17:30"))
                .andExpect(jsonPath("$.stops[1].travelMinutesToNext").doesNotExist())
                .andExpect(jsonPath("$.costPerPersonCents").value(0));
    }

    @Test
    void a3InvalidOutputFallsBackToTheTwoStopPlan() throws Exception {
        DELEGATE.set((systemPrompt, userJson) -> """
                {"stops":[{"seq":2,"name":"Museum","startTime":"09:00","endTime":"10:00",
                "travelMinutesToNext":null}],"costPerPersonCents":0}
                """);

        generate()
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.stops.length()").value(2))
                .andExpect(jsonPath("$.stops[0].name").value("City Hall MRT"))
                .andExpect(jsonPath("$.costPerPersonCents").value(0));
    }

    @Test
    void a4BlankLocationsAreCompletedBeforeTheFallback() throws Exception {
        jdbcTemplate.update("UPDATE trip SET start_location = NULL, end_location = NULL WHERE id = ?", tripId);
        DELEGATE.set((systemPrompt, userJson) -> {
            throw new PlanAiException(PlanAiException.Reason.TIMEOUT, "slow");
        });

        generate()
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.stops[0].name").value("Merlion Park"))
                .andExpect(jsonPath("$.stops[1].name").value("City Hall MRT"));

        Map<String, Object> trip = jdbcTemplate.queryForMap(
                "SELECT start_location, end_location FROM trip WHERE id = ?", tripId);
        assertEquals("Merlion Park", trip.get("start_location"));
        assertEquals("City Hall MRT", trip.get("end_location"));
    }

    @Test
    void a6GateFailuresDoNotCallTheModel() throws Exception {
        jdbcTemplate.update("UPDATE trip_member SET ready = 0 WHERE trip_id = ? AND user_id = 4", tripId);

        generate()
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBERS_NOT_READY"));

        assertEquals(0, CALLS.get());
    }

    @Test
    void a7RegenerationCreatesTheNextVersion() throws Exception {
        generate().andExpect(status().isCreated()).andExpect(jsonPath("$.version").value(1));
        generate().andExpect(status().isCreated()).andExpect(jsonPath("$.version").value(2));

        Integer superseded = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM main_plan_draft WHERE trip_id = ? AND version = 1 "
                        + "AND status = 'superseded'", Integer.class, tripId);
        assertEquals(1, superseded);
        assertEquals(2, CALLS.get());
    }

    @Test
    void a8ErrorBodyKeepsTheFlatShape() throws Exception {
        jdbcTemplate.update("UPDATE trip_member SET ready = 0 WHERE trip_id = ? AND user_id = 4", tripId);

        var result = generate().andExpect(status().isConflict()).andReturn();
        String body = result.getResponse().getContentAsString();

        org.junit.jupiter.api.Assertions.assertTrue(body.contains("\"code\""));
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("\"message\""));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("\"source\""));
    }

    private org.springframework.test.web.servlet.ResultActions generate() throws Exception {
        MockHttpServletRequestBuilder request = post("/api/trips/" + tripId + "/main-plan")
                .with(TestAuth.asUser("1"));
        return mockMvc.perform(request);
    }
}
