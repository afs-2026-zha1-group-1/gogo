# Spec Delta

## ADDED Requirements

### Requirement: QR-code invitation scanner

The frontend SHALL provide a scanner screen at `#/scan` that decodes QR codes
from a camera stream or image file. Decoded text matching `/join/<token>` SHALL
route to the existing Join page without creating a membership from scanning
alone; non-matching text SHALL be rejected without navigation. Camera access
SHALL be deferred until the user starts scanning and released on leave.

#### Scenario: Camera permission deferred until explicit start

- **GIVEN** a traveler opens the scanner screen
- **WHEN** they have not tapped "Start camera"
- **THEN** no camera permission request is made

#### Scenario: Camera released on close or navigation away

- **GIVEN** a traveler has an active camera stream in the scanner
- **WHEN** they close the scanner or navigate away
- **THEN** all camera tracks are stopped and the stream is released

#### Scenario: Valid invitation QR routes to existing preview and accept flow

- **GIVEN** a traveler scanning with an active camera
- **WHEN** a QR code encoding a URL matching `/join/<token>` is recognized
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
- **WHEN** a QR code whose decoded text does not match the `/join/<token>`
  pattern is recognized
- **THEN** the code is rejected with an "unrecognized" indication
- **AND** no navigation or API call is made to the decoded content

#### Scenario: Camera unavailable provides retry and link fallback

- **GIVEN** a traveler attempting to scan
- **WHEN** camera permission is denied, the camera hardware is unavailable, or
  the QR code is unreadable
- **THEN** a recoverable error state is displayed with a retry action
- **AND** an invitation-link text input is available as a manual fallback

#### Scenario: Image-file QR decoding uses the same validation

- **GIVEN** a traveler who selects "Choose image" and picks a photo containing
  a QR code
- **WHEN** the QR is decoded successfully
- **THEN** the same `/join/<token>` URL validation and routing rules apply as
  for camera scanning

#### Scenario: Manual invitation-link input routes after validation

- **GIVEN** a traveler who types or pastes a URL into the invitation-link
  fallback input
- **WHEN** they submit the link and it matches the `/join/<token>` pattern
- **THEN** the token is extracted and the existing Join page opens
- **AND** a non-matching URL is rejected with an unrecognized indication
  without navigation
