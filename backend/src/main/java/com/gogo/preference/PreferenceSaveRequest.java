package com.gogo.preference;

import java.util.List;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

import jakarta.validation.constraints.NotNull;

/**
 * `{"interests": [<label>...]}`. Presence is enforced by Jakarta Validation; element types
 * are enforced by {@link StrictStringListDeserializer} so a numeric or null element answers
 * INVALID_REQUEST while an unknown string still reaches the catalogue check.
 */
public record PreferenceSaveRequest(
        @NotNull @JsonDeserialize(using = StrictStringListDeserializer.class) List<String> interests) {
}
