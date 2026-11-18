package com.gogo.mainplan;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Plan AI settings (design D7). Every value is optional so tests and offline
// demos keep the fixture provider; a blank key selects the fake provider.
@ConfigurationProperties("gogo.plan.ai")
public record PlanAiProperties(
        String apiKey,
        String baseUrl,
        String model,
        Integer maxTokens,
        Duration timeout) {

    public PlanAiProperties {
        apiKey = apiKey == null ? "" : apiKey.trim();
        baseUrl = baseUrl == null || baseUrl.isBlank()
                ? "https://mlop-llm-gateway-dev.home-np.oocl.com/v2/openai/deployments/ali-copilot"
                : baseUrl;
        model = model == null || model.isBlank() ? "deepseek-v4.1-flash" : model;
        maxTokens = maxTokens == null || maxTokens <= 0 ? 8192 : maxTokens;
        timeout = timeout == null || timeout.isNegative() || timeout.isZero()
                ? Duration.ofSeconds(30)
                : timeout;
    }
}
