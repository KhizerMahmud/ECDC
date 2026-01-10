import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
    }

    // Check if token exists and is active
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Check if link has expired
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      if (now > expiresAt) {
        return NextResponse.json({ valid: false, expired: true }, { status: 200 });
      }
    }

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error('Error verifying shared link token:', error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}

