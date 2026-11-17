package com.gogo.mainplan;

import java.util.List;

// Generation-inputs summary projection (design D7, fixtures wire set).
// hardBudgetCents null = no limit; rules are the six fixed identifiers.
public record InputsResponse(
        long tripId,
        int readyCount,
        int memberCount,
        List<Member> members,
        List<String> commonInterests,
        List<String> mustDo,
        List<Budget> budgets,
        List<String> rules) {

    public record Member(long userId, String displayName, boolean ready, int preferenceRevision) {
    }

    public record Budget(long userId, String displayName, Integer hardBudgetCents) {
    }
}