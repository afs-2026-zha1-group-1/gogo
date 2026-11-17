package com.gogo.preference;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * The ten predefined interests. The wire value is the Chinese label, the stored value is the
 * code; matching is literal on the label (no case folding, trimming, aliases or substrings).
 */
public final class InterestCatalogue {

    private static final List<String> LABELS = List.of(
            "水上运动", "潜水", "摄影", "美食", "咖啡", "历史人文", "手作", "自然风景", "冒险", "慢游");

    private static final List<String> CODES = List.of(
            "water", "diving", "photo", "food", "coffee", "heritage", "craft", "nature",
            "adventure", "slow");

    private InterestCatalogue() {
    }

    static List<String> labels() {
        return LABELS;
    }

    static Optional<String> codeOf(String label) {
        int index = LABELS.indexOf(label);
        return index < 0 ? Optional.empty() : Optional.of(CODES.get(index));
    }

    public static Optional<String> labelOf(String code) {
        int index = CODES.indexOf(code);
        return index < 0 ? Optional.empty() : Optional.of(LABELS.get(index));
    }

    static List<String> labelsOf(List<String> codes) {
        List<String> labels = new ArrayList<>();
        for (String code : codes) {
            int index = CODES.indexOf(code);
            if (index >= 0) {
                labels.add(LABELS.get(index));
            }
        }
        return labels;
    }
}
