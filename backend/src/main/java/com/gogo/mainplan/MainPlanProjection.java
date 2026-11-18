package com.gogo.mainplan;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.gogo.trip.TripZones;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Materializes the confirmed main plan (main_plan_draft + main_plan_stop) into main-line plan_node rows
 * (branch_id = 'main', plan_version = the confirmed draft's version). This is the only writer of main-line
 * plan_node rows: the splits capability reads them instead of synthesizing boundary stops, so a trip's split
 * boundaries always come from the plan its members actually confirmed.
 *
 * Local HH:MM stop times are placed on the trip start date in the trip's own zone (香港/伦敦/新加坡 default, see
 * {@link TripZones}), so ISO consumers need no locale knowledge. Rows of other versions
 * are left untouched (history stays readable); only the confirmed version is rewritten, which makes the
 * projection idempotent and self-healing for plans confirmed before the projection existed.
 */
@Component
public class MainPlanProjection {

    private final JdbcTemplate jdbc;
    private final MainPlanRepository plans;

    public MainPlanProjection(JdbcTemplate jdbc, MainPlanRepository plans) {
        this.jdbc = jdbc;
        this.plans = plans;
    }

    /**
     * Rewrites the trip's main-line nodes from its confirmed draft and returns the projected main-plan version.
     * Empty when the trip has no confirmed draft; callers must reject instead of inventing stops.
     */
    @Transactional
    public Optional<Integer> projectConfirmed(long tripId) {
        Optional<MainPlanRepository.DraftRow> confirmed = plans.findDraftByStatus(tripId, "confirmed");
        if (confirmed.isEmpty()) {
            return Optional.empty();
        }
        MainPlanRepository.DraftRow draft = confirmed.get();
        Map<String, Object> trip = tripFacts(tripId);
        String startDate = (String) trip.get("start_date");
        ZoneId zone = TripZones.of((String) trip.get("destination"));
        List<MainPlanRepository.StopRow> stops = plans.stopsForDraft(draft.id());
        String now = Instant.now().toString();
        Map<Integer, List<String>> existing = existingMainRows(tripId, draft.version());
        for (MainPlanRepository.StopRow stop : stops) {
            List<String> ids = existing.remove(stop.seq());
            Instant startAt = instant(startDate, stop.startLocal(), zone);
            Instant endAt = instant(startDate, stop.endLocal(), zone);
            if (ids == null || ids.isEmpty()) {
                jdbc.update("INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, "
                                + "start_at, end_at, location_name, lat, lng, sort_order, created_at, cost_cents) "
                                + "VALUES (?, ?, ?, NULL, 'main', 'stop', ?, ?, ?, ?, NULL, NULL, ?, ?, ?)",
                        stableId(tripId, draft.version(), stop.seq()), tripId, draft.version(), stop.name(),
                        startAt, endAt, locationOf(stop), stop.seq(), now, stop.costCents());
                continue;
            }
            // The row already occupying this order keeps its id, so split drafts that stored it stay valid.
            jdbc.update("UPDATE plan_node SET title = ?, start_at = ?, end_at = ?, location_name = ?, cost_cents = ? "
                            + "WHERE id = ?",
                    stop.name(), startAt, endAt, locationOf(stop), stop.costCents(), ids.get(0));
            for (String duplicate : ids.subList(1, ids.size())) {
                jdbc.update("DELETE FROM plan_node WHERE id = ?", duplicate);
            }
        }
        // Orders the plan no longer uses (a stop dropped by the confirmed version) are never left behind.
        for (List<String> ids : existing.values()) {
            for (String id : ids) {
                jdbc.update("DELETE FROM plan_node WHERE id = ?", id);
            }
        }
        return Optional.of(draft.version());
    }

    /**
     * Main-line rows of one plan version keyed by {@code sort_order}. A duplicated order keeps its first id
     * ({@code ORDER BY sort_order, id}) so the surviving row is deterministic.
     */
    private Map<Integer, List<String>> existingMainRows(long tripId, int version) {
        Map<Integer, List<String>> rows = new LinkedHashMap<>();
        jdbc.query("SELECT sort_order, id FROM plan_node WHERE trip_id = ? AND branch_id = 'main' "
                        + "AND plan_version = ? ORDER BY sort_order, id",
                (RowCallbackHandler) rs -> rows.computeIfAbsent(rs.getInt("sort_order"), key -> new ArrayList<>())
                        .add(rs.getString("id")),
                tripId, version);
        return rows;
    }

    /** Deterministic main-line id so a stop keeps the same identity across re-projections of one version. */
    static String stableId(long tripId, int version, int seq) {
        return "mn-" + tripId + "-" + version + "-" + seq;
    }

    /** The edited location when the plan carries one; the stop name is the pre-US-090 fallback. */
    private static String locationOf(MainPlanRepository.StopRow stop) {
        String location = stop.locationName();
        return location == null || location.isBlank() ? stop.name() : location;
    }

    private Map<String, Object> tripFacts(long tripId) {
        List<Map<String, Object>> trips = jdbc.queryForList(
                "SELECT start_date, destination FROM trip WHERE id = ?", tripId);
        return trips.isEmpty() ? Map.of() : trips.get(0);
    }

    /** Local HH:MM on the trip start date in the given zone -> ISO-8601 instant (null when unparseable). */
    static Instant instant(String startDate, String clock, ZoneId zone) {
        if (startDate == null || clock == null) {
            return null;
        }
        try {
            return LocalDateTime.of(LocalDate.parse(startDate), LocalTime.parse(clock)).atZone(zone).toInstant();
        } catch (DateTimeParseException ex) {
            return null;
        }
    }
}
