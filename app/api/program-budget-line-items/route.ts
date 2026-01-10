import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budget_id');
    const month = searchParams.get('month');

    let query = supabase
      .from('program_budget_line_items')
      .select('*')
      .order('budget_month', { ascending: true })
      .order('category', { ascending: true });

    if (budgetId) {
      query = query.eq('budget_id', budgetId);
    }

    if (month) {
      query = query.gte('budget_month', `${month}-01`).lt('budget_month', `${month}-32`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error in /api/program-budget-line-items:', error);
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in /api/program-budget-line-items:', error);
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

    // Ensure budget_month is the first day of the month
    const budgetMonth = new Date(body.budget_month + '-01');
    const firstDay = new Date(budgetMonth.getFullYear(), budgetMonth.getMonth(), 1)
      .toISOString().split('T')[0];

    const sanitizedBody = {
      ...body,
      budget_month: firstDay,
      budgeted_amount: parseFloat(body.budgeted_amount) || 0,
    };

    const { data, error } = await supabase
      .from('program_budget_line_items')
      .insert(sanitizedBody)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/program-budget-line-items POST:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    // Ensure budget_month is the first day of the month if provided
    if (updates.budget_month) {
      const budgetMonth = new Date(updates.budget_month + '-01');
      updates.budget_month = new Date(budgetMonth.getFullYear(), budgetMonth.getMonth(), 1)
        .toISOString().split('T')[0];
    }

    if (updates.budgeted_amount !== undefined) {
      updates.budgeted_amount = parseFloat(updates.budgeted_amount) || 0;
    }

    const { data, error } = await supabase
      .from('program_budget_line_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/program-budget-line-items PUT:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id } = body;

    const { error } = await supabase
      .from('program_budget_line_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/program-budget-line-items DELETE:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

