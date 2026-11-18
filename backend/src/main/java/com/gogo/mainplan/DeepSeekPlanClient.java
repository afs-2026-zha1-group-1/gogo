package com.gogo.mainplan;

// Package seam around the DeepSeek chat call (design D3): production uses HTTP,
// unit and API tests use stubs so no test ever reaches the network.
interface DeepSeekPlanClient {

    String complete(String systemPrompt, String userJson);
}
