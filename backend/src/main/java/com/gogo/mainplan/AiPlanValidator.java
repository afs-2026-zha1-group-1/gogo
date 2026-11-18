package com.gogo.mainplan;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// Output contract before persistence (design D5). Anything outside this shape
// is invalid output, which the provider turns into the minimal fallback.
class AiPlanValidator {

    private static final Pattern HH_MM = Pattern.compile("^([01]\\d|2[0-3]):([0-5]\\d)$");

    MainPlanResult validate(String content, ObjectMapper objectMapper) {
        JsonNode root = read(objectMapper, content);
        if (!root.isObject()) {
            throw invalid("The plan root must be a JSON object");
        }
        JsonNode costNode = root.path("costPerPersonCents");
        if (!costNode.isIntegralNumber() || costNode.asInt() < 0) {
            throw invalid("costPerPersonCents must be a nonnegative integer");
        }
        JsonNode stopsNode = root.path("stops");
        if (!stopsNode.isArray() || stopsNode.size() < 2) {
            throw invalid("stops must contain at least two entries");
        }
        List<MainPlanResult.PlannedStop> stops = new ArrayList<>();
        for (int i = 0; i < stopsNode.size(); i++) {
            JsonNode stop = stopsNode.get(i);
            int seq = integer(stop, "seq");
            if (seq != i + 1) {
                throw invalid("seq must start at 1 and be contiguous");
            }
            String name = text(stop, "name");
            int start = minutes(text(stop, "startTime"));
            int end = minutes(text(stop, "endTime"));
            if (end <= start) {
                throw invalid("every stop must end after it starts");
            }
            boolean last = i == stopsNode.size() - 1;
            Integer leg = null;
            if (last) {
                JsonNode legNode = stop.path("travelMinutesToNext");
                if (!legNode.isMissingNode() && !legNode.isNull()) {
                    throw invalid("the last stop must have a null travel leg");
                }
            } else {
                leg = integer(stop, "travelMinutesToNext");
                if (leg < 0) {
                    throw invalid("travel legs must be zero or more minutes");
                }
            }
            stops.add(new MainPlanResult.PlannedStop(seq, name, text(stop, "startTime"),
                    text(stop, "endTime"), leg, interests(stop)));
        }
        return new MainPlanResult(stops, costNode.asInt());
    }

    private static JsonNode read(ObjectMapper objectMapper, String content) {
        try {
            return objectMapper.readTree(content);
        } catch (JsonProcessingException cause) {
            throw new PlanAiException(PlanAiException.Reason.INVALID_OUTPUT,
                    "The model output is not JSON", cause);
        }
    }

    private static int integer(JsonNode stop, String field) {
        JsonNode value = stop.path(field);
        if (!value.isIntegralNumber()) {
            throw invalid(field + " must be an integer on every stop");
        }
        return value.asInt();
    }

    private static String text(JsonNode stop, String field) {
        JsonNode value = stop.path(field);
        if (!value.isTextual() || value.asText().isBlank()) {
            throw invalid(field + " must be a nonblank string on every stop");
        }
        return value.asText();
    }

    private static List<String> interests(JsonNode stop) {
        JsonNode value = stop.path("interests");
        if (value.isMissingNode() || value.isNull()) {
            return List.of();
        }
        if (!value.isArray()) {
            throw invalid("interests must be an array of strings");
        }
        List<String> tags = new ArrayList<>();
        for (JsonNode tag : value) {
            if (!tag.isTextual()) {
                throw invalid("interests must be an array of strings");
            }
            tags.add(tag.asText());
        }
        return tags;
    }

    private static int minutes(String value) {
        Matcher matcher = HH_MM.matcher(value);
        if (!matcher.matches()) {
            throw invalid("startTime and endTime must use HH:mm");
        }
        return Integer.parseInt(matcher.group(1)) * 60 + Integer.parseInt(matcher.group(2));
    }

    private static PlanAiException invalid(String message) {
        return new PlanAiException(PlanAiException.Reason.INVALID_OUTPUT, message);
    }
}
