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
              {"seq":1,"name":"Museum","address":"1 Museum Rd","startTime":"09:00","endTime":"10:00",
               "travelMinutesToNext":15,"interests":["culture"]},
              {"seq":2,"name":"Lunch","address":"2 Lunch St","startTime":"10:15","endTime":"11:15",
               "travelMinutesToNext":null,"interests":["food"]}],
             "costPerPersonCents":4200}
            """;

    private static final String MULTI_DAY = """
            {"stops":[
              {"seq":1,"dayIndex":1,"name":"Museum","address":"1 Museum Rd",
               "startTime":"09:00","endTime":"10:00",
               "travelMinutesToNext":15,"interests":["culture"]},
              {"seq":2,"dayIndex":1,"name":"Lunch","address":"2 Lunch St",
               "startTime":"10:15","endTime":"11:15",
               "travelMinutesToNext":null,"interests":["food"]},
              {"seq":3,"dayIndex":2,"name":"Park","address":"3 Park Ave",
               "startTime":"09:00","endTime":"10:00",
               "travelMinutesToNext":15,"interests":["nature"]},
              {"seq":4,"dayIndex":2,"name":"Dinner","address":"4 Dinner Rd",
               "startTime":"10:15","endTime":"11:15",
               "travelMinutesToNext":null,"interests":["food"]}],
             "costPerPersonCents":8400}
            """;

    @Test
    void acceptsAMultiDayPlanCoveringEveryDay() {
        MainPlanResult result = validator.validate(MULTI_DAY, objectMapper, 2);

        assertEquals(4, result.stops().size());
        assertEquals(1, result.stops().get(1).dayIndex());
        assertEquals(2, result.stops().get(2).dayIndex());
    }

    @Test
    void rejectsAnUncoveredTripDay() {
        assertInvalidForDays(MULTI_DAY, 3);
    }

    @Test
    void rejectsMissingDayIndexOnAMultiDayTrip() {
        assertInvalidForDays(MULTI_DAY.replace("\"dayIndex\":1,", "").replace("\"dayIndex\":2,", ""), 2);
    }

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
    void rejectsMoreThanSixStopsInADay() {
        assertInvalid("""
                {"stops":[
                  {"seq":1,"name":"A","startTime":"09:00","endTime":"09:30","travelMinutesToNext":15},
                  {"seq":2,"name":"B","startTime":"09:45","endTime":"10:15","travelMinutesToNext":15},
                  {"seq":3,"name":"C","startTime":"10:30","endTime":"11:00","travelMinutesToNext":15},
                  {"seq":4,"name":"D","startTime":"11:15","endTime":"11:45","travelMinutesToNext":15},
                  {"seq":5,"name":"E","startTime":"12:00","endTime":"12:30","travelMinutesToNext":15},
                  {"seq":6,"name":"F","startTime":"12:45","endTime":"13:15","travelMinutesToNext":15},
                  {"seq":7,"name":"G","startTime":"13:30","endTime":"14:00","travelMinutesToNext":null}],
                 "costPerPersonCents":0}
                """);
    }

    @Test
    void rejectsNonContiguousSeq() {
        assertInvalid(VALID.replace("\"seq\":2", "\"seq\":3"));
    }

    @Test
    void rejectsBadClockFormat() {
        assertInvalid(VALID.replace("\"startTime\":\"09:00\"", "\"startTime\":\"9:00\""));
    }

    @Test
    void rejectsEndNotAfterStart() {
        assertInvalid(VALID.replace("\"endTime\":\"10:00\"", "\"endTime\":\"09:00\""));
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
    void rejectsAStopWithoutAddress() {
        assertInvalid(VALID.replace("\"address\":\"1 Museum Rd\",", ""));
    }

    @Test
    void rejectsABlankAddress() {
        assertInvalid(VALID.replace("\"address\":\"1 Museum Rd\"", "\"address\":\"  \""));
    }

    @Test
    void keepsTheTrimmedAddressOnEveryStop() {
        MainPlanResult result = validator.validate(VALID, objectMapper);

        assertEquals("1 Museum Rd", result.stops().get(0).address());
        assertEquals("2 Lunch St", result.stops().get(1).address());
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

    private void assertInvalidForDays(String content, int days) {
        PlanAiException cause = assertThrows(PlanAiException.class,
                () -> validator.validate(content, objectMapper, days));
        assertEquals(PlanAiException.Reason.INVALID_OUTPUT, cause.reason());
    }
}
