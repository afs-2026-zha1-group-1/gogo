package com.gogo.hello.splits.domain;

/**
 * One activity the group pays for during the split window (US-045). {@code costCents} is the per-person cost in the
 * same minor unit as the main-plan cost and the member budgets, so the budget check never converts currency.
 * {@code source} records where the item came from: {@code main} (a confirmed main-plan stop the group still follows),
 * {@code ai} (the mock squad-activity recommendation) or {@code manual} (typed in by a member). Pure value object.
 */
public record RouteActivity(String name, String location, int costCents, String source) {

    public static final String SOURCE_MAIN = "main";
    public static final String SOURCE_AI = "ai";
    public static final String SOURCE_MANUAL = "manual";
}
