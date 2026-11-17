package com.gogo.preference;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Must-do list replacement and reads (MD7, MD8, MD9). A save validates everything first
 * ({@link MustDoValidator}), then normalises with trim/blank to null, then issues ids in request
 * order — a new item gets `max(current ids) + 1` and a cleared list restarts at 1 (MDS-6, C1) —
 * and finally writes the whole list through one upsert, so omission is the only delete path.
 * Reads decode every member's row leniently (MD10) and drop the storage `name` mirror on the
 * way out (MDR-5); members without a row appear with an empty list, ordered by userId.
 */
@Service
public class MustDoService {

    private static final String MUST_DO = "must_do";

    private final PreferenceRepository repository;
    private final ObjectMapper objectMapper;

    public MustDoService(PreferenceRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public List<MustDoMember> members(long tripId) {
        List<MustDoMember> members = new ArrayList<>();
        for (PreferenceRepository.StoredPreference stored : repository.membersOf(tripId, MUST_DO)) {
            List<MustDoItem> items = stored.payload() == null
                    ? List.of()
                    : MustDoPayload.decode(objectMapper, stored.payload());
            members.add(new MustDoMember(stored.userId(), items));
        }
        return members;
    }

    public List<MustDoItem> save(long tripId, long userId, List<MustDoItem> requested) {
        List<MustDoItem> current = currentItems(tripId, userId);
        Set<Long> currentIds = new HashSet<>();
        long maxId = 0;
        for (MustDoItem item : current) {
            if (item.id() != null) {
                currentIds.add(item.id());
                maxId = Math.max(maxId, item.id());
            }
        }

        MustDoValidator.validate(requested, currentIds);

        List<MustDoItem> stored = new ArrayList<>();
        for (MustDoItem item : requested) {
            Long id = item.id() != null ? item.id() : ++maxId;
            stored.add(new MustDoItem(id,
                    MustDoValidator.trimToNull(item.activity()),
                    MustDoValidator.trimToNull(item.location()),
                    MustDoValidator.trimToNull(item.time())));
        }

        repository.savePayload(tripId, userId, MUST_DO, MustDoPayload.encode(objectMapper, stored));
        return stored;
    }

    private List<MustDoItem> currentItems(long tripId, long userId) {
        for (PreferenceRepository.StoredPreference stored : repository.membersOf(tripId, MUST_DO)) {
            if (stored.userId() == userId && stored.payload() != null) {
                return MustDoPayload.decode(objectMapper, stored.payload());
            }
        }
        return List.of();
    }
}
