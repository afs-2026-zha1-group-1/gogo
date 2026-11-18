package com.gogo.hello.splits;

import com.gogo.auth.AccountPrincipal;
import com.gogo.hello.common.ApiResponse;
import com.gogo.hello.splits.domain.RouteActivity;
import com.gogo.hello.splits.domain.SplitDraftDocument;
import com.gogo.hello.splits.domain.TimingResult;
import com.gogo.hello.splits.dto.AssignmentRequest;
import com.gogo.hello.splits.dto.BoundaryResponse;
import com.gogo.hello.splits.dto.BudgetCheckResponse;
import com.gogo.hello.splits.dto.CheckTimingRequest;
import com.gogo.hello.splits.dto.DraftVersionRequest;
import com.gogo.hello.splits.dto.GenerateRoutesRequest;
import com.gogo.hello.splits.dto.RecommendActivitiesRequest;
import com.gogo.hello.splits.dto.RouteGenerationResponse;
import com.gogo.hello.splits.dto.SaveActivitiesRequest;
import com.gogo.hello.splits.dto.SaveBoundariesRequest;
import com.gogo.hello.splits.dto.SaveRoutesRequest;
import com.gogo.hello.splits.dto.SplitDraftDetailResponse;
import com.gogo.hello.splits.dto.SplitRoundCreatedResponse;
import com.gogo.hello.splits.dto.SplitRoundsResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin REST adapter for the splits capability (design D1). The caller id comes from the
 * authenticated session; an anonymous caller reaches {@link MemberGuard} with a null id and maps to
 * 401 MEMBER_REQUIRED, preserving the splits contract.
 */
@RestController
@RequestMapping("/api/trips/{tripId}")
public class SplitDraftController {

    private final SplitDraftService service;

    public SplitDraftController(SplitDraftService service) {
        this.service = service;
    }

    @GetMapping("/split-draft")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> getDraftDetail(
            @PathVariable String tripId,
            Authentication authentication) {
        SplitDraftDetailResponse detail = service.getDraftDetail(tripId, caller(authentication));
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/split-draft")
    public ResponseEntity<ApiResponse<SplitDraftDocument>> startDraft(
            @PathVariable String tripId,
            Authentication authentication) {
        SplitDraftDocument draft = service.startDraft(tripId, caller(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(draft));
    }

    @PutMapping("/split-draft/boundaries")
    public ResponseEntity<ApiResponse<BoundaryResponse>> saveBoundaries(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody SaveBoundariesRequest request) {
        BoundaryResponse response = service.saveBoundaries(tripId, caller(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/split-draft/routes:generate")
    public ResponseEntity<ApiResponse<RouteGenerationResponse>> generateRoutes(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody GenerateRoutesRequest request) {
        RouteGenerationResponse response = service.generateRoutes(tripId, caller(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /** Saves a manual A/B route edit for any trip member while the draft is active (US-087 S2/S2b). */
    @PutMapping("/split-draft/routes")
    public ResponseEntity<ApiResponse<RouteGenerationResponse>> saveRoutes(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody SaveRoutesRequest request) {
        RouteGenerationResponse response = service.saveRoutes(tripId, caller(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/split-draft/routes:check-timing")
    public ResponseEntity<ApiResponse<TimingResult>> checkTiming(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody CheckTimingRequest request) {
        TimingResult result = service.checkTiming(tripId, caller(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** Moves the caller into the target group (US-040 A1-A9, design DD1/DD2). */
    @PutMapping("/split-draft/assignment")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> assignGroup(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody AssignmentRequest request) {
        SplitDraftDetailResponse detail = service.assign(tripId, caller(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /** Member-readable budget check for the current draft (US-045, Screen 15). */
    @GetMapping("/split-draft/budget-check")
    public ResponseEntity<ApiResponse<BudgetCheckResponse>> budgetCheck(
            @PathVariable String tripId,
            Authentication authentication) {
        BudgetCheckResponse response = service.budgetCheck(tripId, caller(authentication));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /** Replaces one group's costed activities (US-045 manual entry / accepted AI recommendation). */
    @PutMapping("/split-draft/activities")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> saveActivities(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody SaveActivitiesRequest request) {
        SplitDraftDetailResponse detail = service.saveActivities(tripId, caller(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /** Returns the mock AI's budget-fitting squad activity suggestion (US-045, no persistence). */
    @PostMapping("/split-draft/activities:recommend")
    public ResponseEntity<ApiResponse<List<RouteActivity>>> recommendActivities(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody RecommendActivitiesRequest request) {
        List<RouteActivity> suggestion = service.recommendActivities(tripId, caller(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(suggestion));
    }

    /** Confirms the current draft as the trip's split (US-049, design D1/D5). */
    @PostMapping("/split-draft:confirm")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> confirmDraft(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody DraftVersionRequest request) {
        SplitDraftDetailResponse detail = service.confirmDraft(tripId, caller(authentication), request.draftVersion());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /** Cancels the initiator's unconfirmed draft and frees the row for a replacement (US-050, design D1/D6). */
    @PostMapping("/split-draft:cancel")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> cancelDraft(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody DraftVersionRequest request) {
        SplitDraftDetailResponse detail = service.cancelDraft(tripId, caller(authentication), request.draftVersion());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /** US-051: the organizer cancels a confirmed split before departure (design D9). */
    @PostMapping("/split:cancel")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> cancelConfirmedSplit(
            @PathVariable String tripId,
            Authentication authentication,
            @RequestBody DraftVersionRequest request) {
        SplitDraftDetailResponse detail =
                service.cancelConfirmedSplit(tripId, caller(authentication), request.draftVersion());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    // ---- US-096 round-scoped endpoints ----

    @GetMapping("/split-draft/rounds")
    public ResponseEntity<ApiResponse<SplitRoundsResponse>> getRounds(
            @PathVariable String tripId,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(service.getRounds(tripId, caller(authentication))));
    }

    @PostMapping("/split-draft/rounds")
    public ResponseEntity<ApiResponse<SplitRoundCreatedResponse>> startNextRound(
            @PathVariable String tripId,
            Authentication authentication) {
        SplitRoundCreatedResponse response = service.startNextRound(tripId, caller(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/split-draft/rounds/{roundIndex}")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> getRoundDetail(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.getRoundDetail(tripId, roundIndex, caller(authentication))));
    }

    @PutMapping("/split-draft/rounds/{roundIndex}/boundaries")
    public ResponseEntity<ApiResponse<BoundaryResponse>> saveRoundBoundaries(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody SaveBoundariesRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.saveBoundaries(tripId, roundIndex, caller(authentication), request)));
    }

    @PutMapping("/split-draft/rounds/{roundIndex}/assignment")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> assignRoundGroup(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody AssignmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.assign(tripId, roundIndex, caller(authentication), request)));
    }

    @PostMapping("/split-draft/rounds/{roundIndex}/routes:generate")
    public ResponseEntity<ApiResponse<RouteGenerationResponse>> generateRoundRoutes(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody GenerateRoutesRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.generateRoutes(tripId, roundIndex, caller(authentication), request)));
    }

    @PutMapping("/split-draft/rounds/{roundIndex}/routes")
    public ResponseEntity<ApiResponse<RouteGenerationResponse>> saveRoundRoutes(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody SaveRoutesRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.saveRoutes(tripId, roundIndex, caller(authentication), request)));
    }

    @GetMapping("/split-draft/rounds/{roundIndex}/budget-check")
    public ResponseEntity<ApiResponse<BudgetCheckResponse>> roundBudgetCheck(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.budgetCheck(tripId, roundIndex, caller(authentication))));
    }

    @PutMapping("/split-draft/rounds/{roundIndex}/activities")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> saveRoundActivities(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody SaveActivitiesRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.saveActivities(tripId, roundIndex, caller(authentication), request)));
    }

    @PostMapping("/split-draft/rounds/{roundIndex}/activities:recommend")
    public ResponseEntity<ApiResponse<List<RouteActivity>>> recommendRoundActivities(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody RecommendActivitiesRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.recommendActivities(tripId, roundIndex, caller(authentication), request)));
    }

    @PostMapping("/split-draft/rounds/{roundIndex}:confirm")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> confirmRound(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody DraftVersionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.confirmDraft(tripId, roundIndex, caller(authentication), request.draftVersion())));
    }

    @PostMapping("/split-draft/rounds/{roundIndex}:cancel")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> cancelRound(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody DraftVersionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.cancelDraft(tripId, roundIndex, caller(authentication), request.draftVersion())));
    }

    @PostMapping("/split-draft/rounds/{roundIndex}:cancel-confirmed")
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> cancelConfirmedRound(
            @PathVariable String tripId,
            @PathVariable int roundIndex,
            Authentication authentication,
            @RequestBody DraftVersionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.cancelConfirmedSplit(tripId, roundIndex, caller(authentication), request.draftVersion())));
    }

    private String caller(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AccountPrincipal principal) {
            return String.valueOf(principal.id());
        }
        return null;
    }
}