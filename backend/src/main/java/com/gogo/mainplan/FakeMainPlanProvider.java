package com.gogo.mainplan;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import com.gogo.hello.common.MockDestinations;

// The deterministic implementation (design D2): supplied times, legs and a per-person cost.
// 珠海/香港 always use their fixed two-day plan, even when an LLM key is configured; other
// destinations use the city fixture only when no key is configured. No external HTTP client here.
// US-045: the plan total is the sum of the stop costs, so the split budget check
// can subtract a replaced activity exactly.
// US-079: address/city are the AI-generation contract fields; coordinates are
// completed by the service from place_cache at persist time, not by providers.
public class FakeMainPlanProvider implements MainPlanProvider {

    private static final List<MainPlanResult.PlannedStop> SINGAPORE = List.of(
            new MainPlanResult.PlannedStop(1, "City Hall MRT", "09:00", "09:30", 30,
                    List.of("culture"), "150 North Bridge Rd, Singapore 179100", "Singapore", 500),
            new MainPlanResult.PlannedStop(2, "National Gallery Singapore", "10:00", "10:30", 30,
                    List.of("art", "culture"), "1 St Andrew's Rd, Singapore 179097", "Singapore", 1500),
            new MainPlanResult.PlannedStop(3, "Gardens by the Bay", "11:00", "11:15", 15,
                    List.of("nature"), "18 Marina Gardens Dr, Singapore 018953", "Singapore", 2000),
            new MainPlanResult.PlannedStop(4, "Merlion Park", "11:30", "12:00", null,
                    List.of("culture"), "1 Fullerton Rd, Singapore 049213", "Singapore", 1000));

    // 珠海/香港 demos are fixed regardless of the LLM key: two days, two main-plan stops per day.
    // The remaining two places are added to group B by FixtureBranchCandidateProvider.
    private static final List<List<MainPlanResult.PlannedStop>> ZHUHAI_DAYS = List.of(
            List.of(
                    new MainPlanResult.PlannedStop(1, "日月贝（珠海大剧院）", "09:00", "10:30", 30,
                            List.of("photo", "culture"), null, "珠海", 0),
                    new MainPlanResult.PlannedStop(2, "爱情邮局", "14:00", "16:00", null,
                            List.of("photo", "slow"), null, "珠海", 0)),
            List.of(
                    new MainPlanResult.PlannedStop(1, "情侣路", "09:00", "11:00", 30,
                            List.of("slow", "nature"), null, "珠海", 0),
                    new MainPlanResult.PlannedStop(2, "圆明新园", "14:00", "16:30", null,
                            List.of("culture", "heritage"), null, "珠海", 0)));

    private static final List<List<MainPlanResult.PlannedStop>> HONG_KONG_DAYS = List.of(
            List.of(
                    new MainPlanResult.PlannedStop(1, "维多利亚港", "09:00", "10:30", 20,
                            List.of("photo", "slow"), null, "香港", 0),
                    new MainPlanResult.PlannedStop(2, "太平山顶", "14:00", "16:00", null,
                            List.of("nature", "photo"), null, "香港", 0)),
            List.of(
                    new MainPlanResult.PlannedStop(1, "旺角", "09:00", "11:00", 20,
                            List.of("food", "craft"), null, "香港", 0),
                    new MainPlanResult.PlannedStop(2, "尖沙咀", "14:00", "16:30", null,
                            List.of("food", "photo"), null, "香港", 0)));

    private static final List<MainPlanResult.PlannedStop> LONDON = List.of(
            new MainPlanResult.PlannedStop(1, "大英博物馆", "09:00", "10:30", 20,
                    List.of("heritage", "photo"), "伦敦大罗素街大英博物馆（Great Russell St, WC1B 3DG）", "伦敦", 0),
            new MainPlanResult.PlannedStop(2, "考文特花园", "10:50", "11:50", 15,
                    List.of("food", "craft"), "伦敦考文特花园市集（Covent Garden, WC2E 8RF）", "伦敦", 1500),
            new MainPlanResult.PlannedStop(3, "国家美术馆与特拉法加广场", "12:05", "13:05", 20,
                    List.of("heritage", "photo"), "伦敦特拉法加广场国家美术馆（WC2N 5DN）", "伦敦", 0),
            new MainPlanResult.PlannedStop(4, "博罗市场午餐", "13:25", "14:25", 20,
                    List.of("food", "coffee"), "伦敦南华克街 8 号博罗市场（8 Southwark St, SE1 1TL）", "伦敦", 2500),
            new MainPlanResult.PlannedStop(5, "伦敦塔与塔桥", "14:45", "16:15", 25,
                    List.of("heritage", "photo"), "伦敦塔桥路伦敦塔（Tower Bridge Rd, SE1 2UP）", "伦敦", 3500),
            new MainPlanResult.PlannedStop(6, "泰晤士河游船（塔桥 → 威斯敏斯特）", "16:40", "17:40", 20,
                    List.of("slow", "photo"), "伦敦塔桥千禧码头（Tower Millennium Pier, SE1 2UP）", "伦敦", 2000),
            new MainPlanResult.PlannedStop(7, "伦敦眼与南岸夜景", "18:00", "19:15", null,
                    List.of("photo", "slow"), "伦敦南岸郡政厅伦敦眼（County Hall, SE1 7PB）", "伦敦", 0));

    // 合肥演示方案（用户给定）：爬山免费 -> 披萨 100 元 -> 之心城购物 1000 元 -> 官亭路小吃 100 元。
    // 人均合计 1200 元 = 120000 分；11:00 与 13:00 两个衔接点留给通勤的时间分别为 0 / 20 分钟，
    // 满足 ScheduleValidator 的「结束 + 路程 <= 下一站开始」规则。
    private static final List<MainPlanResult.PlannedStop> HEFEI = List.of(
            new MainPlanResult.PlannedStop(1, "大蜀山森林公园", "09:00", "11:00", 0,
                    List.of("nature", "adventure"), null, "合肥", 0),
            new MainPlanResult.PlannedStop(2, "红星路步行街披萨店", "11:00", "13:00", 20,
                    List.of("food"), null, "合肥", 10000),
            new MainPlanResult.PlannedStop(3, "之心城购物中心", "14:00", "17:00", 20,
                    List.of("slow", "food"), null, "合肥", 100000),
            new MainPlanResult.PlannedStop(4, "官亭路步行街小吃", "18:00", "20:00", null,
                    List.of("food", "slow"), null, "合肥", 10000));

    @Override
    public MainPlanResult plan(TripContext trip, List<MemberInput> inputs) {
        String destination = trip.destination() == null ? "" : trip.destination().trim();
        if (MockDestinations.isZhuhai(destination)) {
            return twoDayPlan(ZHUHAI_DAYS, trip.dayCount());
        }
        if (MockDestinations.isHongKong(destination)) {
            return twoDayPlan(HONG_KONG_DAYS, trip.dayCount());
        }
        List<MainPlanResult.PlannedStop> day = isLondon(destination) ? LONDON
                : isHefei(destination) ? HEFEI
                : SINGAPORE;
        List<MainPlanResult.PlannedStop> stops = repeatForDays(day, trip.dayCount());
        return new MainPlanResult(stops, MainPlanResult.totalCost(stops));
    }

    /** 珠海/香港 demos are capped at two days, two main-plan stops each. */
    private static MainPlanResult twoDayPlan(List<List<MainPlanResult.PlannedStop>> days, int tripDays) {
        int useDays = Math.min(Math.max(1, tripDays), days.size());
        List<MainPlanResult.PlannedStop> stops = new ArrayList<>();
        int seq = 1;
        for (int dayIndex = 1; dayIndex <= useDays; dayIndex++) {
            for (MainPlanResult.PlannedStop stop : days.get(dayIndex - 1)) {
                stops.add(new MainPlanResult.PlannedStop(seq++, stop.name(), stop.startTime(), stop.endTime(),
                        stop.travelMinutesToNext(), stop.interests(), stop.address(), stop.city(),
                        stop.costCents(), dayIndex));
            }
        }
        return new MainPlanResult(stops, MainPlanResult.totalCost(stops));
    }

    /** The no-key fixture covers every trip day; each day reuses the city's stop list. */
    private static List<MainPlanResult.PlannedStop> repeatForDays(List<MainPlanResult.PlannedStop> day, int days) {
        List<MainPlanResult.PlannedStop> stops = new ArrayList<>();
        int seq = 1;
        for (int dayIndex = 1; dayIndex <= days; dayIndex++) {
            for (MainPlanResult.PlannedStop stop : day) {
                stops.add(new MainPlanResult.PlannedStop(seq++, stop.name(), stop.startTime(), stop.endTime(),
                        stop.travelMinutesToNext(), stop.interests(), stop.address(), stop.city(),
                        stop.costCents(), dayIndex));
            }
        }
        return stops;
    }

    private static boolean isLondon(String destination) {
        return destination.contains("伦敦") || destination.toLowerCase(Locale.ROOT).contains("london");
    }

    private static boolean isHefei(String destination) {
        return destination.contains("合肥") || destination.toLowerCase(Locale.ROOT).contains("hefei");
    }
}
