export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type UserRole = 'admin' | 'vendor' | 'koc' | 'user';
const VALID_ROLES: UserRole[] = ['user', 'vendor', 'koc'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role } = body as {
      email?: string;
      password?: string;
      role?: string;
    };

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const userRole: UserRole = VALID_ROLES.includes(role as UserRole)
      ? (role as UserRole)
      : 'user';

    // Use service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create auth user
    const { data: authData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm so user can login immediately
        user_metadata: { role: userRole },
      });

    if (signUpError) {
      // Handle duplicate email
      if (signUpError.message.includes('already been registered') ||
          signUpError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // 2. Insert into public.users table (service role bypasses RLS)
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: authData.user.id,
          email,
          role: userRole,
        },
        { onConflict: 'id' }
      );

    if (insertError) {
      console.error('Failed to insert user record:', insertError);
      // Don't fail registration — auth user exists, profile can be synced later
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
      userId: authData.user.id,
    });
  } catch (err) {
    console.error('Register error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
