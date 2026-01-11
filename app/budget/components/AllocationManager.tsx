'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

interface Allocation {
  id: string;
  employee_id: string;
  budget_id: string;
  allocation_percentage: number;
  allocated_amount: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  notes?: string;
  employee?: { first_name: string; last_name: string; annual_salary: number };
  budget?: { budget_number: string; name: string };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  annual_salary: number;
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  color_code?: string;
}

interface AllocationManagerProps {
  readOnly?: boolean;
}

export default function AllocationManager({ readOnly = false }: AllocationManagerProps = {}) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    budget_id: '',
    allocated_amount: 0,
    fiscal_year_start: '',
    fiscal_year_end: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    employeeName: '',
    budgetNumber: '',
    budgetName: '',
    fiscalYear: '',
  });
  const [sortBy, setSortBy] = useState<'amount' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allocationsRes, employeesRes, budgetsRes] = await Promise.all([
        fetch('/api/allocations'),
        fetch('/api/employees'),
        fetch('/api/budgets'),
      ]);

      const allocationsData = allocationsRes.ok ? await allocationsRes.json() : [];
      const employeesData = employeesRes.ok ? await employeesRes.json() : [];
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];

      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setAllocations([]);
      setEmployees([]);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = selectedAllocation ? 'PUT' : 'POST';
      const body = selectedAllocation ? { id: selectedAllocation.id, ...formData } : formData;

      const res = await fetch('/api/allocations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadData();
        // Dispatch event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('allocationUpdated'));
        }
        setShowForm(false);
        setSelectedAllocation(null);
        setFormData({
          employee_id: '',
          budget_id: '',
          allocated_amount: 0,
          fiscal_year_start: '',
          fiscal_year_end: '',
          notes: '',
        });
        setEmployeeSearchQuery('');
        setShowEmployeeDropdown(false);
      }
    } catch (error) {
      console.error('Error saving allocation:', error);
      alert('Error saving allocation');
    }
  };

  const handleEdit = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setFormData({
      employee_id: allocation.employee_id,
      budget_id: allocation.budget_id,
      allocated_amount: allocation.allocated_amount || 0,
      fiscal_year_start: allocation.fiscal_year_start,
      fiscal_year_end: allocation.fiscal_year_end,
      notes: allocation.notes || '',
    });
    setEmployeeSearchQuery('');
    setShowEmployeeDropdown(false);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return;

    try {
      const res = await fetch(`/api/allocations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        // Dispatch event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('allocationUpdated'));
        }
      }
    } catch (error) {
      console.error('Error deleting allocation:', error);
      alert('Error deleting allocation');
    }
  };

  const handleSort = (column: 'amount') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedAllocations = useMemo(() => {
    let filtered = allocations.filter(alloc => {
      // Employee name filter
      if (filters.employeeName) {
        const empName = `${alloc.employee?.first_name || ''} ${alloc.employee?.last_name || ''}`.toLowerCase();
        if (!empName.includes(filters.employeeName.toLowerCase())) {
          return false;
        }
      }

      // Budget number filter
      if (filters.budgetNumber) {
        const budgetNum = alloc.budget?.budget_number?.toLowerCase() || '';
        if (!budgetNum.includes(filters.budgetNumber.toLowerCase())) {
          return false;
        }
      }

      // Budget name filter
      if (filters.budgetName) {
        const budgetName = alloc.budget?.name?.toLowerCase() || '';
        if (!budgetName.includes(filters.budgetName.toLowerCase())) {
          return false;
        }
      }


      // Fiscal year filter
      if (filters.fiscalYear) {
        const fiscalYearStr = `${new Date(alloc.fiscal_year_start).getFullYear()}-${new Date(alloc.fiscal_year_end).getFullYear()}`;
        if (!fiscalYearStr.includes(filters.fiscalYear)) {
          return false;
        }
      }

      return true;
    });

    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let diff = (a.allocated_amount || 0) - (b.allocated_amount || 0);
        return sortDirection === 'asc' ? diff : -diff;
      });
    }

    return filtered;
  }, [allocations, filters, sortBy, sortDirection]);

  // Get unique fiscal years for filter dropdown
  const uniqueFiscalYears = useMemo(() => {
    const years = new Set<string>();
    allocations.forEach(alloc => {
      const yearStr = `${new Date(alloc.fiscal_year_start).getFullYear()}-${new Date(alloc.fiscal_year_end).getFullYear()}`;
      years.add(yearStr);
    });
    return Array.from(years).sort();
  }, [allocations]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      employeeName: '',
      budgetNumber: '',
      budgetName: '',
      fiscalYear: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) {
      return employees;
    }
    const query = employeeSearchQuery.toLowerCase();
    return employees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [employees, employeeSearchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeInputRef.current && !employeeInputRef.current.contains(event.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get selected employee display name
  const selectedEmployeeName = useMemo(() => {
    if (!formData.employee_id) return '';
    const employee = employees.find(emp => emp.id === formData.employee_id);
    if (!employee) return '';
    return `${employee.first_name} ${employee.last_name} ($${(employee.annual_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr)`;
  }, [formData.employee_id, employees]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const SortIcon = ({ column }: { column: 'amount' }) => (
    <span className="flex flex-col ml-1">
      <svg
        className={`w-2 h-2 ${sortBy === column && sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 10 10"
      >
        <path d="M5 0L0 5h10z" />
      </svg>
      <svg
        className={`w-2 h-2 -mt-1 ${sortBy === column && sortDirection === 'desc' ? 'text-gray-900' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 10 10"
      >
        <path d="M5 10L0 5h10z" />
      </svg>
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Employee Allocations</h2>
        <button
          onClick={() => {
            setSelectedAllocation(null);
            // Set default fiscal year (Oct 1 to Sept 30)
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            let fiscalYearStart: string;
            
            if (month >= 9) { // October (9) or later
              fiscalYearStart = `${year}-10-01`;
            } else {
              fiscalYearStart = `${year - 1}-10-01`;
            }
            
            const fiscalYearEnd = new Date(fiscalYearStart);
            fiscalYearEnd.setFullYear(fiscalYearEnd.getFullYear() + 1);
            fiscalYearEnd.setMonth(8); // September
            fiscalYearEnd.setDate(30);

            setFormData({
              employee_id: '',
              budget_id: '',
              allocated_amount: 0,
              fiscal_year_start: fiscalYearStart,
              fiscal_year_end: fiscalYearEnd.toISOString().split('T')[0],
              notes: '',
            });
            setEmployeeSearchQuery('');
            setShowEmployeeDropdown(false);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Allocation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All Filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {/* Employee Name Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Name
            </label>
            <input
              type="text"
              value={filters.employeeName}
              onChange={(e) => handleFilterChange('employeeName', e.target.value)}
              placeholder="Search employee name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Budget Number Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Number
            </label>
            <input
              type="text"
              value={filters.budgetNumber}
              onChange={(e) => handleFilterChange('budgetNumber', e.target.value)}
              placeholder="Search budget number..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Budget Name Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Name
            </label>
            <input
              type="text"
              value={filters.budgetName}
              onChange={(e) => handleFilterChange('budgetName', e.target.value)}
              placeholder="Search budget name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Fiscal Year Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fiscal Year
            </label>
            <select
              value={filters.fiscalYear}
              onChange={(e) => handleFilterChange('fiscalYear', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Fiscal Years</option>
              {uniqueFiscalYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredAndSortedAllocations.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{allocations.length}</span> allocations
          {hasActiveFilters && (
            <span className="ml-2 text-blue-600">
              (filtered)
            </span>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedAllocation ? 'Edit Allocation' : 'Add Allocation'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <div ref={employeeInputRef} className="relative mt-1">
                  <input
                    type="text"
                    value={formData.employee_id ? selectedEmployeeName : employeeSearchQuery}
                    onChange={(e) => {
                      setEmployeeSearchQuery(e.target.value);
                      setShowEmployeeDropdown(true);
                      setFormData({ ...formData, employee_id: '' });
                    }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                    placeholder="Type to search employee..."
                    className="block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  {showEmployeeDropdown && filteredEmployees.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => {
                            setFormData({ ...formData, employee_id: emp.id });
                            setEmployeeSearchQuery('');
                            setShowEmployeeDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {emp.first_name} {emp.last_name} (${(emp.annual_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr)
                        </div>
                      ))}
                    </div>
                  )}
                  {showEmployeeDropdown && employeeSearchQuery && filteredEmployees.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg px-3 py-2 text-gray-500">
                      No employees found
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget</label>
                <select
                  value={formData.budget_id}
                  onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select budget</option>
                  {budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.budget_number} - {budget.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Allocated Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.allocated_amount}
                  onChange={(e) => setFormData({ ...formData, allocated_amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Dollar amount allocated to this budget
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fiscal Year Start</label>
                <input
                  type="date"
                  value={formData.fiscal_year_start}
                  onChange={(e) => {
                    const start = e.target.value;
                    // Only auto-calculate end date if end date is empty or hasn't been manually set
                    if (!formData.fiscal_year_end) {
                      const endDate = new Date(start);
                      endDate.setFullYear(endDate.getFullYear() + 1);
                      endDate.setMonth(8); // September
                      endDate.setDate(30);
                      setFormData({
                        ...formData,
                        fiscal_year_start: start,
                        fiscal_year_end: endDate.toISOString().split('T')[0],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        fiscal_year_start: start,
                      });
                    }
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fiscal Year End</label>
                <input
                  type="date"
                  value={formData.fiscal_year_end}
                  onChange={(e) => setFormData({ ...formData, fiscal_year_end: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Add notes about this allocation..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedAllocation ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedAllocation(null);
                  setEmployeeSearchQuery('');
                  setShowEmployeeDropdown(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Allocated Amount ($)
                  <SortIcon column="amount" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiscal Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedAllocations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {hasActiveFilters 
                    ? 'No allocations match your filters. Try adjusting your filter criteria.' 
                    : 'No allocations found. Click "Add Allocation" to create one.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedAllocations.map((allocation, index) => {
              const isEven = index % 2 === 0;
              const baseBgColor = isEven ? 'bg-gray-50' : 'bg-white';
              
              return (
              <tr 
                key={allocation.id}
                className={`${baseBgColor} transition-colors duration-150`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {allocation.employee?.first_name} {allocation.employee?.last_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {allocation.budget?.budget_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {allocation.budget?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${(allocation.allocated_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(allocation.fiscal_year_start).getFullYear()}-{new Date(allocation.fiscal_year_end).getFullYear()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleEdit(allocation)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(allocation.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

