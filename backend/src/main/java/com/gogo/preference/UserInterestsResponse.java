package com.gogo.preference;

import java.util.List;

/** The caller's personal default interests (US-019). */
public record UserInterestsResponse(List<String> interests) {
}
