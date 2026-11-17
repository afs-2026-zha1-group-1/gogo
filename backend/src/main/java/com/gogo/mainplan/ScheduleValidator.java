package com.gogo.mainplan;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

// The five schedule rules (design D9) on single-day HH:MM-as-minutes.
// Equality is allowed everywhere: a leg landing exactly on the next start
// passes, and the day window 00:00–23:59 is inclusive. Out-of-window values
// still take part in pair comparisons; unparseable times only raise
// OUT_OF_DAY and skip the pairs they appear in.
@Component
public class ScheduleValidator {

    public record ScheduleError(String type, int seq, String message) {
    }

    public List<ScheduleError> validate(List<MainPlanRepository.StopRow> stops) {
        List<ScheduleError> errors = new ArrayList<>();
        Integer[] starts = new Integer[stops.size()];
        Integer[] ends = new Integer[stops.size()];
        for (int i = 0; i < stops.size(); i++) {
            MainPlanRepository.StopRow stop = stops.get(i);
            starts[i] = minutes(stop.startLocal());
            ends[i] = minutes(stop.endLocal());
            if (starts[i] == null || starts[i] < 0 || starts[i] > 1439) {
                errors.add(new ScheduleError("OUT_OF_DAY", stop.seq(),
                        "Stop " + stop.seq() + " starts outside the day window (00:00-23:59)"));
            }
            if (ends[i] == null || ends[i] < 0 || ends[i] > 1439) {
                errors.add(new ScheduleError("OUT_OF_DAY", stop.seq(),
                        "Stop " + stop.seq() + " ends outside the day window (00:00-23:59)"));
            }
            if (i < stops.size() - 1 && stop.travelMinutesToNext() == null) {
                errors.add(new ScheduleError("MISSING_LEG", stop.seq(),
                        "Stop " + stop.seq() + " is missing travel minutes to the next stop"));
            }
        }
        for (int i = 0; i + 1 < stops.size(); i++) {
            MainPlanRepository.StopRow current = stops.get(i);
            MainPlanRepository.StopRow next = stops.get(i + 1);
            if (starts[i] == null || starts[i + 1] == null || ends[i] == null) {
                continue;
            }
            if (starts[i + 1] < starts[i]) {
                errors.add(new ScheduleError("OUT_OF_ORDER", next.seq(),
                        "Stop " + next.seq() + " starts before stop " + current.seq()));
            }
            if (starts[i + 1] < ends[i]) {
                errors.add(new ScheduleError("OVERLAP", next.seq(),
                        "Stop " + next.seq() + " starts before stop " + current.seq() + " ends"));
            }
            if (current.travelMinutesToNext() != null
                    && ends[i] + current.travelMinutesToNext() > starts[i + 1]) {
                errors.add(new ScheduleError("TRAVEL_EXCEEDS_GAP", current.seq(),
                        "Travel from stop " + current.seq() + " does not fit before stop " + next.seq() + " starts"));
            }
        }
        return errors;
    }

    // "HH:MM" -> minutes since midnight; 25:00 parses to 1500 so the window
    // check can flag it. Unparseable input yields null.
    private Integer minutes(String local) {
        if (local == null) {
            return null;
        }
        String[] parts = local.split(":");
        if (parts.length != 2) {
            return null;
        }
        try {
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (NumberFormatException cause) {
            return null;
        }
    }
}