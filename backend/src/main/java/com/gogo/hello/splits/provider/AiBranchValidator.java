package com.gogo.hello.splits.provider;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.hello.splits.domain.RouteStep;
import com.gogo.mainplan.PlanAiException;

/**
 * Output contract for the AI-generated group-B branch route (spec AI1/AI2-N, design D4). Anything outside the
 * fixed shape is {@link PlanAiException}(INVALID_OUTPUT), which {@link AiBranchCandidateProvider} turns into the
 * deterministic fixture fallback; nothing is persisted partially. Group B is a station list plus an outbound and a
 * return leg, so the travel legs count equals the stops plus one, and the whole route (stays + legs + zero buffer)
 * must fit the split window derived from the boundary stops.
 */
public class AiBranchValidator {

    public record BranchRoute(List<RouteStep> steps, List<Integer> travelLegsMinutes, List<Integer> costsCents) {
    }

    private static final int MAX_STEPS = 10;

    public BranchRoute validate(String content, long windowMinutes, ObjectMapper objectMapper) {
        JsonNode root = read(objectMapper, content);
        if (!root.isObject()) {
            throw invalid("The branch route root must be a JSON object");
        }
        JsonNode stepsNode = root.path("steps");
        if (!stepsNode.isArray() || stepsNode.isEmpty() || stepsNode.size() > MAX_STEPS) {
            throw invalid("steps must contain between 1 and " + MAX_STEPS + " entries");
        }
        List<RouteStep> steps = new ArrayList<>();
        List<Integer> costs = new ArrayList<>();
        int activityMinutes = 0;
        for (JsonNode step : stepsNode) {
            String name = text(step, "name");
            int minutes = nonNegativeInt(step, "minutes");
            activityMinutes += minutes;
            steps.add(new RouteStep(name, minutes));
            costs.add(optionalNonNegativeInt(step, "costCents"));
        }
        JsonNode legsNode = root.path("travelLegsMinutes");
        if (!legsNode.isArray() || legsNode.size() != steps.size() + 1) {
            throw invalid("travelLegsMinutes must contain one entry per group-B stop plus one");
        }
        List<Integer> legs = new ArrayList<>();
        int travelMinutes = 0;
        for (JsonNode leg : legsNode) {
            if (!leg.isIntegralNumber() || leg.asInt() < 0) {
                throw invalid("every travelLegsMinutes entry must be a nonnegative integer");
            }
            travelMinutes += leg.asInt();
            legs.add(leg.asInt());
        }
        int total = activityMinutes + travelMinutes;
        if (total > windowMinutes) {
            throw invalid("the branch route total (" + total + ") must not exceed the window (" + windowMinutes + ")");
        }
        return new BranchRoute(steps, legs, costs);
    }

    private static JsonNode read(ObjectMapper objectMapper, String content) {
        try {
            return objectMapper.readTree(content);
        } catch (JsonProcessingException cause) {
            throw new PlanAiException(PlanAiException.Reason.INVALID_OUTPUT, "The model output is not JSON", cause);
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isTextual() || value.asText().isBlank()) {
            throw invalid(field + " must be a nonblank string");
        }
        return value.asText().trim();
    }

    private static int nonNegativeInt(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isIntegralNumber() || value.asInt() < 0) {
            throw invalid(field + " must be a nonnegative integer");
        }
        return value.asInt();
    }

    /** Optional per-person cost in minor units (US-045); absent means free. */
    private static int optionalNonNegativeInt(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return 0;
        }
        if (!value.isIntegralNumber() || value.asInt() < 0) {
            throw invalid(field + " must be a nonnegative integer when present");
        }
        return value.asInt();
    }

    private static PlanAiException invalid(String message) {
        return new PlanAiException(PlanAiException.Reason.INVALID_OUTPUT, message);
    }
}