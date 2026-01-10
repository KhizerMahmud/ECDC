'use client';

import { useState, useEffect, useMemo } from 'react';

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  gl_code?: string;
  fiscal_year_start?: string;
  fiscal_year_end?: string;
  funder?: { code: string; name: string };
}

interface ProgramBudgetLineItem {
  id: string;
  budget_id: string;
  category: string;
  budget_month: string;
  budgeted_amount: number;
  spent_amount: number;
  balance: number;
}

interface LineItemSummary {
  category: string;
  total_budgeted: number;
  total_spent: number;
  total_balance: number;
  running_percentage: number;
}

interface ProgramBudgetLineItemsProps {
  readOnly?: boolean;
}

export default function ProgramBudgetLineItems({ readOnly = false }: ProgramBudgetLineItemsProps = {}) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [lineItems, setLineItems] = useState<ProgramBudgetLineItem[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProgramBudgetLineItem | null>(null);
  const [formData, setFormData] = useState({
    budget_id: '',
    category: '',
    budget_month: '',
    budgeted_amount: 0,
  });

  // Common line item categories
  const commonCategories = [
    'Travel',
    'Supplies',
    'Staff Development',
    'Interpretation',
    'Client Activity',
    'Rent',
    'Capacity Building Event',
    'Youth Incentives',
    'Local Travel',
    'Client Training',
    'Contractual',
  ];

  useEffect(() => {
    loadData();
    // Set default month to current month
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const loadData = async () => {
    try {
      const [budgetsRes, lineItemsRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/program-budget-line-items'),
      ]);

      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      const lineItemsData = lineItemsRes.ok ? await lineItemsRes.json() : [];

      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setLineItems(Array.isArray(lineItemsData) ? lineItemsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setBudgets([]);
      setLineItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = selectedItem ? 'PUT' : 'POST';
      const body = selectedItem ? { id: selectedItem.id, ...formData } : formData;

      const res = await fetch('/api/program-budget-line-items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadData();
        setShowForm(false);
        setSelectedItem(null);
        setFormData({
          budget_id: '',
          category: '',
          budget_month: '',
          budgeted_amount: 0,
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Error saving line item');
      }
    } catch (error) {
      console.error('Error saving line item:', error);
      alert('Error saving line item');
    }
  };

  const handleEdit = (item: ProgramBudgetLineItem) => {
    setSelectedItem(item);
    setFormData({
      budget_id: item.budget_id,
      category: item.category,
      budget_month: item.budget_month.substring(0, 7),
      budgeted_amount: item.budgeted_amount,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;
    
    try {
      const res = await fetch('/api/program-budget-line-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        await loadData();
      } else {
        alert('Error deleting line item');
      }
    } catch (error) {
      console.error('Error deleting line item:', error);
      alert('Error deleting line item');
    }
  };

  // Filter and group line items
  const filteredLineItems = useMemo(() => {
    let filtered = lineItems;
    
    if (selectedBudget !== 'all') {
      filtered = filtered.filter(item => item.budget_id === selectedBudget);
    }
    
    if (selectedMonth) {
      filtered = filtered.filter(item => 
        item.budget_month.startsWith(selectedMonth)
      );
    }
    
    return filtered;
  }, [lineItems, selectedBudget, selectedMonth]);

  // Group by budget and calculate summaries
  const groupedByBudget = useMemo(() => {
    const grouped: { [key: string]: { budget: Budget; items: ProgramBudgetLineItem[]; summary: LineItemSummary[] } } = {};
    
    filteredLineItems.forEach(item => {
      const budget = budgets.find(b => b.id === item.budget_id);
      if (!budget) return;
      
      if (!grouped[budget.id]) {
        grouped[budget.id] = {
          budget,
          items: [],
          summary: [],
        };
      }
      
      grouped[budget.id].items.push(item);
    });
    
    // Calculate summaries for each budget
    Object.keys(grouped).forEach(budgetId => {
      const categoryMap: { [key: string]: LineItemSummary } = {};
      
      grouped[budgetId].items.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = {
            category: item.category,
            total_budgeted: 0,
            total_spent: 0,
            total_balance: 0,
            running_percentage: 0,
          };
        }
        
        categoryMap[item.category].total_budgeted += item.budgeted_amount;
        categoryMap[item.category].total_spent += item.spent_amount;
        categoryMap[item.category].total_balance += item.balance;
      });
      
      // Calculate running percentage (spent / budgeted * 100)
      grouped[budgetId].summary = Object.values(categoryMap).map(summary => ({
        ...summary,
        running_percentage: summary.total_budgeted > 0 
          ? (summary.total_spent / summary.total_budgeted) * 100 
          : 0,
      })).sort((a, b) => a.category.localeCompare(b.category));
    });
    
    return grouped;
  }, [filteredLineItems, budgets]);

  // Get fiscal year months for dropdown
  const fiscalYearMonths = useMemo(() => {
    if (budgets.length === 0) return [];
    
    const firstBudget = budgets[0];
    if (!firstBudget) return [];
    
    const months: string[] = [];
    const start = new Date(firstBudget.fiscal_year_start || new Date().toISOString().split('T')[0]);
    const end = new Date(firstBudget.fiscal_year_end || new Date().toISOString().split('T')[0]);
    
    let current = new Date(start);
    while (current <= end) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }, [budgets]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Program Budget Line Items</h2>
        <button
          onClick={() => {
            setSelectedItem(null);
            setFormData({
              budget_id: selectedBudget !== 'all' ? selectedBudget : '',
              category: '',
              budget_month: selectedMonth || '',
              budgeted_amount: 0,
            });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Line Item
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Program:</span>
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Programs</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.budget_number} - {budget.name || 'N/A'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Months</option>
              {fiscalYearMonths.map((month) => {
                const date = new Date(month + '-01');
                return (
                  <option key={month} value={month}>
                    {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedItem ? 'Edit Line Item' : 'Add Line Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Program</label>
                <select
                  value={formData.budget_id}
                  onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select program</option>
                  {budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.budget_number} - {budget.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  list="categories"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter or select category"
                  required
                />
                <datalist id="categories">
                  {commonCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Month</label>
                <input
                  type="month"
                  value={formData.budget_month}
                  onChange={(e) => setFormData({ ...formData, budget_month: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Budgeted Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budgeted_amount}
                  onChange={(e) => setFormData({ ...formData, budgeted_amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedItem ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Programs List */}
      <div className="space-y-6">
        {Object.values(groupedByBudget).map(({ budget, items, summary }) => (
          <div key={budget.id} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {budget.budget_number} - {budget.name || 'N/A'}
              </h3>
              {budget.gl_code && (
                <p className="text-sm text-gray-500">GL Code: {budget.gl_code}</p>
              )}
              {budget.funder && (
                <p className="text-sm text-gray-500">Funder: {budget.funder.code} - {budget.funder.name}</p>
              )}
            </div>

            {/* Summary Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Budgeted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Running %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.map((item, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <tr
                        key={item.category}
                        className={isEven ? 'bg-gray-50' : 'bg-white'}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                        }}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${item.total_budgeted.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${item.total_spent.toFixed(2)}
                        </td>
                        <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          item.total_balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${item.total_balance.toFixed(2)}
                        </td>
                        <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          item.running_percentage <= 80 ? 'text-green-600' : 
                          item.running_percentage <= 100 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {item.running_percentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => {
                              const monthItems = items.filter(i => i.category === item.category);
                              if (monthItems.length > 0) {
                                handleEdit(monthItems[0]);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Monthly Detail Table */}
            <div className="px-6 py-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Details</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Budgeted</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Spent</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% Used</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => {
                      const isEven = index % 2 === 0;
                      const percentUsed = item.budgeted_amount > 0 
                        ? (item.spent_amount / item.budgeted_amount) * 100 
                        : 0;
                      return (
                        <tr
                          key={item.id}
                          className={isEven ? 'bg-gray-50' : 'bg-white'}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                          }}
                        >
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.category}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.budget_month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                            ${item.budgeted_amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                            ${item.spent_amount.toFixed(2)}
                          </td>
                          <td className={`px-3 py-3 whitespace-nowrap text-sm text-right font-medium ${
                            item.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${item.balance.toFixed(2)}
                          </td>
                          <td className={`px-3 py-3 whitespace-nowrap text-sm text-right font-medium ${
                            percentUsed <= 80 ? 'text-green-600' : 
                            percentUsed <= 100 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {percentUsed.toFixed(1)}%
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedByBudget).length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No line items found. Click "Add Line Item" to create one.
        </div>
      )}
    </div>
  );
}

