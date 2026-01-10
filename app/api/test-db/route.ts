import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!hasUrl || !hasKey) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing environment variables',
        hasUrl,
        hasKey
      }, { status: 500 });
    }

    const supabase = await createClient();
    
    // Test 1: Check if locations table exists
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('count')
      .limit(1);
    
    // Test 2: Check if funders table exists
    const { data: funders, error: fundersError } = await supabase
      .from('funders')
      .select('count')
      .limit(1);
    
    // Test 3: Check if budgets table exists
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('count')
      .limit(1);
    
    // Test 4: Check if employees table exists
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('count')
      .limit(1);
    
    return NextResponse.json({ 
      success: true,
      env: {
        hasUrl,
        hasKey,
        urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...'
      },
      tables: {
        locations: { exists: !locationsError, error: locationsError?.message },
        funders: { exists: !fundersError, error: fundersError?.message },
        budgets: { exists: !budgetsError, error: budgetsError?.message },
        employees: { exists: !employeesError, error: employeesError?.message },
      }
    });
  } catch (error: any) {
    console.error('Error in test-db:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

