package com.gogo.hello.splits.provider;

import static org.assertj.core.api.Assertions.assertThat;

import com.gogo.hello.splits.domain.RouteActivity;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the mock squad-activity recommendation (US-045 SB6). The suggestion must never exceed the group's
 * remaining budget; the most expensive fitting item wins, an empty list means nothing fits, and the city catalogue
 * follows the trip destination (合肥 included for the demo plan).
 */
class MockSquadActivityRecommenderTest {

    private final MockSquadActivityRecommender recommender = new MockSquadActivityRecommender();

    @Test
    @DisplayName("recommend_picksTheMostExpensiveItemWithinTheRemainingBudget")
    void recommend_picksTheMostExpensiveItemWithinTheRemainingBudget() {
        List<RouteActivity> suggestion = recommender.recommend("合肥", 2500);
        assertThat(suggestion).hasSize(1);
        assertThat(suggestion.get(0).name()).isEqualTo("合柴 1972 文创园");
        assertThat(suggestion.get(0).costCents()).isEqualTo(2000);
        assertThat(suggestion.get(0).source()).isEqualTo("ai");
    }

    @Test
    @DisplayName("recommend_noAffordableItem_returnsEmptyList")
    void recommend_noAffordableItem_returnsEmptyList() {
        assertThat(recommender.recommend("Singapore", 500)).isEmpty();
        assertThat(recommender.recommend("合肥", -1)).isEmpty();
    }

    @Test
    @DisplayName("recommend_withoutAnyBudget_returnsACatalogueSuggestion")
    void recommend_withoutAnyBudget_returnsACatalogueSuggestion() {
        assertThat(recommender.recommend("合肥", null)).hasSize(1);
        assertThat(recommender.recommend("Singapore", null)).hasSize(1);
    }
}
