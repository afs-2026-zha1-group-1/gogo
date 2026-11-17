package com.gogo.preference;

import java.util.List;

public record PreferenceMember(long userId, List<String> interests) {
}
