package com.gogo.mainplan;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class PlanAiPropertiesTest {

    @Test
    void defaultsLeaveHeadroomForMultiDayReasoning() {
        PlanAiProperties properties = new PlanAiProperties(null, null, null, null, null);

        assertEquals(16_384, properties.maxTokens());
        assertEquals(Duration.ofSeconds(90), properties.timeout());
    }
}
