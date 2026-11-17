package com.gogo.preference;

import java.util.List;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

import jakarta.validation.constraints.NotNull;

/**
 * `{"items": [...]}` on the wire. Presence is enforced by Jakarta Validation (a missing or null
 * `items` answers INVALID_REQUEST), element types by {@link StrictMustDoItemListDeserializer}.
 * Unknown body keys (`kind`, `userId`, ...) are ignored: only the caller's own list is writable
 * and the session decides whose row changes (ATDD §5 reverse rows).
 */
public record MustDoSaveRequest(
        @NotNull @JsonDeserialize(using = StrictMustDoItemListDeserializer.class) List<MustDoItem> items) {
}
