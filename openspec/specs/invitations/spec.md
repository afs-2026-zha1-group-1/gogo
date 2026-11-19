# invitations Specification

## Purpose
Let a trip organizer share one invitation link (and a QR encoding the same URL)
so invited travelers can preview the trip's public basics and join once under
their identity, while joining closes at main-plan confirmation and unknown links
fail closed without exposing private trip data.
## Requirements
### Requirement: Invitation issuance

The system SHALL expose `POST /api/trips/{id}/invitation` under the trip
caller-identity contract, with the caller derived from the authenticated session.
It SHALL hold at most one invitation per trip, created by a member's first call
with an opaque token and returned unchanged to later member calls. The response
SHALL carry the token and the join path. A non-member SHALL be denied without
receiving a token or creating an invitation. A request without a valid session
SHALL return 401 `USER_REQUIRED` and create nothing.

#### Scenario: Organizer obtains an invitation

- **WHEN** Alice, authenticated as the organizer of `Singapore Friends Day` whose
  main plan is unconfirmed, requests an invitation for that trip
- **THEN** the response status is 200
- **AND** the response carries a `token` and a `joinPath` of the form
  `/join/<token>`
- **AND** exactly one invitation is stored for that trip

#### Scenario: Repeated issuance returns the same invitation

- **WHEN** the authenticated organizer requests an invitation for the same trip
  again
- **THEN** the response status is 200 with the same `token`
- **AND** still exactly one invitation is stored for that trip

#### Scenario: A member who is not the organizer is denied

场景名称保留历史命名；非组织者成员现已获授权。

- **WHEN** Ben, authenticated as a member but not the organizer, requests an
  invitation for the trip
- **THEN** the response status is 200 with the existing token, or creates the only invitation if none exists
- **AND** subsequent organizer and member requests return the same token

#### Scenario: A non-member is denied

- **WHEN** 已认证的非成员请求邀请
- **THEN** 返回 403 且不返回令牌
- **AND** 不创建邀请

#### Scenario: Caller identity is missing or unknown

- **WHEN** an issuance request carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no invitation is created

#### Scenario: An unknown trip id is reported

- **WHEN** an authenticated caller requests an invitation for a trip id that
  does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`

### Requirement: Invitation preview

The system SHALL expose `GET /api/invitations/{token}` without requiring caller
identity. For a known token it SHALL return the trip name, destination, start
date, end date, whether the trip's main plan is currently confirmed and whether
joining is closed. Joining SHALL close when the main plan is first confirmed
and SHALL remain closed after later planning-basics edits that reset the plan
to unconfirmed; `joiningClosed` SHALL therefore be reported separately from
`mainPlanConfirmed`. The preview SHALL NOT return member, itinerary or
preference data. For an unknown token it SHALL return the unusable-invitation
outcome defined by the Unusable invitation requirement.

#### Scenario: Preview shows the public basics before acceptance

- **WHEN** a valid token for `Singapore Friends Day` is previewed while the main plan is unconfirmed and joining is open
- **THEN** the response status is 200
- **AND** the response carries `tripName` equal to `Singapore Friends Day`, `destination` equal to `Singapore`, `startDate` equal to `2026-12-05`, `endDate` equal to `2026-12-05`, `mainPlanConfirmed` equal to false and `joiningClosed` equal to false
- **AND** the response carries no member, itinerary or preference field

#### Scenario: Preview after confirmation reports joining closed

- **WHEN** the same token is previewed after the trip's main plan is confirmed
- **THEN** the response status is 200
- **AND** `mainPlanConfirmed` is true and `joiningClosed` is true
- **AND** the response still carries only the public basics

#### Scenario: Preview after a planning edit keeps joining closed

- **GIVEN** the main plan was confirmed, then a planning-basics edit reset it to unconfirmed
- **WHEN** the same token is previewed
- **THEN** the response status is 200
- **AND** `mainPlanConfirmed` is false
- **AND** `joiningClosed` is true
- **AND** the public basics show the edited name, destination and dates

### Requirement: Invitation acceptance and joining

The system SHALL expose `POST /api/invitations/{token}/accept` under the trip
caller-identity contract, with the caller derived from the authenticated
session. Acceptance SHALL record the caller as a member exactly once and SHALL
report the joined state on repeats without a second membership. While
`joiningClosed` is true, acceptance by a non-member SHALL be rejected with the
member list unchanged; `joiningClosed` becomes true when the main plan is first
confirmed and remains true after later planning-basics edits. An unknown token
SHALL return the unusable-invitation outcome. A request without a valid session
SHALL return 401 `USER_REQUIRED` and create no membership.

#### Scenario: An invited outsider joins once

- **WHEN** Eve, authenticated and not a member, accepts a valid invitation to `Singapore Friends Day` while the main plan is unconfirmed and joining is open
- **THEN** the response status is 200 and reports joined
- **AND** a membership of Eve in that trip is stored
- **AND** `GET /api/trips/{id}` for that trip returns 200 for Eve's session

#### Scenario: Double acceptance yields exactly one membership

- **WHEN** Eve submits acceptance twice under the same authenticated account
- **THEN** both responses report joined
- **AND** exactly one membership of Eve in that trip is stored

#### Scenario: An existing member accepts again with joining open or closed

- **WHEN** Ben, already a member and authenticated, accepts the invitation before or after main-plan confirmation
- **THEN** the response status is 200 and reports joined with an already-member indication
- **AND** no additional membership row is created

#### Scenario: Acceptance after main-plan confirmation is rejected

- **WHEN** the trip's main plan is confirmed and Eve, authenticated and not a member, accepts an otherwise valid invitation
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `JOINING_CLOSED`
- **AND** the stored member list is unchanged

#### Scenario: Acceptance stays closed after a planning edit

- **GIVEN** the main plan was confirmed, then a planning-basics edit reset it to unconfirmed and `joiningClosed` remained true
- **WHEN** Eve, authenticated and not a member, accepts the invitation
- **THEN** the response status is 403 with `code` equal to `JOINING_CLOSED`
- **AND** the stored member list is unchanged

#### Scenario: Caller identity is missing or unknown

- **WHEN** an acceptance request carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no membership is created

#### Scenario: Identity errors take precedence over an invalid token

- **WHEN** an acceptance request has no valid session and a token that refers to no invitation
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no membership is created

### Requirement: Unusable invitation

For an unknown token, preview and acceptance SHALL return 404 with `code` equal
to `INVITATION_NOT_FOUND`, no trip values and no membership created or revealed.
The outcome SHALL NOT distinguish why the token is unusable. Acceptance SHALL
validate caller identity first; this 404 applies only to a known caller. Preview
SHALL remain identity-free.

#### Scenario: Previewing an invalid invitation exposes nothing

- **WHEN** a token that refers to no invitation is previewed
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `INVITATION_NOT_FOUND`
- **AND** the response body contains none of the trip's field values

#### Scenario: Accepting an invalid invitation creates nothing

- **WHEN** Eve, authenticated, accepts a token that refers to no invitation
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `INVITATION_NOT_FOUND`
- **AND** no membership is created

#### Scenario: An unauthenticated acceptance is rejected before the token is read

- **WHEN** an acceptance request for an unknown token carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no invitation outcome or membership is revealed

### Requirement: Invitation page entry

The trip detail page SHALL expose an invitation entry as a person-shaped icon
in the top-right of its app bar, navigating to a dedicated full-screen
invitation page at `#/trips/<id>/invitation` without the bottom dock. Trip
members SHALL see the trip's invitation QR code and join link with a copy
control, reusing the existing issuance contract, and a back control returning
to the same trip's detail page. A non-member SHALL see a
permission or unavailable state without the invitation link or QR payload. No
backend endpoint, expiry, revocation or share-channel behavior is added
(deviation D-1: prototype extras are out of scope).

#### Scenario: Organizer opens the invitation page from the detail app bar

- **WHEN** Alice, the organizer, activates the person-shaped icon in the trip
  detail app bar
- **THEN** the route changes to `#/trips/<id>/invitation` without a full page
  reload
- **AND** the page shows the invitation QR code and the join link with a copy
  control

#### Scenario: Repeated entry shows the same invitation

- **WHEN** a member leaves and re-enters the invitation page
- **THEN** the same invitation token and link are shown
- **AND** no additional invitation is created

#### Scenario: Back returns to the same trip detail

- **WHEN** a member activates the back control on the invitation page
- **THEN** the route returns to the same trip's detail page
- **AND** the detail page renders its ready state

#### Scenario: Non-organizer sees a permission state without the link

场景名称保留历史命名；非组织者成员现已可分享邀请。

- **WHEN** Ben 是成员但不是组织者，并打开邀请页或嵌入式邀请面板
- **THEN** 可以使用邀请链接、二维码和复制控件
- **AND** 令牌与组织者可用的令牌相同

#### Scenario: Non-member sees a permission state without the link

- **WHEN** 非成员打开邀请页
- **THEN** 页面显示无权限或不可用状态
- **AND** 不显示邀请链接、令牌或二维码内容

#### Scenario: Copy control copies the join link

- **WHEN** a member activates the copy control on the invitation page
- **THEN** the join link is copied to the clipboard
- **AND** no server-side mutation beyond the existing issuance contract occurs

### Requirement: QR-code invitation scanner

The frontend SHALL provide a full-screen scanner screen at `#/scan` that
decodes QR codes from a camera stream or image file. Decoded text SHALL be
treated as a gogo invitation only when it carries the complete join hash form
`#/join/<token>`, where `<token>` is a 32-character lowercase hexadecimal
segment. An absolute URL SHALL be accepted only when its origin equals the
current app origin; a relative or hash-only form SHALL always be accepted; any
other origin SHALL be rejected as unrelated. A recognized token SHALL route to
the existing Join page without creating a membership from scanning alone;
non-matching text SHALL be rejected without navigation. Camera access SHALL be
deferred until the user starts scanning and released on leave, and closing the
scanner SHALL return to the route it was opened from, falling back to `#/`
when no in-app history exists.

#### Scenario: Camera permission deferred until explicit start

- **GIVEN** a traveler opens the scanner screen
- **WHEN** they have not tapped the primary 开始扫描 action
- **THEN** no camera permission request is made

#### Scenario: Camera released on close or navigation away

- **GIVEN** a traveler has an active camera stream in the scanner
- **WHEN** they close the scanner or navigate away
- **THEN** all camera tracks are stopped and the stream is released

#### Scenario: Valid invitation QR routes to existing preview and accept flow

- **GIVEN** a traveler scanning with an active camera
- **WHEN** a QR code encoding a URL that carries the complete `#/join/<token>`
  form is recognized
- **THEN** the token is extracted and the Join page (`#/join/<token>`) opens
- **AND** a signed-in viewer who is not yet a member sees the preview and
  explicit accept flow
- **AND** no membership is created from scanning alone

#### Scenario: Existing member scanning lands on the already-in-team notice

- **GIVEN** a signed-in traveler who is already a member of the invited trip
- **WHEN** a valid invitation QR or link opens the Join page
- **THEN** the page lands directly on the already-in-team notice (enter-trip /
  back-to-scan actions) without the preview/accept surface
- **AND** the organizer sees the organizer wording (creator of the trip, no
  need to join) instead of the member wording
- **AND** guests and non-members keep the public preview unchanged; the
  preview carries `tripId` and `viewerMember` for signed-in viewers only as
  far as membership of the viewer themselves is concerned (2026-11-17 revision)

#### Scenario: Invalid, revoked, or closed invitation follows existing rules

- **GIVEN** a traveler using the scanner
- **WHEN** a QR code encoding an invitation URL for an invalid, revoked, or
  closed invitation is recognized and the traveler proceeds to the Join page
- **THEN** the existing invitation rules apply (unusable outcome, joining-closed
  rejection) without exposing private trip data

#### Scenario: Unrelated QR code rejected without navigation

- **GIVEN** a traveler using the scanner
- **WHEN** a QR code whose decoded text does not carry the complete
  `#/join/<token>` form is recognized
- **THEN** the code is rejected with an "unrecognized" indication
- **AND** no navigation or API call is made to the decoded content

#### Scenario: Camera unavailable provides retry and link fallback

- **GIVEN** a traveler attempting to scan
- **WHEN** camera permission is denied, the camera hardware is unavailable, or
  the QR code is unreadable
- **THEN** a recoverable error state is displayed with a retry action
- **AND** an invitation-link text input is available as a manual fallback

#### Scenario: Image-file QR decoding uses the same validation

- **GIVEN** a traveler who selects the secondary 从相册选择 action and picks a
  photo containing a QR code
- **WHEN** the QR is decoded successfully
- **THEN** the same `#/join/<token>` validation and routing rules apply as for
  camera scanning

#### Scenario: Manual invitation-link input routes after validation

- **GIVEN** a traveler who types or pastes a URL into the invitation-link
  fallback input
- **WHEN** they submit the link and it carries the `#/join/<token>` form with a
  32-character hexadecimal token
- **THEN** the token is extracted and the existing Join page opens
- **AND** a non-matching URL or token is rejected with an unrecognized
  indication without navigation

#### Scenario: Cross-origin invitation link is rejected

- **GIVEN** a traveler scans a QR code encoding
  `https://another-host.example/#/join/<token>`
- **WHEN** the decoded absolute URL origin differs from the current app origin
- **THEN** the code is rejected with an "unrecognized" indication
- **AND** no navigation and no API call are made to the decoded content

#### Scenario: Scanner screen follows the design basis

- **GIVEN** a traveler opens `#/scan`
- **THEN** the screen shows an app bar with the title 扫码加入行程 and a close
  control, a camera preview area, a primary 开始扫描 action, a secondary
  从相册选择 action, and an invitation-link input with a 预览邀请 action
- **AND** the layout uses the existing `app.css` tokens and Ant Design
  interaction patterns, because no scanner screen exists in the
  `ui-design-reference` prototype or screenshots
- **AND** an error state replaces the preview with a recoverable message, a
  retry action and the same invitation-link input
