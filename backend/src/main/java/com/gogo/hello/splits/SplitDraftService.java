package com.gogo.hello.splits;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.hello.common.ApiException;
import com.gogo.hello.common.ErrorCode;
import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.ReunionTimingCalculator;
import com.gogo.hello.splits.domain.RouteCandidate;
import com.gogo.hello.splits.domain.SplitDraftDocument;
import com.gogo.hello.splits.domain.SplitDraftDocument.RouteDurations;
import com.gogo.hello.splits.domain.RouteTimingInput;
import com.gogo.hello.splits.domain.RouteTimingResult;
import com.gogo.hello.splits.domain.SplitWindow;
import com.gogo.hello.splits.domain.TimingResult;
import com.gogo.hello.splits.dto.BoundaryResponse;
import com.gogo.hello.splits.dto.CheckTimingRequest;
import com.gogo.hello.splits.dto.GenerateRoutesRequest;
import com.gogo.hello.splits.dto.GroupRoute;
import com.gogo.hello.splits.dto.RouteGenerationResponse;
import com.gogo.hello.splits.dto.SaveBoundariesRequest;
import com.gogo.hello.splits.dto.SplitDraftDetailResponse;
import com.gogo.hello.splits.provider.BranchCandidateProvider;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Orchestrates the splits use cases (design D1): guard -> precondition -> conditional update. Business judgments
 * (confirmation predicate, group partition, window/timing) live in the domain; this service only routes and orders
 * them and never encodes the judgments itself (orchestration-execution-separation).
 */
@Service
public class SplitDraftService {

    private final MemberGuard guard;
    private final SplitDraftRepository repository;
    private final ObjectMapper objectMapper;
    private final BranchCandidateProvider provider;
    private final TransactionTemplate transactionTemplate;
    private final ReunionTimingCalculator calculator = new ReunionTimingCalculator();

    public SplitDraftService(MemberGuard guard, SplitDraftRepository repository, ObjectMapper objectMapper,
            BranchCandidateProvider provider, PlatformTransactionManager transactionManager) {
        this.guard = guard;
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.provider = provider;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Starts the trip's unique active draft (spec REQ-004, design D8/D9/D16). Guards identity/trip/membership,
     * requires a confirmed main plan, then conditionally inserts the draft only while {@code split_draft IS NULL};
     * a lost race maps to 409 SPLIT_DRAFT_CONFLICT.
     */
    public SplitDraftDocument startDraft(String tripId, String memberId) {
        guard.requireMember(memberId, tripId);
        if (!repository.isMainPlanConfirmed(tripId)) {
            throw new ApiException(ErrorCode.MAIN_PLAN_NOT_CONFIRMED, "the main plan must be confirmed");
        }
        repository.ensureMainPlanStops(tripId);
        Map<String, List<String>> groups =
                SplitDraftDocument.partitionGroups(repository.findMemberIdsOrdered(tripId));
        String now = Instant.now().toString();

        String existingJson = repository.findDraftJson(tripId);
        if (existingJson != null) {
            SplitDraftDocument existing = fromJson(existingJson);
            if (!"cancelled".equals(existing.status())) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "an active split draft already exists");
            }
            SplitDraftDocument rebuilt = SplitDraftDocument.initialRebuilt(memberId, 1, groups, now);
            if (repository.rebuildIfCancelled(tripId, toJson(rebuilt), now) == 0) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "a concurrent request replaced the draft");
            }
            return rebuilt;
        }

        SplitDraftDocument draft = SplitDraftDocument.initial(memberId, 1, groups, now);
        if (repository.createDraftIfAbsent(tripId, toJson(draft)) == 0) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "an active split draft already exists");
        }
        return draft;
    }

    /**
     * Saves the initiator's boundary pair (spec REQ-005, design D7/D8/D9). After the shared guard, requires an
     * active draft, the initiator, the current version, both stops within the confirmed main plan and a positive
     * window; then conditionally updates the draft (draftVersion+1). Any rejection leaves boundaries/version intact.
     */
    public BoundaryResponse saveBoundaries(String tripId, String memberId, SaveBoundariesRequest request) {
        guard.requireMember(memberId, tripId);
        String json = repository.findDraftJson(tripId);
        if (json == null) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
        }
        SplitDraftDocument draft = fromJson(json);
        if (!draft.initiatorMemberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_INITIATOR, "only the initiator may edit the draft");
        }
        if (!"active".equals(draft.status())) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
        }
        if (request.draftVersion() != draft.draftVersion()) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        PlanStop departure = repository.findMainPlanStop(tripId, request.departureStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN, "departure stop is not in the confirmed main plan"));
        PlanStop reunion = repository.findMainPlanStop(tripId, request.reunionStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN, "reunion stop is not in the confirmed main plan"));
        SplitWindow window = SplitWindow.between(departure.endAt(), reunion.startAt());
        if (!window.isPositive()) {
            throw new ApiException(ErrorCode.NONPOSITIVE_SPLIT_WINDOW, "split window must be positive");
        }
        SplitDraftDocument updated = draft.withBoundaries(departure.id(), reunion.id(), Instant.now().toString());
        if (repository.updateDraftIfVersion(tripId, toJson(updated), draft.draftVersion()) == 0) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        return new BoundaryResponse(
                departure.id(), reunion.id(), departure.endAt(), reunion.startAt(),
                window.minutes(), updated.draftVersion());
    }

    /**
     * Generates the paired group routes (spec REQ-006, design D6/D10/D11/D12). After the shared guard, requires
     * an active draft, the initiator, saved boundaries and the current version. Candidates are computed by the
     * replaceable provider OUTSIDE the persistence transaction, so the single connection stays free (a provider
     * failure leaves no half pair, and a concurrent boundary re-selection can advance the version). One transaction
     * then deletes the old pair, inserts the new pair and conditionally bumps the version: a provider failure maps
     * to ROUTE_GENERATION_FAILED; a lost version race rolls back the inserts and maps to STALE_DRAFT_VERSION,
     * preserving the newer state. Programmatic transaction management realizes D10's single-transaction atomicity.
     */
    public RouteGenerationResponse generateRoutes(String tripId, String memberId, GenerateRoutesRequest request) {
        guard.requireMember(memberId, tripId);
        String json = repository.findDraftJson(tripId);
        if (json == null) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
        }
        SplitDraftDocument draft = fromJson(json);
        if (!draft.initiatorMemberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_INITIATOR, "only the initiator may edit the draft");
        }
        if (!"active".equals(draft.status())) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
        }
        if (draft.departureStopId() == null || draft.reunionStopId() == null) {
            throw new ApiException(ErrorCode.SPLIT_BOUNDARIES_REQUIRED, "boundaries must be saved before generation");
        }
        if (request.draftVersion() != draft.draftVersion()) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        PlanStop departure = repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN, "departure stop is not in the confirmed main plan"));
        PlanStop reunion = repository.findMainPlanStop(tripId, draft.reunionStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN, "reunion stop is not in the confirmed main plan"));
        int capturedVersion = draft.draftVersion();
        Map<String, RouteCandidate> candidates = new LinkedHashMap<>();
        try {
            for (String groupLabel : draft.groups().keySet()) {
                candidates.put(groupLabel, provider.candidateFor(groupLabel, departure, reunion));
            }
        } catch (RuntimeException ex) {
            throw new ApiException(ErrorCode.ROUTE_GENERATION_FAILED, "route generation failed for a group");
        }
        String now = Instant.now().toString();
        Map<String, RouteDurations> durations = new LinkedHashMap<>();
        List<GroupRoute> routeViews = new ArrayList<>();
        for (Map.Entry<String, RouteCandidate> entry : candidates.entrySet()) {
            RouteCandidate candidate = entry.getValue();
            durations.put(entry.getKey(), new RouteDurations(
                    candidate.activityMinutes(), candidate.travelLegsMinutes(), candidate.bufferMinutes()));
            routeViews.add(new GroupRoute(entry.getKey(), candidate.activityName(), departure.id(), reunion.id(),
                    candidate.activityMinutes(), candidate.travelLegsMinutes(), candidate.bufferMinutes()));
        }
        SplitDraftDocument updated = draft.withRoutes(durations, now);
        String updatedJson = toJson(updated);
        transactionTemplate.executeWithoutResult(status -> {
            repository.deleteSplitRoutes(tripId);
            int order = 1;
            for (Map.Entry<String, RouteCandidate> entry : candidates.entrySet()) {
                String branchId = "split-" + entry.getKey().toLowerCase(Locale.ROOT);
                repository.insertSplitRoute(UUID.randomUUID().toString(), tripId, draft.mainPlanVersion(), branchId,
                        entry.getValue().activityName(), departure.endAt().toString(), reunion.startAt().toString(),
                        order++, now);
            }
            if (repository.updateDraftIfVersion(tripId, updatedJson, capturedVersion) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
        });
        return new RouteGenerationResponse(updated.draftVersion(), routeViews);
    }

    /**
     * Checks the reunion timing for an explicit paired snapshot (spec REQ-007, design D13/D8). The entry guard reads
     * identity/trip/membership only; the calculator then consumes the supplied window and routes with no further DB
     * access. A null/empty/non-pair snapshot is rejected with INVALID_ROUTE_PAIR; overruns and missing inputs are a
     * successful 200 with feasible=false, not a 4xx.
     */
    public TimingResult checkTiming(String tripId, String memberId, CheckTimingRequest request) {
        guard.requireMember(memberId, tripId);
        if (request == null || request.routes() == null || request.routes().size() != 2) {
            throw new ApiException(ErrorCode.INVALID_ROUTE_PAIR, "exactly two group routes are required");
        }
        return calculator.compute(request.windowMinutes(), request.routes());
    }

    /**
     * Assembles the member-only consistent draft snapshot (spec detail D1/D2, design D14/D6/D7). After the shared
     * guard, reads the saved document; an existing trip without an active draft returns null (200 data=null) and
     * creates nothing. Main-plan stops come from the draft's main-plan version; boundary times/window are derived
     * from those stops; route views join plan_node split activity names with the draft duration breakdown. Read-only:
     * no mutation and no version bump, and initiator status is not required.
     */
    public SplitDraftDetailResponse getDraftDetail(String tripId, String memberId) {
        guard.requireMember(memberId, tripId);
        String json = repository.findDraftJson(tripId);
        if (json == null) {
            return null;
        }
        SplitDraftDocument draft = fromJson(json);
        List<PlanStop> mainPlanStops = repository.findMainPlanStops(tripId, draft.mainPlanVersion());
        String departureStopId = draft.departureStopId();
        String reunionStopId = draft.reunionStopId();
        Instant departureAt = null;
        Instant reunionAt = null;
        Long windowMinutes = null;
        if (departureStopId != null && reunionStopId != null) {
            PlanStop departure = stopById(mainPlanStops, departureStopId);
            PlanStop reunion = stopById(mainPlanStops, reunionStopId);
            if (departure != null && reunion != null) {
                departureAt = departure.endAt();
                reunionAt = reunion.startAt();
                if (departureAt != null && reunionAt != null) {
                    windowMinutes = SplitWindow.between(departureAt, reunionAt).minutes();
                }
            }
        }
        List<GroupRoute> routes = new ArrayList<>();
        if (draft.routes() != null) {
            Map<String, String> activities = repository.findSplitRouteActivities(tripId);
            for (Map.Entry<String, RouteDurations> entry : draft.routes().entrySet()) {
                String label = entry.getKey();
                RouteDurations durations = entry.getValue();
                String activityName = activities.get("split-" + label.toLowerCase(Locale.ROOT));
                routes.add(new GroupRoute(label, activityName, departureStopId, reunionStopId,
                        durations.activityMinutes(), durations.travelLegsMinutes(), durations.bufferMinutes()));
            }
        }
        return new SplitDraftDetailResponse(
                draft.initiatorMemberId(), draft.mainPlanVersion(), draft.draftVersion(), draft.status(),
                draft.groups(), draft.createdAt(), draft.updatedAt(), mainPlanStops,
                departureStopId, reunionStopId, departureAt, reunionAt, windowMinutes, routes);
    }

    /**
     * Confirms the current draft as the trip's effective split (spec US-049, design D4/D5/D11). Only the organizer may
     * confirm. Completeness is checked before any timing work; the server recomputes both routes from the saved
     * document (a client-declared verdict is never trusted); the status write is a conditional update that leaves the
     * stored column version untouched.
     */
    public SplitDraftDetailResponse confirmDraft(String tripId, String memberId, int draftVersion) {
        guard.requireMember(memberId, tripId);
        requireOrganizer(tripId, memberId);
        SplitDraftDocument draft = requireActiveDraft(tripId);
        if (draft.draftVersion() != draftVersion) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        List<String> missing = missingDraftParts(draft);
        if (!missing.isEmpty()) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_INCOMPLETE, "the draft is not complete",
                    Map.of("missing", missing));
        }
        TimingResult timing = calculator.compute(windowMinutes(tripId, draft), timingInputs(draft));
        if (!timing.feasible()) {
            throw new ApiException(ErrorCode.SPLIT_TIMING_INFEASIBLE, "the route pair does not fit the window",
                    Map.of("routes", timingDetails(timing)));
        }
        String now = Instant.now().toString();
        if (repository.confirmDraftIfActive(tripId, draftVersion, toJson(draft.confirmed(now)), now) == 0) {
            SplitDraftDocument current = currentDraft(tripId);
            if (current == null || !"active".equals(current.status())) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
            }
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        return getDraftDetail(tripId, memberId);
    }

    /**
     * Cancels the initiator's unconfirmed draft (spec US-050, design D4/D6/D9/D11). The status write and the split
     * route node deletion share one transaction; the document routes are cleared in the same write so a cancelled
     * detail never shows ghost routes. The main plan rows are never touched.
     */
    public SplitDraftDetailResponse cancelDraft(String tripId, String memberId, int draftVersion) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId);
        if (!draft.initiatorMemberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_INITIATOR, "only the initiator may cancel the draft");
        }
        if (draft.draftVersion() != draftVersion) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        String now = Instant.now().toString();
        SplitDraftDocument cancelled = draft.cancelled(now);
        transactionTemplate.executeWithoutResult(status -> {
            if (repository.cancelDraftIfActive(tripId, draftVersion, toJson(cancelled), now) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
            repository.deleteSplitRoutes(tripId);
        });
        return getDraftDetail(tripId, memberId);
    }

    /**
     * US-051: cancels a confirmed split before departure (design D9). Only the trip organizer may cancel; the
     * departure instant is the confirmed draft's departure stop {@code start_at}, and a missing value counts as
     * not departed in this MVP. The status write and the split route node deletion share one transaction.
     */
    public SplitDraftDetailResponse cancelConfirmedSplit(String tripId, String memberId, int draftVersion) {
        guard.requireMember(memberId, tripId);
        requireOrganizer(tripId, memberId);
        SplitDraftDocument draft = currentDraft(tripId);
        if (draft == null || !"confirmed".equals(draft.status())) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no confirmed split to cancel");
        }
        if (draft.draftVersion() != draftVersion) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        Instant departureAt = null;
        if (draft.departureStopId() != null) {
            departureAt = repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion())
                    .map(PlanStop::startAt).orElse(null);
        }
        if (departureAt != null && !departureAt.isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.SPLIT_ALREADY_DEPARTED, "the split has already departed");
        }
        String now = Instant.now().toString();
        SplitDraftDocument cancelled = draft.cancelled(now);
        transactionTemplate.executeWithoutResult(status -> {
            if (repository.cancelConfirmedIfConfirmed(tripId, draftVersion, toJson(cancelled), now) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
            repository.deleteSplitRoutes(tripId);
        });
        return getDraftDetail(tripId, memberId);
    }

    private void requireOrganizer(String tripId, String memberId) {
        String organizerId = repository.findOrganizerId(tripId).orElse(null);
        if (organizerId == null || !organizerId.equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_ORGANIZER, "only the trip organizer may confirm the split");
        }
    }

    private SplitDraftDocument requireActiveDraft(String tripId) {
        SplitDraftDocument draft = currentDraft(tripId);
        if (draft == null || !"active".equals(draft.status())) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
        }
        return draft;
    }

    private SplitDraftDocument currentDraft(String tripId) {
        String json = repository.findDraftJson(tripId);
        return json == null ? null : fromJson(json);
    }

    private List<String> missingDraftParts(SplitDraftDocument draft) {
        List<String> missing = new ArrayList<>();
        if (draft.departureStopId() == null || draft.reunionStopId() == null) {
            missing.add("boundaries");
        }
        Map<String, RouteDurations> routes = draft.routes();
        if (routes == null) {
            missing.add("routes");
        } else {
            if (routes.get("A") == null) {
                missing.add("routes.A");
            }
            if (routes.get("B") == null) {
                missing.add("routes.B");
            }
        }
        return missing;
    }

    /** Window length derived from the confirmed main-plan boundary stops (design D5). */
    private long windowMinutes(String tripId, SplitDraftDocument draft) {
        PlanStop departure = repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                        "departure stop is not in the confirmed main plan"));
        PlanStop reunion = repository.findMainPlanStop(tripId, draft.reunionStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                        "reunion stop is not in the confirmed main plan"));
        return SplitWindow.between(departure.endAt(), reunion.startAt()).minutes();
    }

    /** Maps the saved A/B duration breakdown to the calculator's nullable inputs (design D8). */
    private List<RouteTimingInput> timingInputs(SplitDraftDocument draft) {
        List<RouteTimingInput> inputs = new ArrayList<>();
        for (String label : List.of("A", "B")) {
            RouteDurations durations = draft.routes().get(label);
            inputs.add(new RouteTimingInput(label, durations.activityMinutes(),
                    durations.travelLegsMinutes(), durations.bufferMinutes()));
        }
        return inputs;
    }

    /** Per-route detail rows for {@code error.details.routes[]} (contractual shape, US-049 CF2-N/CF3-N). */
    private List<Map<String, Object>> timingDetails(TimingResult timing) {
        List<Map<String, Object>> details = new ArrayList<>();
        for (RouteTimingResult route : timing.routes()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("groupLabel", route.groupLabel());
            row.put("totalMinutes", route.totalMinutes());
            row.put("overrunMinutes", route.overrunMinutes());
            row.put("missingInputs", route.missingInputs());
            details.add(row);
        }
        return details;
    }

    private static PlanStop stopById(List<PlanStop> stops, String id) {
        return stops.stream().filter(stop -> stop.id().equals(id)).findFirst().orElse(null);
    }

    private String toJson(SplitDraftDocument draft) {
        try {
            return objectMapper.writeValueAsString(draft);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("failed to serialize split draft document", ex);
        }
    }

    private SplitDraftDocument fromJson(String json) {
        try {
            return objectMapper.readValue(json, SplitDraftDocument.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("failed to deserialize split draft document", ex);
        }
    }
}