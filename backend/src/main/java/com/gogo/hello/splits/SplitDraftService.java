package com.gogo.hello.splits;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.hello.common.ApiException;
import com.gogo.hello.common.ErrorCode;
import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.ReunionTimingCalculator;
import com.gogo.hello.splits.domain.RouteCandidate;
import com.gogo.hello.splits.domain.RoutePairEdit;
import com.gogo.hello.splits.domain.SplitDraftDocument;
import com.gogo.hello.splits.domain.SplitDraftDocument.RouteDurations;
import com.gogo.hello.splits.domain.RouteTimingInput;
import com.gogo.hello.splits.domain.RouteTimingResult;
import com.gogo.hello.splits.domain.SplitWindow;
import com.gogo.hello.splits.domain.TimingResult;
import com.gogo.hello.splits.dto.AssignmentRequest;
import com.gogo.hello.splits.dto.BoundaryResponse;
import com.gogo.hello.splits.dto.CheckTimingRequest;
import com.gogo.hello.splits.dto.GenerateRoutesRequest;
import com.gogo.hello.splits.dto.GroupRoute;
import com.gogo.hello.splits.dto.RouteEditInput;
import com.gogo.hello.splits.dto.RouteGenerationResponse;
import com.gogo.hello.splits.dto.SaveBoundariesRequest;
import com.gogo.hello.splits.dto.SaveRoutesRequest;
import com.gogo.hello.splits.dto.SplitDraftDetailResponse;
import com.gogo.hello.splits.provider.BranchCandidateProvider;
import com.gogo.mainplan.MainPlanProjection;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
    private final MainPlanProjection mainPlanProjection;
    private final TransactionTemplate transactionTemplate;
    private final ReunionTimingCalculator calculator = new ReunionTimingCalculator();

    public SplitDraftService(MemberGuard guard, SplitDraftRepository repository, ObjectMapper objectMapper,
            BranchCandidateProvider provider, MainPlanProjection mainPlanProjection,
            PlatformTransactionManager transactionManager) {
        this.guard = guard;
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.provider = provider;
        this.mainPlanProjection = mainPlanProjection;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Starts the trip's unique active draft (spec REQ-004, design D8/D9/D16). Guards identity/trip/membership,
     * requires a confirmed main plan, projects that plan into the main-line nodes, then conditionally inserts the
     * draft only while {@code split_draft IS NULL}; a lost race maps to 409 SPLIT_DRAFT_CONFLICT. The draft pins the
     * confirmed plan's real version, so its boundaries come from the same stops the members approved.
     */
    public SplitDraftDocument startDraft(String tripId, String memberId) {
        guard.requireMember(memberId, tripId);
        if (!repository.isMainPlanConfirmed(tripId)) {
            throw new ApiException(ErrorCode.MAIN_PLAN_NOT_CONFIRMED, "the main plan must be confirmed");
        }
        List<String> memberIds = repository.findMemberIdsOrdered(tripId);
        String now = Instant.now().toString();

        String existingJson = repository.findDraftJson(tripId);
        SplitDraftDocument existing = null;
        if (existingJson != null) {
            existing = fromJson(existingJson);
            if (!"cancelled".equals(existing.status())) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "an active split draft already exists");
            }
        }
        requireSplittableMembers(memberIds);
        int mainPlanVersion = confirmedMainPlanVersion(tripId);
        if (existing == null) {
            SplitDraftDocument draft = SplitDraftDocument.initial(
                    memberId, mainPlanVersion, SplitDraftDocument.initialGroups(memberIds), now);
            if (repository.createDraftIfAbsent(tripId, toJson(draft)) == 0) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "an active split draft already exists");
            }
            return draft;
        }
        SplitDraftDocument rebuilt = SplitDraftDocument.initialRebuilt(
                memberId, mainPlanVersion, SplitDraftDocument.initialGroups(memberIds), now);
        if (repository.rebuildIfCancelled(tripId, toJson(rebuilt), now) == 0) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "a concurrent request replaced the draft");
        }
        return rebuilt;
    }

    /**
     * Projects the confirmed main plan into plan_node and returns its version. A confirmation flag without a
     * confirmed draft cannot provide boundary stops, so it is rejected instead of falling back to synthetic nodes.
     */
    private int confirmedMainPlanVersion(String tripId) {
        return mainPlanProjection.projectConfirmed(Long.parseLong(tripId))
                .orElseThrow(() -> new ApiException(
                        ErrorCode.MAIN_PLAN_NOT_CONFIRMED, "the main plan must be confirmed"));
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
        SplitWindow window = SplitWindow.between(departure.startAt(), reunion.startAt());
        if (!window.isPositive()) {
            throw new ApiException(ErrorCode.NONPOSITIVE_SPLIT_WINDOW, "split window must be positive");
        }
        SplitDraftDocument updated = draft.withBoundaries(departure.id(), reunion.id(), Instant.now().toString());
        transactionTemplate.executeWithoutResult(status -> {
            if (repository.updateDraftIfVersion(tripId, toJson(updated), draft.draftVersion()) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
            repository.deleteSplitRoutes(tripId);
        });
        return new BoundaryResponse(
                departure.id(), reunion.id(), departure.startAt(), reunion.startAt(),
                window.minutes(), updated.draftVersion());
    }

    /**
     * Moves a trip member into the target group (US-040 A1-A9, design DD2/DD4/DD7). After the shared guard it requires
     * an active draft, the current version and an A/B label. Any trip member may move any trip member (user ruling
     * 2026-11-17, prototype avatar click); the optional {@code memberId} names the moved member and defaults to the
     * caller, while a target outside the trip is rejected with NOT_A_MEMBER. Moving a member into the group it already
     * belongs to is idempotent: 200 with no write and no version bump (design DD4). Otherwise the conditional update
     * bumps draftVersion and leaves the saved boundaries and generated routes untouched.
     */
    public SplitDraftDetailResponse assign(String tripId, String memberId, AssignmentRequest request) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId);
        if (request == null || request.draftVersion() != draft.draftVersion()) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        String groupLabel = request.groupLabel();
        if (!"A".equals(groupLabel) && !"B".equals(groupLabel)) {
            throw new ApiException(ErrorCode.INVALID_GROUP_LABEL, "group label must be A or B");
        }
        String target = request.memberId() == null || request.memberId().isBlank()
                ? memberId
                : request.memberId();
        if (!target.equals(memberId) && !repository.findMemberIdsOrdered(tripId).contains(target)) {
            throw new ApiException(ErrorCode.NOT_A_MEMBER, "the target member does not belong to this trip");
        }
        if (draft.groups() != null
                && draft.groups().getOrDefault(groupLabel, List.of()).contains(target)) {
            return getDraftDetail(tripId, memberId);
        }
        SplitDraftDocument updated = draft.withAssignment(groupLabel, target, Instant.now().toString());
        if (repository.updateDraftIfVersion(tripId, toJson(updated), draft.draftVersion()) == 0) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        return getDraftDetail(tripId, memberId);
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
        List<String> groupProblems = groupProblems(draft, repository.findMemberIdsOrdered(tripId));
        if (!groupProblems.isEmpty()) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_INCOMPLETE, "the draft is not complete",
                    Map.of("missing", groupProblems));
        }
        PlanStop departure = repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN, "departure stop is not in the confirmed main plan"));
        PlanStop reunion = repository.findMainPlanStop(tripId, draft.reunionStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN, "reunion stop is not in the confirmed main plan"));
        int capturedVersion = draft.draftVersion();
        List<PlanStop> mainPlanStops = repository.findMainPlanStops(tripId, draft.mainPlanVersion());
        Map<String, RouteCandidate> candidates = new LinkedHashMap<>();
        try {
            for (String groupLabel : draft.groups().keySet()) {
                candidates.put(groupLabel, provider.candidateFor(groupLabel, departure, reunion,
                        repository.findDestination(tripId).orElse(null), mainPlanStops));
            }
        } catch (RuntimeException ex) {
            throw new ApiException(ErrorCode.ROUTE_GENERATION_FAILED, "route generation failed for a group");
        }
        String now = Instant.now().toString();
        Map<String, RouteDurations> durations = new LinkedHashMap<>();
        List<GroupRoute> routeViews = new ArrayList<>();
        for (Map.Entry<String, RouteCandidate> entry : candidates.entrySet()) {
            RouteCandidate candidate = entry.getValue();
            durations.put(entry.getKey(), new RouteDurations(candidate.activityMinutes(),
                    candidate.travelLegsMinutes(), candidate.bufferMinutes(), candidate.steps()));
            routeViews.add(new GroupRoute(entry.getKey(), candidate.activityName(), candidate.locationName(),
                    departure.id(), reunion.id(), candidate.activityMinutes(), candidate.travelLegsMinutes(),
                    candidate.bufferMinutes(), candidate.steps()));
        }
        SplitDraftDocument updated = draft.withRoutes(durations, now);
        String updatedJson = toJson(updated);
        transactionTemplate.executeWithoutResult(status -> {
            repository.deleteSplitRoutes(tripId);
            int order = 1;
            for (Map.Entry<String, RouteCandidate> entry : candidates.entrySet()) {
                String branchId = "split-" + entry.getKey().toLowerCase(Locale.ROOT);
                repository.insertSplitRoute(UUID.randomUUID().toString(), tripId, draft.mainPlanVersion(), branchId,
                        entry.getValue().activityName(), entry.getValue().locationName(),
                        departure.startAt().toString(), reunion.startAt().toString(), order++, now);
            }
            if (repository.updateDraftIfVersion(tripId, updatedJson, capturedVersion) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
        });
        return new RouteGenerationResponse(updated.draftVersion(), routeViews);
    }

    /**
     * Saves a manual A/B route edit (spec US-087 S2/S2b, design DD1/DD2/DD3). Any trip member may edit while the
     * draft is active; group A keeps the read-only stop names and derives its activity/leg totals from the submitted
     * stay/travel minutes, while group B supplies a single activity breakdown. The plan_node headers and the draft
     * document routes are written in one transaction with a conditional version bump; a stale version or a missing
     * pair leaves both untouched. Timing is deliberately not judged here: the step-2 Next action calls
     * routes:check-timing afterwards and blocks on feasible=false.
     */
    public RouteGenerationResponse saveRoutes(String tripId, String memberId, SaveRoutesRequest request) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId);
        if (request == null || request.routes() == null || request.routes().size() != 2) {
            throw new ApiException(ErrorCode.INVALID_ROUTE_PAIR, "exactly two group routes are required");
        }
        if (request.draftVersion() != draft.draftVersion()) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        Map<String, RouteDurations> existing = draft.routes();
        List<String> missingRoutes = new ArrayList<>();
        if (existing == null || existing.get("A") == null) {
            missingRoutes.add("routes.A");
        }
        if (existing == null || existing.get("B") == null) {
            missingRoutes.add("routes.B");
        }
        if (!missingRoutes.isEmpty()) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_INCOMPLETE, "the draft is not complete",
                    Map.of("missing", missingRoutes));
        }
        Map<String, RouteEditInput> inputs = new LinkedHashMap<>();
        for (RouteEditInput input : request.routes()) {
            if (input == null) {
                throw new ApiException(ErrorCode.INVALID_ROUTE_INPUT, "route input is required");
            }
            String label = input.groupLabel() == null ? "" : input.groupLabel().trim();
            if (!"A".equals(label) && !"B".equals(label)) {
                throw new ApiException(ErrorCode.INVALID_GROUP_LABEL, "group label must be A or B");
            }
            if (inputs.put(label, input) != null) {
                throw new ApiException(ErrorCode.INVALID_ROUTE_PAIR, "each group label may appear once");
            }
        }
        if (!inputs.keySet().equals(Set.of("A", "B"))) {
            throw new ApiException(ErrorCode.INVALID_ROUTE_PAIR, "exactly the A and B routes are required");
        }
        Map<String, RouteDurations> updatedRoutes = new LinkedHashMap<>();
        Map<String, String> derivedNames = new LinkedHashMap<>();
        Map<String, String> derivedLocations = new LinkedHashMap<>();
        List<GroupRoute> routeViews = new ArrayList<>();
        for (String label : List.of("A", "B")) {
            RouteEditInput input = inputs.get(label);
            RouteDurations durations = deriveRoute(label, input);
            String activityName = RoutePairEdit.deriveActivityName(durations.steps());
            String locationName = durations.steps().get(0).name();
            updatedRoutes.put(label, durations);
            derivedNames.put(label, activityName);
            derivedLocations.put(label, locationName);
            routeViews.add(new GroupRoute(label, activityName, locationName, draft.departureStopId(),
                    draft.reunionStopId(), durations.activityMinutes(), durations.travelLegsMinutes(),
                    durations.bufferMinutes(), durations.steps()));
        }
        String now = Instant.now().toString();
        SplitDraftDocument updated = draft.withRoutes(updatedRoutes, now);
        String updatedJson = toJson(updated);
        transactionTemplate.executeWithoutResult(status -> {
            for (String label : List.of("A", "B")) {
                String branchId = "split-" + label.toLowerCase(Locale.ROOT);
                if (repository.updateSplitRoute(tripId, draft.mainPlanVersion(), branchId,
                        derivedNames.get(label), derivedLocations.get(label)) == 0) {
                    throw new ApiException(ErrorCode.SPLIT_DRAFT_INCOMPLETE, "the route pair is missing",
                            Map.of("missing", List.of("routes." + label)));
                }
            }
            if (repository.updateDraftIfVersion(tripId, updatedJson, draft.draftVersion()) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
        });
        return new RouteGenerationResponse(updated.draftVersion(), routeViews);
    }

    /** Both groups share the station-list derivation; A has stops legs, B has stops + 1 (Revision 3). */
    private RouteDurations deriveRoute(String label, RouteEditInput input) {
        try {
            return RoutePairEdit.derive(label, input.steps(), input.travelLegsMinutes());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.INVALID_ROUTE_INPUT, ex.getMessage());
        }
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
                departureAt = departure.startAt();
                reunionAt = reunion.startAt();
                if (departureAt != null && reunionAt != null) {
                    windowMinutes = SplitWindow.between(departureAt, reunionAt).minutes();
                }
            }
        }
        List<GroupRoute> routes = new ArrayList<>();
        if (draft.routes() != null) {
            Map<String, SplitDraftRepository.SplitRouteActivity> activities = repository.findSplitRouteActivities(tripId);
            for (Map.Entry<String, RouteDurations> entry : draft.routes().entrySet()) {
                String label = entry.getKey();
                RouteDurations durations = entry.getValue();
                SplitDraftRepository.SplitRouteActivity activity =
                        activities.get("split-" + label.toLowerCase(Locale.ROOT));
                routes.add(new GroupRoute(label, activity == null ? null : activity.title(),
                        activity == null ? null : activity.locationName(), departureStopId, reunionStopId,
                        durations.activityMinutes(), durations.travelLegsMinutes(), durations.bufferMinutes(),
                        durations.steps()));
            }
        }
        return new SplitDraftDetailResponse(
                draft.initiatorMemberId(), draft.mainPlanVersion(), draft.draftVersion(), draft.status(),
                draft.groups(), draft.createdAt(), draft.updatedAt(), mainPlanStops,
                departureStopId, reunionStopId, departureAt, reunionAt, windowMinutes, routes,
                repository.findDestination(tripId).orElse(null));
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
        List<String> missing = missingDraftParts(draft, repository.findMemberIdsOrdered(tripId));
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

    private List<String> missingDraftParts(SplitDraftDocument draft, List<String> memberIds) {
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
        missing.addAll(groupProblems(draft, memberIds));
        return missing;
    }

    /**
     * US-040 group completeness projection (design DD8): both groups non-empty and every current trip member assigned
     * exactly once. Items are appended in a fixed order so {@code error.details.missing} stays assertable.
     */
    private List<String> groupProblems(SplitDraftDocument draft, List<String> memberIds) {
        List<String> problems = new ArrayList<>();
        Map<String, List<String>> groups = draft.groups();
        List<String> groupA = groups == null ? null : groups.get("A");
        List<String> groupB = groups == null ? null : groups.get("B");
        if (groupA == null || groupA.isEmpty()) {
            problems.add("groups.A");
        }
        if (groupB == null || groupB.isEmpty()) {
            problems.add("groups.B");
        }
        if (groups == null) {
            problems.add("groups.unassigned");
            return problems;
        }
        List<String> assigned = new ArrayList<>();
        if (groupA != null) {
            assigned.addAll(groupA);
        }
        if (groupB != null) {
            assigned.addAll(groupB);
        }
        if (memberIds.stream().anyMatch(id -> !assigned.contains(id))) {
            problems.add("groups.unassigned");
        }
        boolean duplicate = false;
        for (String label : List.of("A", "B")) {
            List<String> members = groups.get(label);
            if (members != null && new HashSet<>(members).size() != members.size()) {
                duplicate = true;
            }
        }
        if (!duplicate && groupA != null && groupB != null) {
            duplicate = groupA.stream().anyMatch(groupB::contains);
        }
        if (duplicate) {
            problems.add("groups.duplicate");
        }
        return problems;
    }

    /** A split needs two groups with at least one member each (US-040 S10-N, design DD5). */
    private void requireSplittableMembers(List<String> memberIds) {
        if (memberIds.size() < 2) {
            throw new ApiException(ErrorCode.SPLIT_MEMBERS_INSUFFICIENT,
                    "a split needs at least two trip members (one per group)");
        }
    }

    /** Window length derived from the confirmed main-plan boundary stops (design D5). */
    private long windowMinutes(String tripId, SplitDraftDocument draft) {
        PlanStop departure = repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                        "departure stop is not in the confirmed main plan"));
        PlanStop reunion = repository.findMainPlanStop(tripId, draft.reunionStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                        "reunion stop is not in the confirmed main plan"));
        return SplitWindow.between(departure.startAt(), reunion.startAt()).minutes();
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