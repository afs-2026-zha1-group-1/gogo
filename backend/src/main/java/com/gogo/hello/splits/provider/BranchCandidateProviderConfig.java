package com.gogo.hello.splits.provider;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.mainplan.DeepSeekPlanClient;
import com.gogo.mainplan.HttpDeepSeekPlanClient;
import com.gogo.mainplan.PlanAiProperties;

// Single provider bean (design D2, mirrors MainPlanProviderConfig). A blank key keeps the deterministic fixture
// for tests, CI and offline demos; the AI provider is only wired when a key is present. Tests can supply their own
// DeepSeekPlanClient stub through the ObjectProvider.
@Configuration
@EnableConfigurationProperties(PlanAiProperties.class)
class BranchCandidateProviderConfig {

    @Bean
    BranchCandidateProvider branchCandidateProvider(PlanAiProperties properties, ObjectMapper objectMapper,
            ObjectProvider<DeepSeekPlanClient> clientProvider) {
        if (properties.apiKey().isBlank()) {
            return new FixtureBranchCandidateProvider();
        }
        DeepSeekPlanClient client = clientProvider.getIfAvailable(
                () -> HttpDeepSeekPlanClient.create(properties, objectMapper));
        return new AiBranchCandidateProvider(client, new AiBranchValidator(), objectMapper);
    }
}