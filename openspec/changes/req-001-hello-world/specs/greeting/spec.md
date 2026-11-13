# Spec Delta

## Purpose

The `greeting` capability serves a persisted greeting message to the site's home
page, so that the displayed text provably comes from stored data rather than from
the frontend, and so the storage-to-browser chain can be validated end to end.

## ADDED Requirements

### Requirement: Persisted greeting storage

The system SHALL store the greeting message in an embedded database that needs no
separate database service, and SHALL create and seed that database automatically
on first start. Exactly one greeting record SHALL exist, with the message
`Hello World`.

#### Scenario: First start creates and seeds the database

- **WHEN** the backend starts and no database file exists yet
- **THEN** a database file is created
- **AND** it contains exactly one greeting record whose message is `Hello World`

#### Scenario: Later start preserves the seeded greeting

- **WHEN** the backend starts again with the database file already seeded
- **THEN** the greeting record is still present with the message `Hello World`
- **AND** no duplicate greeting record is added

### Requirement: Greeting read endpoint

The system SHALL expose `GET /api/greeting` and SHALL return the stored greeting
message as the response body. The endpoint SHALL be read-only.

#### Scenario: Stored greeting is returned

- **WHEN** a client sends `GET /api/greeting` and the seeded record is present
- **THEN** the response status is 200
- **AND** the response body is exactly `Hello World`

#### Scenario: Response reflects stored data, not a constant

- **WHEN** the stored greeting message differs from `Hello World`
- **THEN** `GET /api/greeting` returns that stored message instead

### Requirement: Home page renders the served greeting

The home page SHALL display the greeting obtained from `GET /api/greeting` and
SHALL NOT contain a hard-coded greeting text. When the greeting cannot be
obtained, the page SHALL show a load-failure message instead of a greeting.

#### Scenario: Home page shows the served greeting

- **WHEN** a visitor opens the home page and the endpoint responds successfully
- **THEN** the page displays `Hello World` as its heading
- **AND** that text was obtained from the endpoint response

#### Scenario: Backend unavailable

- **WHEN** a visitor opens the home page and the endpoint is unreachable or
  responds with a non-success status
- **THEN** the page displays a load-failure message
- **AND** the page does not display a greeting
