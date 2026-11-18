package com.gogo.hello.splits.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the split budget arithmetic (US-045 SB1–SB5). The calculator is pure: shared total, replaced window
 * cost, group activities and member budgets go in; per-member totals and verdicts come out.
 */
class SplitBudgetCalculatorTest {

    private final SplitBudgetCalculator calculator = new SplitBudgetCalculator();

    private static SplitBudgetCalculator.MemberBudget budget(String id, String name, Integer amount, String type) {
        return new SplitBudgetCalculator.MemberBudget(id, name, amount, amount == null ? null : "SGD", type);
    }

    private static List<RouteActivity> activities(int... costs) {
        List<RouteActivity> result = new java.util.ArrayList<>();
        for (int cost : costs) {
            result.add(new RouteActivity("a" + cost, "loc", cost, RouteActivity.SOURCE_MANUAL));
        }
        return result;
    }

    @Test
    @DisplayName("compute_replacedActivitiesAreExcludedFromTheTotal")
    void compute_replacedActivitiesAreExcludedFromTheTotal() {
        SplitBudgetCalculator.Result result = calculator.compute(5000, 4000,
                List.of(new SplitBudgetCalculator.GroupInput("B", List.of("chloe"), activities(2500))),
                Map.of());
        assertThat(result.totalSharedCostCents()).isEqualTo(5000);
        assertThat(result.replacedCostCents()).isEqualTo(4000);
        assertThat(result.remainingSharedCostCents()).isEqualTo(1000);
        assertThat(result.groups().get(0).squadCostCents()).isEqualTo(2500);
        assertThat(result.groups().get(0).totalCostCents()).isEqualTo(3500);
    }

    @Test
    @DisplayName("compute_hardOverrunBlocks_softOverrunOnlyReminds_equalityPasses")
    void compute_hardOverrunBlocks_softOverrunOnlyReminds_equalityPasses() {
        SplitBudgetCalculator.Result hard = calculator.compute(5000, 4000,
                List.of(new SplitBudgetCalculator.GroupInput("A", List.of("alice"), activities(4000))),
                calculator.index(List.of(budget("alice", "Alice", 40, "hard"))));
        assertThat(hard.blocked()).isTrue();
        assertThat(hard.softReminder()).isFalse();
        assertThat(hard.groups().get(0).members().get(0).status()).isEqualTo("hard_over");
        assertThat(hard.groups().get(0).members().get(0).overrunCents()).isEqualTo(1000);

        SplitBudgetCalculator.Result soft = calculator.compute(5000, 4000,
                List.of(new SplitBudgetCalculator.GroupInput("B", List.of("chloe"), activities(2500))),
                calculator.index(List.of(budget("chloe", "Chloe", 20, "soft"))));
        assertThat(soft.blocked()).isFalse();
        assertThat(soft.softReminder()).isTrue();
        assertThat(soft.groups().get(0).members().get(0).status()).isEqualTo("soft_over");
        // Effective soft cap is 20 × 1.2 = 24 (2400 cents); 3500 is 1100 above the cap, not 1500 above the budget.
        assertThat(soft.groups().get(0).members().get(0).overrunCents()).isEqualTo(1100);

        SplitBudgetCalculator.Result equal = calculator.compute(5000, 4000,
                List.of(new SplitBudgetCalculator.GroupInput("B", List.of("chloe"), activities(2500))),
                calculator.index(List.of(budget("chloe", "Chloe", 35, "hard"))));
        assertThat(equal.blocked()).isFalse();
        assertThat(equal.groups().get(0).members().get(0).status()).isEqualTo("within");
        assertThat(equal.groups().get(0).members().get(0).overrunCents()).isZero();
    }

    @Test
    @DisplayName("compute_softOverrunBelowTwentyPercent_staysWithinWithoutReminder")
    void compute_softOverrunBelowTwentyPercent_staysWithinWithoutReminder() {
        // 3500 vs 3000 = 16.7% over: below the 120% cap (3600), so no reminder at all.
        SplitBudgetCalculator.Result insideBand = calculator.compute(5000, 4000,
                List.of(new SplitBudgetCalculator.GroupInput("B", List.of("chloe"), activities(2500))),
                calculator.index(List.of(budget("chloe", "Chloe", 30, "soft"))));
        assertThat(insideBand.softReminder()).isFalse();
        assertThat(insideBand.blocked()).isFalse();
        assertThat(insideBand.groups().get(0).members().get(0).status()).isEqualTo("within");
        assertThat(insideBand.groups().get(0).members().get(0).overrunCents()).isZero();

        // 3500 vs 2900: cap is 3480, so the reminder reports 20 cents above the cap (not 600 above the budget).
        SplitBudgetCalculator.Result overBand = calculator.compute(5000, 4000,
                List.of(new SplitBudgetCalculator.GroupInput("B", List.of("chloe"), activities(2500))),
                calculator.index(List.of(budget("chloe", "Chloe", 29, "soft"))));
        assertThat(overBand.softReminder()).isTrue();
        assertThat(overBand.groups().get(0).members().get(0).overrunCents()).isEqualTo(20);
    }

    @Test
    @DisplayName("compute_softBudgetOverrunIsMeasuredAgainstTheTwentyPercentCap")
    void compute_softBudgetOverrunIsMeasuredAgainstTheTwentyPercentCap() {
        // User example: soft budget 800, effective cap 960 (96000 cents), spend 1000 -> overrun 40 (4000 cents).
        SplitBudgetCalculator.Result result = calculator.compute(120000, 20000,
                List.of(new SplitBudgetCalculator.GroupInput("B", List.of("chloe"), List.of())),
                calculator.index(List.of(budget("chloe", "Chloe", 800, "soft"))));
        assertThat(result.groups().get(0).totalCostCents()).isEqualTo(100000);
        assertThat(result.softReminder()).isTrue();
        assertThat(result.groups().get(0).members().get(0).status()).isEqualTo("soft_over");
        assertThat(result.groups().get(0).members().get(0).overrunCents()).isEqualTo(4000);
    }

    @Test
    @DisplayName("compute_noBudgetReportsNoBudget_scopeIsPerGroup")
    void compute_noBudgetReportsNoBudget_scopeIsPerGroup() {
        SplitBudgetCalculator.Result result = calculator.compute(5000, 4000, List.of(
                new SplitBudgetCalculator.GroupInput("A", List.of("alice"), activities(4000)),
                new SplitBudgetCalculator.GroupInput("B", List.of("chloe", "daniel"), activities(2500))),
                calculator.index(List.of(budget("daniel", "Daniel", 30, "hard"))));
        assertThat(result.groups().get(0).members().get(0).status()).isEqualTo("no_budget");
        assertThat(result.groups().get(1).members().get(0).status()).isEqualTo("no_budget");
        assertThat(result.groups().get(1).members().get(1).status()).isEqualTo("hard_over");
        assertThat(result.blocked()).isTrue();
    }

    @Test
    @DisplayName("compute_activitiesAfterReplacementEmpty_keepsRemainingSharedCost")
    void compute_activitiesAfterReplacementEmpty_keepsRemainingSharedCost() {
        SplitBudgetCalculator.Result result = calculator.compute(5000, 4000,
                List.of(new SplitBudgetCalculator.GroupInput("B", List.of("chloe"), List.of())), Map.of());
        assertThat(result.groups().get(0).squadCostCents()).isZero();
        assertThat(result.groups().get(0).totalCostCents()).isEqualTo(1000);
    }
}
