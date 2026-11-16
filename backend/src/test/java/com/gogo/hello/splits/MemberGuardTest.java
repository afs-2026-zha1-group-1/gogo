package com.gogo.hello.splits;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gogo.hello.common.ApiException;
import com.gogo.hello.common.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Component acceptance test for the shared identity guard (spec chain convention, design D8, task 1.5).
 * Verifies the strict order identity -> trip -> membership against the V2 seed: missing/globally unknown
 * id -> 401 MEMBER_REQUIRED, known id + unknown trip -> 404 TRIP_NOT_FOUND, known outsider Eve -> 403
 * NOT_A_MEMBER. Rejections carry no private values (the guard throws before any trip data is read).
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:file:split-guard-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
class MemberGuardTest {

    private static final String UNKNOWN_TRIP = "00000000-0000-0000-0000-000000000000";
    private static final String UNKNOWN_MEMBER = "99999999-9999-9999-9999-999999999999";

    @Autowired
    private MemberGuard guard;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("requireMember_missingId_throwsMemberRequired")
    void requireMember_missingId_throwsMemberRequired() {
        assertThatThrownBy(() -> guard.requireMember(null, sgfTripId()))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.MEMBER_REQUIRED));
    }

    @Test
    @DisplayName("requireMember_blankId_throwsMemberRequired")
    void requireMember_blankId_throwsMemberRequired() {
        assertThatThrownBy(() -> guard.requireMember("   ", sgfTripId()))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.MEMBER_REQUIRED));
    }

    @Test
    @DisplayName("requireMember_globallyUnknownId_throwsMemberRequired")
    void requireMember_globallyUnknownId_throwsMemberRequired() {
        assertThatThrownBy(() -> guard.requireMember(UNKNOWN_MEMBER, sgfTripId()))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.MEMBER_REQUIRED));
    }

    @Test
    @DisplayName("requireMember_unknownIdAndUnknownTrip_identityPrecedesTrip")
    void requireMember_unknownIdAndUnknownTrip_identityPrecedesTrip() {
        assertThatThrownBy(() -> guard.requireMember(UNKNOWN_MEMBER, UNKNOWN_TRIP))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.MEMBER_REQUIRED));
    }

    @Test
    @DisplayName("requireMember_knownIdUnknownTrip_throwsTripNotFound")
    void requireMember_knownIdUnknownTrip_throwsTripNotFound() {
        assertThatThrownBy(() -> guard.requireMember(memberId("Ben"), UNKNOWN_TRIP))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.TRIP_NOT_FOUND));
    }

    @Test
    @DisplayName("requireMember_knownOutsiderUnknownTrip_tripPrecedesMembership")
    void requireMember_knownOutsiderUnknownTrip_tripPrecedesMembership() {
        assertThatThrownBy(() -> guard.requireMember(eveId(), UNKNOWN_TRIP))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.TRIP_NOT_FOUND));
    }

    @Test
    @DisplayName("requireMember_outsiderEve_throwsNotAMember")
    void requireMember_outsiderEve_throwsNotAMember() {
        assertThatThrownBy(() -> guard.requireMember(eveId(), sgfTripId()))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.NOT_A_MEMBER));
    }

    @Test
    @DisplayName("requireMember_validMember_returnsContext")
    void requireMember_validMember_returnsContext() {
        String ben = memberId("Ben");
        MemberContext context = guard.requireMember(ben, sgfTripId());
        assertThat(context.memberId()).isEqualTo(ben);
        assertThat(context.tripId()).isEqualTo(sgfTripId());
    }

    private String sgfTripId() {
        return jdbc.queryForObject("SELECT id FROM trip WHERE invite_code = 'SGF26A'", String.class);
    }

    private String memberId(String displayName) {
        return jdbc.queryForObject(
                "SELECT id FROM trip_member WHERE display_name = ? AND trip_id = ?",
                String.class, displayName, sgfTripId());
    }

    private String eveId() {
        return jdbc.queryForObject("SELECT id FROM trip_member WHERE display_name = 'Eve'", String.class);
    }
}