package com.gogo.hello.splits.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the pure reunion timing calculator (design D13, Defer-UT timing arithmetic). Verifies
 * totalMinutes = activity + every travel leg + buffer, overrunMinutes = max(0, total - window), missing-input
 * detection and whole-pair feasible aggregation. The calculator is pure domain: no repository, no DB, no HTTP.
 */
class ReunionTimingCalculatorTest {

    private final ReunionTimingCalculator calculator = new ReunionTimingCalculator();

    @Test
    @DisplayName("compute_fixturePairWithinWindow_totals105And110PairFeasible")
    void compute_fixturePairWithinWindow_totals105And110PairFeasible() {
        TimingResult result = calculator.compute(120, List.of(
                new RouteTimingInput("A", 60, List.of(15, 20), 10),
                new RouteTimingInput("B", 60, List.of(20, 20), 10)));
        assertThat(result.windowMinutes()).isEqualTo(120);
        assertThat(result.feasible()).isTrue();
        assertThat(result.routes().get(0).totalMinutes()).isEqualTo(105);
        assertThat(result.routes().get(0).overrunMinutes()).isEqualTo(0);
        assertThat(result.routes().get(0).missingInputs()).isEmpty();
        assertThat(result.routes().get(0).feasible()).isTrue();
        assertThat(result.routes().get(1).totalMinutes()).isEqualTo(110);
        assertThat(result.routes().get(1).feasible()).isTrue();
    }

    @Test
    @DisplayName("compute_lastLegOverrun_total125Overrun5PairInfeasibleButBPasses")
    void compute_lastLegOverrun_total125Overrun5PairInfeasibleButBPasses() {
        TimingResult result = calculator.compute(120, List.of(
                new RouteTimingInput("A", 60, List.of(15, 40), 10),
                new RouteTimingInput("B", 60, List.of(20, 20), 10)));
        assertThat(result.feasible()).isFalse();
        assertThat(result.routes().get(0).totalMinutes()).isEqualTo(125);
        assertThat(result.routes().get(0).overrunMinutes()).isEqualTo(5);
        assertThat(result.routes().get(0).feasible()).isFalse();
        assertThat(result.routes().get(1).totalMinutes()).isEqualTo(110);
        assertThat(result.routes().get(1).feasible()).isTrue();
    }

    @Test
    @DisplayName("compute_missingActivity_listsMissingInputAndInfeasible")
    void compute_missingActivity_listsMissingInputAndInfeasible() {
        TimingResult result = calculator.compute(120, List.of(
                new RouteTimingInput("A", null, List.of(15, 20), 10),
                new RouteTimingInput("B", 60, List.of(20, 20), 10)));
        assertThat(result.feasible()).isFalse();
        assertThat(result.routes().get(0).missingInputs()).contains("activityMinutes");
        assertThat(result.routes().get(0).totalMinutes()).isNull();
        assertThat(result.routes().get(0).feasible()).isFalse();
    }

    @Test
    @DisplayName("compute_missingLastLeg_listsMissingLegAndInfeasible")
    void compute_missingLastLeg_listsMissingLegAndInfeasible() {
        List<Integer> legs = new ArrayList<>();
        legs.add(15);
        legs.add(null);
        TimingResult result = calculator.compute(120, List.of(
                new RouteTimingInput("A", 60, legs, 10),
                new RouteTimingInput("B", 60, List.of(20, 20), 10)));
        assertThat(result.feasible()).isFalse();
        assertThat(result.routes().get(0).missingInputs()).contains("travelLegsMinutes[1]");
        assertThat(result.routes().get(0).totalMinutes()).isNull();
        assertThat(result.routes().get(0).feasible()).isFalse();
    }
}