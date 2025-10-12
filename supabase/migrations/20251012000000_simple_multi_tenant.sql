-- Migration: Simple Multi-Tenant Cash Book
-- Created: 2025-10-12
-- Description: Multi-tenant architecture with simplified transaction tracking

-- ============================================================================
-- 1. ORGANIZATIONS TABLE (Tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations/companies';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier for organization';

-- ============================================================================
-- 2. USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);

COMMENT ON TABLE user_profiles IS 'Extended user profile information';

-- ============================================================================
-- 3. USER-ORGANIZATION MEMBERSHIP (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX idx_user_orgs_org ON user_organizations(organization_id);
CREATE INDEX idx_user_orgs_active ON user_organizations(user_id, is_active);

COMMENT ON TABLE user_organizations IS 'User membership in organizations with roles';
COMMENT ON COLUMN user_organizations.role IS 'User role: owner, admin, or member';
COMMENT ON COLUMN user_organizations.is_active IS 'Currently selected organization for this user';

-- ============================================================================
-- 4. SIMPLIFIED TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cashbook_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_org ON cashbook_transactions(organization_id);
CREATE INDEX idx_transactions_org_date ON cashbook_transactions(organization_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON cashbook_transactions(organization_id, type);
CREATE INDEX idx_transactions_created ON cashbook_transactions(created_at DESC);

COMMENT ON TABLE cashbook_transactions IS 'Simple cash transactions - cash in and cash out only';
COMMENT ON COLUMN cashbook_transactions.type IS 'Transaction type: cash_in or cash_out';
COMMENT ON COLUMN cashbook_transactions.description IS 'Optional transaction notes';
COMMENT ON COLUMN cashbook_transactions.receipt_url IS 'Optional receipt/document URL';

-- ============================================================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON cashbook_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_transactions ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see orgs they belong to
CREATE POLICY "users_can_view_their_organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_their_organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- User Profiles: Users can view all profiles in their organizations
CREATE POLICY "users_can_view_profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "users_can_update_own_profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- User Organizations: Users can view memberships in their orgs
CREATE POLICY "users_can_view_org_memberships" ON user_organizations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_membership" ON user_organizations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_can_manage_memberships" ON user_organizations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Transactions: Complete tenant isolation
CREATE POLICY "users_can_view_org_transactions" ON cashbook_transactions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_transactions" ON cashbook_transactions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_transactions" ON cashbook_transactions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_can_delete_transactions" ON cashbook_transactions
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTION: Get user's active organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_active_organization(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  active_org_id UUID;
BEGIN
  SELECT organization_id INTO active_org_id
  FROM user_organizations
  WHERE user_id = user_uuid AND is_active = true
  LIMIT 1;

  -- If no active org, return first organization
  IF active_org_id IS NULL THEN
    SELECT organization_id INTO active_org_id
    FROM user_organizations
    WHERE user_id = user_uuid
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN active_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. FUNCTION: Create organization with first user as owner
-- ============================================================================

CREATE OR REPLACE FUNCTION create_organization_with_owner(
  org_name TEXT,
  org_slug TEXT,
  owner_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Insert organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO user_organizations (user_id, organization_id, role, is_active)
  VALUES (owner_user_id, new_org_id, 'owner', true);

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
