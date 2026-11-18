package com.gogo.hello.splits.dto;

/** POST .../split-draft/activities:recommend body (US-045): which group the mock AI should suggest activities for. */
public record RecommendActivitiesRequest(String groupLabel, int draftVersion) {
}
