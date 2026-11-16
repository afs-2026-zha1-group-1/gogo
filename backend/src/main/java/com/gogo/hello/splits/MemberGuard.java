package com.gogo.hello.splits;

import com.gogo.hello.common.ApiException;
import com.gogo.hello.common.ErrorCode;
import org.springframework.stereotype.Component;

/**
 * Shared identity guard for all five splits endpoints (spec chain convention, design D8). Validates in strict
 * order: identity (missing/globally unknown id -> 401 MEMBER_REQUIRED), then trip existence (known id + unknown
 * trip -> 404 TRIP_NOT_FOUND), then membership (known outsider -> 403 NOT_A_MEMBER). Rejections throw before any
 * private trip, draft or route value is read, so {@code data=null} exposes nothing.
 */
@Component
public class MemberGuard {

    private final SplitDraftRepository repository;

    public MemberGuard(SplitDraftRepository repository) {
        this.repository = repository;
    }

    public MemberContext requireMember(String memberId, String tripId) {
        if (memberId == null || memberId.isBlank() || !repository.memberExistsGlobally(memberId)) {
            throw new ApiException(ErrorCode.MEMBER_REQUIRED, "a valid X-User-Id header is required");
        }
        if (!repository.tripExists(tripId)) {
            throw new ApiException(ErrorCode.TRIP_NOT_FOUND, "trip does not exist");
        }
        if (!repository.isMemberOfTrip(memberId, tripId)) {
            throw new ApiException(ErrorCode.NOT_A_MEMBER, "member does not belong to this trip");
        }
        return new MemberContext(memberId, tripId);
    }
}