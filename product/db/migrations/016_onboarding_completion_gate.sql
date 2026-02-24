ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN workspace_members.onboarding_completed_at IS
  'When set, dashboard access is unlocked for this user in the workspace.';
