import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('employees')
      .select(`
        *,
        location:locations(*),
        allocations:employee_allocations(
          *,
          budget:budgets(*)
        ),
        utilization:employee_utilization(*)
      `)
      .order('last_name', { ascending: true });

    // Location filtering: show employees with matching location_id OR null (both locations)
    // Note: We handle null location_id on client side for better compatibility
    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error in /api/employees:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ /api/employees: Returning ${data?.length || 0} employees`);
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in /api/employees:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      code: error.code,
      details: error.details 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Convert empty string UUID fields to null (PostgreSQL doesn't accept empty strings for UUID)
    // Convert empty date strings to null
    const sanitizedBody = {
      ...body,
      location_id: body.location_id && body.location_id.trim() !== '' ? body.location_id : null,
      tbh_budget_id: body.tbh_budget_id && body.tbh_budget_id.trim() !== '' ? body.tbh_budget_id : null,
      date_of_hire: body.date_of_hire && body.date_of_hire.trim() !== '' ? body.date_of_hire : null,
      title: body.title && body.title.trim() !== '' ? body.title.trim() : null,
    };

    const { data, error } = await supabase
      .from('employees')
      .insert(sanitizedBody)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    // Convert empty string UUID fields to null (PostgreSQL doesn't accept empty strings for UUID)
    // Convert empty date strings to null
    const sanitizedUpdates: any = { ...updates };
    if ('location_id' in sanitizedUpdates) {
      sanitizedUpdates.location_id = sanitizedUpdates.location_id && sanitizedUpdates.location_id.trim() !== '' 
        ? sanitizedUpdates.location_id 
        : null;
    }
    if ('tbh_budget_id' in sanitizedUpdates) {
      sanitizedUpdates.tbh_budget_id = sanitizedUpdates.tbh_budget_id && sanitizedUpdates.tbh_budget_id.trim() !== '' 
        ? sanitizedUpdates.tbh_budget_id 
        : null;
    }
    if ('date_of_hire' in sanitizedUpdates) {
      sanitizedUpdates.date_of_hire = sanitizedUpdates.date_of_hire && sanitizedUpdates.date_of_hire.trim() !== '' 
        ? sanitizedUpdates.date_of_hire 
        : null;
    }
    if ('title' in sanitizedUpdates) {
      sanitizedUpdates.title = sanitizedUpdates.title && sanitizedUpdates.title.trim() !== '' 
        ? sanitizedUpdates.title.trim() 
        : null;
    }

    const { data, error } = await supabase
      .from('employees')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

