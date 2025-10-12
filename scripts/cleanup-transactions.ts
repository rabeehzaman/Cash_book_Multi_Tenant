import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  console.log('Deleting all transactions...');
  const { error: txnError, count: txnCount } = await supabase
    .from('cashbook_transactions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (txnError) {
    console.error('Error deleting transactions:', txnError);
  } else {
    console.log(`✅ Deleted ${txnCount || 'all'} transactions`);
  }

  console.log('Deleting all sync logs...');
  const { error: logError, count: logCount } = await supabase
    .from('cashbook_sync_log')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (logError) {
    console.error('Error deleting sync logs:', logError);
  } else {
    console.log(`✅ Deleted ${logCount || 'all'} sync logs`);
  }

  console.log('✅ Cleanup complete! Ready for fresh sync.');
}

cleanup();
