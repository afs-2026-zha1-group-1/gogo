-- US-019 personal default interests (per user, prototype). One row per user; `payload` holds
-- {"codes":[...]}. This is a *default* only — it is pre-selected on a trip's preferences page but
-- never written into that trip's member_preference rows (the owner chose "pre-select, not persist").
CREATE TABLE IF NOT EXISTS user_default_interest (
    user_id    INTEGER PRIMARY KEY REFERENCES app_user (id),
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
