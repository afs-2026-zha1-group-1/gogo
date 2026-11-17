package com.gogo.preference;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Reads/writes a user's default interests, reusing the interest catalogue (US-019). */
@Service
public class UserDefaultInterestService {

    private final UserDefaultInterestRepository repository;
    private final ObjectMapper objectMapper;

    public UserDefaultInterestService(UserDefaultInterestRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public List<String> interests(long userId) {
        return repository.payloadOf(userId).map(this::decode).orElse(List.of());
    }

    public List<String> save(long userId, List<String> labels) {
        List<String> codes = new ArrayList<>();
        for (String label : new LinkedHashSet<>(labels)) {
            codes.add(InterestCatalogue.codeOf(label)
                    .orElseThrow(() -> new PreferenceApiException(400, "INTEREST_NOT_ALLOWED",
                            "Unsupported interest: " + label)));
        }
        try {
            repository.save(userId, objectMapper.writeValueAsString(new PreferencePayload(codes)));
        } catch (JsonProcessingException cause) {
            throw new IllegalStateException("Default interest payload is not serializable", cause);
        }
        return InterestCatalogue.labelsOf(codes);
    }

    private List<String> decode(String payloadJson) {
        try {
            PreferencePayload payload = objectMapper.readValue(payloadJson, PreferencePayload.class);
            return payload.codes() == null ? List.of() : InterestCatalogue.labelsOf(payload.codes());
        } catch (Exception cause) {
            return List.of();
        }
    }
}
