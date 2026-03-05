-- Access layer baseline:
-- users -> workspaces -> workspace_members
-- Designed for magic-link onboarding with automatic workspace creation.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
ON users (LOWER(email));

-- Backfill missing user rows from existing workspace memberships.
INSERT INTO users (id, email)
SELECT
  wm.user_id,
  CONCAT(wm.user_id::text, '@autogen.local')
FROM workspace_members wm
LEFT JOIN users u ON u.id = wm.user_id
WHERE u.id IS NULL;

-- Optional foreign key hardening.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_members_user_id_fkey'
  ) THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS owner_id UUID;

UPDATE workspaces w
SET owner_id = candidate.user_id
FROM (
  SELECT DISTINCT ON (wm.workspace_id)
    wm.workspace_id,
    wm.user_id
  FROM workspace_members wm
  WHERE wm.status = 'active'
  ORDER BY
    wm.workspace_id,
    CASE WHEN wm.role = 'owner' THEN 0 ELSE 1 END,
    wm.created_at ASC
) AS candidate
WHERE w.id = candidate.workspace_id
  AND w.owner_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspaces_owner_id_fkey'
  ) THEN
    ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id
ON workspaces (owner_id);

-- Keep users.updated_at fresh if shared trigger helper exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'touch_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS trg_users_touch_updated_at ON users;
    CREATE TRIGGER trg_users_touch_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;
