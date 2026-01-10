'use client';

import { useState, useEffect } from 'react';

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  total_budget: number;
  fiscal_year_start?: string;
  color_code?: string;
  location?: { code: string; name: string };
  calculations?: any[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  annual_salary: number;
  allocations?: any[];
  utilization?: any[];
}

export default function BudgetReports() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Generate fiscal year months
  const getFiscalYearMonths = () => {
    const months: { value: string; label: string }[] = [];
    let fiscalStart: Date;
    
    if (budgets.length > 0 && budgets[0].fiscal_year_start) {
      fiscalStart = new Date(budgets[0].fiscal_year_start);
    } else {
      // Default to current fiscal year
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      if (month >= 9) {
        fiscalStart = new Date(year, 9, 1); // October 1
      } else {
        fiscalStart = new Date(year - 1, 9, 1); // October 1 of previous year
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

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedBudget]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, employeesRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/employees'),
      ]);

      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      const employeesData = employeesRes.ok ? await employeesRes.json() : [];

      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setBudgets([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateBudgetSummary = (budget: Budget) => {
    if (selectedMonth === 'all') {
      // Sum all calculations across all months
      const allCalcs = budget.calculations || [];
      const totals = allCalcs.reduce((sum, calc) => {
        return {
          totalWages: sum.totalWages + (calc.total_wages || 0),
          fringe: sum.fringe + (calc.fringe_amount || 0),
          totalWagesWithFringe: sum.totalWagesWithFringe + (calc.total_wages_with_fringe || 0),
          indirect: sum.indirect + (calc.indirect_amount || 0),
          totalExpenses: sum.totalExpenses + (calc.total_expenses || 0),
        };
      }, {
        totalWages: 0,
        fringe: 0,
        totalWagesWithFringe: 0,
        indirect: 0,
        totalExpenses: 0,
      });

      const totalSpent = totals.totalWagesWithFringe + totals.totalExpenses + totals.indirect;
      const remaining = budget.total_budget - totalSpent;

      return {
        ...totals,
        remaining,
      };
    }

    const monthCalc = budget.calculations?.find(
      (calc) => calc.calculation_month?.startsWith(selectedMonth)
    );

    if (!monthCalc) {
      return {
        totalWages: 0,
        fringe: 0,
        totalWagesWithFringe: 0,
        indirect: 0,
        totalExpenses: 0,
        remaining: budget.total_budget,
      };
    }

    return {
      totalWages: monthCalc.total_wages || 0,
      fringe: monthCalc.fringe_amount || 0,
      totalWagesWithFringe: monthCalc.total_wages_with_fringe || 0,
      indirect: monthCalc.indirect_amount || 0,
      totalExpenses: monthCalc.total_expenses || 0,
      remaining: monthCalc.remaining_budget || 0,
    };
  };

  const calculateEmployeeUtilization = (employee: Employee) => {
    const totalAllocated = employee.allocations?.reduce(
      (sum, a) => sum + (a.allocated_amount || 0),
      0
    ) || 0;
    const utilization = employee.annual_salary > 0
      ? (totalAllocated / employee.annual_salary) * 100
      : 0;
    const deficit = employee.annual_salary - totalAllocated;
    const surplus = totalAllocated - employee.annual_salary;

    return {
      utilization,
      deficit: deficit > 0 ? deficit : 0,
      surplus: surplus > 0 ? surplus : 0,
      totalAllocated,
    };
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Budget Reports</h2>
        <div className="flex gap-4">
          <select
            value={selectedBudget}
            onChange={(e) => setSelectedBudget(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Budgets</option>
            {Array.isArray(budgets) && budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.budget_number}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            title="Select month in fiscal year to view budget data"
          >
            <option value="all">All Months</option>
            {fiscalYearMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget Summary Report */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Budget Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fringe (36.1%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Wages + Fringe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indirect (26.2%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgets.map((budget, index) => {
                const summary = calculateBudgetSummary(budget);
                const isEven = index % 2 === 0;
                const baseBgColor = isEven ? 'bg-gray-50' : 'bg-white';
                
                return (
                  <tr 
                    key={budget.id}
                    className={`${baseBgColor} transition-colors duration-150 hover:bg-gray-100`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {budget.budget_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${budget.total_budget || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${summary.totalWages}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${summary.fringe}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${summary.totalWagesWithFringe}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${summary.totalExpenses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${summary.indirect}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        summary.remaining < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                      ${summary.remaining}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Utilization Report */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Employee Utilization Report</h3>
          <p className="text-sm text-gray-500 mt-1">
            Track which employees are over/under allocated across budgets
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Annual Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Allocated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deficit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Surplus</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(employees) && employees.map((employee) => {
                const util = calculateEmployeeUtilization(employee);
                return (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {employee.first_name} {employee.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${employee.annual_salary || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${util.totalAllocated}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        util.utilization >= 100 ? 'text-green-600' :
                        util.utilization >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {util.utilization}%
                      </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {util.deficit > 0 ? (
                          <span className="text-red-600">
                            ${util.deficit}
                          </span>
                        ) : (
                          <span className="text-gray-400">$0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {util.surplus > 0 ? (
                          <span className="text-green-600">
                            ${util.surplus}
                          </span>
                        ) : (
                          <span className="text-gray-400">$0</span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {util.deficit > 0 ? (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                          Under-allocated - Consider hiring
                        </span>
                      ) : util.surplus > 0 ? (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          Over-allocated - Can hire more
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                          Balanced
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

