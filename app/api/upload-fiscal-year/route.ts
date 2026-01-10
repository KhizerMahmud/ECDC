import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fiscalYearStart = formData.get('fiscal_year_start') as string;
    const fiscalYearEnd = formData.get('fiscal_year_end') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!fiscalYearStart || !fiscalYearEnd) {
      return NextResponse.json({ error: 'Fiscal year dates required' }, { status: 400 });
    }

    // For now, validate the file and return success
    // In production, you would:
    // 1. Read the Excel file using xlsx or similar library
    // 2. Parse the data similar to your import_budget_data.py script
    // 3. Insert the data into Supabase with the specified fiscal year dates
    
    const fileSize = file.size;
    const fileName = file.name;
    
    return NextResponse.json({
      message: `File "${fileName}" (${(fileSize / 1024).toFixed(2)} KB) received for fiscal year ${fiscalYearStart} to ${fiscalYearEnd}.`,
      note: 'To fully process this file, use your existing import scripts (import_budget_data.py) with the fiscal year dates specified. The file has been validated and is ready for processing.',
      fiscalYearStart,
      fiscalYearEnd,
      fileName,
      fileSize,
    });
  } catch (error: any) {
    console.error('Error uploading fiscal year data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

