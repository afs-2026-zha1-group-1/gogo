package com.gogo.preference;

import java.util.List;

/**
 * Stored shape of one preference row (DD6): codes in submitted order. Labels never reach the
 * database, so renaming a label later cannot corrupt stored rows.
 */
record PreferencePayload(List<String> codes) {
}
