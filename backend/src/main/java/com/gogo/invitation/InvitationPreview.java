package com.gogo.invitation;

public record InvitationPreview(
        String tripName,
        String destination,
        String startDate,
        String endDate,
        boolean mainPlanConfirmed,
        long organizerId,
        long tripId,
        boolean viewerMember) {
}
