package com.gogo.hello.splits.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Split budget arithmetic (US-045, design SB1–SB5). Pure domain component: it receives the numbers, never reads the
 * database or HTTP.
 *
 * <p>One member's trip cost while splintered is {@code remainingSharedCost + squadCost(group)}:</p>
 * <ul>
 *   <li>{@code remainingSharedCost} = every main-plan stop cost minus the stops inside the split window (the
 *       activities the branch replaced). Shared stops outside the window keep applying to both groups.</li>
 *   <li>{@code squadCost} = the group's costed activities (main-line stops for the group that follows the plan, the
 *       mock/AI/manual activities otherwise).</li>
 * </ul>
 * The replaced cost is reported for transparency but never added again, so a replaced activity is never counted
 * twice. A hard budget overrun blocks. A soft budget's effective cap is 120% of the stated amount (the "soft ≈
 * ±20%" convention the preference page explains): a total above that cap is a reminder and the reported overrun is
 * the amount above the cap, not above the stated amount. Equality passes (same rule as {@code BudgetOverruns}). No
 * currency conversion: budgets arrive already in minor units of the trip currency.
 */
public class SplitBudgetCalculator {

    public static final String STATUS_WITHIN = "within";
    public static final String STATUS_SOFT_OVERRUN = "soft_over";
    public static final String STATUS_HARD_OVERRUN = "hard_over";
    public static final String STATUS_NO_BUDGET = "no_budget";

    /** Soft budget effective cap: 120% of the stated amount; only a total above it triggers the reminder. */
    static final int SOFT_TOLERANCE_PERCENT = 20;

    public record MemberBudget(String memberId, String displayName, Integer amount, String currency,
            String limitType) {
    }

    public record GroupInput(String groupLabel, List<String> memberIds, List<RouteActivity> activities) {
    }

    public record MemberResult(String memberId, String displayName, String groupLabel, Integer budgetAmount,
            String currency, String limitType, int totalCostCents, int overrunCents, String status) {
    }

    public record GroupResult(String groupLabel, List<String> memberIds, int squadCostCents, int totalCostCents,
            List<MemberResult> members) {
    }

    public record Result(int totalSharedCostCents, int replacedCostCents, int remainingSharedCostCents,
            List<GroupResult> groups, boolean blocked, boolean softReminder) {
    }

    public Result compute(int totalSharedCostCents, int replacedCostCents, List<GroupInput> groups,
            Map<String, MemberBudget> budgets) {
        int remainingShared = Math.max(0, totalSharedCostCents - replacedCostCents);
        List<GroupResult> groupResults = new ArrayList<>();
        boolean blocked = false;
        boolean softReminder = false;
        for (GroupInput group : groups) {
            int squadCost = squadCost(group.activities());
            int total = remainingShared + squadCost;
            List<MemberResult> members = new ArrayList<>();
            for (String memberId : group.memberIds()) {
                MemberBudget budget = budgets.get(memberId);
                MemberResult result = verdict(group.groupLabel(), memberId, total, budget);
                if (STATUS_HARD_OVERRUN.equals(result.status())) {
                    blocked = true;
                }
                if (STATUS_SOFT_OVERRUN.equals(result.status())) {
                    softReminder = true;
                }
                members.add(result);
            }
            groupResults.add(new GroupResult(group.groupLabel(), List.copyOf(group.memberIds()), squadCost, total,
                    List.copyOf(members)));
        }
        return new Result(totalSharedCostCents, replacedCostCents, remainingShared, List.copyOf(groupResults),
                blocked, softReminder);
    }

    /** Sum of the group's costed activities; an empty/null list costs nothing inside the window. */
    public int squadCost(List<RouteActivity> activities) {
        if (activities == null) {
            return 0;
        }
        return activities.stream().mapToInt(RouteActivity::costCents).sum();
    }

    /** Budgets keyed by member id; a member without a stored budget has no limit at all. */
    public Map<String, MemberBudget> index(List<MemberBudget> budgets) {
        Map<String, MemberBudget> index = new LinkedHashMap<>();
        for (MemberBudget budget : budgets) {
            index.put(budget.memberId(), budget);
        }
        return index;
    }

    public MemberResult verdict(String groupLabel, String memberId, int totalCostCents, MemberBudget budget) {
        Integer amount = budget == null ? null : budget.amount();
        String currency = budget == null ? null : budget.currency();
        String limitType = budget == null ? null : budget.limitType();
        String displayName = budget == null ? null : budget.displayName();
        if (amount == null) {
            return new MemberResult(memberId, displayName, groupLabel, null, null, null, totalCostCents, 0,
                    STATUS_NO_BUDGET);
        }
        long budgetCents = (long) amount * 100;
        if (!"soft".equals(limitType)) {
            if (totalCostCents <= budgetCents) {
                return new MemberResult(memberId, displayName, groupLabel, amount, currency, limitType,
                        totalCostCents, 0, STATUS_WITHIN);
            }
            int overrun = (int) Math.min(Integer.MAX_VALUE, totalCostCents - budgetCents);
            return new MemberResult(memberId, displayName, groupLabel, amount, currency, limitType, totalCostCents,
                    overrun, STATUS_HARD_OVERRUN);
        }
        // Soft budgets allow the stated +20% band: 800 -> effective cap 960, so 1000 overruns by 40.
        long softCapCents = budgetCents * (100 + SOFT_TOLERANCE_PERCENT) / 100;
        if (totalCostCents <= softCapCents) {
            return new MemberResult(memberId, displayName, groupLabel, amount, currency, limitType, totalCostCents,
                    0, STATUS_WITHIN);
        }
        int softOverrun = (int) Math.min(Integer.MAX_VALUE, totalCostCents - softCapCents);
        return new MemberResult(memberId, displayName, groupLabel, amount, currency, limitType, totalCostCents,
                softOverrun, STATUS_SOFT_OVERRUN);
    }
}
