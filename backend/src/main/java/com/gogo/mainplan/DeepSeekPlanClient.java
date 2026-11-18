package com.gogo.mainplan;

// Seam around the DeepSeek chat call (main-plan design D3, split design D1): production uses HTTP,
// unit and API tests use stubs so no test ever reaches the network. Public so both the main-plan and
// the split branch providers share the one client.
public interface DeepSeekPlanClient {

    String complete(String systemPrompt, String userJson);
}
