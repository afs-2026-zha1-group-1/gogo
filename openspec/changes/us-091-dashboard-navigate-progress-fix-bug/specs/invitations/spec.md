## MODIFIED Requirements

### Requirement: Invitation issuance

The system SHALL expose `POST /api/trips/{id}/invitation` under the trip
caller-identity contract, with the caller derived from the authenticated session.
It SHALL hold at most one invitation per trip, created by a member's first call
with an opaque token and returned unchanged to later member calls. The response
SHALL carry the token and the join path. A non-member SHALL be denied without
receiving a token or creating an invitation. A request without a valid session
SHALL return 401 `USER_REQUIRED` and create nothing.

#### Scenario: Organizer obtains an invitation

- **WHEN** Alice, authenticated as the organizer of `Singapore Friends Day` whose main plan is unconfirmed, requests an invitation for that trip
- **THEN** the response status is 200
- **AND** the response carries a `token` and a `joinPath` of the form `/join/<token>`
- **AND** exactly one invitation is stored for that trip

#### Scenario: Repeated issuance returns the same invitation

- **WHEN** the authenticated organizer requests an invitation for the same trip again
- **THEN** the response status is 200 with the same `token`
- **AND** still exactly one invitation is stored for that trip

#### Scenario: A member who is not the organizer is denied

The historical scenario name is retained for compatibility; the member is now authorized.

- **WHEN** Ben, authenticated as a member but not the organizer, requests an invitation for the trip
- **THEN** the response status is 200 with the trip's existing token, or creates its only invitation if none exists
- **AND** subsequent organizer and member requests return that same token

#### Scenario: A non-member is denied

- **WHEN** an authenticated non-member requests an invitation
- **THEN** the response status is 403 without the invitation token
- **AND** no invitation is created

#### Scenario: Caller identity is missing or unknown

- **WHEN** an issuance request carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no invitation is created

#### Scenario: An unknown trip id is reported

- **WHEN** an authenticated caller requests an invitation for a trip id that does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`

### Requirement: Invitation page entry

The trip detail page SHALL expose an invitation entry as a person-shaped icon
in the top-right of its app bar, navigating to a dedicated full-screen
invitation page at `#/trips/<id>/invitation` without the bottom dock. Trip
members SHALL see the trip's invitation QR code and join link with a copy
control, reusing the existing issuance contract, and a back control returning
to the same trip's detail page. Non-members SHALL see a permission or
unavailable state without the invitation link or QR payload. No new endpoint,
expiry, revocation or share-channel behavior is added.

#### Scenario: Organizer opens the invitation page from the detail app bar

- **WHEN** Alice, the organizer, activates the person-shaped icon in the trip detail app bar
- **THEN** the route changes to `#/trips/<id>/invitation` without a full page reload
- **AND** the page shows the invitation QR code and the join link with a copy control

#### Scenario: Repeated entry shows the same invitation

- **WHEN** a member leaves and re-enters the invitation page
- **THEN** the same invitation token and link are shown
- **AND** no additional invitation is created

#### Scenario: Back returns to the same trip detail

- **WHEN** a member activates the back control on the invitation page
- **THEN** the route returns to the same trip's detail page
- **AND** the detail page renders its ready state

#### Scenario: Non-organizer sees a permission state without the link

The historical scenario name is retained for compatibility; the member can now share.

- **WHEN** Ben, a member but not the organizer, opens the invitation page or the embedded invitation panel
- **THEN** the link, QR code and copy control are available
- **AND** the token is the same one available to the organizer

#### Scenario: Non-member sees a permission state without the link

- **WHEN** a non-member opens the invitation page
- **THEN** the page shows a permission or unavailable state
- **AND** no invitation link, token or QR payload is displayed

#### Scenario: Copy control copies the join link

- **WHEN** a member activates the copy control on the invitation page
- **THEN** the join link is copied to the clipboard
- **AND** no server-side mutation beyond the existing issuance contract occurs
