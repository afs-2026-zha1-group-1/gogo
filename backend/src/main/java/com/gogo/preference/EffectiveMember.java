package com.gogo.preference;

import java.util.List;

/**
 * The generation-side projection of one READY member (US-026). A member with {@code noPreference}
 * contributes no personal values; {@code interests} is empty in that case.
 */
public record EffectiveMember(long userId, boolean noPreference, List<String> interests) {
}
