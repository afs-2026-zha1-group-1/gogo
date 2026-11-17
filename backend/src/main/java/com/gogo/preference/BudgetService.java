package com.gogo.preference;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Per-member budget save/read (US-024, revised). The body is read as a raw {@link JsonNode} so the
 * service can tell a missing {@code amount} key (INVALID_REQUEST) from an explicit {@code null}
 * amount (a clear). Validation runs before any write; a rejection leaves the stored row untouched.
 * Amount is a whole number of MAJOR units within {@code int} range.
 */
@Service
public class BudgetService {

    private static final String BUDGET = "budget";
    private static final Set<String> CURRENCIES = Set.of("SGD", "CNY", "USD", "EUR", "JPY");
    private static final Set<String> LIMIT_TYPES = Set.of("hard", "soft");

    private final PreferenceRepository repository;
    private final ObjectMapper objectMapper;

    public BudgetService(PreferenceRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public List<BudgetMember> members(long tripId) {
        List<BudgetMember> members = new ArrayList<>();
        for (PreferenceRepository.StoredPreference stored : repository.membersOf(tripId, BUDGET)) {
            members.add(new BudgetMember(stored.userId(), decode(stored.payload())));
        }
        return members;
    }

    public Budget save(long tripId, long userId, JsonNode body) {
        if (body == null || !body.isObject()) {
            throw new PreferenceApiException(400, "INVALID_REQUEST", "Body must be a JSON object");
        }
        if (!body.has("amount")) {
            throw new PreferenceApiException(400, "INVALID_REQUEST", "Missing amount key");
        }
        JsonNode amountNode = body.get("amount");
        if (amountNode.isNull()) {
            if (body.hasNonNull("currency") || body.hasNonNull("limitType")) {
                throw new PreferenceApiException(400, "BUDGET_FIELDS_INCOMPLETE",
                        "A cleared budget cannot carry a currency or limit type");
            }
            repository.savePayload(tripId, userId, BUDGET, "{}");
            return null;
        }
        if (!amountNode.isNumber() || !amountNode.isIntegralNumber() || !amountNode.canConvertToInt()) {
            throw new PreferenceApiException(400, "BUDGET_AMOUNT_INVALID",
                    "Amount must be a whole number within range");
        }
        int amount = amountNode.intValue();
        if (amount < 0) {
            throw new PreferenceApiException(400, "BUDGET_AMOUNT_INVALID", "Amount must not be negative");
        }
        if (!body.hasNonNull("currency") || !body.hasNonNull("limitType")) {
            throw new PreferenceApiException(400, "BUDGET_FIELDS_INCOMPLETE",
                    "An amount needs both a currency and a limit type");
        }
        String currency = body.get("currency").asText();
        if (!CURRENCIES.contains(currency)) {
            throw new PreferenceApiException(400, "BUDGET_CURRENCY_NOT_ALLOWED",
                    "Unsupported currency: " + currency);
        }
        String limitType = body.get("limitType").asText();
        if (!LIMIT_TYPES.contains(limitType)) {
            throw new PreferenceApiException(400, "BUDGET_LIMIT_TYPE_INVALID",
                    "Limit type must be hard or soft");
        }
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("amount", amount);
        payload.put("currency", currency);
        payload.put("limitType", limitType);
        repository.savePayload(tripId, userId, BUDGET, payload.toString());
        return new Budget(amount, currency, limitType);
    }

    private Budget decode(String payload) {
        if (payload == null) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(payload);
            if (node == null || !node.isObject() || !node.hasNonNull("amount")
                    || !node.get("amount").isIntegralNumber()) {
                return null;
            }
            int amount = node.get("amount").asInt();
            String currency = node.hasNonNull("currency") ? node.get("currency").asText() : null;
            String limitType = node.hasNonNull("limitType") ? node.get("limitType").asText() : null;
            return new Budget(amount, currency, limitType);
        } catch (Exception cause) {
            return null;
        }
    }
}
