package com.gogo.hello.common;

import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unit test for the shared error envelope kernel (design D3, task 1.1). Verifies that an
 * {@link ApiException} is mapped to its declared HTTP status and the {@code {data:null,error:{code,message}}}
 * envelope. Standalone MockMvc keeps this a fast unit test with no Spring context or database.
 */
class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @ParameterizedTest
    @CsvSource({
            "MEMBER_REQUIRED,401",
            "TRIP_NOT_FOUND,404",
            "NOT_A_MEMBER,403",
            "NOT_SPLIT_INITIATOR,403",
            "NONPOSITIVE_SPLIT_WINDOW,400",
            "BOUNDARY_NOT_IN_MAIN_PLAN,400",
            "INVALID_ROUTE_PAIR,400",
            "MAIN_PLAN_NOT_CONFIRMED,409",
            "SPLIT_DRAFT_CONFLICT,409",
            "SPLIT_DRAFT_NOT_ACTIVE,409",
            "STALE_DRAFT_VERSION,409",
            "SPLIT_BOUNDARIES_REQUIRED,409",
            "ROUTE_GENERATION_FAILED,500"
    })
    @DisplayName("handleApiException_eachErrorCode_mapsToDeclaredHttpStatusAndCode")
    void handleApiException_eachErrorCode_mapsToDeclaredHttpStatusAndCode(String code, int expectedStatus)
            throws Exception {
        mockMvc.perform(get("/throw/{code}", code))
                .andExpect(status().is(expectedStatus))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.error.code").value(code));
    }

    @Test
    @DisplayName("handleApiException_rejection_carriesNonNullMessageAndNullData")
    void handleApiException_rejection_carriesNonNullMessageAndNullData() throws Exception {
        mockMvc.perform(get("/throw/{code}", "MEMBER_REQUIRED"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.error.code").value("MEMBER_REQUIRED"))
                .andExpect(jsonPath("$.error.message").value(not(emptyString())));
    }

    @RestController
    static class ThrowingController {

        @GetMapping("/throw/{code}")
        public void throwCode(@PathVariable String code) {
            throw new ApiException(ErrorCode.valueOf(code), "rejected: " + code);
        }
    }
}