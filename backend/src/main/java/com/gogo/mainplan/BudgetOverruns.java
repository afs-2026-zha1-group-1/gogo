package com.gogo.mainplan;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

// Hard-budget overrun arithmetic (design D8): null budget means no limit,
// equality passes, overrunCents = costPerPersonCents - hardBudgetCents.
// Member order is preserved; soft budgets never reach this component.
@Component
public class BudgetOverruns {

    public record Overrun(long userId, String displayName, int hardBudgetCents, int overrunCents) {
    }

    public List<Overrun> compute(List<MemberInput> members, int costPerPersonCents) {
        List<Overrun> overruns = new ArrayList<>();
        for (MemberInput member : members) {
            Integer budget = member.hardBudgetCents();
            if (budget != null && costPerPersonCents > budget) {
                overruns.add(new Overrun(member.userId(), member.displayName(),
                        budget, costPerPersonCents - budget));
            }
        }
        return overruns;
    }
}