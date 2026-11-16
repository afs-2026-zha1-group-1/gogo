CREATE TABLE account_credential (
    user_id       INTEGER PRIMARY KEY REFERENCES app_user (id),
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE UNIQUE INDEX uk_account_credential_email ON account_credential (email);

-- Demo-only fixture accounts (password: gogo-demo-2026). Never shown in the UI.
INSERT INTO account_credential (user_id, email, password_hash) VALUES
    (1, 'alice@example.com',  '$2a$10$OTKOwLiSBD63Usy.uUNtzu7oSgqJ/3i/.lWNhSx4nnbzvcdPnPM6W'),
    (2, 'ben@example.com',    '$2a$10$OTKOwLiSBD63Usy.uUNtzu7oSgqJ/3i/.lWNhSx4nnbzvcdPnPM6W'),
    (3, 'chloe@example.com',  '$2a$10$OTKOwLiSBD63Usy.uUNtzu7oSgqJ/3i/.lWNhSx4nnbzvcdPnPM6W'),
    (4, 'daniel@example.com', '$2a$10$OTKOwLiSBD63Usy.uUNtzu7oSgqJ/3i/.lWNhSx4nnbzvcdPnPM6W'),
    (5, 'eve@example.com',    '$2a$10$OTKOwLiSBD63Usy.uUNtzu7oSgqJ/3i/.lWNhSx4nnbzvcdPnPM6W');
