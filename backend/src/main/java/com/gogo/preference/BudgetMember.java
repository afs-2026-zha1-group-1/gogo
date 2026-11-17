package com.gogo.preference;

/** One trip member's budget read model (US-024); {@code budget} is null when never saved or cleared. */
public record BudgetMember(long userId, Budget budget) {
}
