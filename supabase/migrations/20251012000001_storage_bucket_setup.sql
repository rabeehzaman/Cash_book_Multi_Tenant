-- Storage Bucket Setup for Cash Book Receipts
-- Note: Run this after creating the 'cashbook_receipts' bucket via Supabase Dashboard
-- Dashboard -> Storage -> Create Bucket -> Name: cashbook_receipts, Public: true

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload receipts to their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can view org receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete org receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;

-- Policy: Users can upload receipts for their organization
CREATE POLICY "Users can upload receipts to their org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cashbook_receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view receipts from their organization
CREATE POLICY "Users can view org receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'cashbook_receipts'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_organizations
      WHERE user_id = auth.uid()
    )
    OR bucket_id = 'cashbook_receipts' -- Allow public access since bucket is public
  )
);

-- Policy: Admins can delete receipts from their organization
CREATE POLICY "Users can delete org receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cashbook_receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Public read access policy (since bucket is public)
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'cashbook_receipts');
