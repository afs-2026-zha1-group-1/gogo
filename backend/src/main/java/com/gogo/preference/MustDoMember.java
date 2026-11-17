package com.gogo.preference;

import java.util.List;

/**
 * One trip member in the must-do read model (MD9): `userId` plus the member's `mustDos`, empty
 * when the member never saved. Two keys only — no `ready` flag and no mirror (REQ-026 non-goal,
 * MDR-4).
 */
public record MustDoMember(long userId, List<MustDoItem> mustDos) {
}
