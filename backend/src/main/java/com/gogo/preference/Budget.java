package com.gogo.preference;

/**
 * A member's per-person budget on the wire (US-024, revised 2026-11-17 at the owner's request):
 * {@code amount} is in MAJOR currency units and is always an integer (so 1000 means one
 * thousand), {@code currency} is one of the five allowed ISO codes, and {@code limitType} is
 * {@code hard} (never exceed) or {@code soft} (aim to stay within; tolerate roughly a ±20%
 * overshoot). A save of {@code {"amount":null}} clears the budget.
 */
public record Budget(Integer amount, String currency, String limitType) {
}
