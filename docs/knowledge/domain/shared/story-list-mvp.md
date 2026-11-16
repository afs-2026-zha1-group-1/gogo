# Shared Trip App - Must-Have MVP Story List

This list retains the agreed core journey and its reliability safeguards. Optional enhancements are listed in [backlog-good-to-have.md](backlog-good-to-have.md). Original story IDs are preserved so removed stories leave numbering gaps. Optional budget entry means a traveler may omit a budget, not that budget support is outside MVP.

There are 21 user stories left in story-list-mvp.md, across 8 categories.


--> create a dashboard UI
--> database can separate and be a separted story 



## 1. Trip Setup and Basic Information

### US-001: Create a Shared Trip
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Write)
As a traveler, I would like to create a named trip with a destination, valid dates, and start and end locations, so that I have a shared space to organize our journey.

### US-002: View Trip Details
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read)
As a trip member, I would like to view the saved trip name, destination, dates, and start and end locations, so that I know which journey we are planning.

## 2. Invitations and Joining

### US-008: Share a Trip Invitation
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip organizer, I would like to obtain and share an invitation link, so that my friends can join the correct trip.

### US-010: Join an Invited Trip
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As an invited traveler, I would like to see the trip name and accept a valid invitation before main-plan confirmation and join once under my identity, so that I can join the correct trip without duplicate memberships.

### US-012: Recognize an Unusable Invitation
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read)
As an invited traveler, I would like to be told when an invitation is invalid or revoked without seeing private trip data, so that I know the link cannot be used to join.

## 3. Members, Readiness, and Access Control

### US-013: View Trip Members
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read)
As a trip member, I would like to see who has joined and who is the organizer, so that I know who is traveling with me and who manages shared decisions.

## 4. Personal Preferences and Constraints

### US-019: Select My Interests
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip member, I would like to save interests from a predefined list without duplicates, so that suggested activities reflect what I enjoy.

### US-020: Manage My Must-Do Activities
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip member, I would like to add, change, or remove must-do activities and their locations or fixed times, so that important experiences are considered accurately.

### US-024: Set My Trip Budget
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip member, I would like to save an optional nonnegative per-person whole-trip budget with its currency and hard or soft limit, so that plans can check known costs against my spending needs.

### US-026: Submit My Preferences
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip member, I would like to submit my saved preferences and be marked ready, so that the group can use my input for planning.

### US-027: Choose No Preference
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip member, I would like to explicitly choose no preference instead of completing preference fields, so that planning can proceed with defaults without treating my silence as consent.

## 5. Main Itinerary Generation and Review

### US-031: Generate a Shared Main Plan
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip organizer, I would like to generate a timed main plan from ready members' interests and constraints, so that we have a suitable starting itinerary.

### US-037: Confirm the Main Plan
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip organizer, I would like to confirm a current main draft only after schedule and hard-constraint validation, so that everyone follows the same feasible version rather than a stale proposal.

## 6. Split Setup and Group Selections

### US-038: Start a Split Draft
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip member, I would like to start the trip's single split draft from a confirmed main plan before or during travel, so that different interests can be accommodated without creating competing splits.

### US-039: Select Split Boundaries
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a split initiator, I would like to select departure and reunion nodes with a positive usable time window, so that both routes have fixed locations and a clear reunion deadline.


### US-042: Generate Group-Specific Routes
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a split initiator, I would like to generate one route per group using its members' preferences and fixed split boundaries, so that both groups receive suitable separate activities.

### US-043: Check the Reunion Travel Window
**Required layers:** Frontend: Yes | Backend: Yes | Database: No (Validate supplied snapshot)
As a trip member, I would like to have both routes checked for activity time, all travel legs, and a buffer within the split window, so that we can reach the reunion point by the deadline.


### US-049: Confirm the Split
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip organizer, I would like to confirm the current route pair and assignments together after server-side revalidation, so that both groups follow one feasible agreement with locked boundaries.

### US-050: Cancel an Unconfirmed Split
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a split initiator, I would like to cancel my unconfirmed draft, so that the group can abandon that proposal and start a replacement without changing the main plan.


## 9. Reunion, Directions, and Shared Continuation

### US-054: Open Directions to Reunion
**Required layers:** Frontend: Yes | Backend: No (External map app) | Database: No (Reuse loaded reunion details)
As a trip member, I would like to open map directions to the confirmed reunion point without tracking other members, so that I can find my way back while preserving their privacy.

## 10. Trip Completion and Final Records

### US-058: Complete the Shared Trip
**Required layers:** Frontend: Yes | Backend: Yes | Database: Yes (Read/Write)
As a trip organizer, I would like to mark the trip completed once any confirmed split is resolved, so that everyone knows our shared journey has ended.

