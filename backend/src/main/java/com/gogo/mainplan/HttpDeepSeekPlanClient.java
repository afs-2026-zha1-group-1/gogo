package com.gogo.mainplan;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// The internal DeepSeek gateway is OpenAI compatible (main-plan design D1, split design D1): one JSON chat
// call, bearer key, JSON-object response, no thinking field, single attempt.
public class HttpDeepSeekPlanClient implements DeepSeekPlanClient {

    private static final int CONNECT_TIMEOUT_MILLIS = 5_000;

    private final PlanAiProperties properties;
    private final RestClient client;
    private final ObjectMapper objectMapper;

    HttpDeepSeekPlanClient(PlanAiProperties properties, RestClient client, ObjectMapper objectMapper) {
        this.properties = properties;
        this.client = client;
        this.objectMapper = objectMapper;
    }

    public static HttpDeepSeekPlanClient create(PlanAiProperties properties, ObjectMapper objectMapper) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
        factory.setReadTimeout((int) properties.timeout().toMillis());
        RestClient client = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(factory)
                .build();
        return new HttpDeepSeekPlanClient(properties, client, objectMapper);
    }

    @Override
    public String complete(String systemPrompt, String userJson) {
        ChatRequest request = new ChatRequest(
                properties.model(),
                List.of(new Message("system", systemPrompt), new Message("user", userJson)),
                properties.maxTokens(),
                new ResponseFormat("json_object"));
        try {
            String body = client.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(String.class);
            String content = objectMapper.readTree(body == null ? "" : body)
                    .path("choices").path(0).path("message").path("content").asText("");
            if (content.isBlank()) {
                throw new PlanAiException(PlanAiException.Reason.EMPTY, "The model returned empty content");
            }
            return content;
        } catch (ResourceAccessException cause) {
            throw new PlanAiException(PlanAiException.Reason.TIMEOUT, "The model call timed out", cause);
        } catch (RestClientException cause) {
            throw new PlanAiException(PlanAiException.Reason.HTTP, "The model call failed", cause);
        } catch (JsonProcessingException cause) {
            throw new PlanAiException(PlanAiException.Reason.INVALID_OUTPUT,
                    "The model response envelope is not JSON", cause);
        }
    }

    record ChatRequest(
            String model,
            List<Message> messages,
            @JsonProperty("max_tokens") int maxTokens,
            @JsonProperty("response_format") ResponseFormat responseFormat) {
    }

    record Message(String role, String content) {
    }

    record ResponseFormat(String type) {
    }
}
