package com.gogo.hello.splits.dto;

import java.util.List;

/**
 * Budget check projection for the split draft (US-045, Screen 15). Amounts are per person in minor units; the
 * budgets are echoed in their stored major units so the screen can label them with the member's currency.
 *
 * <p>{@code replacedCostCents} is the shared cost of the activities inside the split window (the ones the branches
 * replaced). It is reported for transparency only: {@code totalCostCents} = {@code remainingSharedCostCents} +
 * the group's squad cost, so a replaced activity is never counted twice. {@code blocked} is true when at least one
 * hard budget is exceeded (confirmation is refused); a soft overrun only sets {@code softReminder}.</p>
 */
public record BudgetCheckResponse(
        int draftVersion,
        int totalSharedCostCents,
        int replacedCostCents,
        int remainingSharedCostCents,
        boolean blocked,
        boolean softReminder,
        List<GroupBudget> groups,
        List<RoundCost> rounds) {

    /** Per-round group activity cost (US-096). */
    public record RoundCost(int roundIndex, String groupLabel, int squadCostCents) {
    }

    public record GroupBudget(String groupLabel, List<String> memberIds, int squadCostCents, int totalCostCents,
            List<MemberVerdict> members) {
    }

    public record MemberVerdict(String memberId, String displayName, Integer budgetAmount, String currency,
            String limitType, int totalCostCents, int overrunCents, String status) {
    }
}
