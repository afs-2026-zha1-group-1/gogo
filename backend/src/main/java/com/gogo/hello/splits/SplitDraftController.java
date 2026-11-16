package com.gogo.hello.splits;

import com.gogo.hello.common.ApiResponse;
import com.gogo.hello.splits.domain.SplitDraftDocument;
import com.gogo.hello.splits.domain.TimingResult;
import com.gogo.hello.splits.dto.BoundaryResponse;
import com.gogo.hello.splits.dto.CheckTimingRequest;
import com.gogo.hello.splits.dto.GenerateRoutesRequest;
import com.gogo.hello.splits.dto.RouteGenerationResponse;
import com.gogo.hello.splits.dto.SaveBoundariesRequest;
import com.gogo.hello.splits.dto.SplitDraftDetailResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin REST adapter for the splits capability (design D1). Parses the {@code X-Member-Id} header and path variables
 * and delegates to {@link SplitDraftService}; all guards, judgments and persistence live below this layer. The
 * header is optional here so a missing identity reaches the guard and maps to 401 rather than a framework 400.
 */
@RestController
@RequestMapping("/api/trips/{tripId}/split-draft")
public class SplitDraftController {

    private final SplitDraftService service;

    public SplitDraftController(SplitDraftService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<SplitDraftDetailResponse>> getDraftDetail(
            @PathVariable String tripId,
            @RequestHeader(name = "X-Member-Id", required = false) String memberId) {
        SplitDraftDetailResponse detail = service.getDraftDetail(tripId, memberId);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SplitDraftDocument>> startDraft(
            @PathVariable String tripId,
            @RequestHeader(name = "X-Member-Id", required = false) String memberId) {
        SplitDraftDocument draft = service.startDraft(tripId, memberId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(draft));
    }

    @PutMapping("/boundaries")
    public ResponseEntity<ApiResponse<BoundaryResponse>> saveBoundaries(
            @PathVariable String tripId,
            @RequestHeader(name = "X-Member-Id", required = false) String memberId,
            @RequestBody SaveBoundariesRequest request) {
        BoundaryResponse response = service.saveBoundaries(tripId, memberId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/routes:generate")
    public ResponseEntity<ApiResponse<RouteGenerationResponse>> generateRoutes(
            @PathVariable String tripId,
            @RequestHeader(name = "X-Member-Id", required = false) String memberId,
            @RequestBody GenerateRoutesRequest request) {
        RouteGenerationResponse response = service.generateRoutes(tripId, memberId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/routes:check-timing")
    public ResponseEntity<ApiResponse<TimingResult>> checkTiming(
            @PathVariable String tripId,
            @RequestHeader(name = "X-Member-Id", required = false) String memberId,
            @RequestBody CheckTimingRequest request) {
        TimingResult result = service.checkTiming(tripId, memberId, request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}