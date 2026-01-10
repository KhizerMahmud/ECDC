'use client';

import { useState, useEffect, useRef } from 'react';

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  total_budget: number;
  fiscal_year_start?: string;
  color_code?: string;
  location?: { code: string; name: string };
  funder?: { code: string; name: string };
  fringe_benefits_amount?: number;
  indirect_cost?: number;
  calculations?: any[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  annual_salary: number;
  hourly_rate?: number;
  title?: string;
  allocations?: any[];
}

interface Expense {
  id: string;
  budget_id: string;
  category: string;
  amount: number;
  monthly_allocations?: { [key: string]: number };
}

interface Allocation {
  id: string;
  budget_id: string;
  employee_id: string;
  allocated_amount: number;
  monthly_allocations?: { [key: string]: number };
  employee?: Employee;
}

export default function BudgetPrint() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [printMode, setPrintMode] = useState<'budget' | 'employee'>('budget');
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Print customization options
  const [printOptions, setPrintOptions] = useState({
    includeEmployees: true,
    includeFringeBenefits: true,
    includeIndirectCost: true,
    includeOtherExpenses: true,
    includeDCA: true,
    includeMonthlyBreakdown: true,
    includeYTD: true,
    includeBalance: true,
    includeSummary: true,
    showPageNumbers: true,
    orientation: 'portrait' as 'portrait' | 'landscape',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    dateRange: 'all' as 'all' | 'ytd' | 'custom',
    customStartDate: '',
    customEndDate: '',
  });

  // Generate fiscal year months
  const getFiscalYearMonths = () => {
    const months: { value: string; label: string }[] = [];
    let fiscalStart: Date;
    
    if (budgets.length > 0 && budgets[0].fiscal_year_start) {
      fiscalStart = new Date(budgets[0].fiscal_year_start);
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      if (month >= 9) {
        fiscalStart = new Date(year, 9, 1);
      } else {
        fiscalStart = new Date(year - 1, 9, 1);
      }
    }

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(fiscalStart.getFullYear(), fiscalStart.getMonth() + i, 1);
      const monthValue = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short' });
      months.push({ value: monthValue, label: monthLabel });
    }
    
    return months;
  };

  const fiscalMonths = getFiscalYearMonths();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, employeesRes, expensesRes, allocationsRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/employees'),
        fetch('/api/expenses'),
        fetch('/api/allocations'),
      ]);

      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      const employeesData = employeesRes.ok ? await employeesRes.json() : [];
      const expensesData = expensesRes.ok ? await expensesRes.json() : [];
      const allocationsData = allocationsRes.ok ? await allocationsRes.json() : [];

      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBudget = (budgetId: string) => {
    setSelectedBudgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(budgetId)) {
        newSet.delete(budgetId);
      } else {
        newSet.add(budgetId);
      }
      return newSet;
    });
  };

  const selectAllBudgets = () => {
    setSelectedBudgets(new Set(budgets.map(b => b.id)));
  };

  const deselectAllBudgets = () => {
    setSelectedBudgets(new Set());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getCurrentMonthIndex = () => {
    const now = new Date();
    const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const index = fiscalMonths.findIndex(m => m.value === currentMonthValue);
    return index >= 0 ? index : fiscalMonths.length - 1;
  };

  const handlePrint = () => {
    if (printMode === 'budget' && selectedBudgets.size === 0) {
      alert('Please select at least one budget to print');
      return;
    }
    if (printMode === 'employee' && !selectedEmployee) {
      alert('Please select an employee to print');
      return;
    }
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const getFilteredMonths = () => {
    if (printOptions.dateRange === 'all') {
      return fiscalMonths;
    } else if (printOptions.dateRange === 'ytd') {
      const currentMonthIndex = getCurrentMonthIndex();
      return fiscalMonths.slice(0, currentMonthIndex + 1);
    } else {
      // Custom date range
      const start = printOptions.customStartDate ? new Date(printOptions.customStartDate) : null;
      const end = printOptions.customEndDate ? new Date(printOptions.customEndDate) : null;
      if (!start || !end) return fiscalMonths;
      return fiscalMonths.filter(month => {
        const monthDate = new Date(month.value + '-01');
        return monthDate >= start && monthDate <= end;
      });
    }
  };

  const getBudgetEmployees = (budgetId: string) => {
    return allocations
      .filter(a => a.budget_id === budgetId)
      .map(a => ({
        ...a.employee,
        allocation: a,
      }))
      .filter(e => e && e.id);
  };

  const getBudgetExpenses = (budgetId: string) => {
    return expenses.filter(e => e.budget_id === budgetId);
  };

  const getDCAExpenses = (budgetId: string) => {
    const dcaCategories = ['RECOGNITION CEREMONY', 'STUDENT INTEGRATION', 'CLIENT TRANSPORTATION', 'CLIENT LAPTOP'];
    return expenses.filter(e => 
      e.budget_id === budgetId && 
      dcaCategories.some(cat => e.category.toUpperCase().includes(cat))
    );
  };

  const getOtherExpenses = (budgetId: string) => {
    const dcaCategories = ['RECOGNITION CEREMONY', 'STUDENT INTEGRATION', 'CLIENT TRANSPORTATION', 'CLIENT LAPTOP'];
    return expenses.filter(e => 
      e.budget_id === budgetId && 
      !dcaCategories.some(cat => e.category.toUpperCase().includes(cat))
    );
  };

  const calculateYTD = (monthlyAllocations: { [key: string]: number } | undefined, months: typeof fiscalMonths) => {
    if (!monthlyAllocations) return 0;
    return months.reduce((sum, month) => sum + (monthlyAllocations[month.value] || 0), 0);
  };

  if (loading) {
    return <div className="text-center py-8">Loading budgets...</div>;
  }

  const selectedBudgetsList = budgets.filter(b => selectedBudgets.has(b.id));
  const filteredMonths = getFilteredMonths();

  return (
    <div className="space-y-6">
      {/* Print Controls - Hidden when printing */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          .print-avoid-break {
            page-break-inside: avoid;
          }
          @page {
            size: ${printOptions.orientation};
            margin: 0.5in;
          }
          body {
            font-size: ${printOptions.fontSize === 'small' ? '10px' : printOptions.fontSize === 'large' ? '14px' : '12px'};
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #000;
          }
          .bg-yellow-50, .bg-green-50, .bg-indigo-50, .bg-pink-50, .bg-purple-50, .bg-blue-50, .bg-gray-100 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="no-print bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Print Budgets</h2>

        {/* Budget Selection */}
        {printMode === 'budget' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Budgets to Print</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllBudgets}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Select All
              </button>
              <button
                onClick={deselectAllBudgets}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded p-4">
            {budgets.map((budget) => (
              <label
                key={budget.id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedBudgets.has(budget.id)}
                  onChange={() => toggleBudget(budget.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">
                  {budget.budget_number} - {budget.name}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {selectedBudgets.size} of {budgets.length} budgets selected
          </p>
        </div>
        )}

        {/* Print Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Include Sections</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeEmployees}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeEmployees: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Employees</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeFringeBenefits}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeFringeBenefits: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Fringe Benefits</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeIndirectCost}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeIndirectCost: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Indirect Cost</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeOtherExpenses}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeOtherExpenses: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Other Expenses</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeDCA}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeDCA: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Direct Client Assistance</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeSummary}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeSummary: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Summary</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Include Columns</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeMonthlyBreakdown}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeMonthlyBreakdown: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Monthly Breakdown</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeYTD}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeYTD: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">YTD</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.includeBalance}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeBalance: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Balance</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Print Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Orientation</label>
                <select
                  value={printOptions.orientation}
                  onChange={(e) => setPrintOptions({ ...printOptions, orientation: e.target.value as 'portrait' | 'landscape' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Font Size</label>
                <select
                  value={printOptions.fontSize}
                  onChange={(e) => setPrintOptions({ ...printOptions, fontSize: e.target.value as 'small' | 'medium' | 'large' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={printOptions.showPageNumbers}
                  onChange={(e) => setPrintOptions({ ...printOptions, showPageNumbers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Show Page Numbers</span>
              </label>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Date Range</h4>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Range</label>
              <select
                value={printOptions.dateRange}
                onChange={(e) => setPrintOptions({ ...printOptions, dateRange: e.target.value as 'all' | 'ytd' | 'custom' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Months</option>
                <option value="ytd">Year to Date</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {printOptions.dateRange === 'custom' && (
              <>
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={printOptions.customStartDate}
                    onChange={(e) => setPrintOptions({ ...printOptions, customStartDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={printOptions.customEndDate}
                    onChange={(e) => setPrintOptions({ ...printOptions, customEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Print Button */}
        <div className="flex justify-end">
          <button
            onClick={handlePrint}
            disabled={(printMode === 'budget' && selectedBudgets.size === 0) || (printMode === 'employee' && !selectedEmployee)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            Print {printMode === 'budget' && selectedBudgets.size > 0 ? `(${selectedBudgets.size})` : printMode === 'employee' && selectedEmployee ? '(1 Employee)' : ''}
          </button>
        </div>
      </div>

      {/* Print Preview - Budgets */}
      {printMode === 'budget' && selectedBudgets.size > 0 && (
        <div ref={printRef} className="bg-white">
          {selectedBudgetsList.map((budget, budgetIndex) => {
            const budgetEmployees = getBudgetEmployees(budget.id);
            const budgetExpenses = getBudgetExpenses(budget.id);
            const dcaExpenses = getDCAExpenses(budget.id);
            const otherExpenses = getOtherExpenses(budget.id);
            const totalPersonnel = budgetEmployees.reduce((sum, e) => sum + (e.allocation?.allocated_amount || 0), 0) + (budget.fringe_benefits_amount || 0);
            const totalOther = otherExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const totalDCA = dcaExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const totalProgramCost = totalPersonnel + totalOther + totalDCA + (budget.indirect_cost || 0);

            return (
              <div key={budget.id} className={`print-page print-avoid-break ${budgetIndex > 0 ? 'mt-8' : ''}`}>
                {/* Budget Header */}
                <div className="mb-6 print-avoid-break">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {budget.budget_number} - {budget.name}
                  </h2>
                  {budget.funder && (
                    <p className="text-sm text-gray-600">Funder: {budget.funder.code} - {budget.funder.name}</p>
                  )}
                  {budget.location && (
                    <p className="text-sm text-gray-600">Location: {budget.location.code} - {budget.location.name}</p>
                  )}
                  <p className="text-sm text-gray-600">Total Budget: {formatCurrency(budget.total_budget || 0)}</p>
                  <p className="text-sm text-gray-500">Printed: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Employees Section */}
                {printOptions.includeEmployees && budgetEmployees.length > 0 && (
                  <div className="mb-6 print-avoid-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Employees</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-left">Name</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Budget</th>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                              <th key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">{month.label}</th>
                            ))}
                            {printOptions.includeYTD && (
                              <th className="border border-gray-300 px-2 py-1 text-right">YTD</th>
                            )}
                            {printOptions.includeBalance && (
                              <th className="border border-gray-300 px-2 py-1 text-right">Balance</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {budgetEmployees.map((emp) => {
                            const monthly = emp.allocation?.monthly_allocations || {};
                            const ytd = calculateYTD(monthly, filteredMonths);
                            const balance = (emp.allocation?.allocated_amount || 0) - ytd;
                            return (
                              <tr key={emp.id}>
                                <td className="border border-gray-300 px-2 py-1">{emp.first_name} {emp.last_name}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(emp.allocation?.allocated_amount || 0)}</td>
                                {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                                  <td key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">
                                    {formatCurrency(monthly[month.value] || 0)}
                                  </td>
                                ))}
                                {printOptions.includeYTD && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(ytd)}</td>
                                )}
                                {printOptions.includeBalance && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(balance)}</td>
                                )}
                              </tr>
                            );
                          })}
                          {printOptions.includeFringeBenefits && (
                            <tr className="bg-yellow-50 font-semibold">
                              <td className="border border-gray-300 px-2 py-1">Fringe Benefits</td>
                              <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(budget.fringe_benefits_amount || 0)}</td>
                              {printOptions.includeMonthlyBreakdown && filteredMonths.map(() => (
                                <td key={Math.random()} className="border border-gray-300 px-1 py-1 text-right text-xs">-</td>
                              ))}
                              {printOptions.includeYTD && (
                                <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                              )}
                              {printOptions.includeBalance && (
                                <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                              )}
                            </tr>
                          )}
                          <tr className="bg-green-50 font-bold">
                            <td className="border border-gray-300 px-2 py-1">Total Personnel Cost</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalPersonnel)}</td>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(() => (
                              <td key={Math.random()} className="border border-gray-300 px-1 py-1 text-right text-xs">-</td>
                            ))}
                            {printOptions.includeYTD && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                            {printOptions.includeBalance && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Other Expenses Section */}
                {printOptions.includeOtherExpenses && otherExpenses.length > 0 && (
                  <div className="mb-6 print-avoid-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Other Expenses</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-left">Category</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Budget</th>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                              <th key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">{month.label}</th>
                            ))}
                            {printOptions.includeYTD && (
                              <th className="border border-gray-300 px-2 py-1 text-right">YTD</th>
                            )}
                            {printOptions.includeBalance && (
                              <th className="border border-gray-300 px-2 py-1 text-right">Balance</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {otherExpenses.map((exp) => {
                            const monthly = exp.monthly_allocations || {};
                            const ytd = calculateYTD(monthly, filteredMonths);
                            const balance = (exp.amount || 0) - ytd;
                            return (
                              <tr key={exp.id}>
                                <td className="border border-gray-300 px-2 py-1">{exp.category}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(exp.amount || 0)}</td>
                                {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                                  <td key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">
                                    {formatCurrency(monthly[month.value] || 0)}
                                  </td>
                                ))}
                                {printOptions.includeYTD && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(ytd)}</td>
                                )}
                                {printOptions.includeBalance && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(balance)}</td>
                                )}
                              </tr>
                            );
                          })}
                          <tr className="bg-indigo-50 font-bold">
                            <td className="border border-gray-300 px-2 py-1">Total Other</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalOther)}</td>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(() => (
                              <td key={Math.random()} className="border border-gray-300 px-1 py-1 text-right text-xs">-</td>
                            ))}
                            {printOptions.includeYTD && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                            {printOptions.includeBalance && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* DCA Section */}
                {printOptions.includeDCA && dcaExpenses.length > 0 && (
                  <div className="mb-6 print-avoid-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Direct Client Assistance</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-left">Category</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Budget</th>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                              <th key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">{month.label}</th>
                            ))}
                            {printOptions.includeYTD && (
                              <th className="border border-gray-300 px-2 py-1 text-right">YTD</th>
                            )}
                            {printOptions.includeBalance && (
                              <th className="border border-gray-300 px-2 py-1 text-right">Balance</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {dcaExpenses.map((exp) => {
                            const monthly = exp.monthly_allocations || {};
                            const ytd = calculateYTD(monthly, filteredMonths);
                            const balance = (exp.amount || 0) - ytd;
                            return (
                              <tr key={exp.id}>
                                <td className="border border-gray-300 px-2 py-1">{exp.category}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(exp.amount || 0)}</td>
                                {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                                  <td key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">
                                    {formatCurrency(monthly[month.value] || 0)}
                                  </td>
                                ))}
                                {printOptions.includeYTD && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(ytd)}</td>
                                )}
                                {printOptions.includeBalance && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(balance)}</td>
                                )}
                              </tr>
                            );
                          })}
                          <tr className="bg-pink-50 font-bold">
                            <td className="border border-gray-300 px-2 py-1">Total DCA</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalDCA)}</td>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(() => (
                              <td key={Math.random()} className="border border-gray-300 px-1 py-1 text-right text-xs">-</td>
                            ))}
                            {printOptions.includeYTD && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                            {printOptions.includeBalance && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Indirect Cost Section */}
                {printOptions.includeIndirectCost && (budget.indirect_cost || 0) > 0 && (
                  <div className="mb-6 print-avoid-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Indirect Cost</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-left">Category</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Budget</th>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                              <th key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">{month.label}</th>
                            ))}
                            {printOptions.includeYTD && (
                              <th className="border border-gray-300 px-2 py-1 text-right">YTD</th>
                            )}
                            {printOptions.includeBalance && (
                              <th className="border border-gray-300 px-2 py-1 text-right">Balance</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-purple-50">
                            <td className="border border-gray-300 px-2 py-1">Indirect Cost</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(budget.indirect_cost || 0)}</td>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(() => (
                              <td key={Math.random()} className="border border-gray-300 px-1 py-1 text-right text-xs">-</td>
                            ))}
                            {printOptions.includeYTD && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                            {printOptions.includeBalance && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                {printOptions.includeSummary && (
                  <div className="mb-6 print-avoid-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Total Program Cost Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-left">Category</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Total Personnel Cost</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalPersonnel)}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Total Other Expenses</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalOther)}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Total Direct Client Assistance</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalDCA)}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Indirect Cost</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(budget.indirect_cost || 0)}</td>
                          </tr>
                          <tr className="bg-blue-50 font-bold">
                            <td className="border border-gray-300 px-2 py-1">Total Program Cost</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalProgramCost)}</td>
                          </tr>
                          <tr className="bg-gray-100 font-bold">
                            <td className="border border-gray-300 px-2 py-1">Remaining Budget</td>
                            <td className={`border border-gray-300 px-2 py-1 text-right ${(budget.total_budget || 0) - totalProgramCost < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency((budget.total_budget || 0) - totalProgramCost)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Print Preview - Employee */}
      {printMode === 'employee' && selectedEmployee && (
        <div ref={printRef} className="bg-white">
          {(() => {
            const employee = employees.find(e => e.id === selectedEmployee);
            if (!employee) return null;

            const employeeAllocations = allocations.filter(a => a.employee_id === employee.id);
            const employeeBudgets = employeeAllocations.map(a => budgets.find(b => b.id === a.budget_id)).filter(b => b);
            const totalAllocated = employeeAllocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
            const utilization = employee.annual_salary > 0 ? (totalAllocated / employee.annual_salary) * 100 : 0;

            return (
              <div className="print-page print-avoid-break">
                {/* Employee Header */}
                <div className="mb-6 print-avoid-break">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  {employee.title && <p className="text-sm text-gray-600">Title: {employee.title}</p>}
                  <p className="text-sm text-gray-600">Annual Salary: {formatCurrency(employee.annual_salary || 0)}</p>
                  <p className="text-sm text-gray-600">Hourly Rate: ${(employee.hourly_rate || 0).toFixed(4)}</p>
                  <p className="text-sm text-gray-600">Total Allocated: {formatCurrency(totalAllocated)}</p>
                  <p className="text-sm text-gray-600">Utilization: {utilization.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">Printed: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Budget Allocations */}
                {employeeBudgets.length > 0 && (
                  <div className="mb-6 print-avoid-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Budget Allocations</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-left">Budget</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Allocated Amount</th>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                              <th key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">{month.label}</th>
                            ))}
                            {printOptions.includeYTD && (
                              <th className="border border-gray-300 px-2 py-1 text-right">YTD</th>
                            )}
                            {printOptions.includeBalance && (
                              <th className="border border-gray-300 px-2 py-1 text-right">Balance</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {employeeAllocations.map((alloc) => {
                            const budget = budgets.find(b => b.id === alloc.budget_id);
                            const monthly = alloc.monthly_allocations || {};
                            const ytd = calculateYTD(monthly, filteredMonths);
                            const balance = (alloc.allocated_amount || 0) - ytd;
                            return (
                              <tr key={alloc.id}>
                                <td className="border border-gray-300 px-2 py-1">
                                  {budget ? `${budget.budget_number} - ${budget.name}` : 'Unknown Budget'}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-right">
                                  {formatCurrency(alloc.allocated_amount || 0)}
                                </td>
                                {printOptions.includeMonthlyBreakdown && filteredMonths.map(month => (
                                  <td key={month.value} className="border border-gray-300 px-1 py-1 text-right text-xs">
                                    {formatCurrency(monthly[month.value] || 0)}
                                  </td>
                                ))}
                                {printOptions.includeYTD && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(ytd)}</td>
                                )}
                                {printOptions.includeBalance && (
                                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(balance)}</td>
                                )}
                              </tr>
                            );
                          })}
                          <tr className="bg-green-50 font-bold">
                            <td className="border border-gray-300 px-2 py-1">Total</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalAllocated)}</td>
                            {printOptions.includeMonthlyBreakdown && filteredMonths.map(() => (
                              <td key={Math.random()} className="border border-gray-300 px-1 py-1 text-right text-xs">-</td>
                            ))}
                            {printOptions.includeYTD && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                            {printOptions.includeBalance && (
                              <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="mb-6 print-avoid-break">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 text-sm">
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold">Annual Salary</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(employee.annual_salary || 0)}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold">Total Allocated</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalAllocated)}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold">Utilization</td>
                          <td className={`border border-gray-300 px-2 py-1 text-right ${utilization >= 100 ? 'text-green-600' : utilization >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {utilization.toFixed(1)}%
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold">Remaining Capacity</td>
                          <td className={`border border-gray-300 px-2 py-1 text-right ${(employee.annual_salary || 0) - totalAllocated > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency((employee.annual_salary || 0) - totalAllocated)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold">Number of Budgets</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">{employeeBudgets.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

