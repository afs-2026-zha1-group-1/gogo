package com.gogo.preference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * REQ-019 follow-up: the migrated database must not hold interest codes outside the catalogue.
 * V5 seeded {@code culture}/{@code art}/{@code shopping}, which {@link InterestCatalogue#labelsOf}
 * silently drops, so a stored set could read back shorter than it is. V19 repairs those rows;
 * this test fails if a future seed or write path brings them back.
 */
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:catalogue-test?mode=memory&cache=shared&foreign_keys=on",
        "spring.datasource.hikari.maximum-pool-size=1"
})
class InterestCatalogueSeedTest {

    @Autowired
    private JdbcClient jdbcClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void everyStoredInterestCodeIsInTheCatalogue() throws Exception {
        List<String> payloads = jdbcClient.sql(
                        "SELECT payload FROM member_preference WHERE kind = 'interest'")
                .query(String.class).list();
        assertTrue(!payloads.isEmpty(), "the migrations are expected to seed interest rows");

        List<String> dropped = new ArrayList<>();
        for (String payload : payloads) {
            JsonNode codes = objectMapper.readTree(payload).get("codes");
            List<String> stored = new ArrayList<>();
            codes.forEach(code -> stored.add(code.asText()));
            int labels = InterestCatalogue.labelsOf(stored).size();
            if (labels != stored.size()) {
                dropped.add(payload);
            }
        }
        assertEquals(List.of(), dropped, "every stored code must map to a catalogue label");
    }

    @Test
    void defaultInterestsAreEmptyOrInTheCatalogue() throws Exception {
        List<String> payloads = jdbcClient.sql("SELECT payload FROM user_default_interest")
                .query(String.class).list();
        for (String payload : payloads) {
            List<String> stored = new ArrayList<>();
            objectMapper.readTree(payload).get("codes").forEach(code -> stored.add(code.asText()));
            assertEquals(stored.size(), InterestCatalogue.labelsOf(stored).size(), payload);
        }
    }
}
