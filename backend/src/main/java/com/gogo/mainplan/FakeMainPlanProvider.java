package com.gogo.mainplan;

import java.util.List;
import java.util.Locale;

// The no-key implementation (design D2): deterministic stops with supplied
// times, legs and a per-person cost. Fixtures are keyed by destination so a
// demo selecting 香港 or 伦敦 gets a city-appropriate day; anything else keeps
// the original Singapore fixture. No external HTTP client anywhere.
public class FakeMainPlanProvider implements MainPlanProvider {

    private static final List<MainPlanResult.PlannedStop> SINGAPORE = List.of(
            new MainPlanResult.PlannedStop(1, "City Hall MRT", "09:00", "09:30", 30,
                    List.of("culture")),
            new MainPlanResult.PlannedStop(2, "National Gallery Singapore", "10:00", "10:30", 30,
                    List.of("art", "culture")),
            new MainPlanResult.PlannedStop(3, "Gardens by the Bay", "11:00", "11:15", 15,
                    List.of("nature")),
            new MainPlanResult.PlannedStop(4, "Merlion Park", "11:30", "12:00", null,
                    List.of("culture")));

    private static final List<MainPlanResult.PlannedStop> HONG_KONG = List.of(
            new MainPlanResult.PlannedStop(1, "西九文化区 M+ 博物馆", "09:00", "10:20", 20,
                    List.of("heritage", "photo")),
            new MainPlanResult.PlannedStop(2, "天星小轮（尖沙咀 → 中环）", "10:40", "11:10", 15,
                    List.of("slow", "photo")),
            new MainPlanResult.PlannedStop(3, "中环街市与半山扶梯", "11:25", "12:45", 20,
                    List.of("food", "craft")),
            new MainPlanResult.PlannedStop(4, "太平山顶与凌霄阁", "13:05", "14:35", 40,
                    List.of("nature", "photo")),
            new MainPlanResult.PlannedStop(5, "铜锣湾时代广场", "15:15", "16:30", 25,
                    List.of("food", "craft")),
            new MainPlanResult.PlannedStop(6, "尖沙咀海滨长廊与星光大道", "16:55", "18:10", null,
                    List.of("photo", "slow")));

    private static final List<MainPlanResult.PlannedStop> LONDON = List.of(
            new MainPlanResult.PlannedStop(1, "大英博物馆", "09:00", "10:30", 20,
                    List.of("heritage", "photo")),
            new MainPlanResult.PlannedStop(2, "考文特花园", "10:50", "11:50", 15,
                    List.of("food", "craft")),
            new MainPlanResult.PlannedStop(3, "国家美术馆与特拉法加广场", "12:05", "13:05", 20,
                    List.of("heritage", "photo")),
            new MainPlanResult.PlannedStop(4, "博罗市场午餐", "13:25", "14:25", 20,
                    List.of("food", "coffee")),
            new MainPlanResult.PlannedStop(5, "伦敦塔与塔桥", "14:45", "16:15", 25,
                    List.of("heritage", "photo")),
            new MainPlanResult.PlannedStop(6, "泰晤士河游船（塔桥 → 威斯敏斯特）", "16:40", "17:40", 20,
                    List.of("slow", "photo")),
            new MainPlanResult.PlannedStop(7, "伦敦眼与南岸夜景", "18:00", "19:15", null,
                    List.of("photo", "slow")));

    @Override
    public MainPlanResult plan(TripContext trip, List<MemberInput> inputs) {
        String destination = trip.destination() == null ? "" : trip.destination().trim();
        if (isHongKong(destination)) {
            return new MainPlanResult(HONG_KONG, 68000);
        }
        if (isLondon(destination)) {
            return new MainPlanResult(LONDON, 9500);
        }
        return new MainPlanResult(SINGAPORE, 5000);
    }

    private static boolean isHongKong(String destination) {
        String lower = destination.toLowerCase(Locale.ROOT);
        return destination.contains("香港") || lower.contains("hong kong");
    }

    private static boolean isLondon(String destination) {
        return destination.contains("伦敦") || destination.toLowerCase(Locale.ROOT).contains("london");
    }
}
