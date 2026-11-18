package com.gogo.mainplan;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

// Single provider bean (design D2). A blank key keeps the deterministic fake
// provider for tests, CI and offline demos; the AI provider is only wired when
// a key is present. Tests can supply their own DeepSeekPlanClient stub.
@Configuration
@EnableConfigurationProperties(PlanAiProperties.class)
class MainPlanProviderConfig {

    @Bean
    MainPlanProvider mainPlanProvider(PlanAiProperties properties, ObjectMapper objectMapper,
            ObjectProvider<DeepSeekPlanClient> clientProvider) {
        if (properties.apiKey().isBlank()) {
            return new FakeMainPlanProvider();
        }
        DeepSeekPlanClient client = clientProvider.getIfAvailable(
                () -> HttpDeepSeekPlanClient.create(properties, objectMapper));
        return new AiMainPlanProvider(client, new AiPlanValidator(), objectMapper);
    }
}
