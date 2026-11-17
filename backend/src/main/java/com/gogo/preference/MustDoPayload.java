package com.gogo.preference;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The single codec between the must-do list and the stored `member_preference` payload (MD3,
 * MD4, MD10). {@code encode} is the only factory that writes the storage `name` mirror from
 * `activity`, so create and edit both mirror it (R4) and an unmirrored stored item is
 * unrepresentable. {@code decode} is deliberately lenient because the stored rows may predate
 * this change: `V5` seeds carry no `id`, no `activity` and no `time`, so `activity` falls back
 * to `name` and missing `id`/`time` read as `null`. The write path never goes through that
 * tolerance — the strict wire deserializer validates requests (MD6).
 */
final class MustDoPayload {

    private MustDoPayload() {
    }

    static String encode(ObjectMapper mapper, List<MustDoItem> items) {
        try {
            var root = mapper.createObjectNode();
            var array = root.putArray("items");
            for (MustDoItem item : items) {
                var node = array.addObject();
                if (item.id() == null) {
                    node.putNull("id");
                } else {
                    node.put("id", item.id());
                }
                node.put("activity", item.activity());
                node.put("name", item.activity());
                if (item.location() == null) {
                    node.putNull("location");
                } else {
                    node.put("location", item.location());
                }
                if (item.time() == null) {
                    node.putNull("time");
                } else {
                    node.put("time", item.time());
                }
            }
            return mapper.writeValueAsString(root);
        } catch (Exception cause) {
            throw new IllegalStateException("Must-do payload is not serializable", cause);
        }
    }

    static List<MustDoItem> decode(ObjectMapper mapper, String payloadJson) {
        try {
            JsonNode root = mapper.readTree(payloadJson);
            List<MustDoItem> items = new ArrayList<>();
            for (JsonNode node : root.path("items")) {
                Long id = node.path("id").isIntegralNumber() ? node.get("id").asLong() : null;
                String activity = node.hasNonNull("activity")
                        ? node.get("activity").asText()
                        : (node.hasNonNull("name") ? node.get("name").asText() : null);
                String location = node.hasNonNull("location") ? node.get("location").asText() : null;
                String time = node.hasNonNull("time") ? node.get("time").asText() : null;
                items.add(new MustDoItem(id, activity, location, time));
            }
            return items;
        } catch (Exception cause) {
            throw new IllegalStateException(
                    "Stored must-do payload is not readable JSON: " + payloadJson, cause);
        }
    }
}
