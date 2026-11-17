package com.gogo.preference;

import java.util.List;

/**
 * `{"items": [...]}` returned by a successful `PUT` (MD2): exactly the contract keys, never the
 * storage `name` mirror (MDR-5). The response is what the frontend adopts, so server-issued ids
 * come back in the same call (PAGE-6, PAGE-7).
 */
public record MustDoSaveResponse(List<MustDoItem> items) {
}
