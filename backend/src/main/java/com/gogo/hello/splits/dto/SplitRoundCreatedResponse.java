package com.gogo.hello.splits.dto;

/** Response for starting a next round (US-096): the new round index plus its detail snapshot. */
public record SplitRoundCreatedResponse(int roundIndex, SplitDraftDetailResponse draft) {
}
