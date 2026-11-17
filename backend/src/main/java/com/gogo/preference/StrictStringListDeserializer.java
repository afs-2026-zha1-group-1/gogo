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
 * Reads an interests array strictly: every element must be a JSON string. Numbers, booleans
 * and nulls are rejected as an unreadable body instead of being coerced to text, which is
 * what the delta requires for `{"interests":[null]}` and `{"interests":[42]}`.
 */
class StrictStringListDeserializer extends JsonDeserializer<List<String>> {

    @Override
    public List<String> deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (!parser.isExpectedStartArrayToken()) {
            throw MismatchedInputException.from(parser, List.class,
                    "interests must be an array of strings");
        }
        List<String> values = new ArrayList<>();
        JsonToken token;
        while ((token = parser.nextToken()) != JsonToken.END_ARRAY) {
            if (token != JsonToken.VALUE_STRING) {
                throw MismatchedInputException.from(parser, String.class,
                        "interests must contain only strings");
            }
            values.add(parser.getText());
        }
        return values;
    }
}
