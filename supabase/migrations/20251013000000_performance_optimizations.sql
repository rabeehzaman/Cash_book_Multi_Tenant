-- Migration: Performance Optimizations
-- Created: 2025-10-13
-- Description: Add indexes, balance calculation function, and optimize queries

-- ============================================================================
-- 1. PERFORMANCE INDEXES FOR RLS POLICIES
-- ============================================================================

-- Index for faster RLS policy evaluation on user_organizations
CREATE INDEX IF NOT EXISTS idx_user_orgs_user_active
  ON user_organizations(user_id, is_active, organization_id);

-- Composite index for transaction queries with organization and date
CREATE INDEX IF NOT EXISTS idx_transactions_org_date_type
  ON cashbook_transactions(organization_id, transaction_date DESC, type);

-- Index for auth.uid() lookups in RLS policies
CREATE INDEX IF NOT EXISTS idx_user_orgs_org_user
  ON user_organizations(organization_id, user_id);

-- ============================================================================
-- 2. EFFICIENT BALANCE CALCULATION FUNCTION
-- ============================================================================

-- Function to calculate balance for an organization efficiently
CREATE OR REPLACE FUNCTION calculate_balance(
  p_organization_id UUID,
  p_type TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  cash_in NUMERIC,
  cash_out NUMERIC,
  net_balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) as cash_in,
    COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) as cash_out,
    COALESCE(
      SUM(CASE WHEN type = 'cash_in' THEN amount ELSE -amount END),
      0
    ) as net_balance
  FROM cashbook_transactions
  WHERE organization_id = p_organization_id
    AND (p_type IS NULL OR type = p_type)
    AND (p_start_date IS NULL OR transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR transaction_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION calculate_balance IS 'Efficiently calculate cash in, cash out, and net balance for an organization';

-- ============================================================================
-- 3. MATERIALIZED VIEW FOR USER ORGANIZATION MEMBERSHIP (OPTIONAL)
-- ============================================================================

-- Create a materialized view for faster RLS policy checks
-- This is optional but can significantly speed up RLS policy evaluation
CREATE MATERIALIZED VIEW IF NOT EXISTS user_org_membership AS
SELECT
  uo.user_id,
  uo.organization_id,
  uo.role,
  uo.permissions,
  uo.is_active,
  o.name as organization_name,
  o.slug as organization_slug
FROM user_organizations uo
JOIN organizations o ON o.id = uo.organization_id;

-- Add indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_org_membership_user_org
  ON user_org_membership(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_user_org_membership_user_active
  ON user_org_membership(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_org_membership_org
  ON user_org_membership(organization_id);

COMMENT ON MATERIALIZED VIEW user_org_membership IS 'Cached user-organization memberships for faster RLS policy evaluation';

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_org_membership()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_org_membership;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh materialized view when user_organizations changes
DROP TRIGGER IF EXISTS refresh_user_org_membership_trigger ON user_organizations;
CREATE TRIGGER refresh_user_org_membership_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_organizations
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_user_org_membership();

-- ============================================================================
-- 4. OPTIMIZE ACTIVITY LOGGING (MAKE IT NON-BLOCKING)
-- ============================================================================

-- Update log_activity function to be faster and non-blocking
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
  -- Insert activity log without waiting for confirmation
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

  -- Return immediately without waiting
  RETURN log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- If logging fails, don't block the main operation
    -- Just log the error and return NULL
    RAISE WARNING 'Activity log failed: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_activity IS 'Non-blocking activity logging that does not fail main operations';

-- ============================================================================
-- 5. HELPER FUNCTION: GET USER'S ACTIVE ORGANIZATION WITH ROLE
-- ============================================================================

-- Optimized function to get user's active organization with role in one query
CREATE OR REPLACE FUNCTION get_user_active_org_with_role(user_uuid UUID)
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  user_role TEXT,
  permissions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    uo.role as user_role,
    uo.permissions
  FROM user_organizations uo
  JOIN organizations o ON o.id = uo.organization_id
  WHERE uo.user_id = user_uuid
    AND uo.is_active = true
  LIMIT 1;

  -- If no active org found, return first organization
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      o.id as organization_id,
      o.name as organization_name,
      o.slug as organization_slug,
      uo.role as user_role,
      uo.permissions
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = user_uuid
    ORDER BY uo.created_at ASC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_active_org_with_role IS 'Efficiently get user active organization with role and permissions in one query';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION calculate_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_org_with_role TO authenticated;
GRANT SELECT ON user_org_membership TO authenticated;

-- ============================================================================
-- 7. ANALYZE TABLES FOR BETTER QUERY PLANNING
-- ============================================================================

ANALYZE user_organizations;
ANALYZE organizations;
ANALYZE cashbook_transactions;
ANALYZE activity_logs;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
