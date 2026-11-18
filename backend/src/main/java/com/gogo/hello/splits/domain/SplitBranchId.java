package com.gogo.hello.splits.domain;

import java.util.Locale;

/**
 * Branch ids for split route nodes (US-096): {@code split-r{round}-a} / {@code split-r{round}-b}.
 * Legacy round-1 rows used {@code split-a} / {@code split-b}; V18 renames them, and the parser still
 * recognizes the legacy form so a half-migrated database cannot be silently misread. Pure utility.
 */
public final class SplitBranchId {

    private static final String PREFIX = "split-r";

    private SplitBranchId() {
    }

    public static String of(int roundIndex, String groupLabel) {
        return PREFIX + roundIndex + "-" + groupLabel.toLowerCase(Locale.ROOT);
    }

    public static String[] forRound(int roundIndex) {
        return new String[] {of(roundIndex, "A"), of(roundIndex, "B")};
    }

    /** Round index encoded in the id; legacy {@code split-a/b} maps to round 1, unknown ids to null. */
    public static Integer roundOf(String branchId) {
        if (branchId == null) {
            return null;
        }
        if ("split-a".equals(branchId) || "split-b".equals(branchId)) {
            return 1;
        }
        if (!branchId.startsWith(PREFIX)) {
            return null;
        }
        int dash = branchId.indexOf('-', PREFIX.length());
        if (dash < 0) {
            return null;
        }
        try {
            return Integer.parseInt(branchId.substring(PREFIX.length(), dash));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Group label encoded in the id; legacy {@code split-a/b} maps to A/B, unknown ids to null. */
    public static String labelOf(String branchId) {
        if (branchId == null) {
            return null;
        }
        if ("split-a".equals(branchId)) {
            return "A";
        }
        if ("split-b".equals(branchId)) {
            return "B";
        }
        if (branchId.endsWith("-a")) {
            return "A";
        }
        if (branchId.endsWith("-b")) {
            return "B";
        }
        return null;
    }

    /** True for both the new and the legacy split route ids. */
    public static boolean isSplit(String branchId) {
        return roundOf(branchId) != null;
    }
}
