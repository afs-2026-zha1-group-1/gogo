package com.gogo.preference;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One must-do item on the wire and in the service: the four contract keys only (MD3). The
 * storage-only `name` mirror never appears here — {@link MustDoPayload} adds it when encoding,
 * so an unmirrored stored item cannot be built through any other path (MD4). A `null` id means
 * "new item"; the service issues it as max+1 after validation (MD7). Absent `location` or
 * `time` normalise to `null` and serialise as explicit JSON nulls (C4).
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record MustDoItem(Long id, String activity, String location, String time) {
}
