import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const fiscalYear = searchParams.get('fiscal_year');

    let query = supabase
      .from('budgets')
      .select(`
        *,
        location:locations(*),
        funder:funders(*),
        line_items:budget_line_items(*),
        calculations:budget_calculations(*)
      `)
      .order('budget_number', { ascending: true });

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (fiscalYear) {
      query = query.eq('fiscal_year_start', fiscalYear);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error in /api/budgets:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ /api/budgets: Returning ${data?.length || 0} budgets`);
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in /api/budgets:', error);
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

    // Validate required fields
    if (!body.budget_number || !body.budget_number.trim()) {
      return NextResponse.json(
        { error: 'Budget number is required' },
        { status: 400 }
      );
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Budget name is required' },
        { status: 400 }
      );
    }

    if (!body.location_id) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    if (!body.fiscal_year_start) {
      return NextResponse.json(
        { error: 'Fiscal year start date is required' },
        { status: 400 }
      );
    }

    if (!body.fiscal_year_end) {
      return NextResponse.json(
        { error: 'Fiscal year end date is required' },
        { status: 400 }
      );
    }

    // Validate total_budget is a positive number
    if (typeof body.total_budget !== 'number' || body.total_budget < 0) {
      return NextResponse.json(
        { error: 'Total budget must be a positive number' },
        { status: 400 }
      );
    }

    // Validate fringe_rate if provided (should be a positive number)
    if (body.fringe_rate !== undefined && body.fringe_rate !== null) {
      if (typeof body.fringe_rate !== 'number' || body.fringe_rate < 0) {
        return NextResponse.json(
          { error: 'Fringe rate must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Validate date range
    const startDate = new Date(body.fiscal_year_start);
    const endDate = new Date(body.fiscal_year_end);
    
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid fiscal year start date' },
        { status: 400 }
      );
    }

    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid fiscal year end date' },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'Fiscal year end date must be after start date' },
        { status: 400 }
      );
    }

    // Check for duplicate budget_number
    const { data: existingBudget } = await supabase
      .from('budgets')
      .select('id, budget_number')
      .eq('budget_number', body.budget_number.trim())
      .single();

    if (existingBudget) {
      return NextResponse.json(
        { error: `Budget number "${body.budget_number}" already exists` },
        { status: 400 }
      );
    }

    // Validate contract code format
    const location = await supabase
      .from('locations')
      .select('code')
      .eq('id', body.location_id)
      .single();

    if (location.data) {
      const expectedSuffix = location.data.code === 'VA' ? '-30' : '-33';
      if (!body.budget_number.trim().endsWith(expectedSuffix)) {
        return NextResponse.json(
          { error: `Contract code must end with ${expectedSuffix} for ${location.data.code} location` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid location selected' },
        { status: 400 }
      );
    }

    // Sanitize string inputs
    const sanitizedBody = {
      ...body,
      budget_number: body.budget_number.trim(),
      name: body.name.trim(),
      funder_id: body.funder_id && body.funder_id.trim() ? body.funder_id.trim() : null,
      fringe_rate: body.fringe_rate !== undefined && body.fringe_rate !== null ? body.fringe_rate : null,
      fringe_benefits_amount: body.fringe_benefits_amount !== undefined && body.fringe_benefits_amount !== null ? body.fringe_benefits_amount : 0,
      indirect_cost: body.indirect_cost !== undefined && body.indirect_cost !== null ? body.indirect_cost : null,
      gl_code: body.gl_code?.trim() || null,
      notes: body.notes?.trim() || null,
      color_code: body.color_code?.trim() || null,
    };

    const { data, error } = await supabase
      .from('budgets')
      .insert(sanitizedBody)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/budgets:', error);
    
    // Handle duplicate key error
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A budget with this number already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Budget ID is required for update' },
        { status: 400 }
      );
    }

    // Validate required fields if provided
    if (updates.budget_number !== undefined) {
      if (!updates.budget_number || !updates.budget_number.trim()) {
        return NextResponse.json(
          { error: 'Budget number cannot be empty' },
          { status: 400 }
        );
      }
    }

    if (updates.name !== undefined) {
      if (!updates.name || !updates.name.trim()) {
        return NextResponse.json(
          { error: 'Budget name cannot be empty' },
          { status: 400 }
        );
      }
    }

    // Validate total_budget if provided
    if (updates.total_budget !== undefined) {
      if (typeof updates.total_budget !== 'number' || updates.total_budget < 0) {
        return NextResponse.json(
          { error: 'Total budget must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Validate fringe_rate if provided
    if (updates.fringe_rate !== undefined && updates.fringe_rate !== null) {
      if (typeof updates.fringe_rate !== 'number' || updates.fringe_rate < 0) {
        return NextResponse.json(
          { error: 'Fringe rate must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Validate date range if dates are provided
    if (updates.fiscal_year_start || updates.fiscal_year_end) {
      // Get current budget to compare dates
      const { data: currentBudget } = await supabase
        .from('budgets')
        .select('fiscal_year_start, fiscal_year_end')
        .eq('id', id)
        .single();

      if (currentBudget) {
        const startDate = new Date(updates.fiscal_year_start || currentBudget.fiscal_year_start);
        const endDate = new Date(updates.fiscal_year_end || currentBudget.fiscal_year_end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 }
          );
        }

        if (endDate <= startDate) {
          return NextResponse.json(
            { error: 'Fiscal year end date must be after start date' },
            { status: 400 }
          );
        }
      }
    }

    // Check for duplicate budget_number (excluding current budget)
    if (updates.budget_number) {
      const { data: existingBudget } = await supabase
        .from('budgets')
        .select('id, budget_number')
        .eq('budget_number', updates.budget_number.trim())
        .neq('id', id)
        .single();

      if (existingBudget) {
        return NextResponse.json(
          { error: `Budget number "${updates.budget_number}" already exists` },
          { status: 400 }
        );
      }
    }

    // Validate contract code format if budget_number or location_id changed
    if (updates.budget_number || updates.location_id) {
      const budgetData = await supabase
        .from('budgets')
        .select('budget_number, location_id')
        .eq('id', id)
        .single();

      const locationId = updates.location_id || budgetData.data?.location_id;
      const budgetNumber = updates.budget_number || budgetData.data?.budget_number;

      if (locationId && budgetNumber) {
        const location = await supabase
          .from('locations')
          .select('code')
          .eq('id', locationId)
          .single();

        if (location.data) {
          const expectedSuffix = location.data.code === 'VA' ? '-30' : '-33';
          if (!budgetNumber.trim().endsWith(expectedSuffix)) {
            return NextResponse.json(
              { error: `Contract code must end with ${expectedSuffix} for ${location.data.code} location` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Sanitize string inputs
    const sanitizedUpdates: any = { ...updates };
    if (sanitizedUpdates.budget_number) {
      sanitizedUpdates.budget_number = sanitizedUpdates.budget_number.trim();
    }
    if (sanitizedUpdates.name) {
      sanitizedUpdates.name = sanitizedUpdates.name.trim();
    }
    if (sanitizedUpdates.funder_id !== undefined) {
      sanitizedUpdates.funder_id = sanitizedUpdates.funder_id && sanitizedUpdates.funder_id.trim() ? sanitizedUpdates.funder_id.trim() : null;
    }
    if (sanitizedUpdates.gl_code !== undefined) {
      sanitizedUpdates.gl_code = sanitizedUpdates.gl_code?.trim() || null;
    }
    if (sanitizedUpdates.notes !== undefined) {
      sanitizedUpdates.notes = sanitizedUpdates.notes?.trim() || null;
    }
    if (sanitizedUpdates.color_code !== undefined) {
      sanitizedUpdates.color_code = sanitizedUpdates.color_code?.trim() || null;
    }
    if (sanitizedUpdates.fringe_rate !== undefined) {
      sanitizedUpdates.fringe_rate = sanitizedUpdates.fringe_rate !== null ? sanitizedUpdates.fringe_rate : null;
    }
    if (sanitizedUpdates.fringe_benefits_amount !== undefined) {
      sanitizedUpdates.fringe_benefits_amount = sanitizedUpdates.fringe_benefits_amount !== null ? sanitizedUpdates.fringe_benefits_amount : 0;
    }
    if (sanitizedUpdates.indirect_cost !== undefined) {
      sanitizedUpdates.indirect_cost = sanitizedUpdates.indirect_cost !== null ? sanitizedUpdates.indirect_cost : null;
    }

    const { data, error } = await supabase
      .from('budgets')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/budgets:', error);
    
    // Handle duplicate key error
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A budget with this number already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    // Check if budget exists before deleting
    const { data: budget } = await supabase
      .from('budgets')
      .select('budget_number, name')
      .eq('id', id)
      .single();

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    // Note: Cascade deletes will handle related records (time_entries, expenses, etc.)
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Budget "${budget.budget_number}" deleted successfully` });
  } catch (error: any) {
    console.error('Error in /api/budgets:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete budget because it has related records. Please remove related data first.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

