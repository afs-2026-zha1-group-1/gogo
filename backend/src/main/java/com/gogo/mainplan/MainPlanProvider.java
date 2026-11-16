package com.gogo.mainplan;

import java.util.List;

// Provider port (design D3). The fake implementation IS the MVP production
// behavior (OQ-2 ruling); a real provider replaces it at R2 through this seam.
public interface MainPlanProvider {

    MainPlanResult plan(TripContext trip, List<MemberInput> inputs);
}