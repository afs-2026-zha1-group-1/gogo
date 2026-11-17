package com.gogo.preference;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;

/**
 * Reads the must-do items array strictly so steps 1-2 of MD5 land on INVALID_REQUEST instead
 * of a MUST_DO_* code (MD6): the array itself, each element being an object, the `id` being an
 * integer or null, and `activity`/`location`/`time` being strings or null are all checked here.
 * Value rules (trimmed activity, place-or-time, the HH:mm pattern) stay in
 * {@link MustDoValidator}, which needs the caller's current list. Unknown item fields such as
 * `date` are skipped, never stored (non-goal OQ-12).
 */
class StrictMustDoItemListDeserializer extends JsonDeserializer<List<MustDoItem>> {

    @Override
    public List<MustDoItem> deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (!parser.isExpectedStartArrayToken()) {
            throw MismatchedInputException.from(parser, List.class,
                    "items must be an array of objects");
        }
        List<MustDoItem> values = new ArrayList<>();
        JsonToken token;
        while ((token = parser.nextToken()) != JsonToken.END_ARRAY) {
            if (token != JsonToken.START_OBJECT) {
                throw MismatchedInputException.from(parser, MustDoItem.class,
                        "each item must be a JSON object");
            }
            values.add(readItem(parser));
        }
        return values;
    }

    private MustDoItem readItem(JsonParser parser) throws IOException {
        Long id = null;
        String activity = null;
        String location = null;
        String time = null;
        String field;
        while ((field = parser.nextFieldName()) != null) {
            switch (field) {
                case "id" -> id = readId(parser);
                case "activity" -> activity = readText(parser);
                case "location" -> location = readText(parser);
                case "time" -> time = readText(parser);
                default -> {
                    parser.nextToken();
                    parser.skipChildren();
                }
            }
        }
        return new MustDoItem(id, activity, location, time);
    }

    private Long readId(JsonParser parser) throws IOException {
        JsonToken token = parser.nextToken();
        if (token == JsonToken.VALUE_NULL) {
            return null;
        }
        if (token != JsonToken.VALUE_NUMBER_INT) {
            throw MismatchedInputException.from(parser, Long.class, "id must be an integer or null");
        }
        return parser.getLongValue();
    }

    private String readText(JsonParser parser) throws IOException {
        JsonToken token = parser.nextToken();
        if (token == JsonToken.VALUE_NULL) {
            return null;
        }
        if (token != JsonToken.VALUE_STRING) {
            throw MismatchedInputException.from(parser, String.class,
                    "text fields must be strings or null");
        }
        return parser.getText();
    }
}
