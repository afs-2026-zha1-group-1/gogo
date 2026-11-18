package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class AiPlanValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AiPlanValidator validator = new AiPlanValidator();

    private static final String VALID = """
            {"stops":[
              {"seq":1,"name":"Museum","startTime":"09:00","endTime":"10:00",
               "travelMinutesToNext":15,"interests":["culture"]},
              {"seq":2,"name":"Lunch","startTime":"10:15","endTime":"11:15",
               "travelMinutesToNext":null,"interests":["food"]}],
             "costPerPersonCents":4200}
            """;

    @Test
    void acceptsAValidPlan() {
        MainPlanResult result = validator.validate(VALID, objectMapper);

        assertEquals(2, result.stops().size());
        assertEquals("Museum", result.stops().get(0).name());
        assertEquals(15, result.stops().get(0).travelMinutesToNext());
        assertNull(result.stops().get(1).travelMinutesToNext());
        assertEquals(4200, result.costPerPersonCents());
    }

    @Test
    void rejectsOneStop() {
        assertInvalid("""
                {"stops":[{"seq":1,"name":"Museum","startTime":"09:00","endTime":"10:00",
                "travelMinutesToNext":null}],"costPerPersonCents":0}
                """);
    }

    @Test
    void rejectsNonContiguousSeq() {
        assertInvalid(VALID.replace("\"seq\":2", "\"seq\":3"));
    }

    @Test
    void rejectsBadClockFormat() {
        assertInvalid(VALID.replace("\"09:00\"", "\"9:00\""));
    }

    @Test
    void rejectsEndNotAfterStart() {
        assertInvalid(VALID.replace("\"10:00\"", "\"09:00\""));
    }

    @Test
    void rejectsMissingTravelLeg() {
        assertInvalid(VALID.replace("\"travelMinutesToNext\":15", "\"travelMinutesToNext\":null"));
    }

    @Test
    void rejectsNegativeTravelLeg() {
        assertInvalid(VALID.replace("\"travelMinutesToNext\":15", "\"travelMinutesToNext\":-1"));
    }

    @Test
    void rejectsLegOnTheLastStop() {
        assertInvalid(VALID.replace(
                "\"travelMinutesToNext\":null,\"interests\":[\"food\"]",
                "\"travelMinutesToNext\":5,\"interests\":[\"food\"]"));
    }

    @Test
    void rejectsNegativeCost() {
        assertInvalid(VALID.replace("\"costPerPersonCents\":4200", "\"costPerPersonCents\":-1"));
    }

    @Test
    void rejectsNonJson() {
        assertInvalid("not json");
    }

    private void assertInvalid(String content) {
        PlanAiException cause = assertThrows(PlanAiException.class,
                () -> validator.validate(content, objectMapper));
        assertEquals(PlanAiException.Reason.INVALID_OUTPUT, cause.reason());
    }
}
