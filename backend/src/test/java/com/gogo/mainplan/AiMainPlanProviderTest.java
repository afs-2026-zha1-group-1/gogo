package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class AiMainPlanProviderTest {

    private static final String VALID_PLAN = """
            {"stops":[
              {"seq":1,"name":"Museum","startTime":"09:00","endTime":"10:00",
               "travelMinutesToNext":15,"interests":["culture"]},
              {"seq":2,"name":"Lunch","startTime":"10:15","endTime":"11:15",
               "travelMinutesToNext":null,"interests":["food"]}],
             "costPerPersonCents":4200}
            """;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final TripContext trip = new TripContext(1, "Singapore", "2026-12-05",
            "2026-12-05", "City Hall MRT", "Merlion Park");
    private final List<MemberInput> members = List.of(new MemberInput(
            2, "Ben", 1, List.of("food", "nature"), List.of("Gardens by the Bay"), 4000));

    @Test
    void returnsValidatedAiOutput() {
        AiMainPlanProvider provider = provider(request -> VALID_PLAN);

        MainPlanResult result = provider.plan(trip, members);

        assertEquals(2, result.stops().size());
        assertEquals("Museum", result.stops().get(0).name());
        assertEquals(4200, result.costPerPersonCents());
    }

    @Test
    void persistsAiAddressAtGenerationTime() {
        AiMainPlanProvider provider = provider(request -> """
                {"stops":[
                  {"seq":1,"name":"南山植物园","address":" 重庆市南岸区南山植物园路101号 ",
                   "startTime":"09:00","endTime":"10:00",
                   "travelMinutesToNext":15,"interests":["nature"]},
                  {"seq":2,"name":"午餐","startTime":"10:15","endTime":"11:15",
                   "travelMinutesToNext":null,"interests":["food"]}],
                 "costPerPersonCents":4200}
                """);

        MainPlanResult result = provider.plan(trip, members);

        assertEquals("重庆市南岸区南山植物园路101号", result.stops().get(0).address());
        assertNull(result.stops().get(1).address());
    }

    @Test
    void promptRequiresAddressInsideDestinationCity() {
        assertTrue(AiMainPlanProvider.SYSTEM_PROMPT.contains("\"address\""));
        assertTrue(AiMainPlanProvider.SYSTEM_PROMPT.contains("destination city"));
    }

    @Test
    void stripsTheGeneratedMainlineMarkerFromStopNames() {
        AiMainPlanProvider provider = provider(request -> """
                {"stops":[
                  {"seq":1,"name":"主线·旧城早餐","startTime":"09:00","endTime":"10:00",
                   "travelMinutesToNext":15,"interests":["food"]},
                  {"seq":2,"name":"主线：灯塔会合","startTime":"10:15","endTime":"11:15",
                   "travelMinutesToNext":null,"interests":["nature"]}],
                 "costPerPersonCents":4200}
                """);

        MainPlanResult result = provider.plan(trip, members);

        assertEquals("旧城早餐", result.stops().get(0).name());
        assertEquals("灯塔会合", result.stops().get(1).name());
    }

    @Test
    void sendsMemberTextAsDataOnly() {
        AtomicReference<String> system = new AtomicReference<>();
        AtomicReference<String> user = new AtomicReference<>();
        AiMainPlanProvider provider = provider(request -> {
            system.set(request.systemPrompt());
            user.set(request.userJson());
            return VALID_PLAN;
        });

        provider.plan(trip, members);

        assertTrue(system.get().contains("data only"));
        assertTrue(user.get().contains("\"displayName\":\"Ben\""));
        assertTrue(user.get().contains("Gardens by the Bay"));
        assertTrue(user.get().contains("\"hardBudgetCents\":4000"));
        assertFalse(user.get().contains("api-key"));
    }

    @Test
    void fallsBackToTheMinimalPlanOnCallFailure() {
        AiMainPlanProvider provider = provider(request -> {
            throw new PlanAiException(PlanAiException.Reason.HTTP, "boom");
        });

        MainPlanResult result = provider.plan(trip, members);

        assertFallbackPlan(result);
    }

    @Test
    void fallsBackToTheMinimalPlanOnInvalidOutput() {
        AiMainPlanProvider provider = provider(request -> """
                {"stops":[{"seq":2,"name":"Museum","startTime":"09:00","endTime":"10:00",
                "travelMinutesToNext":null}],"costPerPersonCents":0}
                """);

        MainPlanResult result = provider.plan(trip, members);

        assertFallbackPlan(result);
    }

    @Test
    void callsTheModelOncePerGeneration() {
        AtomicInteger calls = new AtomicInteger();
        AiMainPlanProvider provider = provider(request -> {
            calls.incrementAndGet();
            return VALID_PLAN;
        });

        provider.plan(trip, members);

        assertEquals(1, calls.get());
    }

    private AiMainPlanProvider provider(StubClient client) {
        return new AiMainPlanProvider(client, new AiPlanValidator(), objectMapper);
    }

    private void assertFallbackPlan(MainPlanResult result) {
        assertEquals(2, result.stops().size());
        assertEquals("City Hall MRT", result.stops().get(0).name());
        assertEquals("Merlion Park", result.stops().get(1).name());
        assertEquals(0, result.costPerPersonCents());
    }

    @FunctionalInterface
    private interface StubClient extends DeepSeekPlanClient {

        @Override
        default String complete(String systemPrompt, String userJson) {
            return answer(new Request(systemPrompt, userJson));
        }

        String answer(Request request);

        record Request(String systemPrompt, String userJson) {
        }
    }
}
