package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;

class HttpDeepSeekPlanClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PlanAiProperties properties = new PlanAiProperties(
            "test-key", "https://api.test/v4", "deepseek-v4.1-flash", 8192, Duration.ofSeconds(30));

    @Test
    void sendsTheDeepSeekContractAndReturnsAssistantContent() throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.baseUrl());
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        String plan = "{\"stops\":[]}";
        String envelope = objectMapper.writeValueAsString(Map.of(
                "choices", List.of(Map.of("message", Map.of("content", plan)))));
        server.expect(requestTo("https://api.test/v4/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(jsonPath("$.model").value("deepseek-v4.1-flash"))
                .andExpect(jsonPath("$.max_tokens").value(8192))
                .andExpect(jsonPath("$.response_format.type").value("json_object"))
                .andExpect(jsonPath("$.thinking").doesNotExist())
                .andExpect(jsonPath("$.messages[0].role").value("system"))
                .andExpect(jsonPath("$.messages[1].content").value("{\"trip\":{}}"))
                .andRespond(withSuccess(envelope, MediaType.APPLICATION_JSON));

        HttpDeepSeekPlanClient client = new HttpDeepSeekPlanClient(properties, builder.build(), objectMapper);

        assertEquals(plan, client.complete("system prompt", "{\"trip\":{}}"));
        server.verify();
    }

    @Test
    void mapsNon2xxToHttpFailure() {
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.baseUrl());
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.test/v4/chat/completions"))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        HttpDeepSeekPlanClient client = new HttpDeepSeekPlanClient(properties, builder.build(), objectMapper);

        PlanAiException cause = assertThrows(PlanAiException.class,
                () -> client.complete("system", "{}"));

        assertEquals(PlanAiException.Reason.HTTP, cause.reason());
    }

    @Test
    void mapsBlankContentToEmptyFailure() throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.baseUrl());
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        String envelope = objectMapper.writeValueAsString(Map.of(
                "choices", List.of(Map.of("message", Map.of("content", " ")))));
        server.expect(requestTo("https://api.test/v4/chat/completions"))
                .andRespond(withSuccess(envelope, MediaType.APPLICATION_JSON));
        HttpDeepSeekPlanClient client = new HttpDeepSeekPlanClient(properties, builder.build(), objectMapper);

        PlanAiException cause = assertThrows(PlanAiException.class,
                () -> client.complete("system", "{}"));

        assertEquals(PlanAiException.Reason.EMPTY, cause.reason());
    }
}
