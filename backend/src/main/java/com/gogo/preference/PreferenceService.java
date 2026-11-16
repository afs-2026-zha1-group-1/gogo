package com.gogo.preference;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.stereotype.Service;

/**
 * Dedupes by label keeping the first occurrence, validates the whole request against the
 * catalogue, then writes once (DD5, DD6). A request is all-or-nothing: one unknown label
 * leaves the stored row untouched.
 */
@Service
public class PreferenceService {

    private final PreferenceRepository repository;

    public PreferenceService(PreferenceRepository repository) {
        this.repository = repository;
    }

    public List<PreferenceMember> members(long tripId) {
        List<PreferenceMember> members = new ArrayList<>();
        for (PreferenceRepository.StoredPreference stored : repository.membersOf(tripId)) {
            members.add(new PreferenceMember(stored.userId(),
                    InterestCatalogue.labelsOf(repository.codesOf(stored))));
        }
        return members;
    }

    public List<String> save(long tripId, long userId, List<String> labels) {
        List<String> codes = new ArrayList<>();
        for (String label : new LinkedHashSet<>(labels)) {
            codes.add(InterestCatalogue.codeOf(label)
                    .orElseThrow(() -> new PreferenceApiException(400, "INTEREST_NOT_ALLOWED",
                            "Unsupported interest: " + label)));
        }
        repository.save(tripId, userId, codes);
        return InterestCatalogue.labelsOf(codes);
    }
}
