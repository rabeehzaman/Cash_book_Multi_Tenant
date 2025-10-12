import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, organizationName } = body;

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for testing
    });

    if (authError || !authData.user) {
      throw authError || new Error('Failed to create user');
    }

    const userId = authData.user.id;

    // 2. Create user profile (using service role, bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
      });

    if (profileError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // 3. Create organization with owner
    const orgSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 8);

    const { data: orgId, error: orgError } = await supabaseAdmin.rpc(
      'create_organization_with_owner',
      {
        org_name: organizationName,
        org_slug: orgSlug,
        owner_user_id: userId,
      }
    );

    if (orgError) {
      // Rollback: delete user profile and auth user
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw orgError;
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        email,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to create account',
        details: error
      },
      { status: 400 }
    );
  }
}
