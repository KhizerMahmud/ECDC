'use client';

import { useState, useEffect, useMemo } from 'react';

interface Expense {
  id: string;
  budget_id: string;
  category: string;
  expense_month: string;
  amount: number;
  description: string;
  budget?: { budget_number: string; name: string };
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  color_code?: string;
  fiscal_year_start?: string;
}

const DEFAULT_EXPENSE_CATEGORIES = [
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

interface ExpenseManagerProps {
  readOnly?: boolean;
}

export default function ExpenseManager({ readOnly = false }: ExpenseManagerProps = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    budget_id: '',
    category: '',
    amount: 0,
    description: '',
  });
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'amount' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Load custom categories from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expense_categories');
      if (saved) {
        try {
          setCustomCategories(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading custom categories:', e);
        }
      }
    }
  }, []);

  // Get all categories (default + custom)
  const allCategories = useMemo(() => {
    const combined = [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories];
    return Array.from(new Set(combined)).sort();
  }, [customCategories]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expensesRes, budgetsRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/budgets'),
      ]);

      const expensesData = expensesRes.ok ? await expensesRes.json() : [];
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];

      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setExpenses([]);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const addCustomCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim().toUpperCase())) {
      const categoryUpper = newCategory.trim().toUpperCase();
      const updated = [...customCategories, categoryUpper];
      setCustomCategories(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('expense_categories', JSON.stringify(updated));
      }
      // Automatically select the newly added category
      setFormData({ ...formData, category: categoryUpper });
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const saveCategories = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('expense_categories', JSON.stringify(customCategories));
      alert('Categories saved successfully!');
    }
  };

  const removeCustomCategory = (categoryToRemove: string) => {
    if (confirm(`Are you sure you want to remove the category "${categoryToRemove}"?`)) {
      const updated = customCategories.filter(cat => cat !== categoryToRemove);
      setCustomCategories(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('expense_categories', JSON.stringify(updated));
      }
      // Clear the category from form if it was selected
      if (formData.category === categoryToRemove) {
        setFormData({ ...formData, category: '' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) {
      return; // Prevent double submission
    }
    
    // Validate required fields
    if (!formData.budget_id) {
      alert('Please select a budget');
      return;
    }
    if (!formData.category) {
      alert('Please select a category');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      // Get the budget's fiscal year start date to use as expense_month
      const selectedBudget = budgets.find(b => b.id === formData.budget_id);
      if (!selectedBudget) {
        alert('Please select a budget');
        return;
      }

      // Fetch full budget data to get fiscal_year_start
      const budgetRes = await fetch('/api/budgets');
      if (!budgetRes.ok) {
        alert('Error loading budget data. Please try again.');
        return;
      }
      
      const budgetsData = await budgetRes.json();
      const fullBudget = budgetsData.find((b: any) => b.id === formData.budget_id);
      
      if (!fullBudget || !fullBudget.fiscal_year_start) {
        alert('Could not find budget fiscal year. Please select a valid budget.');
        return;
      }

      // Use fiscal year start as expense_month (expenses are for the whole year)
      const expenseMonth = fullBudget.fiscal_year_start;

      const method = selectedExpense ? 'PUT' : 'POST';
      const body = selectedExpense 
        ? { id: selectedExpense.id, ...formData, expense_month: expenseMonth }
        : { ...formData, expense_month: expenseMonth };

      console.log('Submitting expense:', body);

      const res = await fetch('/api/expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let responseData: any = {};
      try {
        const text = await res.text();
        if (text) {
          responseData = JSON.parse(text);
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }

      if (res.ok) {
        console.log('Expense saved successfully:', responseData);
        await loadData();
        setShowForm(false);
        setSelectedExpense(null);
        setFormData({
          budget_id: '',
          category: '',
          amount: 0,
          description: '',
        });
        // Dispatch event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('expenseUpdated'));
        }
        alert('Expense saved successfully!');
      } else {
        console.error('Error response:', res.status, responseData);
        const errorMessage = responseData.error || responseData.message || `Server error (${res.status}). Please check the console for details.`;
        alert(`Error saving expense: ${errorMessage}`);
        // Don't close the form on error
      }
    } catch (error: any) {
      console.error('Error saving expense:', error);
      alert(`Error saving expense: ${error.message || 'Please try again. Check the browser console for details.'}`);
      // Don't close the form on error
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      budget_id: expense.budget_id,
      category: expense.category,
      amount: expense.amount,
      description: expense.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        // Dispatch event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('expenseUpdated'));
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense');
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

  const sortedExpenses = useMemo(() => {
    if (!sortBy) return expenses;
    
    const sorted = [...expenses].sort((a, b) => {
      const diff = (a.amount || 0) - (b.amount || 0);
      return sortDirection === 'asc' ? diff : -diff;
    });
    
    return sorted;
  }, [expenses, sortBy, sortDirection]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const SortIcon = ({ column }: { column: 'amount' | 'month' }) => (
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
        <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setSelectedExpense(null);
              setFormData({
                budget_id: '',
                category: '',
                amount: 0,
                description: '',
              });
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Expense
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedExpense ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget</label>
                <select
                  value={formData.budget_id}
                  onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select budget</option>
                  {Array.isArray(budgets) && budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.budget_number} - {budget.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select category</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    title="Add new category"
                  >
                    +
                  </button>
                </div>
                {showAddCategory && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomCategory();
                        }
                      }}
                      placeholder="Enter new category"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCategory(false);
                        setNewCategory('');
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {customCategories.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs font-medium text-gray-700">Custom Categories:</div>
                    <div className="flex flex-wrap gap-2">
                      {customCategories.map((cat) => (
                        <div
                          key={cat}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs"
                        >
                          <span className="text-gray-700">{cat}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomCategory(cat)}
                            className="text-red-600 hover:text-red-800 font-bold"
                            title={`Remove ${cat}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (selectedExpense ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedExpense(null);
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Amount
                  <SortIcon column="amount" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(sortedExpenses) && sortedExpenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    {budgets.find(b => b.id === expense.budget_id)?.color_code && (
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: budgets.find(b => b.id === expense.budget_id)?.color_code }}
                      />
                    )}
                    {expense.budget?.budget_number}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{expense.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${expense.amount || 0}
                </td>
                <td className="px-6 py-4 text-sm">{expense.description || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

