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
    private static final int MIN_STOPS_PER_DAY = 2;
    private static final int MAX_STOPS_PER_DAY = 4;
    private static final int EARLIEST_START_MINUTES = 14 * 60;
    private static final int MAX_TRIP_DAYS = 14;

    /** Single-day contract kept for existing callers and fixtures. */
    MainPlanResult validate(String content, ObjectMapper objectMapper) {
        return validate(content, objectMapper, 1);
    }

    MainPlanResult validate(String content, ObjectMapper objectMapper, int expectedDays) {
        int days = Math.max(1, expectedDays);
        if (days > MAX_TRIP_DAYS) {
            throw invalid("the trip spans more than " + MAX_TRIP_DAYS + " days");
        }
        JsonNode root = read(objectMapper, content);
        if (!root.isObject()) {
            throw invalid("The plan root must be a JSON object");
        }
        JsonNode costNode = root.path("costPerPersonCents");
        if (!costNode.isIntegralNumber() || costNode.asInt() < 0) {
            throw invalid("costPerPersonCents must be a nonnegative integer");
        }
        JsonNode stopsNode = root.path("stops");
        if (!stopsNode.isArray() || stopsNode.size() < MIN_STOPS_PER_DAY) {
            throw invalid("stops must contain at least two entries");
        }
        int[] stopsPerDay = new int[days + 1];
        int previousDay = 0;
        List<MainPlanResult.PlannedStop> stops = new ArrayList<>();
        for (int i = 0; i < stopsNode.size(); i++) {
            JsonNode stop = stopsNode.get(i);
            int seq = integer(stop, "seq");
            if (seq != i + 1) {
                throw invalid("seq must start at 1 and be contiguous");
            }
            int dayIndex = dayIndex(stop, days, previousDay);
            boolean firstOfDay = i == 0 || dayIndex != previousDay;
            previousDay = dayIndex;
            stopsPerDay[dayIndex] += 1;
            if (stopsPerDay[dayIndex] > MAX_STOPS_PER_DAY) {
                throw invalid("every day allows at most " + MAX_STOPS_PER_DAY + " stops");
            }
            String name = text(stop, "name");
            int start = minutes(text(stop, "startTime"));
            int end = minutes(text(stop, "endTime"));
            if (firstOfDay && start < EARLIEST_START_MINUTES) {
                throw invalid("each day must start at 14:00 or later");
            }
            if (end <= start) {
                throw invalid("every stop must end after it starts");
            }
            boolean lastOfDay = i == stopsNode.size() - 1
                    || nextDayIndex(stopsNode, i + 1, days) != dayIndex;
            Integer leg = null;
            if (lastOfDay) {
                JsonNode legNode = stop.path("travelMinutesToNext");
                if (!legNode.isMissingNode() && !legNode.isNull()) {
                    throw invalid("the last stop of each day must have a null travel leg");
                }
            } else {
                leg = integer(stop, "travelMinutesToNext");
                if (leg < 0) {
                    throw invalid("travel legs must be zero or more minutes");
                }
            }
            stops.add(new MainPlanResult.PlannedStop(seq, name, text(stop, "startTime"),
                    text(stop, "endTime"), leg, interests(stop), address(stop), optText(stop, "city"), 0,
                    dayIndex));
        }
        for (int day = 1; day <= days; day++) {
            if (stopsPerDay[day] < MIN_STOPS_PER_DAY) {
                throw invalid("every trip day needs at least " + MIN_STOPS_PER_DAY + " stops");
            }
        }
        return new MainPlanResult(stops, costNode.asInt());
    }

    /**
     * dayIndex is optional for a one-day trip (legacy outputs default to 1), but mandatory and
     * gap-free for a multi-day trip.
     */
    private static int dayIndex(JsonNode stop, int expectedDays, int previousDay) {
        JsonNode value = stop.path("dayIndex");
        if (expectedDays <= 1 && (value.isMissingNode() || value.isNull())) {
            return 1;
        }
        int day = integer(stop, "dayIndex");
        if (day < 1 || day > expectedDays) {
            throw invalid("dayIndex must be between 1 and " + expectedDays);
        }
        if (day < previousDay) {
            throw invalid("stops must be ordered by dayIndex");
        }
        return day;
    }

    private static int nextDayIndex(JsonNode stops, int position, int expectedDays) {
        JsonNode value = stops.get(position).path("dayIndex");
        if (value.isIntegralNumber()) {
            return value.asInt();
        }
        return expectedDays > 1 ? Integer.MIN_VALUE : 1;
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

    /** US-079: address/city are optional in the AI contract; missing = null (cache completes later). */
    private static String optText(JsonNode stop, String field) {
        JsonNode value = stop.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText().trim() : null;
    }

    /** 地址生成时即落库：去空白并限长，防模型输出超长文本撑爆展示与存储。 */
    private static String address(JsonNode stop) {
        String value = optText(stop, "address");
        return value == null || value.length() <= 120 ? value : value.substring(0, 120);
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
