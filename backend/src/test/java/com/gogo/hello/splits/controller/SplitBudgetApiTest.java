package com.gogo.hello.splits.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gogo.auth.TestAuth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * API acceptance tests for the split budget check (US-045). Fixtures: the confirmed main plan costs 500 / 1500 / 2000
 * / 1000 cents, the boundary pair is City Hall MRT -> Merlion Park, so the window replaces 4000 of the 5000 shared
 * cents and 1000 cents remain shared. Group A follows the main line (squad cost 4000, total 5000); group B costs 2500
 * (total 3500). Budgets are stored as US-024 major units (40 SGD = 4000 cents).
 */
class SplitBudgetApiTest extends AbstractSplitApiTest {

    @BeforeEach
    void clearBudgetRows() {
        clearBudgets();
    }

    @Test
    @DisplayName("budgetCheck_onlySumsSquadAndStillApplicableSharedCost")
    void budgetCheck_onlySumsSquadAndStillApplicableSharedCost() throws Exception {
        prepareConfirmableDraftAs("Ben");
        budgetCheck(memberId("Alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draftVersion").value(4))
                .andExpect(jsonPath("$.data.totalSharedCostCents").value(5000))
                .andExpect(jsonPath("$.data.replacedCostCents").value(4000))
                .andExpect(jsonPath("$.data.remainingSharedCostCents").value(1000))
                .andExpect(jsonPath("$.data.blocked").value(false))
                .andExpect(jsonPath("$.data.softReminder").value(false))
                .andExpect(jsonPath("$.data.groups[0].groupLabel").value("A"))
                .andExpect(jsonPath("$.data.groups[0].squadCostCents").value(4000))
                .andExpect(jsonPath("$.data.groups[0].totalCostCents").value(5000))
                .andExpect(jsonPath("$.data.groups[0].members.length()").value(3))
                .andExpect(jsonPath("$.data.groups[0].members[0].status").value("no_budget"))
                .andExpect(jsonPath("$.data.groups[1].groupLabel").value("B"))
                .andExpect(jsonPath("$.data.groups[1].squadCostCents").value(2500))
                .andExpect(jsonPath("$.data.groups[1].totalCostCents").value(3500))
                .andExpect(jsonPath("$.data.groups[1].members[0].displayName").value("Chloe"));
    }

    @Test
    @DisplayName("budgetCheck_withoutDraft_returns409DraftNotActive")
    void budgetCheck_withoutDraft_returns409DraftNotActive() throws Exception {
        budgetCheck(memberId("Alice"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_DRAFT_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("budgetCheck_nonMember_returns403NotAMember")
    void budgetCheck_nonMember_returns403NotAMember() throws Exception {
        prepareConfirmableDraftAs("Ben");
        budgetCheck(eveId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_A_MEMBER"));
    }

    @Test
    @DisplayName("confirmDraft_hardBudgetOverrun_blocksAndReportsExceededAmount")
    void confirmDraft_hardBudgetOverrun_blocksAndReportsExceededAmount() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        insertBudget("Alice", 40, "hard");
        confirm(memberId("Alice"), version)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SPLIT_BUDGET_HARD_OVERRUN"))
                .andExpect(jsonPath("$.error.details.overruns.length()").value(1))
                .andExpect(jsonPath("$.error.details.overruns[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.error.details.overruns[0].groupLabel").value("A"))
                .andExpect(jsonPath("$.error.details.overruns[0].totalCostCents").value(5000))
                .andExpect(jsonPath("$.error.details.overruns[0].budgetAmount").value(40))
                .andExpect(jsonPath("$.error.details.overruns[0].currency").value("SGD"))
                .andExpect(jsonPath("$.error.details.overruns[0].overrunCents").value(1000))
                .andExpect(jsonPath("$.error.details.remainingSharedCostCents").value(1000));
        assertThat(objectMapper.readTree(draftJson()).get("status").asText()).isEqualTo("active");
        assertThat(draftVersionColumn()).isEqualTo(version);
    }

    @Test
    @DisplayName("confirmDraft_softBudgetOverrun_isReminderOnlyAndStillConfirms")
    void confirmDraft_softBudgetOverrun_isReminderOnlyAndStillConfirms() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        // Soft 20 -> effective cap 24 (2400 cents); group B costs 3500, so the reminder reports 1100 above the cap.
        insertBudget("Chloe", 20, "soft");
        budgetCheck(memberId("Chloe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.blocked").value(false))
                .andExpect(jsonPath("$.data.softReminder").value(true))
                .andExpect(jsonPath("$.data.groups[1].members[0].status").value("soft_over"))
                .andExpect(jsonPath("$.data.groups[1].members[0].overrunCents").value(1100));
        confirm(memberId("Alice"), version)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("confirmed"));
    }

    @Test
    @DisplayName("budgetCheck_softOverrunWithinTwentyPercent_staysWithinWithoutReminder")
    void budgetCheck_softOverrunWithinTwentyPercent_staysWithinWithoutReminder() throws Exception {
        prepareConfirmableDraftAs("Ben");
        // Soft 30 -> effective cap 36 (3600 cents); group B costs 3500, inside the cap: neither reminder nor block.
        insertBudget("Chloe", 30, "soft");
        budgetCheck(memberId("Chloe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.blocked").value(false))
                .andExpect(jsonPath("$.data.softReminder").value(false))
                .andExpect(jsonPath("$.data.groups[1].members[0].status").value("within"))
                .andExpect(jsonPath("$.data.groups[1].members[0].overrunCents").value(0));
    }

    @Test
    @DisplayName("saveActivities_manualEntry_replacesGroupCostAndClearsOverrun")
    void saveActivities_manualEntry_replacesGroupCostAndClearsOverrun() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        insertBudget("Chloe", 20, "hard");
        saveActivities(memberId("Ben"), version, "B",
                List.of(Map.of("name", "老城咖啡", "location", "大学路", "costCents", 800)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draftVersion").value(version + 1))
                .andExpect(jsonPath("$.data.routes[1].activities[0].name").value("老城咖啡"))
                .andExpect(jsonPath("$.data.routes[1].activities[0].source").value("manual"));
        budgetCheck(memberId("Chloe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups[1].squadCostCents").value(800))
                .andExpect(jsonPath("$.data.groups[1].totalCostCents").value(1800))
                .andExpect(jsonPath("$.data.groups[1].members[0].status").value("within"))
                .andExpect(jsonPath("$.data.blocked").value(false));
    }

    @Test
    @DisplayName("saveActivities_invalidRowsOrStaleVersion_areRejectedWithoutWrite")
    void saveActivities_invalidRowsOrStaleVersion_areRejectedWithoutWrite() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        saveActivities(memberId("Ben"), version, "B", List.of(Map.of("name", " ", "costCents", 100)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ACTIVITIES"));
        saveActivities(memberId("Ben"), version, "B", List.of(Map.of("name", "咖啡", "costCents", -1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ACTIVITIES"));
        saveActivities(memberId("Chloe"), version, "B", List.of(Map.of("name", "咖啡", "costCents", 100)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_SPLIT_INITIATOR"));
        saveActivities(memberId("Ben"), version - 1, "B", List.of(Map.of("name", "咖啡", "costCents", 100)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("STALE_DRAFT_VERSION"));
        assertThat(draftVersionColumn()).isEqualTo(version);
    }

    @Test
    @DisplayName("recommendActivities_suggestionFitsTheTightestRemainingBudget")
    void recommendActivities_suggestionFitsTheTightestRemainingBudget() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        insertBudget("Chloe", 20, "hard");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/activities:recommend", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("groupLabel", "B", "draftVersion", version))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].costCents").value(800))
                .andExpect(jsonPath("$.data[0].source").value("ai"));
        assertThat(draftVersionColumn()).isEqualTo(version);
    }

    @Test
    @DisplayName("recommendActivities_noCatalogueItemFits_returnsEmptyList")
    void recommendActivities_noCatalogueItemFits_returnsEmptyList() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        insertBudget("Chloe", 10, "hard");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/activities:recommend", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("groupLabel", "B", "draftVersion", version))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("recommendActivities_withoutAnyBudget_returnsACatalogueSuggestion")
    void recommendActivities_withoutAnyBudget_returnsACatalogueSuggestion() throws Exception {
        int version = prepareConfirmableDraftAs("Ben");
        mockMvc.perform(post("/api/trips/{tripId}/split-draft/activities:recommend", sgfTripId())
                        .with(TestAuth.asUser(memberId("Ben")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("groupLabel", "B", "draftVersion", version))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    private ResultActions budgetCheck(String actorId) throws Exception {
        return mockMvc.perform(get("/api/trips/{tripId}/split-draft/budget-check", sgfTripId())
                .with(TestAuth.asUser(actorId)));
    }

    private ResultActions saveActivities(String actorId, int draftVersion, String groupLabel,
            List<Map<String, Object>> activities) throws Exception {
        return mockMvc.perform(put("/api/trips/{tripId}/split-draft/activities", sgfTripId())
                .with(TestAuth.asUser(actorId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "groupLabel", groupLabel,
                        "activities", activities,
                        "draftVersion", draftVersion))));
    }

    private ResultActions confirm(String actorId, int draftVersion) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/split-draft:confirm", sgfTripId())
                .with(TestAuth.asUser(actorId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("draftVersion", draftVersion))));
    }
}
