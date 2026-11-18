package com.gogo.hello.splits;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.hello.common.ApiException;
import com.gogo.hello.common.ErrorCode;
import com.gogo.hello.splits.domain.PlanStop;
import com.gogo.hello.splits.domain.ReunionTimingCalculator;
import com.gogo.hello.splits.domain.RouteActivity;
import com.gogo.hello.splits.domain.RouteCandidate;
import com.gogo.hello.splits.domain.RoutePairEdit;
import com.gogo.hello.splits.domain.RouteStep;
import com.gogo.hello.splits.domain.SplitBudgetCalculator;
import com.gogo.hello.splits.domain.SplitBoundaries;
import com.gogo.hello.splits.domain.SplitBranchId;
import com.gogo.hello.splits.domain.SplitDraftDocument;
import com.gogo.hello.splits.domain.SplitDraftDocument.RouteDurations;
import com.gogo.hello.splits.domain.SplitMode;
import com.gogo.hello.splits.domain.RouteTimingInput;
import com.gogo.hello.splits.domain.RouteTimingResult;
import com.gogo.hello.splits.domain.SplitWindow;
import com.gogo.hello.splits.domain.TimingResult;
import com.gogo.hello.splits.dto.AssignmentRequest;
import com.gogo.hello.splits.dto.BoundaryResponse;
import com.gogo.hello.splits.dto.BudgetCheckResponse;
import com.gogo.hello.splits.dto.CheckTimingRequest;
import com.gogo.hello.splits.dto.GenerateRoutesRequest;
import com.gogo.hello.splits.dto.GroupRoute;
import com.gogo.hello.splits.dto.RecommendActivitiesRequest;
import com.gogo.hello.splits.dto.RouteEditInput;
import com.gogo.hello.splits.dto.RouteGenerationResponse;
import com.gogo.hello.splits.dto.SaveActivitiesRequest;
import com.gogo.hello.splits.dto.SaveBoundariesRequest;
import com.gogo.hello.splits.dto.SaveRoutesRequest;
import com.gogo.hello.splits.dto.SplitDraftDetailResponse;
import com.gogo.hello.splits.dto.SplitRoundCreatedResponse;
import com.gogo.hello.splits.dto.SplitRoundsResponse;
import com.gogo.hello.splits.provider.BranchCandidateContext;
import com.gogo.hello.splits.provider.BranchCandidateProvider;
import com.gogo.hello.splits.provider.MockSquadActivityRecommender;
import com.gogo.mainplan.MainPlanProjection;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
    private final MockSquadActivityRecommender activityRecommender;
    private final MainPlanProjection mainPlanProjection;
    private final TransactionTemplate transactionTemplate;
    private final ReunionTimingCalculator calculator = new ReunionTimingCalculator();
    private final SplitBudgetCalculator budgetCalculator = new SplitBudgetCalculator();

    /** Whole-list activity write guard (US-045): a group cannot accumulate unbounded cost rows. */
    private static final int MAX_ACTIVITIES_PER_GROUP = 20;
    private static final int MAX_ACTIVITY_COST_CENTS = 10_000_000;
    /** US-096: the first release supports two rounds (the model stays N-round ready). */
    private static final int MAX_ROUNDS = 2;

    public SplitDraftService(MemberGuard guard, SplitDraftRepository repository, ObjectMapper objectMapper,
            BranchCandidateProvider provider, MockSquadActivityRecommender activityRecommender,
            MainPlanProjection mainPlanProjection, PlatformTransactionManager transactionManager) {
        this.guard = guard;
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.provider = provider;
        this.activityRecommender = activityRecommender;
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
        return startRound(tripId, memberId, 1);
    }

    /**
     * Starts the next split round (US-096). The previous round must be confirmed, the next round must be absent or
     * cancelled, the round limit must not be exceeded and the main-plan version must match round 1. Groups are copied
     * from the previous confirmed round; the user can regroup afterwards.
     */
    public SplitRoundCreatedResponse startNextRound(String tripId, String memberId) {
        guard.requireMember(memberId, tripId);
        if (!repository.isMainPlanConfirmed(tripId)) {
            throw new ApiException(ErrorCode.MAIN_PLAN_NOT_CONFIRMED, "the main plan must be confirmed");
        }
        int roundIndex = nextRoundIndex(tripId);
        if (roundIndex > MAX_ROUNDS) {
            throw new ApiException(ErrorCode.SPLIT_ROUND_LIMIT_REACHED, "only two split rounds are supported");
        }
        SplitDraftDocument previous = currentDraft(tripId, roundIndex - 1);
        if (previous == null || !"confirmed".equals(previous.status())) {
            throw new ApiException(ErrorCode.SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED,
                    "the previous round must be confirmed first");
        }
        SplitDraftDocument existing = currentDraft(tripId, roundIndex);
        if (existing != null && !"cancelled".equals(existing.status())) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "that split round already exists");
        }
        List<String> memberIds = repository.findMemberIdsOrdered(tripId);
        requireSplittableMembers(memberIds);
        int mainPlanVersion = confirmedMainPlanVersion(tripId);
        if (mainPlanVersion != previous.mainPlanVersion()) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT,
                    "the next round must use the same confirmed main plan version");
        }
        Map<String, List<String>> groups = copyGroups(previous.groups());
        String now = Instant.now().toString();
        if (existing == null) {
            SplitDraftDocument draft = SplitDraftDocument.initial(memberId, mainPlanVersion, groups, now);
            if (repository.createDraftIfAbsent(tripId, roundIndex, toJson(draft)) == 0) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "that split round already exists");
            }
        } else {
            SplitDraftDocument rebuilt = SplitDraftDocument.initialRebuilt(memberId, mainPlanVersion, groups, now);
            if (repository.rebuildIfCancelled(tripId, roundIndex, toJson(rebuilt), now) == 0) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "a concurrent request replaced the round");
            }
        }
        return new SplitRoundCreatedResponse(roundIndex, getDraftDetail(tripId, roundIndex, memberId));
    }

    /** Starts or rebuilds one round; round 1 keeps the original all-A partition. */
    private SplitDraftDocument startRound(String tripId, String memberId, int roundIndex) {
        guard.requireMember(memberId, tripId);
        if (!repository.isMainPlanConfirmed(tripId)) {
            throw new ApiException(ErrorCode.MAIN_PLAN_NOT_CONFIRMED, "the main plan must be confirmed");
        }
        List<String> memberIds = repository.findMemberIdsOrdered(tripId);
        String now = Instant.now().toString();

        String existingJson = repository.findDraftJson(tripId, roundIndex);
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
            if (repository.createDraftIfAbsent(tripId, roundIndex, toJson(draft)) == 0) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "an active split draft already exists");
            }
            return draft;
        }
        SplitDraftDocument rebuilt = SplitDraftDocument.initialRebuilt(
                memberId, mainPlanVersion, SplitDraftDocument.initialGroups(memberIds), now);
        if (repository.rebuildIfCancelled(tripId, roundIndex, toJson(rebuilt), now) == 0) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_CONFLICT, "a concurrent request replaced the draft");
        }
        return rebuilt;
    }

    /** Next round index: max+1 when the max round is confirmed, otherwise the max round itself. */
    private int nextRoundIndex(String tripId) {
        int max = repository.findMaxRoundIndex(tripId).orElse(0);
        if (max == 0) {
            return 2;
        }
        SplitDraftDocument current = currentDraft(tripId, max);
        return current != null && "confirmed".equals(current.status()) ? max + 1 : max;
    }

    private static Map<String, List<String>> copyGroups(Map<String, List<String>> groups) {
        Map<String, List<String>> copy = new LinkedHashMap<>();
        if (groups == null) {
            copy.put("A", new ArrayList<>());
            copy.put("B", new ArrayList<>());
            return copy;
        }
        for (Map.Entry<String, List<String>> entry : groups.entrySet()) {
            copy.put(entry.getKey(), new ArrayList<>(entry.getValue()));
        }
        copy.putIfAbsent("A", new ArrayList<>());
        copy.putIfAbsent("B", new ArrayList<>());
        return copy;
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
     * US-090: a 「我的方案」stop edit changes the times a generated pair was computed against, so the pair is dropped
     * while the draft stays active for regeneration. Boundaries and groups survive because the main-plan stop ids
     * are stable across the re-projection. Reached from the mainplan module through an event so that mainplan never
     * depends on splits.
     */
    public void invalidateRoutesAfterMainPlanChange(String tripId) {
        for (SplitDraftRepository.RoundRow row : repository.findRoundRows(tripId)) {
            if (row.document() == null) {
                continue;
            }
            SplitDraftDocument draft = fromJson(row.document());
            if (!"active".equals(draft.status())) {
                continue;
            }
            boolean dangling = draft.departureStopId() != null
                    && repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion()).isEmpty()
                    || draft.reunionStopId() != null
                    && repository.findMainPlanStop(tripId, draft.reunionStopId(), draft.mainPlanVersion()).isEmpty();
            boolean hasRoutes = draft.routes() != null && !draft.routes().isEmpty();
            if (!dangling && !hasRoutes) {
                continue;
            }
            String now = Instant.now().toString();
            SplitDraftDocument updated = dangling
                    ? draft.withClearedBoundariesAndRoutes(now)
                    : draft.withClearedRoutes(now);
            if (repository.updateDraftIfVersion(tripId, row.roundIndex(), toJson(updated), draft.draftVersion()) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
            repository.deleteSplitRoutes(tripId, row.roundIndex());
        }
    }

    /**
     * Saves the initiator's boundary pair (spec REQ-005, design D7/D8/D9). After the shared guard, requires an
     * active draft, the initiator, the current version, both stops within the confirmed main plan and a positive
     * window; then conditionally updates the draft (draftVersion+1). Any rejection leaves boundaries/version intact.
     */
    public BoundaryResponse saveBoundaries(String tripId, String memberId, SaveBoundariesRequest request) {
        return saveBoundaries(tripId, 1, memberId, request);
    }

    /**
     * Saves one round's boundary pair (US-096). Round 1 keeps the original stop→stop rule; later rounds also require
     * the departure to be at or after the previous round's reunion stop.
     */
    public BoundaryResponse saveBoundaries(String tripId, int roundIndex, String memberId,
            SaveBoundariesRequest request) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId, roundIndex);
        if (!draft.initiatorMemberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_INITIATOR, "only the initiator may edit the draft");
        }
        if (request.draftVersion() != draft.draftVersion()) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        String departureStopId = request.departureStopId();
        String reunionStopId = request.reunionStopId();
        if (reunionStopId == null) {
            throw new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                    "reunion stop is required and must be in the confirmed main plan");
        }
        List<PlanStop> stops = repository.findMainPlanStops(tripId, draft.mainPlanVersion());
        SplitMode mode;
        PlanStop departure;
        PlanStop reunion;
        if (roundIndex > 1) {
            if (departureStopId == null) {
                throw new ApiException(ErrorCode.INVALID_ROUND_MODE,
                        "later split rounds require a departure stop and only support stop-to-stop mode");
            }
            mode = SplitMode.MIDDLE;
            departure = repository.findMainPlanStop(tripId, departureStopId, draft.mainPlanVersion())
                    .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                            "departure stop is not in the confirmed main plan"));
            reunion = repository.findMainPlanStop(tripId, reunionStopId, draft.mainPlanVersion())
                    .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                            "reunion stop is not in the confirmed main plan"));
            SplitDraftDocument previous = currentDraft(tripId, roundIndex - 1);
            if (previous == null || !"confirmed".equals(previous.status())) {
                throw new ApiException(ErrorCode.SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED,
                        "the previous round must be confirmed first");
            }
            PlanStop previousReunion = stopById(stops, previous.reunionStopId());
            if (previousReunion == null) {
                throw new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                        "the previous round's reunion stop is not in the confirmed main plan");
            }
            if (indexOfStop(stops, departure.id()) < indexOfStop(stops, previousReunion.id())) {
                throw new ApiException(ErrorCode.BOUNDARY_BEFORE_PREVIOUS_REUNION,
                        "the next round cannot depart before the previous reunion");
            }
        } else {
            mode = departureStopId == null ? SplitMode.FROM_START : SplitMode.MIDDLE;
            departure = departureStopId == null ? null
                    : repository.findMainPlanStop(tripId, departureStopId, draft.mainPlanVersion())
                            .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                                    "departure stop is not in the confirmed main plan"));
            reunion = repository.findMainPlanStop(tripId, reunionStopId, draft.mainPlanVersion())
                    .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                            "reunion stop is not in the confirmed main plan"));
        }
        SplitBoundaries boundaries;
        try {
            boundaries = SplitBoundaries.resolve(mode, departure, reunion, stops);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.NONPOSITIVE_SPLIT_WINDOW, "split window must be positive");
        }
        if (boundaries.windowMinutes() <= 0) {
            throw new ApiException(ErrorCode.NONPOSITIVE_SPLIT_WINDOW, "split window must be positive");
        }
        SplitDraftDocument updated = draft.withBoundaries(mode.name(), departureStopId, reunionStopId,
                Instant.now().toString());
        transactionTemplate.executeWithoutResult(status -> {
            if (repository.updateDraftIfVersion(tripId, roundIndex, toJson(updated), draft.draftVersion()) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
            repository.deleteSplitRoutes(tripId, roundIndex);
        });
        return new BoundaryResponse(roundIndex, mode.name(), departureStopId, reunionStopId,
                boundaries.startAt(), boundaries.endAt(), boundaries.windowMinutes(), updated.draftVersion());
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
        return assign(tripId, 1, memberId, request);
    }

    /** Moves a trip member within one round; other rounds' groups are never touched. */
    public SplitDraftDetailResponse assign(String tripId, int roundIndex, String memberId, AssignmentRequest request) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId, roundIndex);
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
            return getDraftDetail(tripId, roundIndex, memberId);
        }
        SplitDraftDocument updated = draft.withAssignment(groupLabel, target, Instant.now().toString());
        if (repository.updateDraftIfVersion(tripId, roundIndex, toJson(updated), draft.draftVersion()) == 0) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        return getDraftDetail(tripId, roundIndex, memberId);
    }

    /**
     * Member-readable budget check for the current draft (US-045, Screen 15). Read-only: it projects the main-plan
     * stop costs, the cost of the activities the split window replaced and each group's costed activities, then
     * compares the per-person total with every member's stored budget. Only the caller's membership is required, so
     * a member can watch the result before the organizer confirms.
     */
    public BudgetCheckResponse budgetCheck(String tripId, String memberId) {
        return budgetCheck(tripId, 1, memberId);
    }

    /** Member-readable budget check for one round (US-096 round scoping). */
    public BudgetCheckResponse budgetCheck(String tripId, int roundIndex, String memberId) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = currentDraft(tripId, roundIndex);
        if (draft == null) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
        }
        return budgetCheckOf(tripId, roundIndex, draft);
    }

    /**
     * Replaces one group's costed activities (US-045 manual entry or an accepted mock-AI recommendation). The draft
     * must be active and the caller the initiator, mirroring boundaries/routes; the version guard makes a concurrent
     * edit a 409 instead of a lost update. Route durations are untouched: changing activities changes cost, not the
     * time window the pair already fits.
     */
    public SplitDraftDetailResponse saveActivities(String tripId, String memberId,
            SaveActivitiesRequest request) {
        return saveActivities(tripId, 1, memberId, request);
    }

    /** Replaces one round's group activities; other rounds are untouched. */
    public SplitDraftDetailResponse saveActivities(String tripId, int roundIndex, String memberId,
            SaveActivitiesRequest request) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId, roundIndex);
        if (!draft.initiatorMemberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_INITIATOR, "only the initiator may edit the draft");
        }
        if (request == null || request.draftVersion() != draft.draftVersion()) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        String groupLabel = requireGroupLabel(request.groupLabel());
        List<RouteActivity> activities = toActivities(request.activities());
        SplitDraftDocument updated = draft.withActivities(groupLabel, activities, Instant.now().toString());
        if (repository.updateDraftIfVersion(tripId, roundIndex, toJson(updated), draft.draftVersion()) == 0) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        return getDraftDetail(tripId, roundIndex, memberId);
    }

    /**
     * Returns the mock AI's squad-activity suggestion for one group (US-045). The recommendation never exceeds the
     * tightest remaining budget among the group's members (hard and soft limits both count, since the point is to
     * stay in budget), and an empty list means nothing in the catalogue fits. Nothing is persisted here: the client
     * saves an accepted suggestion through {@link #saveActivities}.
     */
    public List<RouteActivity> recommendActivities(String tripId, String memberId,
            RecommendActivitiesRequest request) {
        return recommendActivities(tripId, 1, memberId, request);
    }

    /** Round-scoped activity recommendation. */
    public List<RouteActivity> recommendActivities(String tripId, int roundIndex, String memberId,
            RecommendActivitiesRequest request) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId, roundIndex);
        if (!draft.initiatorMemberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_INITIATOR, "only the initiator may edit the draft");
        }
        if (request == null || request.draftVersion() != draft.draftVersion()) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        String groupLabel = requireGroupLabel(request.groupLabel());
        BudgetCheckResponse budget = budgetCheckOf(tripId, roundIndex, draft);
        BudgetCheckResponse.GroupBudget group = budget.groups().stream()
                .filter(item -> item.groupLabel().equals(groupLabel))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_GROUP_LABEL, "unknown group label"));
        Integer remaining = null;
        for (BudgetCheckResponse.MemberVerdict member : group.members()) {
            if (member.budgetAmount() == null) {
                continue;
            }
            long memberRemaining = (long) member.budgetAmount() * 100
                    - (member.totalCostCents() - group.squadCostCents());
            int bounded = (int) Math.max(Integer.MIN_VALUE, Math.min(Integer.MAX_VALUE, memberRemaining));
            if (remaining == null || bounded < remaining) {
                remaining = bounded;
            }
        }
        return activityRecommender.recommend(repository.findDestination(tripId).orElse(null), remaining);
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
        return generateRoutes(tripId, 1, memberId, request);
    }

    /** Generates one round's paired routes; other rounds' plan_node rows are never touched. */
    public RouteGenerationResponse generateRoutes(String tripId, int roundIndex, String memberId,
            GenerateRoutesRequest request) {
        guard.requireMember(memberId, tripId);
        String json = repository.findDraftJson(tripId, roundIndex);
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
        if (draft.reunionStopId() == null) {
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
        List<PlanStop> mainPlanStops = repository.findMainPlanStops(tripId, draft.mainPlanVersion());
        PlanStop departure = draft.departureStopId() == null ? null
                : repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion())
                        .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                                "departure stop is not in the confirmed main plan"));
        PlanStop reunion = repository.findMainPlanStop(tripId, draft.reunionStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN, "reunion stop is not in the confirmed main plan"));
        SplitBoundaries boundaries = SplitBoundaries.resolve(
                SplitMode.of(draft.splitMode(), draft.departureStopId(), draft.reunionStopId()),
                departure, reunion, mainPlanStops);
        int capturedVersion = draft.draftVersion();
        List<String> excludeActivityNames = excludedActivityNames(tripId, roundIndex);
        BranchCandidateContext context = new BranchCandidateContext(roundIndex, boundaries.startAt(),
                boundaries.endAt(), excludeActivityNames);
        Map<String, RouteCandidate> candidates = new LinkedHashMap<>();
        try {
            for (String groupLabel : draft.groups().keySet()) {
                RouteCandidate candidate = excludeActivityNames.isEmpty()
                        ? provider.candidateFor(groupLabel, departure, reunion,
                                repository.findDestination(tripId).orElse(null), mainPlanStops)
                        : provider.candidateFor(groupLabel, departure, reunion,
                                repository.findDestination(tripId).orElse(null), mainPlanStops, context);
                candidates.put(groupLabel, candidate);
            }
        } catch (RuntimeException ex) {
            throw new ApiException(ErrorCode.ROUTE_GENERATION_FAILED, "route generation failed for a group");
        }
        String now = Instant.now().toString();
        Map<String, RouteDurations> durations = new LinkedHashMap<>();
        Map<String, List<RouteActivity>> activities = new LinkedHashMap<>();
        List<GroupRoute> routeViews = new ArrayList<>();
        for (Map.Entry<String, RouteCandidate> entry : candidates.entrySet()) {
            RouteCandidate candidate = entry.getValue();
            durations.put(entry.getKey(), new RouteDurations(candidate.activityMinutes(),
                    candidate.travelLegsMinutes(), candidate.bufferMinutes(), candidate.steps()));
            activities.put(entry.getKey(), List.copyOf(candidate.activities()));
            routeViews.add(new GroupRoute(entry.getKey(), candidate.activityName(), candidate.locationName(),
                    draft.departureStopId(), reunion.id(), candidate.activityMinutes(), candidate.travelLegsMinutes(),
                    candidate.bufferMinutes(), candidate.steps(), candidate.activities()));
        }
        SplitDraftDocument updated = draft.withRoutes(durations, activities, now);
        String updatedJson = toJson(updated);
        transactionTemplate.executeWithoutResult(status -> {
            repository.deleteSplitRoutes(tripId, roundIndex);
            int order = 1;
            for (Map.Entry<String, RouteCandidate> entry : candidates.entrySet()) {
                String branchId = SplitBranchId.of(roundIndex, entry.getKey());
                repository.insertSplitRoute(UUID.randomUUID().toString(), tripId, draft.mainPlanVersion(), branchId,
                        entry.getValue().activityName(), entry.getValue().locationName(),
                        boundaries.startAt().toString(), boundaries.endAt().toString(), order++, now);
            }
            if (repository.updateDraftIfVersion(tripId, roundIndex, updatedJson, capturedVersion) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
        });
        return new RouteGenerationResponse(roundIndex, updated.draftVersion(), routeViews);
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
        return saveRoutes(tripId, 1, memberId, request);
    }

    /** Saves one round's manual A/B route edit; other rounds are untouched. */
    public RouteGenerationResponse saveRoutes(String tripId, int roundIndex, String memberId,
            SaveRoutesRequest request) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId, roundIndex);
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
                    durations.bufferMinutes(), durations.steps(), archivedActivities(draft, label)));
        }
        String now = Instant.now().toString();
        SplitDraftDocument updated = draft.withRoutes(updatedRoutes, draft.activities(), now);
        String updatedJson = toJson(updated);
        transactionTemplate.executeWithoutResult(status -> {
            for (String label : List.of("A", "B")) {
                String branchId = SplitBranchId.of(roundIndex, label);
                if (repository.updateSplitRoute(tripId, draft.mainPlanVersion(), branchId,
                        derivedNames.get(label), derivedLocations.get(label)) == 0) {
                    throw new ApiException(ErrorCode.SPLIT_DRAFT_INCOMPLETE, "the route pair is missing",
                            Map.of("missing", List.of("routes." + label)));
                }
            }
            if (repository.updateDraftIfVersion(tripId, roundIndex, updatedJson, draft.draftVersion()) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
        });
        return new RouteGenerationResponse(roundIndex, updated.draftVersion(), routeViews);
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
        return getDraftDetail(tripId, 1, memberId);
    }

    /** Reads one round's detail; round 1 keeps the historical null response for a trip without a draft. */
    public SplitDraftDetailResponse getDraftDetail(String tripId, int roundIndex, String memberId) {
        guard.requireMember(memberId, tripId);
        String json = repository.findDraftJson(tripId, roundIndex);
        if (json == null) {
            return null;
        }
        return detailOf(tripId, roundIndex, fromJson(json));
    }

    /** Reads one round's detail; a missing round is a 404 for the round-scoped endpoint. */
    public SplitDraftDetailResponse getRoundDetail(String tripId, int roundIndex, String memberId) {
        SplitDraftDetailResponse detail = getDraftDetail(tripId, roundIndex, memberId);
        if (detail == null) {
            throw new ApiException(ErrorCode.SPLIT_ROUND_NOT_FOUND, "split round not found");
        }
        return detail;
    }

    /** All rounds plus the derived aggregate status and the next-round gate (US-096). */
    public SplitRoundsResponse getRounds(String tripId, String memberId) {
        guard.requireMember(memberId, tripId);
        List<SplitDraftDetailResponse> rounds = new ArrayList<>();
        for (SplitDraftRepository.RoundRow row : repository.findRoundRows(tripId)) {
            if (row.document() == null) {
                continue;
            }
            rounds.add(detailOf(tripId, row.roundIndex(), fromJson(row.document())));
        }
        StartGate gate = startGate(tripId);
        return new SplitRoundsResponse(aggregateStatus(rounds), MAX_ROUNDS, gate.allowed(), gate.reason(), rounds);
    }

    private SplitDraftDetailResponse detailOf(String tripId, int roundIndex, SplitDraftDocument draft) {
        List<PlanStop> mainPlanStops = repository.findMainPlanStops(tripId, draft.mainPlanVersion());
        String departureStopId = draft.departureStopId();
        String reunionStopId = draft.reunionStopId();
        Instant departureAt = null;
        Instant reunionAt = null;
        Long windowMinutes = null;
        if (reunionStopId != null) {
            PlanStop departure = departureStopId == null ? null : stopById(mainPlanStops, departureStopId);
            PlanStop reunion = stopById(mainPlanStops, reunionStopId);
            if ((departureStopId == null || departure != null) && reunion != null) {
                try {
                    SplitBoundaries boundaries = SplitBoundaries.resolve(
                            SplitMode.of(draft.splitMode(), departureStopId, reunionStopId),
                            departure, reunion, mainPlanStops);
                    departureAt = boundaries.startAt();
                    reunionAt = boundaries.endAt();
                    if (departureAt != null && reunionAt != null) {
                        windowMinutes = SplitWindow.between(departureAt, reunionAt).minutes();
                    }
                } catch (IllegalArgumentException ignored) {
                    // stale/invalid saved boundaries: detail still returns the raw ids with null times
                }
            }
        }
        List<GroupRoute> routes = new ArrayList<>();
        if (draft.routes() != null) {
            Map<String, SplitDraftRepository.SplitRouteActivity> activities =
                    repository.findSplitRouteActivities(tripId, roundIndex);
            for (Map.Entry<String, RouteDurations> entry : draft.routes().entrySet()) {
                String label = entry.getKey();
                RouteDurations durations = entry.getValue();
                SplitDraftRepository.SplitRouteActivity activity =
                        activities.get(SplitBranchId.of(roundIndex, label));
                List<RouteActivity> costedActivities = draft.activities() == null
                        ? null
                        : draft.activities().get(label);
                routes.add(new GroupRoute(label, activity == null ? null : activity.title(),
                        activity == null ? null : activity.locationName(), departureStopId, reunionStopId,
                        durations.activityMinutes(), durations.travelLegsMinutes(), durations.bufferMinutes(),
                        durations.steps(), costedActivities));
            }
        }
        return new SplitDraftDetailResponse(
                roundIndex, draft.initiatorMemberId(), draft.mainPlanVersion(), draft.draftVersion(), draft.status(),
                draft.splitMode(), draft.groups(), draft.createdAt(), draft.updatedAt(), mainPlanStops,
                departureStopId, reunionStopId, departureAt, reunionAt, windowMinutes, routes,
                repository.findDestination(tripId).orElse(null));
    }

    private String aggregateStatus(List<SplitDraftDetailResponse> rounds) {
        if (rounds.isEmpty()) {
            return "absent";
        }
        boolean anyActive = rounds.stream().anyMatch(round -> "active".equals(round.status()));
        if (anyActive) {
            return "active";
        }
        boolean anyConfirmed = rounds.stream().anyMatch(round -> "confirmed".equals(round.status()));
        boolean allNonCancelledConfirmed = rounds.stream()
                .filter(round -> !"cancelled".equals(round.status()))
                .allMatch(round -> "confirmed".equals(round.status()));
        if (anyConfirmed && allNonCancelledConfirmed) {
            return "confirmed";
        }
        return "cancelled";
    }

    private record StartGate(boolean allowed, String reason) {
    }

    private StartGate startGate(String tripId) {
        if (!repository.isMainPlanConfirmed(tripId)) {
            return new StartGate(false, "MAIN_PLAN_NOT_CONFIRMED");
        }
        int roundIndex = nextRoundIndex(tripId);
        if (roundIndex > MAX_ROUNDS) {
            return new StartGate(false, "ROUND_LIMIT_REACHED");
        }
        SplitDraftDocument previous = currentDraft(tripId, roundIndex - 1);
        if (previous == null || !"confirmed".equals(previous.status())) {
            return new StartGate(false, "PREVIOUS_ROUND_NOT_CONFIRMED");
        }
        SplitDraftDocument existing = currentDraft(tripId, roundIndex);
        if (existing != null && !"cancelled".equals(existing.status())) {
            return new StartGate(false, "ROUND_ALREADY_ACTIVE");
        }
        if (repository.findMemberIdsOrdered(tripId).size() < 2) {
            return new StartGate(false, "MEMBERS_INSUFFICIENT");
        }
        return new StartGate(true, null);
    }

    /**
     * Confirms the current draft as the trip's effective split (spec US-049, design D4/D5/D11). Only the organizer may
     * confirm. Completeness is checked before any timing work; the server recomputes both routes from the saved
     * document (a client-declared verdict is never trusted); the status write is a conditional update that leaves the
     * stored column version untouched.
     */
    public SplitDraftDetailResponse confirmDraft(String tripId, String memberId, int draftVersion) {
        return confirmDraft(tripId, 1, memberId, draftVersion);
    }

    /** Confirms one round; only that round becomes frozen, and later rounds require it to stay confirmed. */
    public SplitDraftDetailResponse confirmDraft(String tripId, int roundIndex, String memberId, int draftVersion) {
        guard.requireMember(memberId, tripId);
        requireOrganizer(tripId, memberId);
        SplitDraftDocument draft = requireActiveDraft(tripId, roundIndex);
        if (draft.draftVersion() != draftVersion) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        if (roundIndex > 1) {
            SplitDraftDocument previous = currentDraft(tripId, roundIndex - 1);
            if (previous == null || !"confirmed".equals(previous.status())) {
                throw new ApiException(ErrorCode.SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED,
                        "the previous round must be confirmed first");
            }
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
        BudgetCheckResponse budget = budgetCheckOf(tripId, roundIndex, draft);
        if (budget.blocked()) {
            throw new ApiException(ErrorCode.SPLIT_BUDGET_HARD_OVERRUN,
                    "a member's hard budget would be exceeded; adjust the budget or the group activities",
                    budgetHardOverrunDetails(budget));
        }
        String now = Instant.now().toString();
        if (repository.confirmDraftIfActive(tripId, roundIndex, draftVersion, toJson(draft.confirmed(now)), now) == 0) {
            SplitDraftDocument current = currentDraft(tripId, roundIndex);
            if (current == null || !"active".equals(current.status())) {
                throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
            }
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        return getDraftDetail(tripId, roundIndex, memberId);
    }

    /**
     * Cancels the initiator's unconfirmed draft (spec US-050, design D4/D6/D9/D11). The status write and the split
     * route node deletion share one transaction; the document routes are cleared in the same write so a cancelled
     * detail never shows ghost routes. The main plan rows are never touched.
     */
    public SplitDraftDetailResponse cancelDraft(String tripId, String memberId, int draftVersion) {
        return cancelDraft(tripId, 1, memberId, draftVersion);
    }

    /** Cancels one active round; its routes are deleted, other rounds stay untouched, version unchanged. */
    public SplitDraftDetailResponse cancelDraft(String tripId, int roundIndex, String memberId, int draftVersion) {
        guard.requireMember(memberId, tripId);
        SplitDraftDocument draft = requireActiveDraft(tripId, roundIndex);
        if (!draft.initiatorMemberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_INITIATOR, "only the initiator may cancel the draft");
        }
        if (draft.draftVersion() != draftVersion) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        String now = Instant.now().toString();
        SplitDraftDocument cancelled = draft.cancelled(now);
        transactionTemplate.executeWithoutResult(status -> {
            if (repository.cancelDraftIfActive(tripId, roundIndex, draftVersion, toJson(cancelled), now) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
            repository.deleteSplitRoutes(tripId, roundIndex);
        });
        return getDraftDetail(tripId, roundIndex, memberId);
    }

    /**
     * US-051: cancels a confirmed split before departure (design D9). Only the trip organizer may cancel; the
     * departure instant is the confirmed draft's departure stop {@code start_at}, and a missing value counts as
     * not departed in this MVP. The status write and the split route node deletion share one transaction.
     */
    public SplitDraftDetailResponse cancelConfirmedSplit(String tripId, String memberId, int draftVersion) {
        return cancelConfirmedSplit(tripId, 1, memberId, draftVersion);
    }

    /** Cancels one confirmed round before departure; a later non-cancelled round blocks the cancellation. */
    public SplitDraftDetailResponse cancelConfirmedSplit(String tripId, int roundIndex, String memberId,
            int draftVersion) {
        guard.requireMember(memberId, tripId);
        requireOrganizer(tripId, memberId);
        SplitDraftDocument draft = currentDraft(tripId, roundIndex);
        if (draft == null || !"confirmed".equals(draft.status())) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no confirmed split to cancel");
        }
        if (draft.draftVersion() != draftVersion) {
            throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
        }
        for (SplitDraftRepository.RoundRow row : repository.findRoundRows(tripId)) {
            if (row.roundIndex() <= roundIndex || row.document() == null) {
                continue;
            }
            SplitDraftDocument later = fromJson(row.document());
            if (!"cancelled".equals(later.status())) {
                throw new ApiException(ErrorCode.SPLIT_LATER_ROUNDS_EXIST,
                        "cancel later split rounds before cancelling this one");
            }
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
            if (repository.cancelConfirmedIfConfirmed(tripId, roundIndex, draftVersion, toJson(cancelled), now) == 0) {
                throw new ApiException(ErrorCode.STALE_DRAFT_VERSION, "draft version is stale");
            }
            repository.deleteSplitRoutes(tripId, roundIndex);
        });
        return getDraftDetail(tripId, roundIndex, memberId);
    }

    private void requireOrganizer(String tripId, String memberId) {
        String organizerId = repository.findOrganizerId(tripId).orElse(null);
        if (organizerId == null || !organizerId.equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_SPLIT_ORGANIZER, "only the trip organizer may confirm the split");
        }
    }

    private SplitDraftDocument requireActiveDraft(String tripId) {
        return requireActiveDraft(tripId, 1);
    }

    private SplitDraftDocument requireActiveDraft(String tripId, int roundIndex) {
        SplitDraftDocument draft = currentDraft(tripId, roundIndex);
        if (draft == null || !"active".equals(draft.status())) {
            throw new ApiException(ErrorCode.SPLIT_DRAFT_NOT_ACTIVE, "no active split draft");
        }
        return draft;
    }

    private SplitDraftDocument currentDraft(String tripId) {
        return currentDraft(tripId, 1);
    }

    private SplitDraftDocument currentDraft(String tripId, int roundIndex) {
        String json = repository.findDraftJson(tripId, roundIndex);
        return json == null ? null : fromJson(json);
    }

    private List<String> missingDraftParts(SplitDraftDocument draft, List<String> memberIds) {
        List<String> missing = new ArrayList<>();
        if (draft.reunionStopId() == null) {
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

    /**
     * Activities already used by other non-cancelled rounds (US-096). Both costed activities and persisted route
     * step names are included, so legacy documents without activities still protect the next round from repeating
     * a place.
     */
    private List<String> excludedActivityNames(String tripId, int currentRoundIndex) {
        LinkedHashSet<String> names = new LinkedHashSet<>();
        for (SplitDraftRepository.RoundRow row : repository.findRoundRows(tripId)) {
            if (row.roundIndex() == currentRoundIndex || row.document() == null) {
                continue;
            }
            SplitDraftDocument other = fromJson(row.document());
            if ("cancelled".equals(other.status())) {
                continue;
            }
            if (other.activities() != null) {
                for (List<RouteActivity> activities : other.activities().values()) {
                    for (RouteActivity activity : activities) {
                        names.add(activity.name());
                    }
                }
            }
            if (other.routes() != null) {
                for (RouteDurations durations : other.routes().values()) {
                    if (durations.steps() == null) {
                        continue;
                    }
                    for (RouteStep step : durations.steps()) {
                        names.add(step.name());
                    }
                }
            }
        }
        return List.copyOf(names);
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
        List<PlanStop> stops = repository.findMainPlanStops(tripId, draft.mainPlanVersion());
        PlanStop departure = draft.departureStopId() == null ? null
                : repository.findMainPlanStop(tripId, draft.departureStopId(), draft.mainPlanVersion())
                        .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                                "departure stop is not in the confirmed main plan"));
        PlanStop reunion = repository.findMainPlanStop(tripId, draft.reunionStopId(), draft.mainPlanVersion())
                .orElseThrow(() -> new ApiException(ErrorCode.BOUNDARY_NOT_IN_MAIN_PLAN,
                        "reunion stop is not in the confirmed main plan"));
        try {
            return SplitBoundaries.resolve(
                    SplitMode.of(draft.splitMode(), draft.departureStopId(), draft.reunionStopId()),
                    departure, reunion, stops).windowMinutes();
        } catch (IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.NONPOSITIVE_SPLIT_WINDOW, "split window must be positive");
        }
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

    private String requireGroupLabel(String groupLabel) {
        if (!"A".equals(groupLabel) && !"B".equals(groupLabel)) {
            throw new ApiException(ErrorCode.INVALID_GROUP_LABEL, "group label must be A or B");
        }
        return groupLabel;
    }

    /** Strict whole-list validation for the US-045 activity write; a rejection leaves the stored draft untouched. */
    private List<RouteActivity> toActivities(List<SaveActivitiesRequest.ActivityInput> inputs) {
        if (inputs == null) {
            throw new ApiException(ErrorCode.INVALID_ACTIVITIES, "activities must be a list");
        }
        if (inputs.size() > MAX_ACTIVITIES_PER_GROUP) {
            throw new ApiException(ErrorCode.INVALID_ACTIVITIES,
                    "a group may keep at most " + MAX_ACTIVITIES_PER_GROUP + " activities");
        }
        List<RouteActivity> activities = new ArrayList<>();
        for (SaveActivitiesRequest.ActivityInput input : inputs) {
            if (input == null) {
                throw new ApiException(ErrorCode.INVALID_ACTIVITIES, "an activity must be an object");
            }
            String name = input.name() == null ? "" : input.name().trim();
            if (name.isEmpty() || name.length() > 60) {
                throw new ApiException(ErrorCode.INVALID_ACTIVITIES, "activity name is required (max 60 chars)");
            }
            String location = input.location() == null ? null : input.location().trim();
            if (location != null && location.length() > 60) {
                throw new ApiException(ErrorCode.INVALID_ACTIVITIES, "activity location is too long (max 60 chars)");
            }
            Integer cost = input.costCents();
            if (cost == null || cost < 0 || cost > MAX_ACTIVITY_COST_CENTS) {
                throw new ApiException(ErrorCode.INVALID_ACTIVITIES,
                        "activity cost must be between 0 and " + MAX_ACTIVITY_COST_CENTS + " cents");
            }
            String source = RouteActivity.SOURCE_AI.equals(input.source())
                    ? RouteActivity.SOURCE_AI
                    : RouteActivity.SOURCE_MANUAL;
            activities.add(new RouteActivity(name, location, cost, source));
        }
        return activities;
    }

    /**
     * Shared projection behind the member check and the confirmation gate (US-045 + US-096). Costs are aggregated
     * over every non-cancelled round: the replaced window stops are unioned by id, and each member pays the group
     * activities of the group they belonged to in that round. The current round's A/B groups remain the display
     * grouping; {@code rounds[]} exposes the per-round activity cost for transparency.
     */
    private BudgetCheckResponse budgetCheckOf(String tripId, int roundIndex, SplitDraftDocument current) {
        record RoundDraft(int roundIndex, SplitDraftDocument draft) {
        }
        List<RoundDraft> rounds = new ArrayList<>();
        for (SplitDraftRepository.RoundRow row : repository.findRoundRows(tripId)) {
            if (row.document() == null) {
                continue;
            }
            SplitDraftDocument candidate = fromJson(row.document());
            if (!"cancelled".equals(candidate.status())) {
                rounds.add(new RoundDraft(row.roundIndex(), candidate));
            }
        }
        if (rounds.isEmpty()) {
            rounds.add(new RoundDraft(roundIndex, current));
        }

        List<PlanStop> stops = repository.findMainPlanStops(tripId, current.mainPlanVersion());
        int totalShared = stops.stream().mapToInt(PlanStop::costCents).sum();
        Map<String, Integer> replacedById = new LinkedHashMap<>();
        for (RoundDraft round : rounds) {
            for (PlanStop stop : windowStops(stops, round.draft())) {
                replacedById.putIfAbsent(stop.id(), stop.costCents());
            }
        }
        int replaced = replacedById.values().stream().mapToInt(Integer::intValue).sum();
        int remainingShared = Math.max(0, totalShared - replaced);

        Map<String, String> names = repository.findMemberNames(tripId);
        Map<String, SplitBudgetCalculator.MemberBudget> budgets = budgetsOf(tripId, names);
        Map<String, Integer> memberTotals = new LinkedHashMap<>();
        for (String memberId : names.keySet()) {
            memberTotals.put(memberId, remainingShared);
        }
        List<BudgetCheckResponse.RoundCost> roundCosts = new ArrayList<>();
        for (RoundDraft round : rounds) {
            for (String label : List.of("A", "B")) {
                int squadCost = squadCost(round.draft(), label);
                roundCosts.add(new BudgetCheckResponse.RoundCost(round.roundIndex(), label, squadCost));
                List<String> memberIds = round.draft().groups() == null
                        ? List.of()
                        : round.draft().groups().getOrDefault(label, List.of());
                for (String memberId : memberIds) {
                    memberTotals.merge(memberId, squadCost, Integer::sum);
                }
            }
        }

        List<BudgetCheckResponse.GroupBudget> groupViews = new ArrayList<>();
        boolean blocked = false;
        boolean softReminder = false;
        for (String label : List.of("A", "B")) {
            List<String> memberIds = current.groups() == null
                    ? List.of()
                    : current.groups().getOrDefault(label, List.of());
            int squadCost = squadCost(current, label);
            int groupTotal = remainingShared + squadCost;
            List<BudgetCheckResponse.MemberVerdict> members = new ArrayList<>();
            for (String memberId : memberIds) {
                SplitBudgetCalculator.MemberResult verdict = budgetCalculator.verdict(label, memberId,
                        memberTotals.getOrDefault(memberId, remainingShared), budgets.get(memberId));
                if (SplitBudgetCalculator.STATUS_HARD_OVERRUN.equals(verdict.status())) {
                    blocked = true;
                }
                if (SplitBudgetCalculator.STATUS_SOFT_OVERRUN.equals(verdict.status())) {
                    softReminder = true;
                }
                members.add(new BudgetCheckResponse.MemberVerdict(verdict.memberId(), verdict.displayName(),
                        verdict.budgetAmount(), verdict.currency(), verdict.limitType(), verdict.totalCostCents(),
                        verdict.overrunCents(), verdict.status()));
            }
            groupViews.add(new BudgetCheckResponse.GroupBudget(label, memberIds, squadCost, groupTotal, members));
        }
        return new BudgetCheckResponse(current.draftVersion(), totalShared, replaced, remainingShared,
                blocked, softReminder, groupViews, roundCosts);
    }

    private int squadCost(SplitDraftDocument draft, String label) {
        List<RouteActivity> activities = draft.activities() == null ? null : draft.activities().get(label);
        return budgetCalculator.squadCost(activities);
    }

    /** Main-plan stops inside the split window: departure inclusive, reunion exclusive (design US-089). */
    private List<PlanStop> windowStops(List<PlanStop> stops, SplitDraftDocument draft) {
        if (draft.reunionStopId() == null) {
            return List.of();
        }
        int from = draft.departureStopId() == null ? 0 : indexOfStop(stops, draft.departureStopId());
        int to = indexOfStop(stops, draft.reunionStopId());
        if (from < 0 || to <= from) {
            return List.of();
        }
        return stops.subList(from, to);
    }

    private static int indexOfStop(List<PlanStop> stops, String id) {
        for (int index = 0; index < stops.size(); index++) {
            if (stops.get(index).id().equals(id)) {
                return index;
            }
        }
        return -1;
    }

    private record BudgetFields(Integer amount, String currency, String limitType) {
    }

    /** Reads the US-024 budget payload; an amount is the only thing that makes a budget real. */
    private Map<String, SplitBudgetCalculator.MemberBudget> budgetsOf(String tripId, Map<String, String> names) {
        Map<String, String> payloads = repository.findBudgetPayloads(tripId);
        List<SplitBudgetCalculator.MemberBudget> budgets = new ArrayList<>();
        for (Map.Entry<String, String> member : names.entrySet()) {
            BudgetFields fields = readBudget(payloads.get(member.getKey()));
            budgets.add(new SplitBudgetCalculator.MemberBudget(member.getKey(), member.getValue(),
                    fields.amount(), fields.currency(), fields.limitType()));
        }
        return budgetCalculator.index(budgets);
    }

    private BudgetFields readBudget(String payload) {
        if (payload == null || payload.isBlank()) {
            return new BudgetFields(null, null, null);
        }
        try {
            com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(payload);
            if (node == null || !node.isObject() || !node.path("amount").isNumber()) {
                return new BudgetFields(null, null, null);
            }
            return new BudgetFields(node.path("amount").asInt(), node.path("currency").asText(null),
                    node.path("limitType").asText(null));
        } catch (JsonProcessingException ex) {
            return new BudgetFields(null, null, null);
        }
    }

    /** Machine-readable hard-overrun detail rows for {@code error.details} (US-045 confirmation block). */
    private Map<String, Object> budgetHardOverrunDetails(BudgetCheckResponse budget) {
        List<Map<String, Object>> overruns = new ArrayList<>();
        for (BudgetCheckResponse.GroupBudget group : budget.groups()) {
            for (BudgetCheckResponse.MemberVerdict member : group.members()) {
                if (!SplitBudgetCalculator.STATUS_HARD_OVERRUN.equals(member.status())) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("memberId", member.memberId());
                row.put("displayName", member.displayName());
                row.put("groupLabel", group.groupLabel());
                row.put("totalCostCents", member.totalCostCents());
                row.put("budgetAmount", member.budgetAmount());
                row.put("currency", member.currency());
                row.put("overrunCents", member.overrunCents());
                overruns.add(row);
            }
        }
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("overruns", overruns);
        details.put("remainingSharedCostCents", budget.remainingSharedCostCents());
        details.put("replacedCostCents", budget.replacedCostCents());
        return details;
    }

    private static PlanStop stopById(List<PlanStop> stops, String id) {
        return stops.stream().filter(stop -> stop.id().equals(id)).findFirst().orElse(null);
    }

    /** Costed activities already stored for a group; an edited route keeps its budget row unchanged (US-045). */
    private static List<RouteActivity> archivedActivities(SplitDraftDocument draft, String label) {
        if (draft.activities() == null) {
            return List.of();
        }
        List<RouteActivity> stored = draft.activities().get(label);
        return stored == null ? List.of() : stored;
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