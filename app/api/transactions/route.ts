import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema - enhanced with optional category and party
const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['cash_in', 'cash_out']),
  transaction_date: z.string().optional(), // ISO date string (YYYY-MM-DD)
  description: z.string().optional(),
  receipt_url: z.string().optional(),
  category_id: z.string().uuid().optional(),
  party_name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get user's active organization
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    // Extract data from FormData
    const type = formData.get('type') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const transaction_date = formData.get('transaction_date') as string || undefined;
    const description = formData.get('description') as string || undefined;
    const category_id = formData.get('category_id') as string || undefined;
    const party_name = formData.get('party_name') as string || undefined;
    const receiptFile = formData.get('receipt') as File | null;

    // Upload receipt to Supabase if present
    let receipt_url: string | undefined;
    if (receiptFile && receiptFile.size > 0) {
      const fileName = `${membership.organization_id}/${Date.now()}-${receiptFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('cashbook_receipts')
        .upload(fileName, receiptFile);

      if (uploadError) {
        console.error('Receipt upload error:', uploadError);
        throw new Error('Failed to upload receipt');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('cashbook_receipts')
        .getPublicUrl(fileName);
      receipt_url = publicUrl;
    }

    // Validate request data
    const validatedData = transactionSchema.parse({
      type,
      amount,
      transaction_date: transaction_date || undefined,
      description,
      receipt_url,
      category_id: category_id || undefined,
      party_name: party_name || undefined,
    });

    // Create transaction in database with organization_id
    const { data: transaction, error: dbError } = await supabase
      .from('cashbook_transactions')
      .insert({
        organization_id: membership.organization_id,
        amount: validatedData.amount,
        type: validatedData.type,
        transaction_date: validatedData.transaction_date || new Date().toISOString().split('T')[0],
        description: validatedData.description,
        receipt_url: validatedData.receipt_url,
        category_id: validatedData.category_id || null,
        party_name: validatedData.party_name || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    // Log activity (non-blocking - don't await)
    supabase.rpc("log_activity", {
      p_organization_id: membership.organization_id,
      p_user_id: user.id,
      p_action: "created",
      p_entity_type: "transaction",
      p_entity_id: transaction.id,
      p_metadata: {
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
      },
    }).catch(err => {
      // Log error but don't fail the request
      console.error('Activity logging failed:', err);
    });

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Transaction creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transaction creation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get user's active organization
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');

    // Build query - RLS automatically filters by organization
    let query = supabase
      .from('cashbook_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    if (search) {
      query = query.ilike('description', `%${search}%`);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate balance using database aggregation (single query)
    const balanceFilters: any[] = [];
    if (type && type !== 'all') balanceFilters.push(`type.eq.${type}`);
    if (startDate) balanceFilters.push(`transaction_date.gte.${startDate}`);
    if (endDate) balanceFilters.push(`transaction_date.lte.${endDate}`);

    // Use a single RPC call to calculate balance efficiently
    const { data: balanceData, error: balanceError } = await supabase.rpc(
      'calculate_balance',
      {
        p_organization_id: membership.organization_id,
        p_type: type && type !== 'all' ? type : null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }
    );

    if (balanceError) {
      console.error('Balance calculation error:', balanceError);
      // Fallback to calculating from fetched transactions if RPC fails
      const cashIn = transactions
        ?.filter((t) => t.type === 'cash_in')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
      const cashOut = transactions
        ?.filter((t) => t.type === 'cash_out')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

      return NextResponse.json({
        success: true,
        transactions,
        balance: {
          total_cash_in: cashIn,
          total_cash_out: cashOut,
          net_balance: cashIn - cashOut,
        },
      });
    }

    return NextResponse.json({
      success: true,
      transactions,
      balance: {
        total_cash_in: balanceData?.cash_in || 0,
        total_cash_out: balanceData?.cash_out || 0,
        net_balance: balanceData?.net_balance || 0,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
