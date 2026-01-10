'use client';

import { useState, useEffect, useMemo } from 'react';
import ExportModal from './ExportModal';

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  location_id: string;
  funder_id?: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  total_budget: number;
  fringe_rate?: number;
  fringe_benefits_amount?: number;
  indirect_cost?: number;
  notes?: string;
  color_code?: string;
  location?: { code: string; name: string };
  funder?: { code: string; name: string; color_code?: string };
  line_items?: any[];
  calculations?: any[];
}

interface Location {
  id: string;
  code: string;
  name: string;
}

interface Funder {
  id: string;
  code: string;
  name: string;
  description?: string;
}

const EXPENSE_CATEGORIES = [
  'WAGES',
  'TELEPHONE',
  'LOCAL TRAVEL',
  'INTERPRETATION',
  'RENT',
  'COMPUTER',
  'AUTO MAINTENANCE',
  'CLIENT TRANSPORTATION',
  'HOUSING',
  'FOOD',
  'MISC',
  'CLOTHING',
];

interface BudgetManagerProps {
  readOnly?: boolean;
}

export default function BudgetManager({ readOnly = false }: BudgetManagerProps = {}) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [funders, setFunders] = useState<Funder[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    budget_number: '',
    name: '',
    location_id: '',
    funder_id: '',
    fiscal_year_start: '2025-10-01',
    fiscal_year_end: '2026-09-30',
    total_budget: 0,
    fringe_rate: 36.1,
  });
  const [loading, setLoading] = useState(true);
  const [selectedFunder, setSelectedFunder] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [budgetNameFilter, setBudgetNameFilter] = useState<string>('all');
  const [budgetNumberFilter, setBudgetNumberFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'budget_number' | 'name' | 'total_budget' | 'allocated' | 'remaining'>('budget_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Listen for allocation and expense updates to refresh data
  useEffect(() => {
    const handleAllocationUpdate = async () => {
      try {
        const [allocationsRes, expensesRes] = await Promise.all([
          fetch('/api/allocations'),
          fetch('/api/expenses'),
        ]);
        if (allocationsRes.ok) {
          const data = await allocationsRes.json();
          setAllocations(Array.isArray(data) ? data : []);
        }
        if (expensesRes.ok) {
          const data = await expensesRes.json();
          setExpenses(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error refreshing allocations/expenses:', error);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('allocationUpdated', handleAllocationUpdate);
      window.addEventListener('expenseUpdated', handleAllocationUpdate);
      return () => {
        window.removeEventListener('allocationUpdated', handleAllocationUpdate);
        window.removeEventListener('expenseUpdated', handleAllocationUpdate);
      };
    }
  }, []);

  const [allocations, setAllocations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [budgetsRes, locationsRes, fundersRes, allocationsRes, expensesRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/locations'),
        fetch('/api/funders'),
        fetch('/api/allocations'),
        fetch('/api/expenses'),
      ]);

      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      const locationsData = locationsRes.ok ? await locationsRes.json() : [];
      const fundersData = fundersRes.ok ? await fundersRes.json() : [];
      const allocationsData = allocationsRes.ok ? await allocationsRes.json() : [];
      const expensesData = expensesRes.ok ? await expensesRes.json() : [];

      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setFunders(Array.isArray(fundersData) ? fundersData : []);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setBudgets([]);
      setLocations([]);
      setFunders([]);
      setAllocations([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.budget_number.trim()) {
      alert('Please enter a budget number');
      return;
    }

    if (!formData.name.trim()) {
      alert('Please enter a budget name');
      return;
    }

    if (!formData.location_id) {
      alert('Please select a location');
      return;
    }

    if (!formData.fiscal_year_start) {
      alert('Please select a fiscal year start date');
      return;
    }

    if (!formData.fiscal_year_end) {
      alert('Please select a fiscal year end date');
      return;
    }

    if (formData.total_budget < 0) {
      alert('Total budget must be a positive number');
      return;
    }

    try {
      const method = selectedBudget ? 'PUT' : 'POST';
      const body = selectedBudget ? { id: selectedBudget.id, ...formData } : formData;

      const res = await fetch('/api/budgets', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        await loadData();
        setShowForm(false);
        setSelectedBudget(null);
        setFormData({
          budget_number: '',
          name: '',
          location_id: '',
          funder_id: '',
          fiscal_year_start: '2025-10-01',
          fiscal_year_end: '2026-09-30',
          total_budget: 0,
          fringe_rate: 36.1,
        });
        alert(selectedBudget ? 'Budget updated successfully!' : 'Budget created successfully!');
      } else {
        alert(data.error || 'Error saving budget. Please check your inputs.');
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Error saving budget. Please try again.');
    }
  };

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      budget_number: budget.budget_number,
      name: budget.name || '',
      location_id: budget.location_id,
      funder_id: budget.funder_id || '',
      fiscal_year_start: budget.fiscal_year_start,
      fiscal_year_end: budget.fiscal_year_end,
      total_budget: budget.total_budget,
      fringe_rate: budget.fringe_rate || 36.1,
    });
    setShowForm(true);
  };

  const calculateBudgetStatus = (budget: Budget) => {
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
    // This matches the overview page calculation
    const budgetAllocated = allocated + fringeBenefits + expensesTotal + indirectCost;
    // Truncate allocated to 2 decimal places before calculating remaining to ensure consistency
    const budgetAllocatedTruncated = Math.floor(budgetAllocated * 100) / 100;
    const totalBudgetTruncated = Math.floor((budget.total_budget || 0) * 100) / 100;
    const remaining = totalBudgetTruncated - budgetAllocatedTruncated;
    const isOverspent = remaining < 0;

    return {
      spent: budgetAllocatedTruncated, // This is actually "Budget Allocated" now, truncated to 2 decimals
      remaining: remaining, // Don't clamp to 0 - show actual remaining (can be negative)
      available: budget.total_budget || 0,
      isOverspent,
    };
  };

  const handleDelete = async (budget: Budget) => {
    const confirmed = confirm(
      `Are you sure you want to delete budget "${budget.budget_number} - ${budget.name}"?\n\n` +
      'This action cannot be undone and will delete:\n' +
      '- All time entries for this budget\n' +
      '- All expenses for this budget\n' +
      '- All budget calculations\n' +
      '- All budget line items\n\n' +
      'Click OK to continue, or Cancel to abort.'
    );

    if (!confirmed) return;

    // Extra confirmation for safety
    const userInput = prompt('Type "DELETE" to confirm deletion:');
    if (userInput !== 'DELETE') {
      alert('Deletion cancelled. You must type "DELETE" to confirm.');
      return;
    }

    try {
      const res = await fetch(`/api/budgets?id=${budget.id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        await loadData();
        // Dispatch event to notify other components (like overview page)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('budgetUpdated'));
        }
        alert(`Budget "${budget.budget_number}" deleted successfully.`);
      } else {
        alert(data.error || 'Error deleting budget');
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Error deleting budget. Please try again.');
    }
  };

  const initializeLineItems = async (budgetId: string) => {
    try {
      // Create line items for all categories
      for (const category of EXPENSE_CATEGORIES) {
        await fetch('/api/budget-line-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budget_id: budgetId,
            category,
            budgeted_amount: 0,
            multiplier: category === 'WAGES' ? 1 : 1,
          }),
        });
      }
    } catch (error) {
      console.error('Error initializing line items:', error);
    }
  };

  // Get unique budget numbers and names for dropdowns
  const uniqueBudgetNumbers = useMemo(() => {
    const numbers = budgets.map(b => b.budget_number).filter((v, i, a) => a.indexOf(v) === i);
    return numbers.sort();
  }, [budgets]);

  const uniqueBudgetNames = useMemo(() => {
    const names = budgets
      .map(b => b.name)
      .filter((name): name is string => !!name)
      .filter((v, i, a) => a.indexOf(v) === i);
    return names.sort();
  }, [budgets]);

  // Filter budgets - must be before early return (Rules of Hooks)
  const filteredBudgets = useMemo(() => {
    let filtered = budgets.filter((budget) => {
      const matchesBudgetName = budgetNameFilter === '' || budgetNameFilter === 'all' || 
        budget.name === budgetNameFilter;
      
      const matchesBudgetNumber = budgetNumberFilter === '' || budgetNumberFilter === 'all' || 
        budget.budget_number === budgetNumberFilter;
      
      const matchesFunder = selectedFunder === 'all' || budget.funder_id === selectedFunder;
      const matchesLocation = selectedLocation === 'all' || budget.location_id === selectedLocation;
      
      return matchesBudgetName && matchesBudgetNumber && matchesFunder && matchesLocation;
    });

    // Sort based on sortBy and sortDirection
    filtered = filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'budget_number') {
        comparison = a.budget_number.localeCompare(b.budget_number);
      } else if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'total_budget') {
        comparison = (a.total_budget || 0) - (b.total_budget || 0);
      } else if (sortBy === 'allocated') {
        const statusA = calculateBudgetStatus(a);
        const statusB = calculateBudgetStatus(b);
        comparison = statusA.spent - statusB.spent;
      } else if (sortBy === 'remaining') {
        const statusA = calculateBudgetStatus(a);
        const statusB = calculateBudgetStatus(b);
        comparison = statusA.remaining - statusB.remaining;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [budgets, budgetNameFilter, budgetNumberFilter, selectedFunder, selectedLocation, sortBy, sortDirection, allocations, expenses]);

  const handleSort = (column: 'budget_number' | 'name' | 'total_budget' | 'allocated' | 'remaining') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };


  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Budgets</h2>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              📥 Export
            </button>
            <button
              onClick={() => {
                setSelectedBudget(null);
                setFormData({
                  budget_number: '',
                  name: '',
                  location_id: '',
                  funder_id: '',
                  fiscal_year_start: '2025-10-01',
                  fiscal_year_end: '2026-09-30',
                  total_budget: 0,
                  fringe_rate: 36.1,
                });
                setShowForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Budget
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Budget Number Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Budget Number:</span>
            <select
              value={budgetNumberFilter}
              onChange={(e) => setBudgetNumberFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Budget Numbers</option>
              {uniqueBudgetNumbers.map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Name Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Budget Name:</span>
            <select
              value={budgetNameFilter}
              onChange={(e) => setBudgetNameFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Budget Names</option>
              {uniqueBudgetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Location:</span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              {Array.isArray(locations) && locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code}
                </option>
              ))}
            </select>
          </div>

          {/* Funder Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Funder:</span>
            <select
              value={selectedFunder}
              onChange={(e) => setSelectedFunder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Funders</option>
              {Array.isArray(funders) && funders.map((funder) => (
                <option key={funder.id} value={funder.id}>
                  {funder.code}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Showing {filteredBudgets.length} of {budgets.length} budgets
        </div>
      </div>

      {showForm && !readOnly && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedBudget ? 'Edit Budget' : 'Add Budget'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget Number</label>
                <input
                  type="text"
                  value={formData.budget_number}
                  onChange={(e) => {
                    setFormData({ ...formData, budget_number: e.target.value });
                  }}
                  onBlur={(e) => {
                    // Auto-append contract code based on location only when user finishes editing
                    if (formData.location_id && e.target.value) {
                      const location = locations.find(l => l.id === formData.location_id);
                      if (location) {
                        const suffix = location.code === 'VA' ? '-30' : '-33';
                        let value = e.target.value.trim();
                        // Only auto-append if value doesn't already end with the correct suffix
                        if (!value.endsWith(suffix)) {
                          // Remove any existing suffix and add correct one
                          value = value.replace(/-\d{2}$/, '') + suffix;
                          setFormData({ ...formData, budget_number: value });
                        }
                      }
                    }
                  }}
                  placeholder="e.g., 2343-30 (VA) or 2343-33 (MD)"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  VA contracts end in -30, MD contracts end in -33. The suffix will be added automatically when you finish typing.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <select
                  value={formData.location_id}
                  onChange={(e) => {
                    const locationId = e.target.value;
                    const location = locations.find(l => l.id === locationId);
                    let budgetNumber = formData.budget_number;
                    
                    // Auto-update contract code suffix when location changes
                    if (location && budgetNumber) {
                      const suffix = location.code === 'VA' ? '-30' : '-33';
                      budgetNumber = budgetNumber.replace(/-\d{2}$/, '') + suffix;
                    }
                    
                    setFormData({ ...formData, location_id: locationId, budget_number: budgetNumber });
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select location</option>
                  {Array.isArray(locations) && locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code === 'VA' ? '-30' : '-33'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Funder/Donor</label>
                <select
                  value={formData.funder_id}
                  onChange={(e) => setFormData({ ...formData, funder_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select funder (optional)</option>
                  {Array.isArray(funders) && funders.map((funder) => (
                    <option key={funder.id} value={funder.id}>
                      {funder.code}{funder.description ? ` - ${funder.description}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select the funder/donor for this budget (e.g., ONA, MORA, DV, PC, MG, etc.)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Budget</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fringe Benefits Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fringe_rate}
                  onChange={(e) => setFormData({ ...formData, fringe_rate: parseFloat(e.target.value) || 36.1 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="36.1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fringe benefits rate as a percentage (e.g., 36.1 for 36.1%). Defaults to 36.1% if not specified.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fiscal Year Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fiscal_year_start}
                  onChange={(e) => {
                    const start = e.target.value;
                    if (start) {
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
                        fiscal_year_start: '',
                        fiscal_year_end: '',
                      });
                    }
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Select the fiscal year start date (typically October 1st). The end date (September 30th) will be automatically calculated, but you can edit it below if needed.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fiscal Year End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fiscal_year_end}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      fiscal_year_end: e.target.value,
                    });
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Automatically set to one year after start date, but can be manually adjusted if needed.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedBudget ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedBudget(null);
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('budget_number')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Budget #
                  <span className="flex flex-col">
                    <svg
                      className={`w-2 h-2 ${sortBy === 'budget_number' && sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 0L0 5h10z" />
                    </svg>
                    <svg
                      className={`w-2 h-2 -mt-1 ${sortBy === 'budget_number' && sortDirection === 'desc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 10L0 5h10z" />
                    </svg>
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Name
                  <span className="flex flex-col">
                    <svg
                      className={`w-2 h-2 ${sortBy === 'name' && sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 0L0 5h10z" />
                    </svg>
                    <svg
                      className={`w-2 h-2 -mt-1 ${sortBy === 'name' && sortDirection === 'desc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 10L0 5h10z" />
                    </svg>
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funder</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('total_budget')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Total Budget
                  <span className="flex flex-col">
                    <svg
                      className={`w-2 h-2 ${sortBy === 'total_budget' && sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 0L0 5h10z" />
                    </svg>
                    <svg
                      className={`w-2 h-2 -mt-1 ${sortBy === 'total_budget' && sortDirection === 'desc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 10L0 5h10z" />
                    </svg>
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('allocated')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Allocated
                  <span className="flex flex-col">
                    <svg
                      className={`w-2 h-2 ${sortBy === 'allocated' && sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 0L0 5h10z" />
                    </svg>
                    <svg
                      className={`w-2 h-2 -mt-1 ${sortBy === 'allocated' && sortDirection === 'desc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 10L0 5h10z" />
                    </svg>
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('remaining')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Remaining
                  <span className="flex flex-col">
                    <svg
                      className={`w-2 h-2 ${sortBy === 'remaining' && sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 0L0 5h10z" />
                    </svg>
                    <svg
                      className={`w-2 h-2 -mt-1 ${sortBy === 'remaining' && sortDirection === 'desc' ? 'text-gray-900' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 10 10"
                    >
                      <path d="M5 10L0 5h10z" />
                    </svg>
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              {!readOnly && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBudgets.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="px-6 py-4 text-center text-gray-500">
                  {budgetNameFilter !== 'all' || budgetNumberFilter !== 'all' || selectedFunder !== 'all' || selectedLocation !== 'all' 
                    ? 'No budgets match your filters.' 
                    : readOnly 
                      ? 'No budgets found.'
                      : 'No budgets found. Click "Add Budget" to create one.'}
                </td>
              </tr>
            ) : (
              filteredBudgets.map((budget, index) => {
                const status = calculateBudgetStatus(budget);
                const isEven = index % 2 === 0;
                
                // Determine base background color - alternating even/odd darkness
                let baseBgColor = '';
                if (status.isOverspent) {
                  baseBgColor = isEven ? 'bg-red-50' : 'bg-red-100';
                } else {
                  baseBgColor = isEven ? 'bg-gray-50' : 'bg-white';
                }
                
                return (
                <tr 
                  key={budget.id} 
                  className={`${baseBgColor} transition-colors duration-150 ${
                    status.isOverspent ? 'hover:bg-red-200' : 'hover:bg-gray-100'
                  }`}
                  onMouseEnter={(e) => {
                    if (status.isOverspent) {
                      e.currentTarget.style.backgroundColor = isEven ? '#fecaca' : '#fca5a5';
                    } else {
                      // Even hover should be darker than odd base (white/transparent)
                      // Odd hover should be lighter than even base (gray-50)
                      e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status.isOverspent) {
                      e.currentTarget.style.backgroundColor = isEven ? '#fef2f2' : '#fee2e2';
                    } else {
                      e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {budget.budget_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{budget.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{budget.location?.code || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {budget.funder ? (
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: budget.funder.color_code ? `${budget.funder.color_code}20` : '#dbeafe',
                            color: budget.funder.color_code || '#1e40af',
                            border: budget.funder.color_code ? `1px solid ${budget.funder.color_code}` : '1px solid #93c5fd'
                          }}
                        >
                          {budget.funder.code}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    ${(budget.total_budget || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    ${status.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    status.isOverspent ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ${Math.abs(status.remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {status.isOverspent ? (
                      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 font-medium">
                        OVERSPENT
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-medium">
                        OK
                      </span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(budget)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="budgets"
        onExport={async (options) => {
          try {
            let url = '/api/export-excel';
            const body: any = {
              includeBudgets: true,
              includeEmployees: false,
              includeAllocations: false,
              includeTimeEntries: false,
              includeExpenses: false,
            };

            if (options.format === 'json' || options.format === 'csv') {
              // For JSON/CSV, we'll need to handle differently
              // For now, just use the Excel endpoint
              alert(`${options.format.toUpperCase()} export coming soon! Using Excel format for now.`);
            }

            const response = await fetch(url, {
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

