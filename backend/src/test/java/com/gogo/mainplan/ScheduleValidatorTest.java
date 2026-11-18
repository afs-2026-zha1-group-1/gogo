package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

// UT (ATDD UT-1 deferred to apply): the five schedule rules (design D9) on
// single-day HH:MM-as-minutes, including the ratified travel-fit equality.
class ScheduleValidatorTest {

    private final ScheduleValidator validator = new ScheduleValidator();

    private List<MainPlanRepository.StopRow> fixtureStops() {
        List<MainPlanRepository.StopRow> stops = new ArrayList<>();
        stops.add(new MainPlanRepository.StopRow(1, "City Hall MRT", "09:00", "09:30", 30, null, null, null, null, 500));
        stops.add(new MainPlanRepository.StopRow(2, "National Gallery Singapore", "10:00", "10:30", 30, null, null, null, null, 1500));
        stops.add(new MainPlanRepository.StopRow(3, "Gardens by the Bay", "11:00", "11:15", 15, null, null, null, null, 2000));
        stops.add(new MainPlanRepository.StopRow(4, "Merlion Park", "11:30", "12:00", null, null, null, null, null, 1000));
        return stops;
    }

    private boolean hasError(List<ScheduleValidator.ScheduleError> errors, String type, int seq) {
        return errors.stream().anyMatch(error -> error.type().equals(type) && error.seq() == seq);
    }

    @Test
    void fixtureSchedulePassesWithTravelFitEquality() {
        // legs 30/30/15 land exactly on the next starts — equality passes.
        assertTrue(validator.validate(fixtureStops()).isEmpty());
    }

    @Test
    void outOfOrderStartIsFlaggedOnTheLaterSeq() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(1, new MainPlanRepository.StopRow(2, "National Gallery Singapore", "08:00", "10:30", 30, null, null, null, null, 1500));
        assertTrue(hasError(validator.validate(stops), "OUT_OF_ORDER", 2));
    }

    @Test
    void overlapIsFlaggedOnTheOverlappingStop() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(1, new MainPlanRepository.StopRow(2, "National Gallery Singapore", "09:15", "10:30", 30, null));
        assertTrue(hasError(validator.validate(stops), "OVERLAP", 2));
    }

    @Test
    void missingLegIsFlaggedOnTheNonLastStop() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(0, new MainPlanRepository.StopRow(1, "City Hall MRT", "09:00", "09:30", null, null));
        assertTrue(hasError(validator.validate(stops), "MISSING_LEG", 1));
    }

    @Test
    void lastStopWithoutLegIsFine() {
        assertTrue(validator.validate(fixtureStops()).stream()
                .noneMatch(error -> error.type().equals("MISSING_LEG")));
    }

    @Test
    void travelExceedingGapIsFlaggedOnTheLegCarryingStop() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(0, new MainPlanRepository.StopRow(1, "City Hall MRT", "09:00", "09:30", 45, null));
        List<ScheduleValidator.ScheduleError> errors = validator.validate(stops);
        assertTrue(hasError(errors, "TRAVEL_EXCEEDS_GAP", 1));
    }

    @Test
    void oneMinuteOverTheGapBlocks() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(0, new MainPlanRepository.StopRow(1, "City Hall MRT", "09:00", "09:30", 31, null));
        assertTrue(hasError(validator.validate(stops), "TRAVEL_EXCEEDS_GAP", 1));
    }

    @Test
    void outOfDayStartIsFlagged() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(2, new MainPlanRepository.StopRow(3, "Gardens by the Bay", "25:00", "11:15", 15, null));
        assertTrue(hasError(validator.validate(stops), "OUT_OF_DAY", 3));
    }

    @Test
    void outOfDayEndIsFlagged() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(3, new MainPlanRepository.StopRow(4, "Merlion Park", "11:30", "24:30", null, null));
        assertTrue(hasError(validator.validate(stops), "OUT_OF_DAY", 4));
    }

    @Test
    void dayWindowBoundariesAreInclusive() {
        List<MainPlanRepository.StopRow> stops = List.of(
                new MainPlanRepository.StopRow(1, "Early", "00:00", "00:30", null, null));
        assertTrue(validator.validate(stops).isEmpty());
        List<MainPlanRepository.StopRow> late = List.of(
                new MainPlanRepository.StopRow(1, "Late", "23:00", "23:59", null, null));
        assertTrue(validator.validate(late).isEmpty());
    }

    @Test
    void everyErrorCarriesTypeSeqAndMessage() {
        List<MainPlanRepository.StopRow> stops = fixtureStops();
        stops.set(0, new MainPlanRepository.StopRow(1, "City Hall MRT", "09:00", "09:30", 45, null));
        List<ScheduleValidator.ScheduleError> errors = validator.validate(stops);
        assertEquals(1, errors.size());
        assertEquals("TRAVEL_EXCEEDS_GAP", errors.get(0).type());
        assertEquals(1, errors.get(0).seq());
        assertTrue(errors.get(0).message() != null && !errors.get(0).message().isBlank());
    }
}