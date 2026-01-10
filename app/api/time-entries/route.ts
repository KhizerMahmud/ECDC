import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const budgetId = searchParams.get('budget_id');
    const month = searchParams.get('month');

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        employee:employees(*),
        budget:budgets(*)
      `)
      .order('pay_period_start', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (budgetId) {
      query = query.eq('budget_id', budgetId);
    }

    if (month) {
      const monthStart = new Date(month);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      query = query
        .gte('pay_period_start', monthStart.toISOString().split('T')[0])
        .lte('pay_period_end', monthEnd.toISOString().split('T')[0]);
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

    // Get employee hourly rate
    const { data: employee } = await supabase
      .from('employees')
      .select('hourly_rate')
      .eq('id', body.employee_id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Calculate wage amount (base wage, manual adjustments and bonuses are separate)
    const wageAmount = (body.hours_worked || 0) * (employee.hourly_rate || 0);

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        ...body,
        wage_amount: wageAmount,
        manual_adjustment: body.manual_adjustment || 0,
        bonus: body.bonus || 0,
        notes: body.notes || null,
        is_biweekly: body.is_biweekly !== false,
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

    // If hours_worked is being updated, recalculate wage_amount
    if (updates.hours_worked !== undefined) {
      const { data: entry } = await supabase
        .from('time_entries')
        .select('employee_id')
        .eq('id', id)
        .single();

      if (entry) {
        const { data: employee } = await supabase
          .from('employees')
          .select('hourly_rate')
          .eq('id', entry.employee_id)
          .single();

        if (employee) {
          updates.wage_amount = (updates.hours_worked || 0) * (employee.hourly_rate || 0);
        }
      }
    }

    // Ensure manual_adjustment, bonus, and notes are handled
    if (updates.manual_adjustment !== undefined) {
      updates.manual_adjustment = updates.manual_adjustment || 0;
    }
    if (updates.bonus !== undefined) {
      updates.bonus = updates.bonus || 0;
    }
    if (updates.notes !== undefined) {
      updates.notes = updates.notes || null;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
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
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

