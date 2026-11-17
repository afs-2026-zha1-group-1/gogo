package com.gogo.preference;

import java.util.List;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

import jakarta.validation.constraints.NotNull;

/** {@code {"interests": [<label>...]}} for a user's default interests (US-019). */
public record UserInterestSaveRequest(
        @NotNull @JsonDeserialize(using = StrictStringListDeserializer.class) List<String> interests) {
}
