package com.gogo.mainplan;

import java.util.List;

// One ready member's preference snapshot handed to the provider (design D3).
// hardBudgetCents is null when the member has no hard limit.
public record MemberInput(
        long userId,
        String displayName,
        int preferenceRevision,
        List<String> interests,
        List<String> mustDo,
        Integer hardBudgetCents) {
}