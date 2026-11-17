package com.gogo.preference;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Readiness / submission (US-026). Saving is not submitting: readiness is its own
 * {@code kind='submission'} row written by an explicit action. A member with
 * {@code noPreference = false} and no content in interests/must-dos/budget is rejected with
 * {@code PREFERENCE_EMPTY} ("silence is not consent"). Pending means the row does not exist.
 */
@Service
public class SubmissionService {

    private static final String SUBMISSION = "submission";
    private static final String INTEREST = "interest";
    private static final String MUST_DO = "must_do";
    private static final String BUDGET = "budget";
    private static final ZoneId SG = ZoneId.of("Asia/Singapore");

    private final PreferenceRepository repository;
    private final ObjectMapper objectMapper;

    public SubmissionService(PreferenceRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public SubmissionResponse save(long tripId, long userId, Boolean noPreference) {
        boolean noPref = Boolean.TRUE.equals(noPreference);
        if (!noPref && !hasAnyContent(tripId, userId)) {
            throw new PreferenceApiException(400, "PREFERENCE_EMPTY",
                    "Save at least one preference, or choose no preference");
        }
        String submittedAt = OffsetDateTime.now(SG).toString();
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("status", "ready");
        payload.put("noPreference", noPref);
        payload.put("submittedAt", submittedAt);
        repository.savePayload(tripId, userId, SUBMISSION, payload.toString());
        // The generation projection reads the scaffold trip_member columns, so a real submission has
        // to show up there too; otherwise the inputs page reports the member as pending.
        repository.markReady(tripId, userId);
        return new SubmissionResponse("ready", noPref, submittedAt);
    }

    public ReadinessResponse readiness(long tripId) {
        List<SubmissionMember> members = new ArrayList<>();
        int ready = 0;
        for (PreferenceRepository.StoredPreference stored : repository.membersOf(tripId, SUBMISSION)) {
            boolean isReady = stored.payload() != null && !stored.payload().isBlank();
            boolean noPref = isReady && noPreferenceOf(stored.payload());
            if (isReady) {
                ready++;
            }
            members.add(new SubmissionMember(stored.userId(), isReady ? "ready" : "pending",
                    isReady && noPref));
        }
        int total = members.size();
        return new ReadinessResponse(members, ready, total, total > 0 && ready == total);
    }

    public EffectiveResponse effective(long tripId) {
        List<EffectiveMember> members = new ArrayList<>();
        for (PreferenceRepository.StoredPreference stored : repository.membersOf(tripId, SUBMISSION)) {
            if (stored.payload() == null || stored.payload().isBlank()) {
                continue;
            }
            boolean noPref = noPreferenceOf(stored.payload());
            List<String> interests = noPref ? List.of() : interestsOf(tripId, stored.userId());
            members.add(new EffectiveMember(stored.userId(), noPref, interests));
        }
        return new EffectiveResponse(members);
    }

    private boolean hasAnyContent(long tripId, long userId) {
        for (PreferenceRepository.StoredPreference s : repository.membersOf(tripId, INTEREST)) {
            if (s.userId() == userId && s.payload() != null && !repository.codesOf(s).isEmpty()) {
                return true;
            }
        }
        for (PreferenceRepository.StoredPreference s : repository.membersOf(tripId, MUST_DO)) {
            if (s.userId() == userId && s.payload() != null) {
                JsonNode node = readTree(s.payload());
                if (node != null && node.path("items").isArray() && !node.path("items").isEmpty()) {
                    return true;
                }
            }
        }
        for (PreferenceRepository.StoredPreference s : repository.membersOf(tripId, BUDGET)) {
            if (s.userId() == userId && s.payload() != null) {
                JsonNode node = readTree(s.payload());
                if (node != null && node.hasNonNull("amount")) {
                    return true;
                }
            }
        }
        return false;
    }

    private List<String> interestsOf(long tripId, long userId) {
        for (PreferenceRepository.StoredPreference s : repository.membersOf(tripId, INTEREST)) {
            if (s.userId() == userId) {
                return InterestCatalogue.labelsOf(repository.codesOf(s));
            }
        }
        return List.of();
    }

    private boolean noPreferenceOf(String payload) {
        JsonNode node = readTree(payload);
        return node != null && node.path("noPreference").asBoolean(false);
    }

    private JsonNode readTree(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception cause) {
            return null;
        }
    }
}
