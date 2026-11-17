package com.gogo.preference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import com.fasterxml.jackson.databind.ObjectMapper;

// REQ-020 apply-time unit checks for the pieces the API layer composes: the codec round trip
// (UT-4) and the service's id assignment and validate-before-write ordering (UT-3, UT-5). The
// repository is a mock so "no write happened" is a direct observation, not a status code.
class MustDoCodecAndServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    // UT-4: encode writes the `name` mirror and explicit nulls; decode round-trips them.
    @Test
    void codecRoundTripCarriesTheMirrorAndNullFields() throws Exception {
        List<MustDoItem> items = List.of(
                new MustDoItem(1L, "Museum", "National Museum", null),
                new MustDoItem(2L, "Promenade", null, "19:00"));

        String json = MustDoPayload.encode(mapper, items);
        var root = mapper.readTree(json);
        var first = root.get("items").get(0);
        assertEquals("Museum", first.get("name").asText(), "the mirror follows activity (R4)");
        assertTrue(first.get("time").isNull(), "an absent time is stored as null (C4)");
        assertTrue(root.get("items").get(1).get("location").isNull());

        assertEquals(items, MustDoPayload.decode(mapper, json));
    }

    // UT-4 / MD10: the reader tolerates the V5 seed shape, which has no id, activity or time.
    @Test
    void decoderAcceptsTheSeedShape() {
        List<MustDoItem> decoded = MustDoPayload.decode(mapper,
                "{\"items\":[{\"name\":\"Merlion Park\",\"location\":\"Merlion Park\"}]}");

        assertEquals(1, decoded.size());
        assertNull(decoded.get(0).id());
        assertEquals("Merlion Park", decoded.get(0).activity(), "activity falls back to name");
        assertNull(decoded.get(0).time());
    }

    // UT-3: a new item takes max(current ids)+1 in request order, and a cleared list restarts at 1.
    @Test
    void idsContinueAfterTheCurrentMaximumAndRestartWhenCleared() {
        MustDoService service = serviceWithStored(
                "{\"items\":[{\"id\":3,\"activity\":\"A\",\"name\":\"A\",\"location\":\"La\",\"time\":null}]}");

        List<MustDoItem> assigned = service.save(1L, 2L, List.of(
                new MustDoItem(null, "B", "Lb", null),
                new MustDoItem(null, "C", "Lc", null)));
        assertEquals(List.of(4L, 5L), assigned.stream().map(MustDoItem::id).toList());

        MustDoService cleared = serviceWithStored("{\"items\":[]}");
        assertEquals(1L, cleared.save(1L, 2L, List.of(new MustDoItem(null, "B", "Lb", null)))
                .get(0).id());
    }

    // UT-5: every rejected request leaves the repository untouched, and a valid one writes once
    // through the must-do kind with the mirror in the payload.
    @Test
    void validationFinishesBeforeTheFirstWrite() throws Exception {
        PreferenceRepository repository = mock(PreferenceRepository.class);
        when(repository.membersOf(anyLong(), anyString())).thenReturn(List.of());
        MustDoService service = new MustDoService(repository, mapper);

        assertThrows(MustDoApiException.class, () -> service.save(1L, 2L,
                List.of(new MustDoItem(null, "Museum", "National Museum", "24:00"))));
        assertThrows(MustDoApiException.class, () -> service.save(1L, 2L,
                List.of(new MustDoItem(null, "  ", "National Museum", null))));
        verify(repository, never()).savePayload(anyLong(), anyLong(), anyString(), anyString());

        service.save(1L, 2L, List.of(new MustDoItem(null, " Museum ", "  ", "10:00")));
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(repository).savePayload(eq(1L), eq(2L), eq("must_do"), payload.capture());

        List<MustDoItem> written = MustDoPayload.decode(mapper, payload.getValue());
        assertEquals(1, written.size());
        assertEquals("Museum", written.get(0).activity(), "the stored value is trimmed (UT-1)");
        assertNull(written.get(0).location(), "a blank location is stored as null");
        assertEquals("Museum", mapper.readTree(payload.getValue())
                .get("items").get(0).get("name").asText(), "the mirror is trimmed the same way");
    }

    private MustDoService serviceWithStored(String payloadJson) {
        PreferenceRepository repository = mock(PreferenceRepository.class);
        when(repository.membersOf(anyLong(), any())).thenReturn(
                List.of(new PreferenceRepository.StoredPreference(2L, payloadJson)));
        return new MustDoService(repository, mapper);
    }
}
