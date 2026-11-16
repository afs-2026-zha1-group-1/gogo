# Spec Delta

## ADDED Requirements

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
- **THEN** the token is extracted and the existing invitation preview and
  explicit accept flow (`#/join/<token>`) opens
- **AND** no membership is created from scanning alone

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
