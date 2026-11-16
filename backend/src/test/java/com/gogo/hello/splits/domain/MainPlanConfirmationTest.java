package com.gogo.hello.splits.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit test for the main-plan confirmation predicate (spec chain convention, design D16, task 2.3):
 * confirmed iff every member's {@code plan_ack_version} equals {@code trip.plan_version}. Pure domain, no DB.
 */
class MainPlanConfirmationTest {

    @Test
    @DisplayName("isConfirmed_allMembersAcknowledged_returnsTrue")
    void isConfirmed_allMembersAcknowledged_returnsTrue() {
        assertThat(MainPlanConfirmation.isConfirmed(1, List.of(1, 1, 1, 1))).isTrue();
    }

    @Test
    @DisplayName("isConfirmed_oneMemberBehind_returnsFalse")
    void isConfirmed_oneMemberBehind_returnsFalse() {
        assertThat(MainPlanConfirmation.isConfirmed(1, List.of(1, 0, 1, 1))).isFalse();
    }

    @Test
    @DisplayName("isConfirmed_planVersionAdvancedNotAcknowledged_returnsFalse")
    void isConfirmed_planVersionAdvancedNotAcknowledged_returnsFalse() {
        assertThat(MainPlanConfirmation.isConfirmed(2, List.of(1, 1, 1, 1))).isFalse();
    }

    @Test
    @DisplayName("isConfirmed_noMembers_returnsFalse")
    void isConfirmed_noMembers_returnsFalse() {
        assertThat(MainPlanConfirmation.isConfirmed(1, List.of())).isFalse();
    }
}