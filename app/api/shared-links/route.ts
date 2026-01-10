import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Generate a secure random token
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all shared links created by this user
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching shared links:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'You must be logged in to create shared links. Please sign in and try again.' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { expiresAt } = body; // Optional expiration date (ISO string)

    // Generate a unique token
    const token = generateToken();

    // Create the shared link
    const { data, error } = await supabase
      .from('shared_links')
      .insert({
        token,
        created_by: user.id,
        expires_at: expiresAt || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating shared link:', error);
      // Check if it's a table doesn't exist error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'The shared_links table does not exist. Please run the database migration first.',
          details: error.message 
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating shared link:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.details || error.hint || error.code 
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, is_active, expires_at } = body;

    // Update the shared link (RLS ensures user can only update their own links)
    const { data, error } = await supabase
      .from('shared_links')
      .update({
        is_active,
        expires_at: expires_at || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating shared link:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    // Delete the shared link (RLS ensures user can only delete their own links)
    const { error } = await supabase
      .from('shared_links')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting shared link:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

