package com.gogo.hello.splits.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.mainplan.DeepSeekPlanClient;
import com.gogo.mainplan.PlanAiProperties;

/**
 * Unit test for the single-provider selection (design D2, mirrors MainPlanProviderConfig): a blank API key binds
 * the deterministic fixture so tests/CI/offline never touch the network, a non-blank key binds the AI provider.
 */
class BranchCandidateProviderConfigTest {

    private final BranchCandidateProviderConfig config = new BranchCandidateProviderConfig();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("blankKey_providesFixture")
    void blankKey_providesFixture() {
        PlanAiProperties properties = new PlanAiProperties("", "http://base", "model", 8192, Duration.ofSeconds(30));
        ObjectProvider<DeepSeekPlanClient> provider = mock(ObjectProvider.class);

        BranchCandidateProvider bean = config.branchCandidateProvider(properties, objectMapper, provider);

        assertThat(bean).isInstanceOf(FixtureBranchCandidateProvider.class);
        verify(provider, never()).getIfAvailable(any());
    }

    @Test
    @DisplayName("nonBlankKey_providesAiProvider")
    void nonBlankKey_providesAiProvider() {
        PlanAiProperties properties = new PlanAiProperties("k", "http://base", "model", 8192, Duration.ofSeconds(30));
        ObjectProvider<DeepSeekPlanClient> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable(any())).thenReturn((systemPrompt, userJson) -> "{}");

        BranchCandidateProvider bean = config.branchCandidateProvider(properties, objectMapper, provider);

        assertThat(bean).isInstanceOf(AiBranchCandidateProvider.class);
    }
}