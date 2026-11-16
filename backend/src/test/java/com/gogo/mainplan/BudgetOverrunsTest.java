package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

// UT (ATDD UT-2 deferred to apply): hard-budget overrun arithmetic (design
// D8) — null means no limit, equality passes, overrunCents = cost - budget.
class BudgetOverrunsTest {

    private final BudgetOverruns overruns = new BudgetOverruns();

    private MemberInput member(long userId, String displayName, Integer hardBudgetCents) {
        return new MemberInput(userId, displayName, 1, List.of(), List.of(), hardBudgetCents);
    }

    @Test
    void nullBudgetMeansNoLimit() {
        assertTrue(overruns.compute(List.of(member(1, "Alice", null)), 5000).isEmpty());
    }

    @Test
    void budgetEqualToCostPasses() {
        assertTrue(overruns.compute(List.of(member(1, "Alice", 5000)), 5000).isEmpty());
    }

    @Test
    void budgetAboveCostPasses() {
        assertTrue(overruns.compute(List.of(member(1, "Alice", 9000)), 5000).isEmpty());
    }

    @Test
    void budgetBelowCostReportsTheExactOverrunCents() {
        List<BudgetOverruns.Overrun> result = overruns.compute(List.of(member(1, "Alice", 4000)), 5000);
        assertEquals(1, result.size());
        BudgetOverruns.Overrun overrun = result.get(0);
        assertEquals(1, overrun.userId());
        assertEquals("Alice", overrun.displayName());
        assertEquals(4000, overrun.hardBudgetCents());
        assertEquals(1000, overrun.overrunCents());
    }

    @Test
    void mixedMembersOnlyReportHardBudgetOverrunsInMemberOrder() {
        List<MemberInput> members = List.of(
                member(1, "Alice", 4000),
                member(2, "Ben", null),
                member(3, "Chloe", 6000),
                member(4, "Daniel", 4999));
        List<BudgetOverruns.Overrun> result = overruns.compute(members, 5000);
        assertEquals(2, result.size());
        assertEquals(1, result.get(0).userId());
        assertEquals(1000, result.get(0).overrunCents());
        assertEquals(4, result.get(1).userId());
        assertEquals(1, result.get(1).overrunCents());
    }
}