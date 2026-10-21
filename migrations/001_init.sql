-- 001_init.sql
-- Initial schema: users, teams, team memberships, and notes.
--
-- Conventions:
--   * ids are application-generated UUID strings
--   * timestamps are ISO-8601 UTC strings stored as TEXT
--   * notes support optimistic concurrency via `version` and soft deletes via `deleted_at`

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE teams (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  owner_id   TEXT NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL
);

CREATE TABLE team_members (
  team_id    TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  team_id    TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users (id),
  updated_by TEXT NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_teams_owner ON teams (owner_id);
CREATE INDEX idx_team_members_user ON team_members (user_id);
CREATE INDEX idx_notes_team_updated ON notes (team_id, updated_at DESC);
