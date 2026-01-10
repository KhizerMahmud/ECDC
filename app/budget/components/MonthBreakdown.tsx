'use client';

import { useState, useEffect, useMemo } from 'react';

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  location_id: string;
  funder_id?: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  total_budget: number;
  location?: { code: string; name: string };
  funder?: { code: string; name: string; color_code?: string };
  calculations?: Array<{
    id: string;
    budget_id: string;
    calculation_month: string;
    total_wages: number;
    fringe_amount: number;
    total_wages_with_fringe: number;
    indirect_amount: number;
    total_expenses: number;
    remaining_budget: number;
  }>;
}

export default function MonthBreakdown() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFiscalYear = localStorage.getItem('selectedFiscalYear');
      if (savedFiscalYear) {
        setSelectedFiscalYear(savedFiscalYear);
      }
      
      const handleFiscalYearChange = (e: CustomEvent) => {
        setSelectedFiscalYear(e.detail);
        loadData();
      };
      
      window.addEventListener('fiscalYearChanged', handleFiscalYearChange as EventListener);
      return () => {
        window.removeEventListener('fiscalYearChanged', handleFiscalYearChange as EventListener);
      };
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedFiscalYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const budgetParams = new URLSearchParams();
      if (selectedFiscalYear) {
        const [start] = selectedFiscalYear.split('_');
        budgetParams.append('fiscal_year', start);
      }

      const budgetsRes = await fetch(`/api/budgets${budgetParams.toString() ? `?${budgetParams.toString()}` : ''}`);
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

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
      const monthValue = monthDate.toISOString().split('T')[0].substring(0, 7);
      const monthLabel = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push({ value: monthValue, label: monthLabel });
    }
    
    return months;
  };

  const fiscalYearMonths = getFiscalYearMonths();

  // Calculate totals for each month
  const monthTotals = useMemo(() => {
    return fiscalYearMonths.map((month) => {
      const totals = budgets.reduce((acc, budget) => {
        const calc = budget.calculations?.find(
          (c) => c.calculation_month?.startsWith(month.value)
        );
        
        if (calc) {
          acc.totalWages += calc.total_wages || 0;
          acc.fringe += calc.fringe_amount || 0;
          acc.wagesWithFringe += calc.total_wages_with_fringe || 0;
          acc.expenses += calc.total_expenses || 0;
          acc.indirect += calc.indirect_amount || 0;
          acc.spent += (calc.total_wages_with_fringe || 0) + (calc.total_expenses || 0) + (calc.indirect_amount || 0);
        }
        
        return acc;
      }, {
        totalWages: 0,
        fringe: 0,
        wagesWithFringe: 0,
        expenses: 0,
        indirect: 0,
        spent: 0,
      });

      // Budget should be divided across 12 months (monthly budget = total / 12)
      const totalBudget = budgets.reduce((sum, b) => sum + (b.total_budget || 0), 0);
      const monthlyBudget = totalBudget / 12;
      const remaining = monthlyBudget - totals.spent;

      return {
        month: month.value,
        monthLabel: month.label,
        ...totals,
        totalBudget: monthlyBudget,
        remaining,
      };
    });
  }, [budgets, fiscalYearMonths]);

  // Calculate year-to-date totals
  const ytdTotals = useMemo(() => {
    return monthTotals.reduce((acc, month) => {
      acc.totalWages += month.totalWages;
      acc.fringe += month.fringe;
      acc.wagesWithFringe += month.wagesWithFringe;
      acc.expenses += month.expenses;
      acc.indirect += month.indirect;
      acc.spent += month.spent;
      return acc;
    }, {
      totalWages: 0,
      fringe: 0,
      wagesWithFringe: 0,
      expenses: 0,
      indirect: 0,
      spent: 0,
    });
  }, [monthTotals]);

  const totalBudget = budgets.reduce((sum, b) => sum + (b.total_budget || 0), 0);
  const ytdRemaining = totalBudget - ytdTotals.spent;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading month breakdown...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Monthly Budget Breakdown</h2>
        
        {/* Year-to-Date Summary */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Year-to-Date Totals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Budget</div>
              <div className="text-xl font-bold text-gray-900">
                ${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Spent</div>
              <div className="text-xl font-bold text-gray-900">
                ${ytdTotals.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Remaining</div>
              <div className={`text-xl font-bold ${ytdRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(ytdRemaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Utilization</div>
              <div className="text-xl font-bold text-gray-900">
                {totalBudget > 0 
                  ? ((ytdTotals.spent / totalBudget) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Budget
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wages
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fringe
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wages + Fringe
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Indirect
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthTotals.map((month, index) => {
                const isEven = index % 2 === 0;
                return (
                  <tr
                    key={month.month}
                    className={`${isEven ? 'bg-gray-50' : 'bg-white'} transition-colors duration-150 hover:bg-gray-100`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month.monthLabel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${month.totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${month.totalWages.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${month.fringe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${month.wagesWithFringe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${month.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${month.indirect.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      ${month.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      month.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(month.remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              {/* Year-to-Date Row */}
              <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                  Year-to-Date Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-900">
                  ${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-900">
                  ${ytdTotals.totalWages.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-900">
                  ${ytdTotals.fringe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-900">
                  ${ytdTotals.wagesWithFringe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-900">
                  ${ytdTotals.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-900">
                  ${ytdTotals.indirect.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-900">
                  ${ytdTotals.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                  ytdRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(ytdRemaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

