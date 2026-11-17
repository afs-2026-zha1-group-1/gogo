package com.gogo.mainplan;

import java.util.List;

// Generation-inputs summary projection (design D7, fixtures wire set).
// hardBudgetCents null = no limit; rules are the six fixed identifiers.
// Screen 9 (US-031) additionally needs the display-ready view: whether a ready member chose
// "no preference", the interest labels behind the codes, the must-do items with their owners, and
// each budget as its stored amount/currency/limit type.
public record InputsResponse(
        long tripId,
        int readyCount,
        int memberCount,
        List<Member> members,
        List<String> commonInterests,
        List<String> mustDo,
        List<Budget> budgets,
        List<String> rules,
        List<String> commonInterestLabels,
        List<MustDo> mustDoItems) {

    public record Member(long userId, String displayName, boolean ready, int preferenceRevision,
            boolean noPreference) {
    }

    public record Budget(long userId, String displayName, Integer hardBudgetCents,
            Integer amount, String currency, String limitType) {
    }

    public record MustDo(String activity, String location, List<String> memberNames) {
    }
}
