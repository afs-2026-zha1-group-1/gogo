package com.gogo.hello.splits.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Pure reunion timing calculator (design D13, orchestration-execution-separation). Computes each group's
 * {@code totalMinutes = activity + every travel leg + buffer}, {@code overrunMinutes = max(0, total - window)} and
 * detects missing inputs; the whole pair is feasible only when every route is feasible. It holds no repository and
 * performs no DB/HTTP access, so the service can own it with {@code new} and the check-timing path stays read-free
 * beyond the entry guard. Not a Spring bean by design.
 */
public class ReunionTimingCalculator {

    public TimingResult compute(long windowMinutes, List<RouteTimingInput> routes) {
        List<RouteTimingResult> results = new ArrayList<>();
        boolean pairFeasible = true;
        for (RouteTimingInput route : routes) {
            List<String> missing = new ArrayList<>();
            if (route.activityMinutes() == null) {
                missing.add("activityMinutes");
            }
            if (route.bufferMinutes() == null) {
                missing.add("bufferMinutes");
            }
            List<Integer> legs = route.travelLegsMinutes();
            if (legs == null) {
                missing.add("travelLegsMinutes");
            } else {
                for (int i = 0; i < legs.size(); i++) {
                    if (legs.get(i) == null) {
                        missing.add("travelLegsMinutes[" + i + "]");
                    }
                }
            }
            Integer total = null;
            Integer overrun = null;
            boolean feasible = false;
            if (missing.isEmpty()) {
                int sum = route.activityMinutes() + route.bufferMinutes();
                for (int leg : legs) {
                    sum += leg;
                }
                total = sum;
                overrun = (int) Math.max(0, total - windowMinutes);
                feasible = overrun == 0;
            }
            if (!feasible) {
                pairFeasible = false;
            }
            results.add(new RouteTimingResult(route.groupLabel(), total, overrun, missing, feasible));
        }
        return new TimingResult(windowMinutes, pairFeasible, results);
    }
}