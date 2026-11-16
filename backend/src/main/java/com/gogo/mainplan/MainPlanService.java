package com.gogo.mainplan;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gogo.trip.TripRepository;
import com.gogo.trip.TripResponse;

// Generation, reads and confirmation for the main itinerary (design D4-D8).
// member_preference is read-only; identity gates live in the controller,
// trip/membership/organizer gates here.
@Service
public class MainPlanService {

    static final List<String> RULES = List.of(
            "ALL_MEMBERS_READY",
            "SUPPLIED_ACTIVITY_TIMES",
            "TRAVEL_LEGS_BETWEEN_STOPS",
            "HARD_BUDGET_RESPECTED",
            "STALE_DRAFT_BLOCKS_CONFIRM",
            "LOCATION_COMPLETION_AT_GENERATION");

    private final TripRepository trips;
    private final MainPlanRepository plans;
    private final MainPlanProvider provider;
    private final LocationCompletion locationCompletion;
    private final ScheduleValidator scheduleValidator;
    private final BudgetOverruns budgetOverruns;
    private final ObjectMapper objectMapper;

    public MainPlanService(TripRepository trips, MainPlanRepository plans, MainPlanProvider provider,
            LocationCompletion locationCompletion, ScheduleValidator scheduleValidator,
            BudgetOverruns budgetOverruns, ObjectMapper objectMapper) {
        this.trips = trips;
        this.plans = plans;
        this.provider = provider;
        this.locationCompletion = locationCompletion;
        this.scheduleValidator = scheduleValidator;
        this.budgetOverruns = budgetOverruns;
        this.objectMapper = objectMapper;
    }

    // D4: gate order confirmed-check before readiness; one transaction for
    // completion + provider + versioned persist.
    @Transactional
    public PlanResponse generate(long tripId, long caller) {
        TripResponse trip = requireTrip(tripId);
        requireMember(tripId, caller);
        requireOrganizer(trip, caller);
        if (plans.findDraftByStatus(tripId, "confirmed").isPresent()) {
            throw new MainPlanApiException(409, "ALREADY_CONFIRMED",
                    "The main plan is already confirmed; replanning is not available");
        }
        List<MainPlanRepository.MemberRow> members = plans.members(tripId);
        List<Map<String, Object>> pending = members.stream()
                .filter(member -> !member.ready())
                .map(member -> Map.<String, Object>of(
                        "userId", member.userId(), "displayName", member.displayName()))
                .toList();
        if (!pending.isEmpty()) {
            throw new MainPlanApiException(409, "MEMBERS_NOT_READY",
                    "Every member must be ready before generating the main plan",
                    Map.of("pendingMembers", pending));
        }

        Set<Long> readyIds = members.stream().map(MainPlanRepository.MemberRow::userId)
                .collect(Collectors.toSet());
        List<MustDoItem> mustDo = mustDoItems(tripId);
        List<String> preferenceLocations = mustDo.stream()
                .filter(item -> readyIds.contains(item.userId()))
                .map(MustDoItem::location)
                .toList();
        LocationCompletion.CompletedLocations completed = locationCompletion.complete(
                trip.startLocation(), trip.endLocation(), preferenceLocations, trip.destination());
        plans.updateTripLocations(tripId, completed.startLocation(), completed.endLocation());

        Map<Long, List<String>> interests = interestCodes(tripId);
        Map<Long, Integer> hardBudgets = hardBudgets(tripId);
        List<MemberInput> inputs = members.stream()
                .map(member -> new MemberInput(member.userId(), member.displayName(),
                        member.preferenceRevision(),
                        interests.getOrDefault(member.userId(), List.of()),
                        mustDo.stream()
                                .filter(item -> item.userId() == member.userId())
                                .map(MustDoItem::name).toList(),
                        hardBudgets.get(member.userId())))
                .toList();
        TripContext context = new TripContext(tripId, trip.destination(), trip.startDate(),
                trip.endDate(), completed.startLocation(), completed.endLocation());
        MainPlanResult result = provider.plan(context, inputs);

        List<PlanResponse.InputRevision> revisions = members.stream()
                .map(member -> new PlanResponse.InputRevision(member.userId(), member.preferenceRevision()))
                .toList();
        plans.supersedeCurrentDrafts(tripId);
        int version = plans.maxVersion(tripId) + 1;
        long draftId = plans.insertDraft(tripId, version,
                result.costPerPersonCents(), writeJson(revisions));
        for (MainPlanResult.PlannedStop stop : result.stops()) {
            plans.insertStop(draftId, stop, writeJson(stop.interests()));
        }
        return new PlanResponse(tripId, version, false, false,
                result.costPerPersonCents(), revisions, toStops(result.stops()));
    }

    // D8: gate order trip -> member -> organizer -> no-draft ->
    // already-confirmed -> stale -> validation (both lists). Success flips
    // status + trip flag in one transaction; the response reuses the read
    // projection so confirm and GET always share one shape.
    @Transactional
    public PlanResponse confirm(long tripId, long caller) {
        TripResponse trip = requireTrip(tripId);
        requireMember(tripId, caller);
        requireOrganizer(trip, caller);
        Optional<MainPlanRepository.DraftRow> confirmed = plans.findDraftByStatus(tripId, "confirmed");
        Optional<MainPlanRepository.DraftRow> current = plans.findDraftByStatus(tripId, "current");
        if (confirmed.isEmpty() && current.isEmpty()) {
            throw new MainPlanApiException(404, "NO_DRAFT",
                    "No main plan draft has been generated for this trip");
        }
        if (confirmed.isPresent()) {
            throw new MainPlanApiException(409, "ALREADY_CONFIRMED",
                    "The main plan is already confirmed");
        }
        MainPlanRepository.DraftRow draft = current.orElseThrow();
        List<PlanResponse.InputRevision> revisions = readRevisions(draft.inputRevisionsJson());
        if (isStale(tripId, revisions)) {
            throw new MainPlanApiException(409, "STALE_DRAFT",
                    "Member preferences changed since this draft was generated; regenerate before confirming");
        }
        List<ScheduleValidator.ScheduleError> scheduleErrors =
                scheduleValidator.validate(plans.stopsForDraft(draft.id()));
        Map<Long, Integer> hardBudgets = hardBudgets(tripId);
        List<MemberInput> members = plans.members(tripId).stream()
                .map(member -> new MemberInput(member.userId(), member.displayName(),
                        member.preferenceRevision(), List.of(), List.of(),
                        hardBudgets.get(member.userId())))
                .toList();
        List<BudgetOverruns.Overrun> overruns =
                budgetOverruns.compute(members, draft.costPerPersonCents());
        if (!scheduleErrors.isEmpty() || !overruns.isEmpty()) {
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("scheduleErrors", scheduleErrors);
            detail.put("overruns", overruns);
            throw new MainPlanApiException(422, "VALIDATION_FAILED",
                    "The draft failed validation; fix the reported issues before confirming", detail);
        }
        plans.markDraftConfirmed(draft.id());
        plans.setTripMainPlanConfirmed(tripId);
        return readPlan(tripId, caller);
    }

    // D6: confirmed row wins over current; stale computed on read, confirmed
    // rows frozen.
    public PlanResponse readPlan(long tripId, long caller) {
        requireTrip(tripId);
        requireMember(tripId, caller);
        MainPlanRepository.DraftRow draft = plans.findDraftByStatus(tripId, "confirmed")
                .or(() -> plans.findDraftByStatus(tripId, "current"))
                .orElseThrow(() -> new MainPlanApiException(404, "NO_DRAFT",
                        "No main plan draft has been generated for this trip"));
        boolean confirmed = "confirmed".equals(draft.status());
        List<PlanResponse.InputRevision> revisions = readRevisions(draft.inputRevisionsJson());
        boolean stale = !confirmed && isStale(tripId, revisions);
        List<PlanResponse.Stop> stops = plans.stopsForDraft(draft.id()).stream()
                .map(stop -> new PlanResponse.Stop(stop.seq(), stop.name(), stop.startLocal(),
                        stop.endLocal(), stop.travelMinutesToNext(), readInterests(stop.interestsJson())))
                .toList();
        return new PlanResponse(tripId, draft.version(), confirmed, stale,
                draft.costPerPersonCents(), revisions, stops);
    }

    // D7: member-readable before any draft; display-only aggregations.
    public InputsResponse readInputs(long tripId, long caller) {
        requireTrip(tripId);
        requireMember(tripId, caller);
        List<MainPlanRepository.MemberRow> members = plans.members(tripId);
        List<InputsResponse.Member> memberLines = members.stream()
                .map(member -> new InputsResponse.Member(member.userId(), member.displayName(),
                        member.ready(), member.preferenceRevision()))
                .toList();
        int readyCount = (int) members.stream().filter(MainPlanRepository.MemberRow::ready).count();
        Set<Long> readyIds = members.stream().filter(MainPlanRepository.MemberRow::ready)
                .map(MainPlanRepository.MemberRow::userId)
                .collect(Collectors.toSet());

        Map<Long, List<String>> interests = interestCodes(tripId);
        List<String> common = null;
        for (long userId : readyIds) {
            List<String> codes = interests.getOrDefault(userId, List.of());
            if (common == null) {
                common = new ArrayList<>(codes);
            } else {
                common.retainAll(codes);
            }
        }
        LinkedHashSet<String> mustDo = new LinkedHashSet<>();
        for (MustDoItem item : mustDoItems(tripId)) {
            if (readyIds.contains(item.userId())) {
                mustDo.add(item.name());
            }
        }
        Map<Long, Integer> hardBudgets = hardBudgets(tripId);
        List<InputsResponse.Budget> budgets = members.stream()
                .map(member -> new InputsResponse.Budget(member.userId(), member.displayName(),
                        hardBudgets.get(member.userId())))
                .toList();
        return new InputsResponse(tripId, readyCount, members.size(), memberLines,
                common == null ? List.of() : common, List.copyOf(mustDo), budgets, RULES);
    }

    // ---- gates ----

    TripResponse requireTrip(long tripId) {
        return trips.findById(tripId)
                .orElseThrow(() -> new MainPlanApiException(404, "TRIP_NOT_FOUND", "Trip not found"));
    }

    void requireMember(long tripId, long caller) {
        if (!trips.isMember(tripId, caller)) {
            throw new MainPlanApiException(403, "NOT_A_MEMBER", "Only trip members can access the main plan");
        }
    }

    void requireOrganizer(TripResponse trip, long caller) {
        if (trip.organizerId() != caller) {
            throw new MainPlanApiException(403, "NOT_ORGANIZER", "Only the organizer can manage the main plan");
        }
    }

    // ---- staleness ----

    boolean isStale(long tripId, List<PlanResponse.InputRevision> revisions) {
        Map<Long, Integer> current = new LinkedHashMap<>();
        for (MainPlanRepository.MemberRow member : plans.members(tripId)) {
            current.put(member.userId(), member.preferenceRevision());
        }
        for (PlanResponse.InputRevision revision : revisions) {
            Integer now = current.get(revision.userId());
            if (now == null || now != revision.revision()) {
                return true;
            }
        }
        return false;
    }

    // ---- preference reads (read-only, REQ-019 owns writes) ----

    record MustDoItem(long userId, String name, String location) {
    }

    private Map<Long, List<String>> interestCodes(long tripId) {
        Map<Long, List<String>> codes = new LinkedHashMap<>();
        for (MainPlanRepository.PreferenceRow row : plans.preferenceRows(tripId, "interest")) {
            List<String> list = new ArrayList<>();
            for (JsonNode code : parse(row.payload()).path("codes")) {
                list.add(code.asText());
            }
            codes.put(row.userId(), list);
        }
        return codes;
    }

    private List<MustDoItem> mustDoItems(long tripId) {
        List<MustDoItem> items = new ArrayList<>();
        for (MainPlanRepository.PreferenceRow row : plans.preferenceRows(tripId, "must_do")) {
            for (JsonNode item : parse(row.payload()).path("items")) {
                items.add(new MustDoItem(row.userId(), item.path("name").asText(),
                        item.path("location").asText(null)));
            }
        }
        return items;
    }

    Map<Long, Integer> hardBudgets(long tripId) {
        Map<Long, Integer> budgets = new LinkedHashMap<>();
        for (MainPlanRepository.PreferenceRow row : plans.preferenceRows(tripId, "budget")) {
            JsonNode payload = parse(row.payload());
            if ("hard".equals(payload.path("limitType").asText())) {
                budgets.put(row.userId(), payload.path("amount").asInt());
            }
        }
        return budgets;
    }

    // ---- JSON helpers ----

    private List<PlanResponse.InputRevision> readRevisions(String json) {
        List<PlanResponse.InputRevision> revisions = new ArrayList<>();
        for (JsonNode node : parse(json)) {
            revisions.add(new PlanResponse.InputRevision(node.path("userId").asLong(),
                    node.path("revision").asInt()));
        }
        return revisions;
    }

    private List<String> readInterests(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        List<String> tags = new ArrayList<>();
        for (JsonNode node : parse(json)) {
            tags.add(node.asText());
        }
        return tags;
    }

    private List<PlanResponse.Stop> toStops(List<MainPlanResult.PlannedStop> stops) {
        return stops.stream()
                .map(stop -> new PlanResponse.Stop(stop.seq(), stop.name(), stop.startTime(),
                        stop.endTime(), stop.travelMinutesToNext(), stop.interests()))
                .toList();
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException cause) {
            throw new IllegalStateException("Stored main-plan JSON is invalid", cause);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException cause) {
            throw new IllegalStateException("Main-plan JSON serialization failed", cause);
        }
    }
}