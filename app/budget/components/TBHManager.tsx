'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  annual_salary: number;
  status: string;
  tbh_budget_id?: string;
  tbh_notes?: string;
  location?: { code: string; name: string };
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  total_budget: number;
  color_code?: string;
  location?: { code: string; name: string };
  calculations?: any[];
}

export default function TBHManager() {
  const [tbhEmployees, setTbhEmployees] = useState<Employee[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesRes, budgetsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/budgets'),
      ]);

      const employeesData = employeesRes.ok ? await employeesRes.json() : [];
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];

      // Filter for TBH employees: status='tbh' OR name starts with 'TBH -'
      const tbhFiltered = Array.isArray(employeesData) ? employeesData.filter((emp: Employee) => 
        emp.status === 'tbh' || 
        emp.first_name?.startsWith('TBH -') || 
        emp.first_name?.startsWith('TBH-') ||
        `${emp.first_name} ${emp.last_name}`.includes('TBH')
      ) : [];

      setTbhEmployees(tbhFiltered);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setTbhEmployees([]);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateBudgetStatus = (budget: Budget) => {
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
    const calc = budget.calculations?.find(
      (c) => c.calculation_month?.startsWith(currentMonth)
    );

    if (!calc) {
      return {
        spent: 0,
        remaining: budget.total_budget,
        available: budget.total_budget,
        hasMoney: budget.total_budget > 0,
      };
    }

    const spent = (calc.total_wages_with_fringe || 0) + (calc.total_expenses || 0) + (calc.indirect_amount || 0);
    const remaining = budget.total_budget - spent;
    const hasMoney = remaining > 0;

    return {
      spent,
      remaining: Math.max(0, remaining),
      available: budget.total_budget,
      hasMoney,
    };
  };

  const getBudgetsWithMoney = () => {
    return budgets.filter(budget => {
      const status = calculateBudgetStatus(budget);
      return status.hasMoney && status.remaining > 50000; // At least $50k available
    }).sort((a, b) => {
      const statusA = calculateBudgetStatus(a);
      const statusB = calculateBudgetStatus(b);
      return statusB.remaining - statusA.remaining; // Sort by available amount descending
    });
  };

  const getBudgetForEmployee = (employee: Employee) => {
    if (!employee.tbh_budget_id) return null;
    return budgets.find(b => b.id === employee.tbh_budget_id);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const budgetsWithMoney = getBudgetsWithMoney();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">To Be Hired (TBH) Employees</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track positions to be hired and identify which programs need them and have available budget
          </p>
        </div>
      </div>

      {/* TBH Employees */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            TBH Employees ({tbhEmployees.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proposed Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Needed For Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program Has Money?</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tbhEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No TBH employees found. Add employees with status "To Be Hired (TBH)" to track positions to be hired.
                  </td>
                </tr>
              ) : (
                Array.isArray(tbhEmployees) && tbhEmployees.map((employee, index) => {
                  const isEven = index % 2 === 0;
                  const baseBgColor = isEven ? 'bg-gray-50' : 'bg-white';
                  const budget = getBudgetForEmployee(employee);
                  const budgetStatus = budget ? calculateBudgetStatus(budget) : null;
                  const hasMoney = budgetStatus?.hasMoney || false;
                  
                  return (
                    <tr 
                      key={employee.id}
                      className={`${baseBgColor} transition-colors duration-150`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {employee.first_name} {employee.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {employee.location?.code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ${employee.annual_salary || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {budget ? (
                          <div className="flex items-center gap-2">
                            {budget.color_code && (
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: budget.color_code }}
                              />
                            )}
                            <span className="font-medium">{budget.budget_number}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {budget ? (
                          hasMoney ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-medium">
                              YES - ${budgetStatus?.remaining} available
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 font-medium">
                              NO - Overspent
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{employee.tbh_notes || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            // Navigate to employee edit
                            window.location.href = '#employees';
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Programs with Available Budget */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Programs with Available Budget (Can Hire)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            These programs have sufficient remaining budget to hire new employees
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Can Hire</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgetsWithMoney.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No programs with sufficient available budget
                  </td>
                </tr>
              ) : (
                Array.isArray(budgetsWithMoney) && budgetsWithMoney.map((budget, index) => {
                  const status = calculateBudgetStatus(budget);
                  const canHireCount = Math.floor(status.remaining / 100000); // Assuming $100k average salary
                  const isEven = index % 2 === 0;
                  const baseBgColor = isEven ? 'bg-gray-50' : 'bg-white';
                  
                  return (
                    <tr 
                      key={budget.id} 
                      className={`${baseBgColor} transition-colors duration-150`}
                      style={budget.color_code ? { backgroundColor: isEven ? `${budget.color_code}08` : `${budget.color_code}12` } : {}}
                      onMouseEnter={(e) => {
                        if (budget.color_code) {
                          e.currentTarget.style.backgroundColor = isEven ? `${budget.color_code}18` : `${budget.color_code}16`;
                        } else {
                          e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (budget.color_code) {
                          e.currentTarget.style.backgroundColor = isEven ? `${budget.color_code}08` : `${budget.color_code}12`;
                        } else {
                          e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {budget.color_code && (
                            <div
                              className="w-4 h-4 rounded border border-gray-300"
                              style={{ backgroundColor: budget.color_code }}
                              title={`Color: ${budget.color_code}`}
                            />
                          )}
                          <span>{budget.budget_number}</span>
                          {budget.name && (
                            <span className="text-gray-500 text-xs">({budget.name})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {budget.location?.code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ${status.available}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ${status.spent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${status.remaining}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-medium">
                          ~{canHireCount} employee{canHireCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiring Recommendations</h3>
        <div className="space-y-2">
          {Array.isArray(tbhEmployees) && tbhEmployees.map((employee) => {
            const budget = getBudgetForEmployee(employee);
            const budgetStatus = budget ? calculateBudgetStatus(budget) : null;
            
            if (!budget) {
              return (
                <div key={employee.id} className="text-sm">
                  <span className="font-medium">{employee.first_name} {employee.last_name}</span> needs to be assigned to a program.
                </div>
              );
            }
            
            if (budgetStatus && !budgetStatus.hasMoney) {
              // Find alternative budgets with money
              const alternatives = budgetsWithMoney.filter(b => 
                b.location?.code === employee.location?.code && 
                b.id !== budget.id
              );
              
              return (
                <div key={employee.id} className="text-sm p-2 bg-yellow-50 rounded">
                  <span className="font-medium">{employee.first_name} {employee.last_name}</span> is needed for{' '}
                  <span className="font-medium">{budget.budget_number}</span>, but that program is <span className="text-red-600 font-medium">overspent</span>.
                  {alternatives.length > 0 ? (
                    <div className="mt-1">
                      <span className="font-medium">Alternative programs with available budget:</span>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {alternatives.slice(0, 3).map(a => {
                          const altStatus = calculateBudgetStatus(a);
                          return (
                            <li key={a.id}>
                              {a.budget_number} - ${altStatus.remaining} available
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <span className="ml-2 text-red-600">No alternative programs with sufficient budget found.</span>
                  )}
                </div>
              );
            }
            
            if (budgetStatus && budgetStatus.hasMoney) {
              return (
                <div key={employee.id} className="text-sm p-2 bg-green-50 rounded">
                  <span className="font-medium">{employee.first_name} {employee.last_name}</span> can be hired for{' '}
                  <span className="font-medium">{budget.budget_number}</span> -{' '}
                  <span className="text-green-600 font-medium">
                    ${budgetStatus.remaining} available
                  </span>
                </div>
              );
            }
            
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

