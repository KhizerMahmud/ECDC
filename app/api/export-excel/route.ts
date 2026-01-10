import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const options = await request.json();

    const workbook = new ExcelJS.Workbook();
    
    // Fetch data based on options
    if (options.includeBudgets) {
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*, location:locations(*), funder:funders(*)')
        .order('budget_number');

      if (budgets) {
        const sheet = workbook.addWorksheet('Budgets');
        sheet.columns = [
          { header: 'Budget Number', key: 'budget_number', width: 15 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Location', key: 'location', width: 10 },
          { header: 'Funder', key: 'funder', width: 15 },
          { header: 'Fiscal Year Start', key: 'fiscal_year_start', width: 18 },
          { header: 'Fiscal Year End', key: 'fiscal_year_end', width: 18 },
          { header: 'Total Budget', key: 'total_budget', width: 15 },
          { header: 'Notes', key: 'notes', width: 40 },
        ];

        budgets.forEach((budget: any) => {
          sheet.addRow({
            budget_number: budget.budget_number,
            name: budget.name || '',
            location: budget.location?.code || '',
            funder: budget.funder?.code || '',
            fiscal_year_start: budget.fiscal_year_start,
            fiscal_year_end: budget.fiscal_year_end,
            total_budget: budget.total_budget || 0,
            notes: budget.notes || '',
          });
        });
      }
    }

    if (options.includeEmployees) {
      const { data: employees } = await supabase
        .from('employees')
        .select('*, location:locations(*)')
        .order('last_name');

      if (employees) {
        const sheet = workbook.addWorksheet('Employees');
        sheet.columns = [
          { header: 'First Name', key: 'first_name', width: 15 },
          { header: 'Last Name', key: 'last_name', width: 15 },
          { header: 'Location', key: 'location', width: 10 },
          { header: 'Annual Salary', key: 'annual_salary', width: 15 },
          { header: 'Hourly Rate', key: 'hourly_rate', width: 12 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'TBH Budget ID', key: 'tbh_budget_id', width: 20 },
          { header: 'TBH Notes', key: 'tbh_notes', width: 40 },
        ];

        employees.forEach((emp: any) => {
          sheet.addRow({
            first_name: emp.first_name,
            last_name: emp.last_name,
            location: emp.location?.code || '',
            annual_salary: emp.annual_salary || 0,
            hourly_rate: emp.hourly_rate || 0,
            status: emp.status || 'active',
            tbh_budget_id: emp.tbh_budget_id || '',
            tbh_notes: emp.tbh_notes || '',
          });
        });
      }
    }

    if (options.includeAllocations) {
      const { data: allocations } = await supabase
        .from('employee_allocations')
        .select('*, employee:employees(*), budget:budgets(*)')
        .order('fiscal_year_start');

      if (allocations) {
        const sheet = workbook.addWorksheet('Allocations');
        sheet.columns = [
          { header: 'Employee', key: 'employee', width: 25 },
          { header: 'Budget Number', key: 'budget_number', width: 15 },
          { header: 'Allocation %', key: 'allocation_percentage', width: 15 },
          { header: 'Allocated Amount', key: 'allocated_amount', width: 18 },
          { header: 'Fiscal Year Start', key: 'fiscal_year_start', width: 18 },
          { header: 'Fiscal Year End', key: 'fiscal_year_end', width: 18 },
          { header: 'Notes', key: 'notes', width: 40 },
        ];

        allocations.forEach((alloc: any) => {
          sheet.addRow({
            employee: `${alloc.employee?.first_name || ''} ${alloc.employee?.last_name || ''}`.trim(),
            budget_number: alloc.budget?.budget_number || '',
            allocation_percentage: alloc.allocation_percentage || 0,
            allocated_amount: alloc.allocated_amount || 0,
            fiscal_year_start: alloc.fiscal_year_start,
            fiscal_year_end: alloc.fiscal_year_end,
            notes: alloc.notes || '',
          });
        });
      }
    }

    if (options.includeTimeEntries) {
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*, employee:employees(*), budget:budgets(*)')
        .order('pay_period_start', { ascending: false });

      if (timeEntries) {
        const sheet = workbook.addWorksheet('Time Entries');
        sheet.columns = [
          { header: 'Employee', key: 'employee', width: 25 },
          { header: 'Budget Number', key: 'budget_number', width: 15 },
          { header: 'Pay Period Start', key: 'pay_period_start', width: 18 },
          { header: 'Pay Period End', key: 'pay_period_end', width: 18 },
          { header: 'Hours Worked', key: 'hours_worked', width: 15 },
          { header: 'Notes', key: 'notes', width: 40 },
        ];

        timeEntries.forEach((entry: any) => {
          sheet.addRow({
            employee: `${entry.employee?.first_name || ''} ${entry.employee?.last_name || ''}`.trim(),
            budget_number: entry.budget?.budget_number || '',
            pay_period_start: entry.pay_period_start,
            pay_period_end: entry.pay_period_end,
            hours_worked: entry.hours_worked || 0,
            notes: entry.notes || '',
          });
        });
      }
    }

    if (options.includeExpenses) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*, budget:budgets(*)')
        .order('expense_month', { ascending: false });

      if (expenses) {
        const sheet = workbook.addWorksheet('Expenses');
        sheet.columns = [
          { header: 'Budget Number', key: 'budget_number', width: 15 },
          { header: 'Expense Month', key: 'expense_month', width: 15 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Description', key: 'description', width: 30 },
          { header: 'Notes', key: 'notes', width: 40 },
        ];

        expenses.forEach((expense: any) => {
          sheet.addRow({
            budget_number: expense.budget?.budget_number || '',
            expense_month: expense.expense_month,
            category: expense.category || '',
            amount: expense.amount || 0,
            description: expense.description || '',
            notes: expense.notes || '',
          });
        });
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="budget-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting to Excel:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

