package com.gogo.preference;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * The seven predefined interests. The wire value is the label, the stored value is the
 * code; matching is literal (no case folding, trimming, aliases or substrings).
 */
public final class InterestCatalogue {

    private static final List<String> LABELS = List.of(
            "Art", "Nature", "Culture", "History", "Food", "Shopping", "Adventure");

    private static final List<String> CODES = List.of(
            "art", "nature", "culture", "history", "food", "shopping", "adventure");

    private InterestCatalogue() {
    }

    static List<String> labels() {
        return LABELS;
    }

    static Optional<String> codeOf(String label) {
        int index = LABELS.indexOf(label);
        return index < 0 ? Optional.empty() : Optional.of(CODES.get(index));
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
