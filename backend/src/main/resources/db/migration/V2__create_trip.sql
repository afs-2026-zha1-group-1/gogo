CREATE TABLE app_user (
    id           INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL
);

CREATE TABLE trip (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    destination    TEXT NOT NULL,
    start_date     TEXT NOT NULL,
    end_date       TEXT NOT NULL,
    start_location TEXT,
    end_location   TEXT,
    organizer_id   INTEGER NOT NULL REFERENCES app_user (id)
);

CREATE TABLE trip_member (
    trip_id INTEGER NOT NULL REFERENCES trip (id),
    user_id INTEGER NOT NULL REFERENCES app_user (id),
    PRIMARY KEY (trip_id, user_id)
);

INSERT INTO app_user (id, display_name) VALUES
    (1, 'Alice'),
    (2, 'Ben'),
    (3, 'Chloe'),
    (4, 'Daniel'),
    (5, 'Eve');

INSERT INTO trip (name, destination, start_date, end_date, start_location, end_location, organizer_id)
VALUES ('Singapore Friends Day', 'Singapore', '2026-12-05', '2026-12-05', 'City Hall MRT', 'Merlion Park', 1);

INSERT INTO trip_member (trip_id, user_id)
SELECT t.id, u.id
FROM trip t, app_user u
WHERE t.name = 'Singapore Friends Day' AND u.id IN (1, 2, 3, 4);