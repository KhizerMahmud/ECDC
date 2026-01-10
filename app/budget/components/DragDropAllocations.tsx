'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  annual_salary: number;
  location_id: string;
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  location_id: string;
  color_code?: string;
}

interface Allocation {
  id: string;
  employee_id: string;
  budget_id: string;
  allocation_percentage: number;
  allocated_amount: number;
  notes?: string;
  employee?: Employee;
  budget?: Budget;
}

interface DragDropAllocationsProps {
  readOnly?: boolean;
}

export default function DragDropAllocations({ readOnly = false }: DragDropAllocationsProps = {}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesRes, budgetsRes, allocationsRes] = await Promise.all([
        fetch('/api/employees?status=active'),
        fetch('/api/budgets'),
        fetch('/api/allocations'),
      ]);

      const employeesData = employeesRes.ok ? await employeesRes.json() : [];
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      const allocationsData = allocationsRes.ok ? await allocationsRes.json() : [];

      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setEmployees([]);
      setBudgets([]);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, employee: Employee) => {
    setDraggedEmployee(employee);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, budget: Budget) => {
    e.preventDefault();
    if (!draggedEmployee) return;

    // Check if allocation already exists
    const existing = allocations.find(
      a => a.employee_id === draggedEmployee.id && a.budget_id === budget.id
    );

    if (existing) {
      alert('Employee is already allocated to this budget. Please edit the existing allocation.');
      return;
    }

    // Prompt for allocation amount
    const amount = prompt(`Enter allocation amount ($) for ${draggedEmployee.first_name} ${draggedEmployee.last_name} on ${budget.budget_number}:`, '0');
    if (!amount || isNaN(parseFloat(amount))) return;

    const allocationAmount = parseFloat(amount);
    if (allocationAmount < 0) {
      alert('Allocation amount must be greater than or equal to 0');
      return;
    }

    // Prompt for notes
    const notes = prompt('Add notes (optional):', '');

    // Set default fiscal year
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let fiscalYearStart: string;
    
    if (month >= 9) {
      fiscalYearStart = `${year}-10-01`;
    } else {
      fiscalYearStart = `${year - 1}-10-01`;
    }
    
    const fiscalYearEnd = new Date(fiscalYearStart);
    fiscalYearEnd.setFullYear(fiscalYearEnd.getFullYear() + 1);
    fiscalYearEnd.setMonth(8);
    fiscalYearEnd.setDate(30);

    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: draggedEmployee.id,
          budget_id: budget.id,
          allocated_amount: allocationAmount,
          fiscal_year_start: fiscalYearStart,
          fiscal_year_end: fiscalYearEnd.toISOString().split('T')[0],
          notes: notes || null,
        }),
      });

      if (res.ok) {
        await loadData();
        // Dispatch event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('allocationUpdated'));
        }
        setDraggedEmployee(null);
      }
    } catch (error) {
      console.error('Error creating allocation:', error);
      alert('Error creating allocation');
    }
  };

  const getEmployeesForBudget = (budgetId: string) => {
    return allocations
      .filter(a => a.budget_id === budgetId)
      .map(a => employees.find(e => e.id === a.employee_id))
      .filter(Boolean) as Employee[];
  };

  const getUnallocatedEmployees = () => {
    const allocatedIds = new Set(allocations.map(a => a.employee_id));
    return employees.filter(e => !allocatedIds.has(e.id));
  };

  const filteredBudgets = selectedBudget === 'all' 
    ? budgets 
    : budgets.filter(b => b.id === selectedBudget);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Drag & Drop Employee Allocations</h2>
        <select
          value={selectedBudget}
          onChange={(e) => setSelectedBudget(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Budgets</option>
          {budgets.map((budget) => (
            <option key={budget.id} value={budget.id}>
              {budget.budget_number}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unallocated Employees */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Unallocated Employees</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {Array.isArray(getUnallocatedEmployees()) && getUnallocatedEmployees().map((employee) => (
              <div
                key={employee.id}
                draggable
                onDragStart={(e) => handleDragStart(e, employee)}
                className="p-3 bg-gray-50 rounded border border-gray-200 cursor-move hover:bg-gray-100"
              >
                <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                <div className="text-sm text-gray-500">
                  ${employee.annual_salary || 0}/yr
                </div>
              </div>
            ))}
            {getUnallocatedEmployees().length === 0 && (
              <p className="text-gray-500 text-sm">All employees are allocated</p>
            )}
          </div>
        </div>

        {/* Budgets with Allocations */}
        <div className="lg:col-span-2 space-y-4 max-h-[600px] overflow-y-auto">
          {Array.isArray(filteredBudgets) && filteredBudgets.map((budget) => {
            const budgetEmployees = getEmployeesForBudget(budget.id);
            return (
              <div
                key={budget.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, budget)}
                className="bg-white rounded-lg shadow p-4 border-2 border-dashed border-gray-300 hover:border-blue-400"
              >
                <div className="font-semibold mb-2">
                  {budget.budget_number} - {budget.name || 'N/A'}
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {budgetEmployees.length > 0 ? (
                    Array.isArray(budgetEmployees) && budgetEmployees.map((employee) => {
                      const allocation = allocations.find(
                        a => a.employee_id === employee.id && a.budget_id === budget.id
                      );
                      return (
                        <div
                          key={employee.id}
                          className="p-2 bg-blue-50 rounded border border-blue-200 text-sm"
                        >
                          <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                          <div className="text-xs text-gray-600">
                            ${allocation?.allocated_amount || 0} allocated
                            {allocation?.notes && (
                              <span className="ml-2">• {allocation.notes}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-400 text-sm italic">Drop employees here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

