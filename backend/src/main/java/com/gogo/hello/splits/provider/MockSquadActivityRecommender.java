package com.gogo.hello.splits.provider;

import com.gogo.hello.splits.domain.RouteActivity;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Mock "AI" squad-activity recommendation (US-045, design SB6). The real model is not wired yet, so this provider
 * returns a deterministic city catalogue entry whose per-person cost fits the group's remaining budget: the most
 * expensive item that still fits, else nothing (the caller then shows "no recommendation fits"). No network call and
 * no persistence — the client receives the suggestion and saves it through the normal activities endpoint only if it
 * accepts it.
 */
@Component
public class MockSquadActivityRecommender {

    private record Suggestion(String name, String location, int costCents) {
    }

    private static final String HONG_KONG = "香港";
    private static final String LONDON = "伦敦";
    private static final String HEFEI = "合肥";

    private static final List<Suggestion> SINGAPORE = List.of(
            new Suggestion("老城咖啡与街区漫步", "Tiong Bahru", 800),
            new Suggestion("滨海湾花园（花穹）", "Gardens by the Bay", 2200),
            new Suggestion("新加坡国家美术馆", "National Gallery Singapore", 1500));

    private static final List<Suggestion> HONG_KONG_SUGGESTIONS = List.of(
            new Suggestion("中环街市咖啡", "中环街市", 900),
            new Suggestion("PMQ 元创方手作体验", "PMQ 元创方", 2500),
            new Suggestion("香港故宫文化博物馆", "西九文化区", 6000));

    private static final List<Suggestion> LONDON_SUGGESTIONS = List.of(
            new Suggestion("考文特花园咖啡", "Covent Garden", 700),
            new Suggestion("泰特现代美术馆（特展）", "Tate Modern", 1800),
            new Suggestion("伦敦塔桥与河畔漫步", "Tower Bridge", 3000));

    private static final List<Suggestion> HEFEI_SUGGESTIONS = List.of(
            new Suggestion("逍遥津公园漫步", "逍遥津公园", 0),
            new Suggestion("罍街小吃", "宁国路罍街", 3000),
            new Suggestion("合柴 1972 文创园", "金寨南路", 2000));

    /**
     * Picks one suggestion for the group. {@code maxSquadCostCents} is the tightest remaining budget across the
     * group members (null = nobody set a budget), and the returned activity never exceeds it. The most expensive
     * fitting item wins so the recommendation is useful rather than always free.
     */
    public List<RouteActivity> recommend(String destination, Integer maxSquadCostCents) {
        List<Suggestion> catalogue = catalogueOf(destination);
        Suggestion best = null;
        for (Suggestion suggestion : catalogue) {
            if (maxSquadCostCents != null && suggestion.costCents() > maxSquadCostCents) {
                continue;
            }
            if (best == null || suggestion.costCents() > best.costCents()) {
                best = suggestion;
            }
        }
        if (best == null && maxSquadCostCents != null) {
            return List.of();
        }
        if (best == null) {
            best = catalogue.get(catalogue.size() / 2);
        }
        return List.of(new RouteActivity(best.name(), best.location(), best.costCents(), RouteActivity.SOURCE_AI));
    }

    private static List<Suggestion> catalogueOf(String destination) {
        String value = destination == null ? "" : destination.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        if (value.contains("香港") || lower.contains("hong kong")) {
            return HONG_KONG_SUGGESTIONS;
        }
        if (value.contains("伦敦") || lower.contains("london")) {
            return LONDON_SUGGESTIONS;
        }
        if (value.contains("合肥") || lower.contains("hefei")) {
            return HEFEI_SUGGESTIONS;
        }
        return SINGAPORE;
    }
}
