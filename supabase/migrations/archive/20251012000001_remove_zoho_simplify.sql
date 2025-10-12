-- Migration: Remove Zoho Integration and Simplify to Basic Cash Book
-- Created: 2025-10-12
-- Description: Remove all Zoho-specific tables, columns, and constraints

-- 1. Drop Zoho-specific tables
DROP TABLE IF EXISTS cashbook_sync_log CASCADE;
DROP TABLE IF EXISTS cashbook_bank_accounts CASCADE;
DROP TABLE IF EXISTS cashbook_zoho_config CASCADE;

-- 2. Remove Zoho-specific columns from cashbook_transactions
ALTER TABLE cashbook_transactions
DROP COLUMN IF EXISTS zoho_synced,
DROP COLUMN IF EXISTS zoho_expense_id,
DROP COLUMN IF EXISTS zoho_bill_id,
DROP COLUMN IF EXISTS zoho_vendor_payment_id,
DROP COLUMN IF EXISTS zoho_invoice_id,
DROP COLUMN IF EXISTS zoho_customer_payment_id,
DROP COLUMN IF EXISTS sync_error,
DROP COLUMN IF EXISTS zoho_transaction_id,
DROP COLUMN IF EXISTS transaction_source,
DROP COLUMN IF EXISTS zoho_transaction_type,
DROP COLUMN IF EXISTS last_modified_time,
DROP COLUMN IF EXISTS bank_account_id;

-- 3. Simplify transaction type constraint to just cash_in and cash_out
ALTER TABLE cashbook_transactions
DROP CONSTRAINT IF EXISTS cashbook_transactions_type_check;

ALTER TABLE cashbook_transactions
ADD CONSTRAINT cashbook_transactions_type_check
CHECK (type IN ('cash_in', 'cash_out'));

-- 4. Update cashbook_categories to support simple types
-- (Already has the right structure, just ensure constraint is correct)
ALTER TABLE cashbook_categories
DROP CONSTRAINT IF EXISTS cashbook_categories_type_check;

ALTER TABLE cashbook_categories
ADD CONSTRAINT cashbook_categories_type_check
CHECK (type IN ('cash_in', 'cash_out', 'both'));

-- 5. Add comments for documentation
COMMENT ON TABLE cashbook_transactions IS 'Simple cash book transactions - cash in and cash out only';
COMMENT ON COLUMN cashbook_transactions.type IS 'Transaction type: cash_in or cash_out';
COMMENT ON COLUMN cashbook_transactions.category IS 'Transaction category (e.g., Sales, Expenses, Salary)';
COMMENT ON COLUMN cashbook_transactions.party_name IS 'Name of person/company involved in transaction';
COMMENT ON COLUMN cashbook_transactions.description IS 'Optional notes about the transaction';
COMMENT ON COLUMN cashbook_transactions.receipt_url IS 'Optional receipt/document image URL';

-- 6. Create index on transaction_date for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON cashbook_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON cashbook_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON cashbook_transactions(category);
