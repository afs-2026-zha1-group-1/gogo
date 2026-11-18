package com.gogo.hello.splits.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.mainplan.PlanAiException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the B-group AI output contract (spec AI1/AI2-N, design D4). The validator accepts stops with
 * non-negative integer stays and legs count = stops + 1 whose total stays inside the window, and rejects
 * non-JSON, out-of-range stops, empty/negative values, wrong leg counts and over-window totals as
 * {@link PlanAiException}(INVALID_OUTPUT), which the provider turns into the fixture fallback.
 */
class AiBranchValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AiBranchValidator validator = new AiBranchValidator();

    @Test
    @DisplayName("validate_acceptsWellFormedRouteInsideWindow")
    void validate_acceptsWellFormedRouteInsideWindow() {
        AiBranchValidator.BranchRoute route = validator.validate("""
                {"steps":[{"name":"Gardens by the Bay","minutes":60}],
                 "travelLegsMinutes":[15,15]}
                """, 150, objectMapper);

        assertThat(route.steps()).hasSize(1);
        assertThat(route.steps().get(0).name()).isEqualTo("Gardens by the Bay");
        assertThat(route.steps().get(0).minutes()).isEqualTo(60);
        assertThat(route.travelLegsMinutes()).containsExactly(15, 15);
    }

    @Test
    @DisplayName("validate_acceptsMultiStopRouteWithinWindow")
    void validate_acceptsMultiStopRouteWithinWindow() {
        AiBranchValidator.BranchRoute route = validator.validate("""
                {"steps":[{"name":"Market","minutes":30},{"name":"Park","minutes":40}],
                 "travelLegsMinutes":[10,15,20]}
                """, 150, objectMapper);

        assertThat(route.steps()).hasSize(2);
        assertThat(route.travelLegsMinutes()).containsExactly(10, 15, 20);
    }

    @Test
    @DisplayName("validate_rejectsOverWindowTotal")
    void validate_rejectsOverWindowTotal() {
        assertThatThrownBy(() -> validator.validate("""
                {"steps":[{"name":"Gardens by the Bay","minutes":90}],
                 "travelLegsMinutes":[20,20]}
                """, 100, objectMapper))
                .isInstanceOf(PlanAiException.class)
                .hasMessageContaining("window");
    }

    @Test
    @DisplayName("validate_rejectsEmptySteps")
    void validate_rejectsEmptySteps() {
        assertThatThrownBy(() -> validator.validate("""
                {"steps":[],"travelLegsMinutes":[10,10]}
                """, 150, objectMapper))
                .isInstanceOf(PlanAiException.class)
                .hasMessageContaining("steps");
    }

    @Test
    @DisplayName("validate_rejectsTooManySteps")
    void validate_rejectsTooManySteps() {
        StringBuilder steps = new StringBuilder();
        for (int i = 1; i <= 11; i++) {
            if (steps.length() > 0) {
                steps.append(',');
            }
            steps.append("{\"name\":\"Stop").append(i).append("\",\"minutes\":10}");
        }
        assertThatThrownBy(() -> validator.validate(
                "{\"steps\":[" + steps + "],\"travelLegsMinutes\":[10]}", 5000, objectMapper))
                .isInstanceOf(PlanAiException.class)
                .hasMessageContaining("steps");
    }

    @Test
    @DisplayName("validate_rejectsBlankStepName")
    void validate_rejectsBlankStepName() {
        assertThatThrownBy(() -> validator.validate("""
                {"steps":[{"name":"  ","minutes":60}],"travelLegsMinutes":[10,10]}
                """, 150, objectMapper))
                .isInstanceOf(PlanAiException.class)
                .hasMessageContaining("name");
    }

    @Test
    @DisplayName("validate_rejectsNegativeStayMinutes")
    void validate_rejectsNegativeStayMinutes() {
        assertThatThrownBy(() -> validator.validate("""
                {"steps":[{"name":"Market","minutes":-5}],"travelLegsMinutes":[10,10]}
                """, 150, objectMapper))
                .isInstanceOf(PlanAiException.class)
                .hasMessageContaining("minutes");
    }

    @Test
    @DisplayName("validate_rejectsWrongLegCount")
    void validate_rejectsWrongLegCount() {
        assertThatThrownBy(() -> validator.validate("""
                {"steps":[{"name":"Market","minutes":30}],"travelLegsMinutes":[10]}
                """, 150, objectMapper))
                .isInstanceOf(PlanAiException.class)
                .hasMessageContaining("travelLegs");
    }

    @Test
    @DisplayName("validate_rejectsNegativeLeg")
    void validate_rejectsNegativeLeg() {
        assertThatThrownBy(() -> validator.validate("""
                {"steps":[{"name":"Market","minutes":30}],"travelLegsMinutes":[-1,10]}
                """, 150, objectMapper))
                .isInstanceOf(PlanAiException.class)
                .hasMessageContaining("travelLegs");
    }

    @Test
    @DisplayName("validate_rejectsNonJson")
    void validate_rejectsNonJson() {
        assertThatThrownBy(() -> validator.validate("not json", 150, objectMapper))
                .isInstanceOf(PlanAiException.class);
    }
}