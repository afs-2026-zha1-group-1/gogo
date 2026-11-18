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
import com.gogo.preference.InterestCatalogue;
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
    private final MainPlanProjection projection;

    public MainPlanService(TripRepository trips, MainPlanRepository plans, MainPlanProvider provider,
            LocationCompletion locationCompletion, ScheduleValidator scheduleValidator,
            BudgetOverruns budgetOverruns, ObjectMapper objectMapper, MainPlanProjection projection) {
        this.trips = trips;
        this.plans = plans;
        this.provider = provider;
        this.locationCompletion = locationCompletion;
        this.scheduleValidator = scheduleValidator;
        this.budgetOverruns = budgetOverruns;
        this.objectMapper = objectMapper;
        this.projection = projection;
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

        Set<Long> readyIds = members.stream()
                .filter(member -> !noPreferenceOf(member.submissionPayload()))
                .map(MainPlanRepository.MemberRow::userId)
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
                .map(member -> {
                    boolean noPref = noPreferenceOf(member.submissionPayload());
                    return new MemberInput(member.userId(), member.displayName(),
                            member.preferenceRevision(),
                            noPref ? List.<String>of() : interests.getOrDefault(member.userId(), List.of()),
                            noPref ? List.<String>of()
                                    : mustDo.stream()
                                            .filter(item -> item.userId() == member.userId())
                                            .map(MustDoItem::name).toList(),
                            noPref ? null : hardBudgets.get(member.userId()));
                })
                .toList();
        TripContext context = new TripContext(tripId, trip.destination(), trip.startDate(),
                trip.endDate(), completed.startLocation(), completed.endLocation());
        MainPlanResult result = provider.plan(context, inputs);

        List<PlanResponse.InputRevision> revisions = members.stream()
                .map(member -> new PlanResponse.InputRevision(member.userId(), member.preferenceRevision()))
                .toList();
        plans.supersedeCurrentDrafts(tripId);
        int version = plans.maxVersion(tripId) + 1;
        long draftId = plans.insertDraft(tripId, version, result.costPerPersonCents(), writeJson(revisions),
                writeJson(tripBasics(trip.destination(), trip.startDate(), trip.endDate(),
                        completed.startLocation(), completed.endLocation())));
        // US-079 路线1：坐标不由 AI/provider 产出——落库时查地址簿缓存补全；
        // 缓存未命中的国内站由前端 JS API 查坐标后经 stop-locations 回写。
        List<PlanResponse.Stop> completedStops = new ArrayList<>();
        for (MainPlanResult.PlannedStop stop : result.stops()) {
            String city = stop.city() != null ? stop.city() : trip.destination();
            Optional<MainPlanRepository.PlaceRow> cached = plans.cacheLookup(stop.name(), city);
            String address = stop.address() != null ? stop.address()
                    : cached.map(MainPlanRepository.PlaceRow::address).orElse(null);
            Double lat = cached.map(MainPlanRepository.PlaceRow::lat).orElse(null);
            Double lng = cached.map(MainPlanRepository.PlaceRow::lng).orElse(null);
            plans.insertStop(draftId, stop, writeJson(stop.interests()), address, lat, lng);
            completedStops.add(new PlanResponse.Stop(stop.seq(), stop.name(), stop.startTime(),
                    stop.endTime(), stop.travelMinutesToNext(), stop.interests(), address, lat, lng));
        }
        return new PlanResponse(tripId, version, false, false,
                result.costPerPersonCents(), revisions, completedStops);
    }

    /** US-079 路线1：程序查坐标回写请求体（seq + WGS-84 坐标）。 */
    public record StopLocation(int seq, double lat, double lng) {
    }

    // 回写当前草稿站点坐标并沉淀进地址簿；门序同生成（trip→member→organizer→draft）。
    @Transactional
    public PlanResponse completeStopLocations(long tripId, long caller, List<StopLocation> locations) {
        TripResponse trip = requireTrip(tripId);
        requireMember(tripId, caller);
        requireOrganizer(trip, caller);
        MainPlanRepository.DraftRow draft = plans.findDraftByStatus(tripId, "current")
                .orElseThrow(() -> new MainPlanApiException(404, "NO_DRAFT",
                        "No main plan draft has been generated for this trip"));
        List<MainPlanRepository.StopRow> stops = plans.stopsForDraft(draft.id());
        String city = trip.destination() == null ? "" : trip.destination();
        for (StopLocation location : locations) {
            if (Math.abs(location.lat()) > 90 || Math.abs(location.lng()) > 180) {
                throw new MainPlanApiException(422, "INVALID_COORDS", "Coordinates out of range");
            }
            MainPlanRepository.StopRow row = stops.stream()
                    .filter(stop -> stop.seq() == location.seq())
                    .findFirst()
                    .orElseThrow(() -> new MainPlanApiException(422, "UNKNOWN_STOP",
                            "Stop seq is not part of the current draft"));
            plans.updateStopLocation(draft.id(), location.seq(), location.lat(), location.lng());
            plans.cacheUpsert(row.name(), city, row.address(), location.lat(), location.lng(), "geocode");
        }
        return readPlan(tripId, caller);
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
        if (isStale(tripId, revisions, draft)) {
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
        plans.setTripConfirmedAndJoiningClosed(tripId);
        // The confirmed plan becomes the trip's main-line nodes in the same transaction, so the splits
        // capability reads the very rows this confirmation approved instead of a separate synthetic set.
        projection.projectConfirmed(tripId);
        return readPlan(tripId, caller);
    }

    /**
     * US-003 D7: the trip-detail shortcut keeps its URL but delegates to the same
     * validated confirmation; only the organizer passes, and the response is the
     * updated trip projection.
     */
    @Transactional
    public TripResponse confirmShortcut(long tripId, long caller) {
        confirm(tripId, caller);
        return requireTrip(tripId);
    }

    /**
     * US-003 D10/D11: organizer edits one stop's name and times on the current
     * unconfirmed draft. Feasibility stays with confirmation validation.
     */
    @Transactional
    public PlanResponse editStop(long tripId, long caller, int seq, StopEditRequest request) {
        TripResponse trip = requireTrip(tripId);
        requireMember(tripId, caller);
        requireOrganizer(trip, caller);
        if (plans.findDraftByStatus(tripId, "confirmed").isPresent()) {
            throw new MainPlanApiException(409, "ALREADY_CONFIRMED",
                    "The main plan is already confirmed; stops cannot be edited");
        }
        MainPlanRepository.DraftRow draft = plans.findDraftByStatus(tripId, "current")
                .orElseThrow(() -> new MainPlanApiException(404, "NO_DRAFT",
                        "No main plan draft has been generated for this trip"));
        if (!plans.stopExists(draft.id(), seq)) {
            throw new MainPlanApiException(404, "STOP_NOT_FOUND", "No stop with seq " + seq);
        }
        String name = request == null || request.name() == null ? null : request.name().trim();
        if (name == null || name.isBlank()) {
            throw new MainPlanApiException(400, "NAME_REQUIRED", "Stop name must not be blank");
        }
        Integer start = parseClock(request.startTime());
        Integer end = parseClock(request.endTime());
        if (start == null || end == null) {
            throw new MainPlanApiException(400, "INVALID_TIME", "Stop times must be HH:MM values");
        }
        if (end <= start) {
            throw new MainPlanApiException(400, "INVALID_TIME_RANGE", "End time must be after start time");
        }
        int updated = plans.updateStopIfCurrent(draft.id(), seq, name,
                request.startTime().trim(), request.endTime().trim());
        if (updated == 0) {
            if (plans.findDraftByStatus(tripId, "confirmed").isPresent()) {
                throw new MainPlanApiException(409, "ALREADY_CONFIRMED",
                        "The main plan is already confirmed; stops cannot be edited");
            }
            throw new MainPlanApiException(404, "STOP_NOT_FOUND", "No stop with seq " + seq);
        }
        return readPlan(tripId, caller);
    }

    private static Integer parseClock(String value) {
        if (value == null || !value.trim().matches("\\d{1,2}:\\d{2}")) {
            return null;
        }
        String[] parts = value.trim().split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
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
        boolean stale = !confirmed && isStale(tripId, revisions, draft);
        List<PlanResponse.Stop> stops = plans.stopsForDraft(draft.id()).stream()
                .map(stop -> new PlanResponse.Stop(stop.seq(), stop.name(), stop.startLocal(),
                        stop.endLocal(), stop.travelMinutesToNext(), readInterests(stop.interestsJson()),
                        stop.address(), stop.lat(), stop.lng()))
                .toList();
        return new PlanResponse(tripId, draft.version(), confirmed, stale,
                draft.costPerPersonCents(), revisions, stops);
    }

    // D7: member-readable before any draft; display-only aggregations. A member who chose "no
    // preference" stays ready but contributes no personal values, so the summary never repeats
    // stale interests, must-dos or budgets for them.
    public InputsResponse readInputs(long tripId, long caller) {
        requireTrip(tripId);
        requireMember(tripId, caller);
        List<MainPlanRepository.MemberRow> members = plans.members(tripId);
        List<InputsResponse.Member> memberLines = members.stream()
                .map(member -> new InputsResponse.Member(member.userId(), member.displayName(),
                        member.ready(), member.preferenceRevision(),
                        noPreferenceOf(member.submissionPayload())))
                .toList();
        int readyCount = (int) members.stream().filter(MainPlanRepository.MemberRow::ready).count();
        Set<Long> readyIds = members.stream().filter(MainPlanRepository.MemberRow::ready)
                .filter(member -> !noPreferenceOf(member.submissionPayload()))
                .map(MainPlanRepository.MemberRow::userId)
                .collect(Collectors.toSet());
        Map<Long, String> names = new LinkedHashMap<>();
        for (MainPlanRepository.MemberRow member : members) {
            names.put(member.userId(), member.displayName());
        }

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
        List<String> commonCodes = common == null ? List.of() : common;
        List<String> commonLabels = new ArrayList<>();
        for (String code : commonCodes) {
            commonLabels.add(InterestCatalogue.labelOf(code).orElse(code));
        }

        LinkedHashSet<String> mustDo = new LinkedHashSet<>();
        Map<String, InputsResponse.MustDo> groupedMustDo = new LinkedHashMap<>();
        for (MustDoItem item : mustDoItems(tripId)) {
            if (!readyIds.contains(item.userId())) {
                continue;
            }
            mustDo.add(item.name());
            String key = item.name() + "\u0000" + (item.location() == null ? "" : item.location());
            InputsResponse.MustDo existing = groupedMustDo.get(key);
            List<String> owners = new ArrayList<>(existing == null ? List.of() : existing.memberNames());
            String owner = names.get(item.userId());
            if (owner != null && !owners.contains(owner)) {
                owners.add(owner);
            }
            groupedMustDo.put(key, new InputsResponse.MustDo(item.name(), item.location(), owners));
        }

        Map<Long, Integer> hardBudgets = hardBudgets(tripId);
        Map<Long, MemberBudget> storedBudgets = budgets(tripId);
        List<InputsResponse.Budget> budgets = members.stream()
                .map(member -> {
                    boolean noPref = noPreferenceOf(member.submissionPayload());
                    MemberBudget stored = noPref ? null : storedBudgets.get(member.userId());
                    return new InputsResponse.Budget(member.userId(), member.displayName(),
                            noPref ? null : hardBudgets.get(member.userId()),
                            stored == null ? null : stored.amount(),
                            stored == null ? null : stored.currency(),
                            stored == null ? null : stored.limitType());
                })
                .toList();
        return new InputsResponse(tripId, readyCount, members.size(), memberLines,
                commonCodes, List.copyOf(mustDo), budgets, RULES, commonLabels,
                List.copyOf(groupedMustDo.values()));
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

    /** US-003 D6: preference revisions OR the trip-basics snapshot decide staleness; a missing snapshot is stale. */
    boolean isStale(long tripId, List<PlanResponse.InputRevision> revisions, MainPlanRepository.DraftRow draft) {
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
        if (draft.tripBasicsJson() == null) {
            return true;
        }
        TripResponse trip = requireTrip(tripId);
        String snapshot = writeJson(tripBasics(trip.destination(), trip.startDate(), trip.endDate(),
                trip.startLocation(), trip.endLocation()));
        return !snapshot.equals(draft.tripBasicsJson());
    }

    /** US-003 D5: snapshot content shared by generation and the staleness comparison. */
    private Map<String, Object> tripBasics(String destination, String startDate, String endDate,
            String startLocation, String endLocation) {
        Map<String, Object> basics = new LinkedHashMap<>();
        basics.put("destination", destination);
        basics.put("startDate", startDate);
        basics.put("endDate", endDate);
        basics.put("startLocation", startLocation);
        basics.put("endLocation", endLocation);
        return basics;
    }

    // ---- preference reads (read-only, REQ-019 owns writes) ----

    record MustDoItem(long userId, String name, String location) {
    }

    record MemberBudget(Integer amount, String currency, String limitType) {
    }

    // A cleared budget keeps an empty object, so only an amount makes a member's budget real.
    private Map<Long, MemberBudget> budgets(long tripId) {
        Map<Long, MemberBudget> stored = new LinkedHashMap<>();
        for (MainPlanRepository.PreferenceRow row : plans.preferenceRows(tripId, "budget")) {
            JsonNode payload = parse(row.payload());
            if (!payload.path("amount").isNumber()) {
                continue;
            }
            stored.put(row.userId(), new MemberBudget(payload.path("amount").asInt(),
                    payload.path("currency").asText(null), payload.path("limitType").asText(null)));
        }
        return stored;
    }

    // US-026: "no preference" is an explicit choice stored on the submission row; the member is
    // ready but contributes no personal values to generation.
    private boolean noPreferenceOf(String submissionPayload) {
        if (submissionPayload == null || submissionPayload.isBlank()) {
            return false;
        }
        return parse(submissionPayload).path("noPreference").asBoolean(false);
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

    // A member's budget is stored in major units (元); the plan cost and every budget comparison
    // work in cents, so the conversion happens here and nowhere else.
    Map<Long, Integer> hardBudgets(long tripId) {
        Map<Long, Integer> budgets = new LinkedHashMap<>();
        for (MainPlanRepository.PreferenceRow row : plans.preferenceRows(tripId, "budget")) {
            JsonNode payload = parse(row.payload());
            if ("hard".equals(payload.path("limitType").asText())) {
                budgets.put(row.userId(), payload.path("amount").asInt() * 100);
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