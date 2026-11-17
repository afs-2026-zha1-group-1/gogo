package com.gogo.preference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

// REQ-020 apply-time unit checks (ATDD design UT-1, UT-2): the two pure helpers behind the
// validation steps, asserted directly so a regression names the helper rather than an endpoint.
class MustDoValidatorTest {

    // UT-1: trim plus blank-to-null normalisation of the three strings.
    @Test
    void trimToNullNormalisesBlankToNull() {
        assertNull(MustDoValidator.trimToNull(null));
        assertNull(MustDoValidator.trimToNull(""));
        assertNull(MustDoValidator.trimToNull("   "));
        assertNull(MustDoValidator.trimToNull("\t \n"));
        assertEquals("Museum", MustDoValidator.trimToNull("  Museum  "));
        assertEquals("10:00", MustDoValidator.trimToNull(" 10:00 "));
    }

    // UT-2: the HH:mm predicate over the accepted values and the six delta-listed rejections.
    @Test
    void timePredicateAcceptsPadded24HourAndRejectsTheListedMalformations() {
        for (String time : List.of("00:00", "09:30", "10:00", "23:59", "12:00")) {
            assertTrue(MustDoValidator.isValidTime(time), "should accept: " + time);
        }
        for (String rejected : List.of("10:0", "10:00:00", "25:00", "10am", "1 0:00", "24:00")) {
            assertFalse(MustDoValidator.isValidTime(rejected), "should reject: " + rejected);
        }
        assertFalse(MustDoValidator.isValidTime(null), "a null time simply stays absent");
    }

    // Steps 6 before 7 (MDS-14) and foreign = unknown (MDS-13) are the validator's own decisions.
    @Test
    void duplicateIdIsReportedBeforeUnknownId() {
        List<MustDoItem> request = List.of(
                new MustDoItem(9L, "A", "La", null),
                new MustDoItem(9L, "B", "Lb", null));
        MustDoApiException duplicate = assertThrows(MustDoApiException.class, () ->
                MustDoValidator.validate(request, Set.of(1L)));
        assertEquals("MUST_DO_ITEM_DUPLICATE_ID", duplicate.code());

        MustDoApiException unknown = assertThrows(MustDoApiException.class, () ->
                MustDoValidator.validate(List.of(new MustDoItem(9L, "A", "La", null)), Set.of(1L)));
        assertEquals("MUST_DO_ITEM_UNKNOWN", unknown.code());
    }
}
