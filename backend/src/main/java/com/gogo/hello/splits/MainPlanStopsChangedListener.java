package com.gogo.hello.splits;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.gogo.mainplan.MainPlanStopsChanged;

/**
 * US-090: a 「我的方案」stop edit invalidates the generated split pair. The event keeps the dependency one-way
 * (splits already reads the main plan), so mainplan never imports splits.
 */
@Component
class MainPlanStopsChangedListener {

    private final SplitDraftService drafts;

    MainPlanStopsChangedListener(SplitDraftService drafts) {
        this.drafts = drafts;
    }

    @EventListener
    void onMainPlanStopsChanged(MainPlanStopsChanged event) {
        drafts.invalidateRoutesAfterMainPlanChange(String.valueOf(event.tripId()));
    }
}
