'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ExportModal from './ExportModal';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  location_id: string;
  annual_salary: number;
  hourly_rate: number;
  status: string;
  title?: string;
  date_of_hire?: string;
  tbh_budget_id?: string;
  tbh_notes?: string;
  location?: { code: string; name: string };
  allocations?: any[];
  utilization?: any[];
}

interface Location {
  id: string;
  code: string;
  name: string;
}

interface EmployeeManagerProps {
  readOnly?: boolean;
}

export default function EmployeeManager({ readOnly = false }: EmployeeManagerProps = {}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    location_id: '',
    annual_salary: 0,
    status: 'active',
    title: '',
    date_of_hire: '',
    tbh_budget_id: '',
    tbh_notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; employee: Employee } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'salary' | 'hourly_rate' | 'allocated' | 'utilization' | 'location' | 'title' | 'proposed_salary' | 'needed_for_program' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'tbh'>('all'); // New: toggle between all employees and TBH

  useEffect(() => {
    loadData();
  }, []);

  const [budgets, setBudgets] = useState<Array<{
    id: string;
    budget_number: string;
    name: string;
    total_budget: number;
    color_code?: string;
    location?: { code: string; name: string };
    calculations?: any[];
    fringe_benefits_amount?: number;
    indirect_cost?: number;
  }>>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [employeesRes, locationsRes, budgetsRes, allocationsRes, expensesRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/locations'),
        fetch('/api/budgets'),
        fetch('/api/allocations'),
        fetch('/api/expenses'),
      ]);

      const employeesData = employeesRes.ok ? await employeesRes.json() : [];
      const locationsData = locationsRes.ok ? await locationsRes.json() : [];
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      const allocationsData = allocationsRes.ok ? await allocationsRes.json() : [];
      const expensesData = expensesRes.ok ? await expensesRes.json() : [];

      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setEmployees([]);
      setLocations([]);
      setBudgets([]);
      setAllocations([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = selectedEmployee ? 'PUT' : 'POST';
      const body = selectedEmployee ? { id: selectedEmployee.id, ...formData } : formData;

      const res = await fetch('/api/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadData();
        setShowForm(false);
        setSelectedEmployee(null);
        setFormData({
          first_name: '',
          last_name: '',
          location_id: '',
          annual_salary: 0,
          status: 'active',
          title: '',
          date_of_hire: '',
          tbh_budget_id: '',
          tbh_notes: '',
        });
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      location_id: employee.location_id || '', // Convert null to empty string for "Both" option
      annual_salary: employee.annual_salary,
      status: employee.status,
      title: employee.title || '',
      date_of_hire: employee.date_of_hire || '',
      tbh_budget_id: employee.tbh_budget_id || '',
      tbh_notes: employee.tbh_notes || '',
    });
    setShowForm(true);
    // Scroll to top of page when opening edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConvertToEmployee = async (employee: Employee) => {
    const confirmed = confirm(
      `Convert "${employee.first_name} ${employee.last_name}" from TBH to active employee?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          location_id: employee.location_id,
          annual_salary: employee.annual_salary,
          hourly_rate: employee.hourly_rate,
          status: 'active', // Convert from 'tbh' to 'active'
          title: employee.title || '',
          date_of_hire: employee.date_of_hire || '',
          tbh_budget_id: employee.tbh_budget_id || '',
          tbh_notes: employee.tbh_notes || '',
        }),
      });

      if (res.ok) {
        await loadData();
        alert(`"${employee.first_name} ${employee.last_name}" has been converted to an active employee.`);
      } else {
        const data = await res.json();
        alert(data.error || 'Error converting employee');
      }
    } catch (error) {
      console.error('Error converting employee:', error);
      alert('Error converting employee. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error deleting employee');
    }
  };

  const calculateUtilization = (employee: Employee) => {
    const totalAllocated = employee.allocations?.reduce((sum, a) => sum + (a.allocated_amount || 0), 0) || 0;
    const utilization = employee.annual_salary > 0 ? (totalAllocated / employee.annual_salary) * 100 : 0;
    const deficit = employee.annual_salary - totalAllocated;
    return { utilization, deficit, totalAllocated };
  };

  const handleContextMenu = (e: React.MouseEvent, employee: Employee) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      employee
    });
  };

  const handleContextMenuAction = (action: string, employee: Employee) => {
    setContextMenu(null);
    
    switch (action) {
      case 'edit':
        handleEdit(employee);
        break;
      case 'delete':
        handleDelete(employee.id);
        break;
      case 'view_allocations':
        // Navigate to allocations tab
        window.location.hash = 'allocations';
        break;
      case 'view_utilization':
        // Show utilization details in a better format
        const util = calculateUtilization(employee);
        alert(
          `Utilization Report: ${employee.first_name} ${employee.last_name}\n\n` +
          `Annual Salary: $${employee.annual_salary}\n` +
          `Total Allocated: $${util.totalAllocated}\n` +
          `Utilization: ${util.utilization}%\n` +
          `${util.deficit > 0 ? `Deficit: $${util.deficit}` : `Surplus: $${util.totalAllocated - employee.annual_salary}`}`
        );
        break;
      case 'mark_tbh':
        // Mark as TBH
        handleEdit(employee);
        setFormData(prev => ({ ...prev, status: 'tbh' }));
        break;
      case 'duplicate':
        // Duplicate employee
        setSelectedEmployee(null);
        setFormData({
          first_name: employee.first_name,
          last_name: employee.last_name + ' (Copy)',
          location_id: employee.location_id || '',
          annual_salary: employee.annual_salary,
          status: 'active',
          title: '',
          date_of_hire: '',
          tbh_budget_id: '',
          tbh_notes: '',
        });
        setShowForm(true);
        break;
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  const handleSort = (column: 'name' | 'salary' | 'hourly_rate' | 'allocated' | 'utilization' | 'location' | 'title' | 'proposed_salary' | 'needed_for_program') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      // Filter by view mode: 'all' excludes TBH, 'tbh' only shows TBH
      if (viewMode === 'all' && emp.status === 'tbh') {
        return false;
      }
      if (viewMode === 'tbh' && emp.status !== 'tbh') {
        return false;
      }
      
    const matchesSearch = searchQuery === '' || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      // Location filtering: 
      // - "all" shows everyone (including those with null location_id = Admin)
      // - "admin" shows only Admin employees (null location_id)
      // - specific location (VA/MD) shows employees with that location_id PLUS Admin employees (since Admin works in both)
      const matchesLocation = locationFilter === 'all' || 
        (locationFilter === 'admin' ? !emp.location_id : 
         (emp.location_id === locationFilter || !emp.location_id)); // Include Admin when filtering by VA/MD
      return matchesSearch && matchesStatus && matchesLocation;
    });

    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let diff = 0;
        
        if (sortBy === 'name') {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          diff = nameA.localeCompare(nameB);
        } else if (sortBy === 'salary') {
          diff = (a.annual_salary || 0) - (b.annual_salary || 0);
        } else if (sortBy === 'hourly_rate') {
          diff = (a.hourly_rate || 0) - (b.hourly_rate || 0);
        } else if (sortBy === 'allocated') {
          const utilA = calculateUtilization(a);
          const utilB = calculateUtilization(b);
          diff = utilA.totalAllocated - utilB.totalAllocated;
        } else if (sortBy === 'utilization') {
          const utilA = calculateUtilization(a);
          const utilB = calculateUtilization(b);
          diff = utilA.utilization - utilB.utilization;
        } else if (sortBy === 'location') {
          const locA = a.location?.code || (a.location_id ? 'N/A' : 'Admin');
          const locB = b.location?.code || (b.location_id ? 'N/A' : 'Admin');
          diff = locA.localeCompare(locB);
        } else if (sortBy === 'title') {
          const titleA = (a.title || '').toLowerCase();
          const titleB = (b.title || '').toLowerCase();
          diff = titleA.localeCompare(titleB);
        } else if (sortBy === 'proposed_salary') {
          diff = (a.annual_salary || 0) - (b.annual_salary || 0);
        } else if (sortBy === 'needed_for_program') {
          const budgetA = budgets.find(bud => bud.id === a.tbh_budget_id);
          const budgetB = budgets.find(bud => bud.id === b.tbh_budget_id);
          const budgetNumA = budgetA?.budget_number || '';
          const budgetNumB = budgetB?.budget_number || '';
          diff = budgetNumA.localeCompare(budgetNumB);
        }
        
        return sortDirection === 'asc' ? diff : -diff;
      });
    }

    return filtered;
  }, [employees, searchQuery, statusFilter, locationFilter, sortBy, sortDirection, viewMode, budgets]);

  // Calculate running totals of salaries by location
  // NOTE: This sums the stored annual_salary values (2 decimal precision) directly.
  // We do NOT calculate from hourly_rate * 2080 to avoid rounding errors.
  // The stored annual_salary is the source of truth.
  const salaryTotals = useMemo(() => {
    const totals = {
      va: 0,
      md: 0,
      admin: 0,
      total: 0
    };

    filteredAndSortedEmployees.forEach((emp) => {
      const salary = emp.annual_salary || 0;
      const locationCode = emp.location?.code?.toLowerCase() || '';
      
      if (locationCode === 'va') {
        totals.va += salary;
      } else if (locationCode === 'md') {
        totals.md += salary;
      } else {
        // Admin (null location_id means both MD & VA)
        totals.admin += salary;
      }
      
      totals.total += salary;
    });

    return totals;
  }, [filteredAndSortedEmployees]);

  // TBH-specific helper functions - matches overview page calculation
  const calculateBudgetStatus = (budget: typeof budgets[0]) => {
    // Calculate allocated amount (sum of all employee allocations for this budget)
    const allocated = allocations
      .filter(alloc => alloc.budget_id === budget.id)
      .reduce((sum, alloc) => sum + (alloc.allocated_amount || 0), 0);

    // Get fringe benefits amount
    const fringeBenefits = budget.fringe_benefits_amount || 0;

    // Calculate expenses total (sum of all expenses/budget allocations for this budget)
    const expensesTotal = expenses
      .filter(exp => exp.budget_id === budget.id)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Get indirect cost
    const indirectCost = budget.indirect_cost || 0;

    // Budget Allocated = employee allocations + fringe benefits + expenses (budget allocations) + indirect cost
    const budgetAllocated = allocated + fringeBenefits + expensesTotal + indirectCost;
    const remaining = (budget.total_budget || 0) - budgetAllocated;
    const hasMoney = remaining > 0;

    return {
      spent: budgetAllocated,
      remaining: Math.max(0, remaining),
      available: budget.total_budget || 0,
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

  const SortIcon = ({ column }: { column: 'name' | 'salary' | 'hourly_rate' | 'allocated' | 'utilization' | 'location' | 'title' | 'proposed_salary' | 'needed_for_program' }) => (
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
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      <div className="flex justify-between items-center">
        <div>
        <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
          {/* View Mode Toggle */}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Employees
            </button>
            <button
              onClick={() => setViewMode('tbh')}
              className={`px-4 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'tbh'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              TBH (To Be Hired)
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            📥 Export
          </button>
          <button
          onClick={() => {
            setSelectedEmployee(null);
            setFormData({
              first_name: '',
              last_name: '',
              location_id: '',
              annual_salary: 0,
              status: 'active',
              title: '',
              date_of_hire: '',
              tbh_budget_id: '',
              tbh_notes: '',
            });
            setShowForm(true);
            // Scroll to top of page when opening add form
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Employee
        </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedEmployee ? 'Edit Employee' : 'Add Employee'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value || '' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Admin (MD & VA)</option>
                  {Array.isArray(locations) && locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select "Both (MD & VA)" if the employee works across both locations
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Annual Salary</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.annual_salary}
                  onChange={(e) => setFormData({ ...formData, annual_salary: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Hourly rate will be calculated automatically (annual salary / 2080 hours)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Job title/position"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Hire</label>
                <input
                  type="date"
                  value={formData.date_of_hire}
                  onChange={(e) => setFormData({ ...formData, date_of_hire: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="laid_off">Laid Off</option>
                  <option value="tbh">To Be Hired (TBH)</option>
                </select>
              </div>
              {formData.status === 'tbh' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">TBH Budget (Which program needs this hire)</label>
                    <select
                      value={formData.tbh_budget_id}
                      onChange={(e) => setFormData({ ...formData, tbh_budget_id: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select budget</option>
                      {Array.isArray(budgets) && budgets.map((budget) => (
                        <option key={budget.id} value={budget.id}>
                          {budget.budget_number} - {budget.name || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedEmployee ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search Bar */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Location:</span>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              <option value="admin">Admin (MD & VA)</option>
              {Array.isArray(locations) && locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter - hide in TBH view */}
          {viewMode === 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="laid_off">Laid Off</option>
            </select>
          </div>
          )}
        </div>
        <div className="mt-2 space-y-2">
          <div className="text-sm text-gray-500">
            Showing {filteredAndSortedEmployees.length} of {viewMode === 'all' ? employees.filter(e => e.status !== 'tbh').length : employees.filter(e => e.status === 'tbh').length} {viewMode === 'all' ? 'employees' : 'TBH employees'}
          </div>
          {viewMode === 'all' && (
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
            <div className="text-gray-900">
              VA Total: <span className="text-blue-600">${salaryTotals.va.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-gray-900">
              MD Total: <span className="text-blue-600">${salaryTotals.md.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-gray-900">
              Admin Total: <span className="text-blue-600">${salaryTotals.admin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-gray-900 border-l border-gray-300 pl-4">
              Grand Total: <span className="text-green-600 font-bold">${salaryTotals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Name
                  <SortIcon column="name" />
                </button>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('location')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Loc
                  <SortIcon column="location" />
                </button>
              </th>
              {viewMode === 'all' && (
                <>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date of Hire
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button
                      onClick={() => handleSort('salary')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Salary
                      <SortIcon column="salary" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button
                      onClick={() => handleSort('hourly_rate')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Rate
                      <SortIcon column="hourly_rate" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button
                      onClick={() => handleSort('allocated')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Allocated
                      <SortIcon column="allocated" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button
                      onClick={() => handleSort('utilization')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Util %
                      <SortIcon column="utilization" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budgets</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </>
              )}
              {viewMode === 'tbh' && (
                <>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button
                      onClick={() => handleSort('title')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Title
                      <SortIcon column="title" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button
                      onClick={() => handleSort('proposed_salary')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Proposed Salary
                      <SortIcon column="proposed_salary" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button
                      onClick={() => handleSort('needed_for_program')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Needed For Program
                      <SortIcon column="needed_for_program" />
                    </button>
                  </th>
                </>
              )}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedEmployees.length === 0 ? (
              <tr>
                        <td colSpan={viewMode === 'all' ? 11 : 7} className="px-3 py-4 text-center text-gray-500">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No employees match your filters.' 
                    : 'No employees found. Click "Add Employee" to create one.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedEmployees.map((employee, index) => {
              const { utilization, deficit, totalAllocated } = calculateUtilization(employee);
              const isEven = index % 2 === 0;
              
              // Determine base background color - alternating even/odd darkness
              const baseBgColor = isEven ? 'bg-gray-50' : 'bg-white';
              
              return (
                <tr 
                  key={employee.id}
                  onContextMenu={(e) => handleContextMenu(e, employee)}
                  draggable={false}
                  className={`cursor-context-menu select-none ${baseBgColor} transition-colors duration-150`}
                  onMouseEnter={(e) => {
                    // Even hover should be darker than odd base (white/transparent)
                    // Odd hover should be lighter than even base (gray-50)
                    e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                  }}
                >
                  <td className="px-3 py-4 text-sm font-medium">
                    <div className="truncate max-w-[150px]" title={`${employee.first_name} ${employee.last_name}`}>
                    {employee.first_name} {employee.last_name}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {employee.location?.code || (employee.location_id ? 'N/A' : 'Admin')}
                  </td>
                  {viewMode === 'all' && (
                    <>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        {employee.title || '-'}
                  </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        {employee.date_of_hire ? new Date(employee.date_of_hire).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                  </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        ${(employee.annual_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        ${(employee.hourly_rate || 0).toFixed(4)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        ${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <div className="flex flex-col">
                          <span className={`font-medium whitespace-nowrap ${utilization >= 100 ? 'text-green-600' : utilization >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {utilization.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </span>
                    {deficit > 0 && (
                            <span className="text-xs text-red-600">-${deficit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                        </div>
                  </td>
                      <td className="px-3 py-4 text-sm">
                        {(() => {
                          const employeeAllocations = allocations.filter(a => a.employee_id === employee.id);
                          const employeeBudgets = employeeAllocations
                            .map(a => {
                              const budget = budgets.find(b => b.id === a.budget_id);
                              return budget ? { budget, allocation: a } : null;
                            })
                            .filter(b => b !== null) as Array<{ budget: typeof budgets[0], allocation: typeof allocations[0] }>;
                          
                          if (employeeBudgets.length === 0) {
                            return <span className="text-gray-400">None</span>;
                          }
                          
                          return (
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">{employeeBudgets.length} budget{employeeBudgets.length !== 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-600 max-w-xs">
                                {employeeBudgets.map((item, idx) => (
                                  <div key={item.budget.id || idx} className="truncate" title={`${item.budget.budget_number} - ${item.budget.name} ($${(item.allocation.allocated_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}>
                                    {item.budget.budget_number} - {item.budget.name} <span className="font-semibold text-gray-800">(${(item.allocation.allocated_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      employee.status === 'active' ? 'bg-green-100 text-green-800' :
                      employee.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                    </>
                  )}
                  {viewMode === 'tbh' && (() => {
                    const budget = getBudgetForEmployee(employee);
                    return (
                      <>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          {employee.title || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          {employee.annual_salary && employee.annual_salary > 0 ? (
                            `$${(employee.annual_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-gray-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
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
                      </>
                    );
                  })()}
                  <td className="px-3 py-4 whitespace-nowrap text-sm space-x-1">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-blue-600 hover:text-blue-900 text-xs"
                    >
                      Edit
                    </button>
                    {viewMode === 'tbh' && (
                      <button
                        onClick={() => handleConvertToEmployee(employee)}
                        className="text-green-600 hover:text-green-900 text-xs"
                      >
                        Convert
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      {/* TBH-specific sections when in TBH view */}
      {viewMode === 'tbh' && (
        <>
        </>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[200px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={() => handleContextMenuAction('edit', contextMenu.employee)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            ✏️ Edit Employee
          </button>
          <button
            onClick={() => handleContextMenuAction('duplicate', contextMenu.employee)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            📋 Duplicate Employee
          </button>
          <button
            onClick={() => handleContextMenuAction('view_allocations', contextMenu.employee)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            📊 View Allocations
          </button>
          <button
            onClick={() => handleContextMenuAction('view_utilization', contextMenu.employee)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            📈 View Utilization Report
          </button>
          <button
            onClick={() => handleContextMenuAction('mark_tbh', contextMenu.employee)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            👤 Mark as TBH
          </button>
          <hr className="my-1" />
          <button
            onClick={() => handleContextMenuAction('delete', contextMenu.employee)}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            🗑️ Delete Employee
          </button>
        </div>
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="employees"
        onExport={async (options) => {
          try {
            const body: any = {
              includeBudgets: false,
              includeEmployees: true,
              includeAllocations: false,
              includeTimeEntries: false,
              includeExpenses: false,
            };

            if (options.format === 'json' || options.format === 'csv') {
              alert(`${options.format.toUpperCase()} export coming soon! Using Excel format for now.`);
            }

            const response = await fetch('/api/export-excel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${options.filename}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
          } catch (error) {
            console.error('Export error:', error);
            alert('Error exporting data. Please try again.');
          }
        }}
      />
    </div>
  );
}

