package com.gogo.hello.common;

import java.util.Locale;

/** Destinations whose demo data is fixed regardless of the LLM key (珠海 / 香港). */
public final class MockDestinations {

    private MockDestinations() {
    }

    public static boolean isMock(String destination) {
        return isZhuhai(destination) || isHongKong(destination);
    }

    public static boolean isZhuhai(String destination) {
        String value = destination == null ? "" : destination.trim();
        return value.contains("珠海") || value.toLowerCase(Locale.ROOT).contains("zhuhai");
    }

    public static boolean isHongKong(String destination) {
        String value = destination == null ? "" : destination.trim();
        return value.contains("香港") || value.toLowerCase(Locale.ROOT).contains("hong kong");
    }
}
