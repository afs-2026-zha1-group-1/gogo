# Spec Delta — invitations (us-083-085-trip-details)

## ADDED Requirements

### Requirement: Invitation page entry

The trip detail page SHALL expose an invitation entry as a person-shaped icon
in the top-right of its app bar, navigating to a dedicated full-screen
invitation page at `#/trips/<id>/invitation` without the bottom dock. For the
organizer, the page SHALL show the trip's invitation QR code and join link with
a copy control, reusing the existing issuance contract, and a back control
returning to the same trip's detail page. A non-organizer SHALL see a
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

- **WHEN** the organizer leaves and re-enters the invitation page
- **THEN** the same invitation token and link are shown
- **AND** no additional invitation is created

#### Scenario: Back returns to the same trip detail

- **WHEN** the organizer activates the back control on the invitation page
- **THEN** the route returns to the same trip's detail page
- **AND** the detail page renders its ready state

#### Scenario: Non-organizer sees a permission state without the link

- **WHEN** Ben, a member but not the organizer, opens the invitation page
- **THEN** the page shows a permission or unavailable state
- **AND** no invitation link, token or QR payload is displayed

#### Scenario: Copy control copies the join link

- **WHEN** the organizer activates the copy control on the invitation page
- **THEN** the join link is copied to the clipboard
- **AND** no server-side mutation beyond the existing issuance contract occurs