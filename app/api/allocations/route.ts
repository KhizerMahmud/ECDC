import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const budgetId = searchParams.get('budget_id');

    let query = supabase
      .from('employee_allocations')
      .select(`
        *,
        employee:employees(
          *,
          location:locations(*)
        ),
        budget:budgets(*)
      `);

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (budgetId) {
      query = query.eq('budget_id', budgetId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Verify employee exists
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('id', body.employee_id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Use allocated_amount directly from request body
    const { data, error } = await supabase
      .from('employee_allocations')
      .insert({
        employee_id: body.employee_id,
        budget_id: body.budget_id,
        allocated_amount: body.allocated_amount || 0,
        fiscal_year_start: body.fiscal_year_start,
        fiscal_year_end: body.fiscal_year_end,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    // Build update object - include monthly_allocations if provided
    const updateData: any = {};
    if (updates.employee_id !== undefined) updateData.employee_id = updates.employee_id;
    if (updates.budget_id !== undefined) updateData.budget_id = updates.budget_id;
    if (updates.allocated_amount !== undefined) updateData.allocated_amount = updates.allocated_amount;
    if (updates.fiscal_year_start !== undefined) updateData.fiscal_year_start = updates.fiscal_year_start;
    if (updates.fiscal_year_end !== undefined) updateData.fiscal_year_end = updates.fiscal_year_end;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.monthly_allocations !== undefined) updateData.monthly_allocations = updates.monthly_allocations;

    // Use allocated_amount directly - no calculation needed
    const { data, error } = await supabase
      .from('employee_allocations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      .from('employee_allocations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

