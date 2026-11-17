package com.gogo.mainplan;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Materializes the confirmed main plan (main_plan_draft + main_plan_stop) into main-line plan_node rows
 * (branch_id = 'main', plan_version = the confirmed draft's version). This is the only writer of main-line
 * plan_node rows: the splits capability reads them instead of synthesizing boundary stops, so a trip's split
 * boundaries always come from the plan its members actually confirmed.
 *
 * Local HH:MM stop times are placed on the trip start date in the trip timezone (Asia/Singapore, the same zone
 * the preference submission timestamps use), so ISO consumers need no locale knowledge. Rows of other versions
 * are left untouched (history stays readable); only the confirmed version is rewritten, which makes the
 * projection idempotent and self-healing for plans confirmed before the projection existed.
 */
@Component
public class MainPlanProjection {

    static final ZoneId TRIP_ZONE = ZoneId.of("Asia/Singapore");

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
        String startDate = tripStartDate(tripId);
        List<MainPlanRepository.StopRow> stops = plans.stopsForDraft(draft.id());
        String now = Instant.now().toString();
        jdbc.update("DELETE FROM plan_node WHERE trip_id = ? AND branch_id = 'main' AND plan_version = ?",
                tripId, draft.version());
        for (MainPlanRepository.StopRow stop : stops) {
            jdbc.update("INSERT INTO plan_node (id, trip_id, plan_version, parent_id, branch_id, node_type, title, "
                            + "start_at, end_at, location_name, lat, lng, sort_order, created_at) "
                            + "VALUES (?, ?, ?, NULL, 'main', 'stop', ?, ?, ?, ?, NULL, NULL, ?, ?)",
                    UUID.randomUUID().toString(), tripId, draft.version(), stop.name(),
                    instant(startDate, stop.startLocal()), instant(startDate, stop.endLocal()),
                    stop.name(), stop.seq(), now);
        }
        return Optional.of(draft.version());
    }

    private String tripStartDate(long tripId) {
        List<String> dates = jdbc.queryForList("SELECT start_date FROM trip WHERE id = ?", String.class, tripId);
        return dates.isEmpty() ? null : dates.get(0);
    }

    /** Local HH:MM on the trip start date in the trip timezone -> ISO-8601 instant (null when unparseable). */
    static Instant instant(String startDate, String clock) {
        if (startDate == null || clock == null) {
            return null;
        }
        try {
            return LocalDateTime.of(LocalDate.parse(startDate), LocalTime.parse(clock)).atZone(TRIP_ZONE).toInstant();
        } catch (DateTimeParseException ex) {
            return null;
        }
    }
}
