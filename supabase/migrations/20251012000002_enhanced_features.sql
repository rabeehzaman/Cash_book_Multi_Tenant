-- Migration: Enhanced Multi-Tenant Features
-- Created: 2025-10-12
-- Description: Invitations, Activity Logs, Categories, Enhanced Permissions

-- ============================================================================
-- 1. ENHANCED USER ROLES
-- ============================================================================

-- Update user_organizations table to support more granular roles
ALTER TABLE user_organizations DROP CONSTRAINT IF EXISTS user_organizations_role_check;
ALTER TABLE user_organizations ADD CONSTRAINT user_organizations_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Add permissions column
ALTER TABLE user_organizations ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

COMMENT ON COLUMN user_organizations.role IS 'User role: owner (full control), admin (manage users/settings), editor (add/edit transactions), viewer (read-only)';
COMMENT ON COLUMN user_organizations.permissions IS 'Additional fine-grained permissions';

-- ============================================================================
-- 2. INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(organization_id, email, status)
);

CREATE INDEX idx_invitations_org ON user_invitations(organization_id);
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_status ON user_invitations(status);

COMMENT ON TABLE user_invitations IS 'Pending invitations for users to join organizations';
COMMENT ON COLUMN user_invitations.token IS 'Unique invitation token for accepting invitation';
COMMENT ON COLUMN user_invitations.status IS 'Invitation status: pending, accepted, expired, or cancelled';

-- ============================================================================
-- 3. ACTIVITY LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

COMMENT ON TABLE activity_logs IS 'Audit trail of all actions within organizations';
COMMENT ON COLUMN activity_logs.action IS 'Action performed: created, updated, deleted, viewed, etc.';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity: transaction, user, organization, etc.';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional data about the action';

-- ============================================================================
-- 4. CATEGORIES TABLE (OPTIONAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('cash_in', 'cash_out', 'both')),
  color TEXT,
  icon TEXT,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_categories_org ON transaction_categories(organization_id);
CREATE INDEX idx_categories_type ON transaction_categories(organization_id, type);

COMMENT ON TABLE transaction_categories IS 'Optional categories for organizing transactions';
COMMENT ON COLUMN transaction_categories.is_system IS 'System categories cannot be deleted';

-- Add category reference to transactions (optional)
ALTER TABLE cashbook_transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL;
ALTER TABLE cashbook_transactions ADD COLUMN IF NOT EXISTS party_name TEXT;
ALTER TABLE cashbook_transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE cashbook_transactions ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_category ON cashbook_transactions(category_id);
CREATE INDEX idx_transactions_party ON cashbook_transactions(party_name);
CREATE INDEX idx_transactions_created_by ON cashbook_transactions(created_by);

-- ============================================================================
-- 5. UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON transaction_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES FOR NEW TABLES
-- ============================================================================

-- Invitations: Admins and owners can manage
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_can_view_invitations" ON user_invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "admins_can_create_invitations" ON user_invitations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "admins_can_update_invitations" ON user_invitations
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "admins_can_delete_invitations" ON user_invitations
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Activity Logs: Read-only for all org members, system creates them
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_org_activity" ON activity_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Categories: All can view, editors+ can manage
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_org_categories" ON transaction_categories
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "editors_can_create_categories" ON transaction_categories
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "editors_can_update_categories" ON transaction_categories
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
    AND is_system = false
  );

CREATE POLICY "admins_can_delete_categories" ON transaction_categories
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    AND is_system = false
  );

-- Update transaction policies to respect new roles
DROP POLICY IF EXISTS "users_can_insert_transactions" ON cashbook_transactions;
DROP POLICY IF EXISTS "users_can_update_transactions" ON cashbook_transactions;

CREATE POLICY "editors_can_insert_transactions" ON cashbook_transactions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "editors_can_update_transactions" ON cashbook_transactions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to log activities
CREATE OR REPLACE FUNCTION log_activity(
  p_organization_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invitation
CREATE OR REPLACE FUNCTION create_invitation(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_invited_by UUID
)
RETURNS UUID AS $$
DECLARE
  invitation_id UUID;
  invitation_token TEXT;
BEGIN
  -- Generate unique token
  invitation_token := encode(gen_random_bytes(32), 'base64');

  -- Cancel any existing pending invitations for this email
  UPDATE user_invitations
  SET status = 'cancelled'
  WHERE organization_id = p_organization_id
    AND email = p_email
    AND status = 'pending';

  -- Create new invitation
  INSERT INTO user_invitations (
    organization_id,
    email,
    role,
    invited_by,
    token
  ) VALUES (
    p_organization_id,
    p_email,
    p_role,
    p_invited_by,
    invitation_token
  ) RETURNING id INTO invitation_id;

  -- Log activity
  PERFORM log_activity(
    p_organization_id,
    p_invited_by,
    'invited_user',
    'invitation',
    invitation_id,
    jsonb_build_object('email', p_email, 'role', p_role)
  );

  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation
  SELECT * INTO invitation_record
  FROM user_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if user already in organization
  IF EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = p_user_id
      AND organization_id = invitation_record.organization_id
  ) THEN
    -- Update invitation status
    UPDATE user_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;

    RETURN true;
  END IF;

  -- Add user to organization
  INSERT INTO user_organizations (
    user_id,
    organization_id,
    role
  ) VALUES (
    p_user_id,
    invitation_record.organization_id,
    invitation_record.role
  );

  -- Update invitation status
  UPDATE user_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_record.id;

  -- Log activity
  PERFORM log_activity(
    invitation_record.organization_id,
    p_user_id,
    'accepted_invitation',
    'user',
    p_user_id,
    jsonb_build_object('role', invitation_record.role)
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role in organization
CREATE OR REPLACE FUNCTION get_user_role(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_organizations
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_user_role(p_user_id, p_organization_id);

  -- Check role hierarchy
  IF p_required_role = 'viewer' THEN
    RETURN user_role IN ('owner', 'admin', 'editor', 'viewer');
  ELSIF p_required_role = 'editor' THEN
    RETURN user_role IN ('owner', 'admin', 'editor');
  ELSIF p_required_role = 'admin' THEN
    RETURN user_role IN ('owner', 'admin');
  ELSIF p_required_role = 'owner' THEN
    RETURN user_role = 'owner';
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. DEFAULT CATEGORIES FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Insert default categories for all organizations
INSERT INTO transaction_categories (organization_id, name, type, is_system, color)
SELECT
  id as organization_id,
  category.name,
  category.type,
  true as is_system,
  category.color
FROM organizations
CROSS JOIN (
  VALUES
    ('Sales', 'cash_in', '#10b981'),
    ('Services', 'cash_in', '#06b6d4'),
    ('Other Income', 'cash_in', '#8b5cf6'),
    ('Expenses', 'cash_out', '#ef4444'),
    ('Salary', 'cash_out', '#f59e0b'),
    ('Rent', 'cash_out', '#ec4899'),
    ('Utilities', 'cash_out', '#6366f1')
) AS category(name, type, color)
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON user_invitations TO authenticated;
GRANT ALL ON transaction_categories TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
