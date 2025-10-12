-- Migration: Multi-Bank Account Support
-- Created: 2025-10-04
-- Description: Add support for multiple bank accounts instead of single default

-- 1. Create new table for managing active bank accounts
CREATE TABLE IF NOT EXISTS cashbook_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT,
  currency_code TEXT,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- One primary account for default selection
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON cashbook_bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON cashbook_bank_accounts(is_primary);

-- 2. Add bank_account_id column to transactions
ALTER TABLE cashbook_transactions
ADD COLUMN IF NOT EXISTS bank_account_id TEXT;

-- Create index for filtering transactions by account
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON cashbook_transactions(bank_account_id);

-- 3. Add foreign key constraint (optional, for data integrity)
-- Note: We use TEXT reference instead of UUID because Zoho uses string IDs
ALTER TABLE cashbook_transactions
ADD CONSTRAINT fk_transactions_bank_account
FOREIGN KEY (bank_account_id)
REFERENCES cashbook_bank_accounts(account_id)
ON DELETE SET NULL;

-- 4. Backfill existing transactions with default bank account
-- This uses the default_bank_account_id from cashbook_zoho_config
DO $$
DECLARE
  default_account_id TEXT;
  default_account_name TEXT;
BEGIN
  -- Get default bank account from config
  SELECT default_bank_account_id, default_bank_account_name
  INTO default_account_id, default_account_name
  FROM cashbook_zoho_config
  LIMIT 1;

  -- Only proceed if default account exists
  IF default_account_id IS NOT NULL THEN
    -- Insert default account into new table (if not exists)
    INSERT INTO cashbook_bank_accounts (account_id, account_name, is_active, is_primary, display_order)
    VALUES (default_account_id, COALESCE(default_account_name, 'Default Account'), true, true, 0)
    ON CONFLICT (account_id) DO NOTHING;

    -- Backfill all existing transactions
    UPDATE cashbook_transactions
    SET bank_account_id = default_account_id
    WHERE bank_account_id IS NULL;
  END IF;
END $$;

-- 5. Add updated_at trigger for cashbook_bank_accounts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON cashbook_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Add constraint: Only one primary account allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_one_primary
ON cashbook_bank_accounts(is_primary)
WHERE is_primary = true;

-- 7. Comments for documentation
COMMENT ON TABLE cashbook_bank_accounts IS 'Stores all active bank accounts from Zoho Books that are tracked in the Cash Book app';
COMMENT ON COLUMN cashbook_bank_accounts.account_id IS 'Zoho Books bank account ID (matches account_id from Zoho API)';
COMMENT ON COLUMN cashbook_bank_accounts.is_primary IS 'Primary account used as default in transaction form';
COMMENT ON COLUMN cashbook_transactions.bank_account_id IS 'Links transaction to specific bank account';
