# Spec Delta

## MODIFIED Requirements

### Requirement: Greeting read endpoint

The system SHALL expose `GET /api/greeting` and SHALL return the stored greeting
message as a JSON object with a single `message` field, served as
`application/json`. The endpoint SHALL be read-only.

#### Scenario: Stored greeting is returned

- **WHEN** a client sends `GET /api/greeting` and the seeded record is present
- **THEN** the response status is 200
- **AND** the response content type is `application/json`
- **AND** the response body is the JSON object `{"message":"Hello World"}`

#### Scenario: Response reflects stored data, not a constant

- **WHEN** the stored greeting message differs from `Hello World`
- **THEN** `GET /api/greeting` returns that stored message in the JSON `message`
  field instead