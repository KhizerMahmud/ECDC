'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import BudgetManager from './components/BudgetManager';
import EmployeeManager from './components/EmployeeManager';
import AllocationManager from './components/AllocationManager';
import BudgetPrint from './components/BudgetPrint';
import FunderManager from './components/FunderManager';
import FiscalYearManager from './components/FiscalYearManager';
import ExportToExcel from './components/ExportToExcel';
import ProgramBudgetLineItems from './components/ProgramBudgetLineItems';

interface Location {
  id: string;
  code: string;
  name: string;
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  location_id: string;
  funder_id?: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  total_budget: number;
  fringe_benefits_amount?: number;
  indirect_cost?: number;
  location?: Location;
  funder?: { code: string; name: string; description?: string };
  calculations?: any[];
}

interface Funder {
  id: string;
  code: string;
  name: string;
  description?: string;
  color_code?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  location_id: string;
  annual_salary: number;
  hourly_rate: number;
  status: string;
  tbh_budget_id?: string | null;
  allocations?: any[];
  utilization?: any[];
}

interface BudgetDashboardClientProps {
  readOnly?: boolean;
  sharedToken?: string;
}

export default function BudgetDashboardClient({ readOnly = false, sharedToken }: BudgetDashboardClientProps = {}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [funders, setFunders] = useState<Funder[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set());
  const [expandedBudgetAllocations, setExpandedBudgetAllocations] = useState<Set<string>>(new Set());
  const [expandedDCA, setExpandedDCA] = useState<Set<string>>(new Set());
  const [expandedIndirectCost, setExpandedIndirectCost] = useState<Set<string>>(new Set());
  const [expandedTotalProgramCost, setExpandedTotalProgramCost] = useState<Set<string>>(new Set());
  const [editingFringeBenefits, setEditingFringeBenefits] = useState<{ [key: string]: number }>({});
  const [editingIndirectCost, setEditingIndirectCost] = useState<{ [key: string]: number | null }>({});
  const [indirectCostEnabled, setIndirectCostEnabled] = useState<{ [key: string]: boolean }>({});
  const [editingExpense, setEditingExpense] = useState<{ [budgetId: string]: string | null }>({});
  const [newExpenseCategory, setNewExpenseCategory] = useState<{ [budgetId: string]: string }>({});
  const [newExpenseAmount, setNewExpenseAmount] = useState<{ [budgetId: string]: number }>({});
  const [newExpenseDescription, setNewExpenseDescription] = useState<{ [budgetId: string]: string }>({});
  const [showAddExpenseForm, setShowAddExpenseForm] = useState<{ [budgetId: string]: boolean }>({});
  const [monthlyAllocations, setMonthlyAllocations] = useState<{ [allocationId: string]: { [month: string]: number } }>({});
  const [monthlyExpenseAllocations, setMonthlyExpenseAllocations] = useState<{ [expenseId: string]: { [month: string]: number } }>({});
  const [monthlyFringeAllocations, setMonthlyFringeAllocations] = useState<{ [budgetId: string]: { [month: string]: number } }>({});
  const [monthlyIndirectCostAllocations, setMonthlyIndirectCostAllocations] = useState<{ [budgetId: string]: { [month: string]: number } }>({});
  const [expenseModal, setExpenseModal] = useState<{ isOpen: boolean; expenseId: string | null; budgetId: string | null; action: 'edit' | 'delete' | null; expense: any | null }>({
    isOpen: false,
    expenseId: null,
    budgetId: null,
    action: null,
    expense: null,
  });
  const [rowColors] = useState<{
    totalEmployeeAllocations: string;
    totalPersonnelCost: string;
    fringeBenefits: string;
    indirectCost: string;
    totalBudgetAllocations: string;
    other: string;
    dca: string;
  }>({
    totalEmployeeAllocations: 'bg-blue-100',
    totalPersonnelCost: 'bg-green-50',
    fringeBenefits: 'bg-orange-100',
    indirectCost: 'bg-purple-100',
    totalBudgetAllocations: 'bg-green-50',
    other: 'bg-indigo-50',
    dca: 'bg-pink-50',
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'employees' | 'time' | 'allocations' | 'funders' | 'fiscal-years' | 'export' | 'print' | 'program-line-items'>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const handleFringeBenefitsChange = async (budgetId: string, value: number) => {
    try {
      const res = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: budgetId,
          fringe_benefits_amount: value,
        }),
      });

      if (res.ok) {
        // Update the local state - don't call loadData() to prevent page refresh
        setBudgets(prev => prev.map(b => 
          b.id === budgetId ? { ...b, fringe_benefits_amount: value } : b
        ));
        setEditingFringeBenefits(prev => {
          const updated = { ...prev };
          delete updated[budgetId];
          return updated;
        });
        // Don't call loadData() - just update state to prevent page refresh
      } else {
        alert('Error updating fringe benefits');
      }
    } catch (error) {
      console.error('Error updating fringe benefits:', error);
      alert('Error updating fringe benefits');
    }
  };

  const handleIndirectCostChange = async (budgetId: string, value: number | null) => {
    try {
      const res = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: budgetId,
          indirect_cost: value,
        }),
      });

      if (res.ok) {
        // Update the local state
        setBudgets(prev => prev.map(b => 
          b.id === budgetId ? { ...b, indirect_cost: value ?? undefined } : b
        ));
        setEditingIndirectCost(prev => {
          const updated = { ...prev };
          delete updated[budgetId];
          return updated;
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error updating indirect cost: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error updating indirect cost:', error);
      alert(`Error updating indirect cost: ${error.message || 'Please try again'}`);
    }
  };

  const toggleBudgetEmployees = (budgetId: string) => {
    setExpandedBudgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(budgetId)) {
        newSet.delete(budgetId);
      } else {
        newSet.add(budgetId);
      }
      return newSet;
    });
  };

  const toggleBudgetAllocations = (budgetId: string) => {
    setExpandedBudgetAllocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(budgetId)) {
        newSet.delete(budgetId);
      } else {
        newSet.add(budgetId);
      }
      return newSet;
    });
  };

  const toggleDCA = (budgetId: string) => {
    setExpandedDCA(prev => {
      const newSet = new Set(prev);
      if (newSet.has(budgetId)) {
        newSet.delete(budgetId);
      } else {
        newSet.add(budgetId);
      }
      return newSet;
    });
  };

  const toggleIndirectCost = (budgetId: string) => {
    setExpandedIndirectCost(prev => {
      const newSet = new Set(prev);
      if (newSet.has(budgetId)) {
        newSet.delete(budgetId);
      } else {
        newSet.add(budgetId);
      }
      return newSet;
    });
  };

  const toggleTotalProgramCost = (budgetId: string) => {
    setExpandedTotalProgramCost(prev => {
      const newSet = new Set(prev);
      if (newSet.has(budgetId)) {
        newSet.delete(budgetId);
      } else {
        newSet.add(budgetId);
      }
      return newSet;
    });
  };

  const getEmployeesForBudget = (budgetId: string) => {
    return allocations.filter(alloc => alloc.budget_id === budgetId);
  };

  useEffect(() => {
    // Load selected fiscal year from localStorage on mount
    if (typeof window !== 'undefined') {
      const savedFiscalYear = localStorage.getItem('selectedFiscalYear');
      if (savedFiscalYear && !selectedFiscalYear) {
        setSelectedFiscalYear(savedFiscalYear);
      }
      
      // Listen for fiscal year changes from FiscalYearManager
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiscalYear]);

  // Listen for funder updates to refresh data
  useEffect(() => {
    const handleFunderUpdate = () => {
      loadData();
    };
    
    window.addEventListener('funderUpdated', handleFunderUpdate);
    return () => window.removeEventListener('funderUpdated', handleFunderUpdate);
  }, []);

  // Listen for allocation updates to refresh allocations
  // Disabled to prevent row movement - allocations are updated in place via state
  // useEffect(() => {
  //   const handleAllocationUpdate = async () => {
  //     // Only refresh allocations data, not all data
  //     try {
  //       const res = await fetch('/api/allocations');
  //       if (res.ok) {
  //         const data = await res.json();
  //         setAllocations(Array.isArray(data) ? data : []);
  //       }
  //     } catch (error) {
  //       console.error('Error refreshing allocations:', error);
  //     }
  //   };
  //   
  //   if (typeof window !== 'undefined') {
  //     window.addEventListener('allocationUpdated', handleAllocationUpdate);
  //     return () => window.removeEventListener('allocationUpdated', handleAllocationUpdate);
  //   }
  // }, []);

  // Listen for expense updates to refresh expenses
  useEffect(() => {
    const handleExpenseUpdate = async () => {
      // Only refresh expenses data, not all data
      try {
        const res = await fetch('/api/expenses');
        if (res.ok) {
          const data = await res.json();
          setExpenses(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error refreshing expenses:', error);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('expenseUpdated', handleExpenseUpdate);
      return () => window.removeEventListener('expenseUpdated', handleExpenseUpdate);
    }
  }, []);

  // Listen for budget updates (create, update, delete)
  useEffect(() => {
    const handleBudgetUpdate = async () => {
      await loadData();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('budgetUpdated', handleBudgetUpdate);
      return () => window.removeEventListener('budgetUpdated', handleBudgetUpdate);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build query params
      const budgetParams = new URLSearchParams();
      if (selectedFiscalYear) {
        const [start, end] = selectedFiscalYear.split('_');
        budgetParams.append('fiscal_year', start);
      }

      const [locationsRes, budgetsRes, employeesRes, fundersRes, allocationsRes, expensesRes] = await Promise.all([
        fetch('/api/locations'),
        fetch(`/api/budgets${budgetParams.toString() ? `?${budgetParams.toString()}` : ''}`),
        fetch('/api/employees'),
        fetch('/api/funders'),
        fetch('/api/allocations'),
        fetch('/api/expenses'),
      ]);

      // Log response statuses for debugging
      console.log('API Response Statuses:', {
        locations: locationsRes.status,
        budgets: budgetsRes.status,
        employees: employeesRes.status,
        funders: fundersRes.status
      });

      // Check if responses are ok before parsing
      const locationsData = locationsRes.ok ? await locationsRes.json() : [];
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];
      const employeesData = employeesRes.ok ? await employeesRes.json() : [];
      const fundersData = fundersRes.ok ? await fundersRes.json() : [];
      const allocationsData = allocationsRes.ok ? await allocationsRes.json() : [];
      const expensesData = expensesRes.ok ? await expensesRes.json() : [];

      // Log data received
      console.log('Data received:', {
        locations: Array.isArray(locationsData) ? locationsData.length : 'not array',
        budgets: Array.isArray(budgetsData) ? budgetsData.length : 'not array',
        employees: Array.isArray(employeesData) ? employeesData.length : 'not array',
        funders: Array.isArray(fundersData) ? fundersData.length : 'not array'
      });

      // Log errors if any
      if (!locationsRes.ok) {
        const errorData = await locationsRes.json().catch(() => ({}));
        console.error('Locations API error:', errorData);
      }
      if (!budgetsRes.ok) {
        const errorData = await budgetsRes.json().catch(() => ({}));
        console.error('Budgets API error:', errorData);
      }
      if (!employeesRes.ok) {
        const errorData = await employeesRes.json().catch(() => ({}));
        console.error('Employees API error:', errorData);
      }
      if (!fundersRes.ok) {
        const errorData = await fundersRes.json().catch(() => ({}));
        console.error('Funders API error:', errorData);
      }

      // Ensure all are arrays (handle error responses that return objects)
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setFunders(Array.isArray(fundersData) ? fundersData : []);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      
      // Initialize monthly allocations state from loaded allocations
      const monthlyState: { [key: string]: { [month: string]: number } } = {};
      if (Array.isArray(allocationsData)) {
        allocationsData.forEach((alloc: any) => {
          if (alloc.monthly_allocations && typeof alloc.monthly_allocations === 'object') {
            monthlyState[alloc.id] = alloc.monthly_allocations;
          }
        });
      }
      setMonthlyAllocations(monthlyState);
      
      // Initialize monthly expense allocations state from loaded expenses
      const monthlyExpenseState: { [key: string]: { [month: string]: number } } = {};
      if (Array.isArray(expensesData)) {
        expensesData.forEach((exp: any) => {
          if (exp.monthly_allocations && typeof exp.monthly_allocations === 'object') {
            monthlyExpenseState[exp.id] = exp.monthly_allocations;
          }
        });
      }
      setMonthlyExpenseAllocations(monthlyExpenseState);
      
      // Initialize indirect cost enabled state
      const indirectState: { [key: string]: boolean } = {};
      if (Array.isArray(budgetsData)) {
        budgetsData.forEach((b: any) => {
          indirectState[b.id] = b.indirect_cost !== null && b.indirect_cost !== undefined;
        });
      }
      setIndirectCostEnabled(prev => ({ ...prev, ...indirectState }));
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays on error to prevent crashes
      setLocations([]);
      setBudgets([]);
      setEmployees([]);
      setFunders([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalBudget = () => {
    return budgets.reduce((sum, b) => sum + (b.total_budget || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Format number with commas for input display
  const formatNumberInput = (value: number | string | undefined | null): string => {
    if (value === null || value === undefined || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Parse comma-formatted string to number
  const parseNumberInput = (value: string): number => {
    if (!value || value === '') return 0;
    const cleaned = value.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Expense categories (from ExpenseManager)
  const DEFAULT_EXPENSE_CATEGORIES = [
    'TELEPHONE',
    'LOCAL TRAVEL',
    'INTERPRETATION',
    'RENT',
    'COMPUTER',
    'AUTO MAINTENANCE',
    'HOUSING',
    'FOOD',
    'MISC',
    'CLOTHING',
    'STAFF DEVELOPMENT',
    'FIRST AID KIT & THERMOMETERS',
    'MENTAL HEALTH',
    'BLOOD PRESSURE TRAINING',
    'FAMANINE HYGIENE',
    'MEDICAL',
    'TRAINING: ESL',
    'TRAINING: VOCATIONAL',
    'TRAINING: TECHNOLOGY',
    'LEGAL ASSISTANCE',
    'FIELD TRIPS',
    'GRADUATION CEREMONY',
  ];

  // Direct Client Assistance categories
  const DCA_CATEGORIES = [
    'Recognition Ceremony',
    'Student Integration Activities',
    'Client Transportation',
    'Client Laptop',
    'Direct Cash',
    'Housing',
    'Utilities',
    'Food',
    'Health/Medical',
    'Training',
    'Legal Assistance',
    'Other Client Services',
  ];

  // Get custom categories from localStorage
  const getCustomCategories = (): string[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expense_categories');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  };

  // Get all categories (default + custom)
  const getAllExpenseCategories = (): string[] => {
    const customCategories = getCustomCategories();
    const combined = [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories];
    return Array.from(new Set(combined)).sort();
  };

  // Handle expense save
  const handleExpenseSave = async (budgetId: string, expenseId?: string) => {
    const category = expenseId 
      ? (newExpenseCategory[budgetId] || expenses.find(e => e.id === expenseId)?.category || '')
      : newExpenseCategory[budgetId] || '';
    const amount = expenseId
      ? (newExpenseAmount[budgetId] ?? expenses.find(e => e.id === expenseId)?.amount ?? 0)
      : newExpenseAmount[budgetId] ?? 0;
    if (!category || amount <= 0) {
      alert('Please enter a valid category and amount');
      return;
    }

    try {
      const budget = budgets.find(b => b.id === budgetId);
      if (!budget?.fiscal_year_start) {
        alert('Could not find budget fiscal year');
        return;
      }

      const method = expenseId ? 'PUT' : 'POST';
      const body = expenseId
        ? { id: expenseId, budget_id: budgetId, category, amount, expense_month: budget.fiscal_year_start }
        : { budget_id: budgetId, category, amount, expense_month: budget.fiscal_year_start };

      const res = await fetch('/api/expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updatedExpenses = await fetch('/api/expenses');
        if (updatedExpenses.ok) {
          const data = await updatedExpenses.json();
          setExpenses(Array.isArray(data) ? data : []);
        }
        setEditingExpense(prev => {
          const updated = { ...prev };
          delete updated[budgetId];
          return updated;
        });
        setShowAddExpenseForm(prev => {
          const updated = { ...prev };
          updated[budgetId] = false;
          return updated;
        });
        setNewExpenseCategory(prev => {
          const updated = { ...prev };
          delete updated[budgetId];
          return updated;
        });
        setNewExpenseAmount(prev => {
          const updated = { ...prev };
          delete updated[budgetId];
          return updated;
        });
        setNewExpenseDescription(prev => {
          const updated = { ...prev };
          delete updated[budgetId];
          return updated;
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('expenseUpdated'));
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error saving budget allocation: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error saving expense:', error);
      alert(`Error saving budget allocation: ${error.message || 'Please try again'}`);
    }
  };

  // Handle expense delete
  const handleExpenseDelete = async (expenseId: string, budgetId: string, categoryName?: string) => {
    const message = categoryName 
      ? `Are you sure you want to delete the budget allocation "${categoryName}"?`
      : 'Are you sure you want to delete this budget allocation?';
    if (!confirm(message)) return;

    try {
      const res = await fetch(`/api/expenses?id=${expenseId}`, { method: 'DELETE' });
      if (res.ok) {
        const updatedExpenses = await fetch('/api/expenses');
        if (updatedExpenses.ok) {
          const data = await updatedExpenses.json();
          setExpenses(Array.isArray(data) ? data : []);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('expenseUpdated'));
        }
      } else {
        alert('Error deleting budget allocation');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting budget allocation');
    }
  };

  // Start editing expense
  const startEditingExpense = (expenseId: string, budgetId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (expense) {
      setEditingExpense(prev => ({ ...prev, [budgetId]: expenseId }));
      setNewExpenseCategory(prev => ({ ...prev, [budgetId]: expense.category }));
      setNewExpenseAmount(prev => ({ ...prev, [budgetId]: expense.amount }));
      setNewExpenseDescription(prev => ({ ...prev, [budgetId]: expense.description || '' }));
    }
  };

  // Cancel editing expense
  const cancelEditingExpense = (budgetId: string) => {
    setEditingExpense(prev => {
      const updated = { ...prev };
      delete updated[budgetId];
      return updated;
    });
    setShowAddExpenseForm(prev => {
      const updated = { ...prev };
      updated[budgetId] = false;
      return updated;
    });
    setNewExpenseCategory(prev => {
      const updated = { ...prev };
      delete updated[budgetId];
      return updated;
    });
    setNewExpenseAmount(prev => {
      const updated = { ...prev };
      delete updated[budgetId];
      return updated;
    });
    setNewExpenseDescription(prev => {
      const updated = { ...prev };
      delete updated[budgetId];
      return updated;
    });
  };

  // Handle monthly fringe benefits allocation change
  const handleMonthlyFringeAllocationChange = async (budgetId: string, month: string, value: number | null) => {
    try {
      // Update local state immediately
      setMonthlyFringeAllocations(prev => {
        const updated = {
          ...prev,
          [budgetId]: {
            ...(prev[budgetId] || {}),
          },
        };
        if (value === null) {
          // Remove the month entry if value is null (deleted)
          delete updated[budgetId][month];
        } else {
          updated[budgetId][month] = value;
        }
        return updated;
      });
      
      // For now, just update local state
      // If you want to persist this to DB, you'd need to add monthly_fringe_allocations column to budgets table
    } catch (error: any) {
      console.error('Error updating monthly fringe allocation:', error);
    }
  };

  // Handle monthly indirect cost allocation change
  const handleMonthlyIndirectCostAllocationChange = async (budgetId: string, month: string, value: number | null) => {
    try {
      // Update local state immediately
      setMonthlyIndirectCostAllocations(prev => {
        const updated = {
          ...prev,
          [budgetId]: {
            ...(prev[budgetId] || {}),
          },
        };
        if (value === null) {
          // Remove the month entry if value is null (deleted)
          delete updated[budgetId][month];
        } else {
          updated[budgetId][month] = value;
        }
        return updated;
      });
      
      // For now, just update local state
      // If you want to persist this to DB, you'd need to add monthly_indirect_cost_allocations column to budgets table
    } catch (error: any) {
      console.error('Error updating monthly indirect cost allocation:', error);
    }
  };

  // Handle monthly expense allocation change
  const handleMonthlyExpenseAllocationChange = async (expenseId: string, month: string, value: number) => {
    try {
      // Update local state immediately
      setMonthlyExpenseAllocations(prev => ({
        ...prev,
        [expenseId]: {
          ...(prev[expenseId] || {}),
          [month]: value || 0,
        },
      }));

      // Get current expense to merge with existing monthly_allocations
      const expense = expenses.find(e => e.id === expenseId);
      const currentMonthly = expense?.monthly_allocations || {};
      const updatedMonthly = { ...currentMonthly, [month]: value || 0 };

      // Save to database
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expenseId,
          monthly_allocations: updatedMonthly,
        }),
      });

      if (res.ok) {
        // Update the expense in the expenses array with the new monthly_allocations
        setExpenses(prev => prev.map(exp => 
          exp.id === expenseId 
            ? { ...exp, monthly_allocations: updatedMonthly }
            : exp
        ));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('expenseUpdated'));
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error saving monthly expense allocation: ${errorData.error || 'Unknown error'}`);
        // Revert on error - reload expenses
        const updatedExpenses = await fetch('/api/expenses');
        if (updatedExpenses.ok) {
          const data = await updatedExpenses.json();
          setExpenses(Array.isArray(data) ? data : []);
        }
      }
    } catch (error: any) {
      console.error('Error saving monthly expense allocation:', error);
      alert(`Error saving monthly expense allocation: ${error.message || 'Please try again'}`);
      const updatedExpenses = await fetch('/api/expenses');
      if (updatedExpenses.ok) {
        const data = await updatedExpenses.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    }
  };

  // Handle monthly allocation change
  const handleMonthlyAllocationChange = async (allocationId: string, month: string, value: number) => {
    try {
      // Update local state immediately
      setMonthlyAllocations(prev => ({
        ...prev,
        [allocationId]: {
          ...(prev[allocationId] || {}),
          [month]: value || 0,
        },
      }));

      // Get current allocation to merge with existing monthly_allocations
      const allocation = allocations.find(a => a.id === allocationId);
      const currentMonthly = allocation?.monthly_allocations || {};
      const updatedMonthly = { ...currentMonthly, [month]: value || 0 };

      // Save to database
      const res = await fetch('/api/allocations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: allocationId,
          monthly_allocations: updatedMonthly,
        }),
      });

      if (res.ok) {
        // Update the allocation in the allocations array with the new monthly_allocations
        // Use functional update to preserve order - find index and update in place
        setAllocations(prev => {
          const index = prev.findIndex(alloc => alloc.id === allocationId);
          if (index === -1) {
            console.error('Allocation not found in state:', allocationId);
            return prev;
          }
          const updated = [...prev];
          updated[index] = { ...updated[index], monthly_allocations: updatedMonthly };
          return updated;
        });
        // Don't dispatch event to prevent unnecessary re-renders that cause row movement
        // if (typeof window !== 'undefined') {
        //   window.dispatchEvent(new CustomEvent('allocationUpdated'));
        // }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error saving monthly allocation: ${errorData.error || 'Unknown error'}`);
        // Revert on error - reload allocations
        const allocationsRes = await fetch('/api/allocations');
        if (allocationsRes.ok) {
          const data = await allocationsRes.json();
          setAllocations(Array.isArray(data) ? data : []);
        }
      }
    } catch (error: any) {
      console.error('Error saving monthly allocation:', error);
      alert(`Error saving monthly allocation: ${error.message || 'Please try again'}`);
      // Revert on error
      const allocationsRes = await fetch('/api/allocations');
      if (allocationsRes.ok) {
        const data = await allocationsRes.json();
        setAllocations(Array.isArray(data) ? data : []);
      }
    }
  };

  const calculateTotalWages = () => {
    // This would need to be calculated from time entries
    return 0;
  };

  const calculateTotalExpenses = () => {
    // This would need to be calculated from expenses
    return 0;
  };

  const getCurrentFiscalYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (month >= 9) { // October (9) or later
      return `${year}-10-01`;
    } else {
      return `${year - 1}-10-01`;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white shadow">
        <div className="max-w-full mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 py-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-start gap-4">
                <Image 
                  src="/ecdc-logo.png" 
                  alt="ECDC Logo" 
                  width={80} 
                  height={80}
                  className="object-contain"
                />
                <div>
                  <div className="flex items-baseline gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">ECDC</h1>
                    <span className="text-3xl font-bold text-gray-900 whitespace-nowrap">Budget Management System</span>
                  </div>
                  {!readOnly && (
              <p className="mt-1 text-sm text-gray-500">
                      Manage {budgets.length} budget{budgets.length !== 1 ? 's' : ''}, {employees.filter((e) => e.status !== 'tbh').length} employee{employees.filter((e) => e.status !== 'tbh').length !== 1 ? 's' : ''}, and track expenditures
              </p>
                  )}
            </div>
              </div>
            </div>
            {/* Help Button */}
            <div className="relative">
              <button
                onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                onMouseEnter={() => setShowHelpTooltip(true)}
                onMouseLeave={() => setShowHelpTooltip(false)}
                className="text-2xl hover:scale-110 transition-transform cursor-help"
                aria-label="Help"
              >
                ❓
              </button>
              {showHelpTooltip && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 text-white text-sm rounded-lg shadow-xl p-4 z-50">
                  <div className="space-y-2">
                    <h3 className="font-bold text-base mb-2">Quick Start Guide</h3>
                    <div className="space-y-1">
                      <p><strong>Overview:</strong> View all budgets with employee allocations, expenses, and totals. Toggle budgets to see details.</p>
                      <p><strong>Budgets:</strong> Create and manage budgets. Budget numbers automatically get location suffix (-30 for VA, -33 for MD).</p>
                      <p><strong>Employees:</strong> Add employees and see which budgets they're allocated to. View utilization percentages.</p>
                      <p><strong>Allocations:</strong> Assign employees to budgets with monthly breakdowns.</p>
                      <p><strong>Print:</strong> Select budgets or employees to print with customizable options.</p>
                      <p><strong>Export:</strong> Export data to Excel format for external analysis.</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-300">💡 Tip: Use the yellow "Budget" and "YTD" columns to track spending at a glance!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Tabs Navigation */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <nav className="-mb-px flex space-x-4 flex-wrap justify-center">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'budgets', label: 'Budgets' },
                { id: 'employees', label: 'Employees' },
                { id: 'allocations', label: 'Allocations' },
                { id: 'funders', label: 'Funders/Donors' },
                { id: 'fiscal-years', label: 'Fiscal Years' },
                { id: 'print', label: 'Print' },
                { id: 'export', label: 'Export' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Total Budgets</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">{budgets.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Total Budget Amount</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  ${formatCurrency(calculateTotalBudget())}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Active Employees</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {employees.filter((e) => e.status === 'active').length}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">TBH</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {employees.filter((e) => e.status === 'tbh' && e.tbh_budget_id).length}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Total Employees</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {employees.filter((e) => e.status === 'active').length + employees.filter((e) => e.status === 'tbh' && e.tbh_budget_id).length}
                </div>
              </div>
            </div>

            {/* Overview by Donor/Funder */}
            <div className="space-y-6">
              {Array.isArray(funders) && funders.length > 0 ? (
                funders
                  .filter((funder) => {
                    const code = funder.code?.toLowerCase();
                    return code !== 'dv2' && code !== 'dv-2';
                  })
                  .map((funder) => {
                  const funderBudgets = budgets.filter((b) => b.funder_id === funder.id);
                  const funderTotal = funderBudgets.reduce((sum, b) => sum + (b.total_budget || 0), 0);
                  // Sum allocated amounts for all budgets in this funder (employee allocations)
                  const funderAllocated = funderBudgets.reduce((sum, b) => {
                    const budgetAllocations = allocations.filter(alloc => alloc.budget_id === b.id);
                    return sum + budgetAllocations.reduce((allocSum, alloc) => allocSum + (alloc.allocated_amount || 0), 0);
                  }, 0);
                  // Sum fringe benefits for all budgets in this funder
                  const funderFringeBenefits = funderBudgets.reduce((sum, b) => sum + (b.fringe_benefits_amount || 0), 0);
                  // Sum expenses (budget allocations) for all budgets in this funder
                  const funderExpenses = funderBudgets.reduce((sum, b) => {
                    const budgetExpenses = expenses.filter(exp => exp.budget_id === b.id);
                    return sum + budgetExpenses.reduce((expSum, exp) => expSum + (exp.amount || 0), 0);
                  }, 0);
                  // Sum indirect costs for all budgets in this funder
                  const funderIndirectCosts = funderBudgets.reduce((sum, b) => sum + (b.indirect_cost || 0), 0);
                  // Budget Allocated = employee allocations + fringe benefits + expenses (budget allocations) + indirect costs
                  const funderBudgetAllocated = funderAllocated + funderFringeBenefits + funderExpenses + funderIndirectCosts;
                  const funderRemaining = funderTotal - funderBudgetAllocated;

                  return (
                    <div 
                      key={funder.id} 
                      className="bg-white rounded-lg shadow overflow-hidden"
                      style={funder.color_code ? {
                        borderTop: `4px solid ${funder.color_code}`,
                        borderLeft: funder.color_code ? `2px solid ${funder.color_code}` : undefined
                      } : {}}
                    >
                      <div 
                        className="px-6 py-4 border-b"
                        style={funder.color_code ? {
                          backgroundColor: `${funder.color_code}15`,
                          borderColor: `${funder.color_code}40`
                        } : {
                          borderColor: '#e5e7eb'
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-3">
                              <div>
                                <h2 className="text-lg font-semibold text-black">
                                  {funder.code}{funder.name ? ` - ${funder.name}` : ''}
                              </h2>
                            </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {(() => {
                              // Group budgets by location
                              const budgetsByLocation = funderBudgets.reduce((acc: any, b: any) => {
                                const locationCode = b.location?.code || 'N/A';
                                if (!acc[locationCode]) {
                                  acc[locationCode] = [];
                                }
                                acc[locationCode].push(b);
                                return acc;
                              }, {});
                              
                              // Calculate location totals
                              const locationData: { [key: string]: { total: number; remaining: number } } = {};
                              let runningTotal = 0;
                              let runningRemaining = 0;
                              
                              Object.keys(budgetsByLocation).forEach((locationCode) => {
                                const locationBudgets = budgetsByLocation[locationCode];
                                const locationTotal = locationBudgets.reduce((sum: number, b: any) => sum + (b.total_budget || 0), 0);
                                const locationAllocated = locationBudgets.reduce((sum: number, b: any) => {
                                  const budgetAllocations = allocations.filter(alloc => alloc.budget_id === b.id);
                                  const allocated = budgetAllocations.reduce((allocSum: number, alloc: any) => allocSum + (alloc.allocated_amount || 0), 0);
                                  const fringeBenefits = editingFringeBenefits[b.id] !== undefined ? editingFringeBenefits[b.id] : (b.fringe_benefits_amount || 0);
                                  const budgetExpenses = expenses.filter(exp => exp.budget_id === b.id);
                                  const expensesTotal = budgetExpenses.reduce((expSum: number, exp: any) => expSum + (exp.amount || 0), 0);
                                  const indirectCost = editingIndirectCost[b.id] !== undefined ? editingIndirectCost[b.id] : (b.indirect_cost || 0);
                                  return sum + allocated + fringeBenefits + expensesTotal + indirectCost;
                                }, 0);
                                const locationRemaining = locationTotal - locationAllocated;
                                locationData[locationCode] = { total: locationTotal, remaining: locationRemaining };
                                runningTotal += locationTotal;
                                runningRemaining += locationRemaining;
                              });
                              
                              // Order: VA first, then MD, then others
                              const orderedLocations: string[] = [];
                              if (locationData['VA']) orderedLocations.push('VA');
                              if (locationData['MD']) orderedLocations.push('MD');
                              Object.keys(locationData).forEach(code => {
                                if (code !== 'VA' && code !== 'MD') orderedLocations.push(code);
                              });
                              
                              return (
                                <div className="flex items-center gap-4 flex-wrap justify-end">
                                  {orderedLocations.map((locationCode) => (
                                    <div key={locationCode} className="text-right">
                                      <div className="text-xs font-medium text-gray-600">{locationCode}</div>
                                      <div className="text-sm text-gray-500">${formatCurrency(locationData[locationCode].total)}</div>
                                      <div className="text-xs">
                                        <span className={locationData[locationCode].remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                                          ${formatCurrency(Math.abs(locationData[locationCode].remaining))} {locationData[locationCode].remaining >= 0 ? 'remaining' : 'overspent'}
                                        </span>
                            </div>
                                    </div>
                                  ))}
                                  <div className="text-right border-l border-gray-300 pl-4">
                                    <div className="text-xs font-bold text-gray-700">Total Budget</div>
                                    <div className="text-lg font-bold text-gray-900">${formatCurrency(runningTotal)}</div>
                                    <div className="text-sm">
                                      <span className={runningRemaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        ${formatCurrency(Math.abs(runningRemaining))} {runningRemaining >= 0 ? 'remaining' : 'overspent'}
                              </span>
                            </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        {funderBudgets.length > 0 ? (
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead 
                              className="bg-gray-50"
                              style={funder.color_code ? {
                                backgroundColor: `${funder.color_code}10`
                              } : {}}
                            >
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Budget
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-blue-100">
                                  Total Budget Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Budget Allocated
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Budget Remaining
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-yellow-100">
                                  YTD Expense
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-green-100">
                                  Budget Balance
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Employees
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {funderBudgets.map((budget, index) => {
                                // Sum allocated amounts for this budget (employee allocations)
                                const budgetAllocations = allocations.filter(alloc => alloc.budget_id === budget.id);
                                const allocated = budgetAllocations.reduce((sum, alloc) => sum + (alloc.allocated_amount || 0), 0);
                                // Get fringe benefits amount (use editing value if being edited, otherwise use saved value)
                                const fringeBenefits = editingFringeBenefits[budget.id] !== undefined 
                                  ? editingFringeBenefits[budget.id] 
                                  : (budget.fringe_benefits_amount || 0);
                                // Sum expenses for this budget (these are really budget allocations, not expenses)
                                const budgetExpenses = expenses.filter(exp => exp.budget_id === budget.id);
                                const expensesTotal = budgetExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                                // Get indirect cost for this budget (use editing value if being edited, otherwise use saved value)
                                const indirectCost = editingIndirectCost[budget.id] !== undefined
                                  ? editingIndirectCost[budget.id]
                                  : (budget.indirect_cost || 0);
                                // Budget Allocated = employee allocations + fringe benefits + expenses (budget allocations) + indirect cost
                                const budgetAllocated = allocated + fringeBenefits + expensesTotal + indirectCost;
                                const remaining = (budget.total_budget || 0) - budgetAllocated;
                                const isOverspent = remaining < 0;
                                const isEven = index % 2 === 0;

                                // Calculate YTD expenses for this budget
                                const calculateYTDExpenses = () => {
                                  if (!budget.fiscal_year_start || !budget.fiscal_year_end) return 0;
                                  // Get fiscal year months
                                  const months: Array<{ value: string; label: string }> = [];
                                  const start = new Date(budget.fiscal_year_start);
                                  const end = new Date(budget.fiscal_year_end);
                                  let current = new Date(start);
                                  current.setDate(1);
                                  while (current <= end) {
                                    const monthValue = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                                    months.push({ value: monthValue, label: '' });
                                    current.setMonth(current.getMonth() + 1);
                                  }
                                  
                                  // Get current month
                                  const now = new Date();
                                  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                  const currentMonthIndex = months.findIndex(m => m.value === currentMonthValue);
                                  const monthsToSum = currentMonthIndex >= 0 ? months.slice(0, currentMonthIndex + 1) : months;
                                  
                                  // Sum employee allocations YTD
                                  const employeeYTD = budgetAllocations.reduce((sum, alloc) => {
                                    const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                    return sum + monthsToSum.reduce((monthSum, month) => monthSum + (allocMonthly[month.value] || 0), 0);
                                  }, 0);
                                  
                                  // Sum fringe benefits YTD
                                  const fringeYTD = monthsToSum.reduce((sum, month) => {
                                    const monthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                    if (monthlyValue !== undefined && monthlyValue !== null) {
                                      return sum + monthlyValue;
                                    }
                                    // If no custom value, calculate proportional amount
                                    const proportionalAmount = fringeBenefits / Math.max(months.length, 1);
                                    return sum + proportionalAmount;
                                  }, 0);
                                  
                                  // Sum expenses YTD (Other + DCA)
                                  const expenseYTD = budgetExpenses.reduce((sum, exp) => {
                                    const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                    return sum + monthsToSum.reduce((monthSum, month) => monthSum + (expMonthly[month.value] || 0), 0);
                                  }, 0);
                                  
                                  // Sum indirect costs YTD
                                  const indirectYTD = monthsToSum.reduce((sum, month) => {
                                    const monthlyValue = monthlyIndirectCostAllocations[budget.id]?.[month.value];
                                    if (monthlyValue !== undefined && monthlyValue !== null) {
                                      return sum + monthlyValue;
                                    }
                                    // If no custom value, calculate proportional amount
                                    const indirectCostAmount = indirectCost !== null && indirectCost !== undefined ? indirectCost : 0;
                                    const proportionalAmount = indirectCostAmount / Math.max(months.length, 1);
                                    return sum + proportionalAmount;
                                  }, 0);
                                  
                                  return employeeYTD + fringeYTD + expenseYTD + indirectYTD;
                                };
                                const ytdExpenses = calculateYTDExpenses();

                                // Determine base background color - alternating even/odd darkness
                                let baseBgColor = '';
                                if (isOverspent) {
                                  baseBgColor = isEven ? 'bg-red-50' : 'bg-red-100';
                                } else if (funder.color_code) {
                                  // Use funder color with different opacity for even/odd rows
                                  baseBgColor = isEven ? '' : '';
                                } else {
                                  baseBgColor = isEven ? 'bg-gray-50' : '';
                                }

                                const budgetEmployees = getEmployeesForBudget(budget.id);
                                // Sort employees by name to maintain stable order
                                const sortedBudgetEmployees = [...budgetEmployees].sort((a: any, b: any) => {
                                  const nameA = `${a.employee?.first_name || ''} ${a.employee?.last_name || ''}`.trim();
                                  const nameB = `${b.employee?.first_name || ''} ${b.employee?.last_name || ''}`.trim();
                                  return nameA.localeCompare(nameB);
                                });
                                const employeesByLocation = sortedBudgetEmployees.reduce((acc: any, alloc: any) => {
                                  let locationCode = 'Unassigned';
                                  if (alloc.employee?.location?.code) {
                                    locationCode = alloc.employee.location.code;
                                  } else if (!alloc.employee?.location_id || alloc.employee?.location_id === null) {
                                    locationCode = 'Admin';
                                  }
                                  if (!acc[locationCode]) {
                                    acc[locationCode] = [];
                                  }
                                  acc[locationCode].push(alloc);
                                  return acc;
                                }, {});
                                
                                // Sort location codes for consistent display (Admin first, then alphabetical)
                                const sortedLocationCodes = Object.keys(employeesByLocation).sort((a, b) => {
                                  if (a === 'Admin') return -1;
                                  if (b === 'Admin') return 1;
                                  if (a === 'Unassigned') return 1;
                                  if (b === 'Unassigned') return -1;
                                  return a.localeCompare(b);
                                });
                                
                                // Sort employees within each location group by name to maintain stable order
                                sortedLocationCodes.forEach((locationCode: string) => {
                                  employeesByLocation[locationCode].sort((a: any, b: any) => {
                                    const nameA = `${a.employee?.first_name || ''} ${a.employee?.last_name || ''}`.trim();
                                    const nameB = `${b.employee?.first_name || ''} ${b.employee?.last_name || ''}`.trim();
                                    return nameA.localeCompare(nameB);
                                  });
                                });

                                return (
                                  <>
                                  <tr 
                                    key={budget.id}
                                      className={`${baseBgColor} transition-colors duration-150 ${
                                        isOverspent ? 'hover:bg-red-100' : funder.color_code 
                                          ? 'hover:bg-opacity-20' 
                                          : 'hover:bg-gray-100'
                                      }`}
                                      style={!isOverspent && funder.color_code ? { 
                                        backgroundColor: isEven 
                                          ? `${funder.color_code}08` 
                                          : `${funder.color_code}12`
                                      } : {}}
                                      onMouseEnter={(e) => {
                                        if (!isOverspent && funder.color_code) {
                                          // Keep distinction between even and odd rows on hover
                                          // Even hover should be darker than odd base (12), so use 22
                                          // Odd hover should be lighter than even base (08), so use 15
                                          e.currentTarget.style.backgroundColor = isEven 
                                            ? `${funder.color_code}22` 
                                            : `${funder.color_code}15`;
                                        } else if (isOverspent) {
                                          e.currentTarget.style.backgroundColor = isEven ? '#fecaca' : '#fca5a5';
                                        } else {
                                          // Even hover should be darker than odd base (white/transparent)
                                          // Odd hover should be lighter than even base (gray-50)
                                          e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isOverspent && funder.color_code) {
                                          e.currentTarget.style.backgroundColor = isEven 
                                            ? `${funder.color_code}08` 
                                            : `${funder.color_code}12`;
                                        } else if (isOverspent) {
                                          e.currentTarget.style.backgroundColor = isEven ? '#fef2f2' : '#fee2e2';
                                        } else {
                                          e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                                        }
                                      }}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div>
                                          {budget.budget_number}{budget.name ? ` - ${budget.name}` : ''}
                                          {(() => {
                                            const tbhCount = employees.filter((e) => {
                                              const isTbh = e.status === 'tbh' || e.status?.toLowerCase() === 'tbh';
                                              const hasBudgetId = e.tbh_budget_id && String(e.tbh_budget_id) === String(budget.id);
                                              return isTbh && hasBudgetId;
                                            }).length;
                                            return tbhCount > 0 ? (
                                              <div className="text-sm font-normal text-gray-600 mt-0.5">*{tbhCount} TBH Employees</div>
                                            ) : null;
                                          })()}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {budget.location?.code || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-100">
                                        ${formatCurrency(budget.total_budget || 0)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        ${formatCurrency(budgetAllocated)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isOverspent ? 'text-red-600' : 'text-green-600'}`}>
                                        ${formatCurrency(Math.abs(remaining))}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-yellow-100">
                                      ${formatCurrency(ytdExpenses)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium bg-green-100 ${((budget.total_budget || 0) - ytdExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ${formatCurrency((budget.total_budget || 0) - ytdExpenses)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      {isOverspent ? (
                                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 font-medium">
                                          OVERSPENT
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-medium">
                                          OK
                                        </span>
                                      )}
                                    </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                          onClick={() => toggleBudgetEmployees(budget.id)}
                                          className="text-blue-600 hover:text-blue-900 underline"
                                        >
                                          {expandedBudgets.has(budget.id) ? 'Hide' : 'Show'} ({budgetEmployees.length})
                                        </button>
                                    </td>
                                  </tr>
                                    {expandedBudgets.has(budget.id) && (
                                    <tr>
                                      <td colSpan={9} className="px-6 py-2 bg-white">
                                          <div className="ml-4 space-y-2">
                                            {/* Employees Section - Table Format */}
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-3">Employees Allocated:</h4>
                                              {budgetEmployees.length > 0 ? (
                                                <div className="space-y-4">
                                                  {/* Get fiscal year months for this budget based on its fiscal_year_start and fiscal_year_end (calculate once outside loop) */}
                                                  {(() => {
                                                    const getFiscalYearMonths = () => {
                                                      if (!budget.fiscal_year_start || !budget.fiscal_year_end) return [];
                                                      const months: Array<{ value: string; label: string }> = [];
                                                      const start = new Date(budget.fiscal_year_start);
                                                      const end = new Date(budget.fiscal_year_end);
                                                      // Use the actual fiscal year start date from the budget
                                                      let current = new Date(start);
                                                      // Set to the first day of the start month
                                                      current.setDate(1);
                                                      while (current <= end) {
                                                        const monthValue = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                                                        const monthLabel = current.toLocaleDateString('en-US', { month: 'short' });
                                                        months.push({ value: monthValue, label: monthLabel });
                                                        current.setMonth(current.getMonth() + 1);
                                                      }
                                                      return months;
                                                    };
                                                    const fiscalMonths = getFiscalYearMonths();
                                                    
                                                    // Calculate current month for YTD (use current month or last month in fiscal year if current month is beyond)
                                                    const getCurrentMonth = () => {
                                                      const now = new Date();
                                                      const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                                      // If current month is beyond fiscal year, use last month of fiscal year
                                                      const lastFiscalMonth = fiscalMonths.length > 0 ? fiscalMonths[fiscalMonths.length - 1].value : currentMonthValue;
                                                      return fiscalMonths.some(m => m.value === currentMonthValue) ? currentMonthValue : lastFiscalMonth;
                                                    };
                                                    const currentMonth = getCurrentMonth();
                                                    
                                                    return (
                                                      <>
                                                        {/* Show all employees in one table (without location separation) */}
                                                        <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' }}>
                                                          <div className="inline-block min-w-full align-middle" style={{ boxSizing: 'border-box' }}>
                                                            <table className="min-w-full text-sm" style={{ tableLayout: 'auto', width: '100%', maxWidth: '100%', boxSizing: 'border-box', borderCollapse: 'collapse' }}>
                                                              <thead>
                                                                <tr className="border-b border-gray-200">
                                                                  <th className="text-left py-2 px-2 font-medium text-gray-700 sticky left-0 bg-white z-10" style={{ width: '150px', minWidth: '150px' }}>Name</th>
                                                                  <th className="text-center py-2 px-2 font-medium text-gray-700 sticky left-[150px] bg-yellow-100 z-10" style={{ width: '100px', minWidth: '100px' }}>Budget</th>
                                                                  {fiscalMonths.map((month) => (
                                                                    <th key={month.value} className="text-right py-2 px-1 font-medium text-gray-700 whitespace-nowrap" style={{ width: '70px', minWidth: '70px' }}>{month.label}</th>
                                                                  ))}
                                                                  <th className="text-center py-2 px-2 font-medium text-gray-700 whitespace-nowrap bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>YTD</th>
                                                                  <th className="text-right py-2 px-2 font-medium text-gray-700 whitespace-nowrap" style={{ width: '90px', minWidth: '90px' }}>Balance</th>
                                                                </tr>
                                                              </thead>
                                                            <tbody>
                                                              {sortedBudgetEmployees.map((alloc: any) => {
                                                                const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                // Calculate YTD (sum all months in fiscal year, not just up to current month)
                                                                const ytdTotal = fiscalMonths.reduce((sum, month) => {
                                                                  return sum + (allocMonthly[month.value] || 0);
                                                                }, 0);
                                                                // Balance = Total Allocation - YTD
                                                                const balance = (alloc.allocated_amount || 0) - ytdTotal;
                                                                return (
                                                                  <tr key={alloc.id} className="border-b border-gray-100">
                                                                    <td className="py-2 px-3 text-gray-900">
                                                                      {alloc.employee?.first_name} {alloc.employee?.last_name}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-right font-medium text-gray-900 bg-yellow-100">
                                                                      ${formatCurrency(alloc.allocated_amount || 0)}
                                                                    </td>
                                                                    {fiscalMonths.map((month) => {
                                                                      const monthValue = allocMonthly[month.value] || 0;
                                                                      const allocationId = alloc.id;
                                                                      const monthKey = month.value;
                                                                      return (
                                                                        <td key={`${allocationId}-${monthKey}`} className="py-2 px-2">
                                                                          {readOnly ? (
                                                                            <div className="text-right text-xs text-gray-600 font-medium">
                                                                              ${formatCurrency(monthValue)}
                                                                            </div>
                                                                          ) : (
                                                                            <input
                                                                              type="text"
                                                                              value={formatNumberInput(monthValue)}
                                                                              onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault();
                                                                                const value = parseNumberInput(e.target.value);
                                                                                handleMonthlyAllocationChange(allocationId, monthKey, value);
                                                                              }}
                                                                              onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                  e.stopPropagation();
                                                                                  e.preventDefault();
                                                                                  e.currentTarget.blur();
                                                                                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                                                                  // Allow arrow keys to work normally for navigation - don't stop propagation or prevent default
                                                                                } else {
                                                                                  e.stopPropagation();
                                                                                }
                                                                              }}
                                                                              onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault();
                                                                              }}
                                                                              onFocus={(e) => {
                                                                                e.stopPropagation();
                                                                              }}
                                                                              className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                              placeholder="0"
                                                                            />
                                                                          )}
                                                                        </td>
                                );
                              })}
                                                                    <td className="py-2 px-2 text-right font-medium text-gray-700 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                      ${formatCurrency(ytdTotal)}
                                                                    </td>
                                                                    <td className={`py-2 px-2 text-right font-medium text-xs ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                      ${formatCurrency(balance)}
                                                                    </td>
                                                                  </tr>
                                                                );
                                                              })}
                                                              {/* Total Employee Allocations Row */}
                                                              <tr className={`border-t-2 border-gray-300 font-semibold ${rowColors.totalEmployeeAllocations}`}>
                                                                <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.totalEmployeeAllocations} text-xs font-bold`} style={{ width: '150px', minWidth: '150px' }}>
                                                                  Total Employee Allocations:
                                                                </td>
                                                                <td className={`py-2 px-2 text-right font-bold text-gray-900 sticky left-[150px] ${rowColors.totalEmployeeAllocations} bg-yellow-100 text-xs`} style={{ width: '100px', minWidth: '100px' }}>
                                                                  ${formatCurrency(sortedBudgetEmployees.reduce((sum: number, alloc: any) => sum + (alloc.allocated_amount || 0), 0))}
                                                                </td>
                                                                {fiscalMonths.map((month, monthIdx) => {
                                                                  const monthTotal = sortedBudgetEmployees.reduce((sum: number, alloc: any) => {
                                                                    const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                    return sum + (allocMonthly[month.value] || 0);
                                                                  }, 0);
                                                                  return (
                                                                    <td key={month.value} className={`py-2 px-1 text-right font-bold text-gray-900 text-xs ${rowColors.totalEmployeeAllocations}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                      ${formatCurrency(monthTotal)}
                                                                    </td>
                                                                  );
                                                                })}
                                                                <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                  ${formatCurrency(sortedBudgetEmployees.reduce((sum: number, alloc: any) => {
                                                                    const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                    const ytdTotal = fiscalMonths.reduce((ytdSum: number, month: { value: string; label: string }) => {
                                                                      return ytdSum + (allocMonthly[month.value] || 0);
                                                                    }, 0);
                                                                    return sum + ytdTotal;
                                                                  }, 0))}
                                                                </td>
                                                                <td className={`py-2 px-2 text-right font-bold text-xs ${rowColors.totalEmployeeAllocations}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                  {(() => {
                                                                    const totalBalance = sortedBudgetEmployees.reduce((sum: number, alloc: any) => {
                                                                      const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                      const ytdTotal = fiscalMonths.reduce((ytdSum: number, month: { value: string; label: string }) => {
                                                                        return ytdSum + (allocMonthly[month.value] || 0);
                                                                      }, 0);
                                                                      const balance = (alloc.allocated_amount || 0) - ytdTotal;
                                                                      return sum + balance;
                                                                    }, 0);
                                                                    return (
                                                                      <span className={totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                        ${formatCurrency(totalBalance)}
                                                                      </span>
                                                                    );
                                                                  })()}
                                                                </td>
                                                              </tr>
                                                              
                                                              {/* Fringe Benefits Row */}
                                                              {sortedBudgetEmployees.length > 0 && (
                                                                <tr className={`border-t border-gray-300 font-semibold ${rowColors.fringeBenefits}`}>
                                                                  <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.fringeBenefits} text-xs font-bold`} style={{ width: '150px', minWidth: '150px' }}>
                                                                    Fringe Benefits:
                                                                  </td>
                                                                  <td className={`py-2 px-2 text-right sticky left-[150px] ${rowColors.fringeBenefits} bg-yellow-100 text-xs`} style={{ width: '100px', minWidth: '100px' }}>
                                                                    {readOnly ? (
                                                                      <div className="font-bold text-gray-900">
                                                                        ${formatCurrency(budget.fringe_benefits_amount || 0)}
                                                                      </div>
                                                                    ) : (
                                                                      <input
                                                                        type="text"
                                                                        value={editingFringeBenefits[budget.id] !== undefined 
                                                                          ? formatNumberInput(editingFringeBenefits[budget.id])
                                                                          : formatNumberInput(budget.fringe_benefits_amount)}
                                                                        onChange={(e) => {
                                                                          e.stopPropagation();
                                                                          const rawValue = e.target.value;
                                                                          if (rawValue === '') {
                                                                            setEditingFringeBenefits(prev => {
                                                                              const updated = { ...prev };
                                                                              delete updated[budget.id];
                                                                              return updated;
                                                                            });
                                                                          } else {
                                                                            const value = parseNumberInput(rawValue);
                                                                            setEditingFringeBenefits(prev => ({
                                                                              ...prev,
                                                                              [budget.id]: value,
                                                                            }));
                                                                          }
                                                                        }}
                                                                        onBlur={(e) => {
                                                                          e.stopPropagation();
                                                                          const value = parseNumberInput(e.target.value);
                                                                          if (value !== (budget.fringe_benefits_amount || 0)) {
                                                                            handleFringeBenefitsChange(budget.id, value);
                                                                          } else {
                                                                            setEditingFringeBenefits(prev => {
                                                                              const updated = { ...prev };
                                                                              delete updated[budget.id];
                                                                              return updated;
                                                                            });
                                                                          }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                          e.stopPropagation();
                                                                          if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            e.currentTarget.blur();
                                                                          }
                                                                        }}
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                        }}
                                                                        onFocus={(e) => {
                                                                          e.stopPropagation();
                                                                        }}
                                                                        className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="0"
                                                                      />
                                                                    )}
                                                                  </td>
                                                                  {fiscalMonths.map((month) => {
                                                                    const hasCustomValue = monthlyFringeAllocations[budget.id]?.[month.value] !== undefined;
                                                                    const fringeMonthly = hasCustomValue 
                                                                      ? monthlyFringeAllocations[budget.id]?.[month.value]
                                                                      : null;
                                                                    return (
                                                                      <td key={month.value} className={`py-2 px-1 ${rowColors.fringeBenefits}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                        {readOnly ? (
                                                                          <div className="text-right text-xs font-bold text-gray-900">
                                                                            ${formatCurrency(fringeMonthly !== null && fringeMonthly !== undefined ? fringeMonthly : ((budget.fringe_benefits_amount || 0) / Math.max(fiscalMonths.length, 1)) || 0)}
                                                                          </div>
                                                                        ) : (
                                                                          <input
                                                                            type="text"
                                                                            value={formatNumberInput(fringeMonthly)}
                                                                            onChange={(e) => {
                                                                              e.stopPropagation();
                                                                              const value = e.target.value === '' ? null : parseNumberInput(e.target.value);
                                                                              handleMonthlyFringeAllocationChange(budget.id, month.value, value);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                              e.stopPropagation();
                                                                              if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                              }
                                                                            }}
                                                                            onClick={(e) => {
                                                                              e.stopPropagation();
                                                                            }}
                                                                            onFocus={(e) => {
                                                                              e.stopPropagation();
                                                                            }}
                                                                            className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            placeholder="0"
                                                                          />
                                                                        )}
                                                                      </td>
                                                                    );
                                                                  })}
                                                                  <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                    ${formatCurrency(fiscalMonths.reduce((sum: number, month: { value: string; label: string }) => {
                                                                      const monthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                                                      if (monthlyValue !== undefined && monthlyValue !== null) {
                                                                        return sum + monthlyValue;
                                                                      }
                                                                      return sum;
                                                                    }, 0))}
                                                                  </td>
                                                                  <td className={`py-2 px-2 text-right font-bold text-xs ${rowColors.fringeBenefits}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                    {(() => {
                                                                      const fringeBalance = (budget.fringe_benefits_amount || 0) - fiscalMonths.reduce((sum: number, month: { value: string; label: string }) => {
                                                                        const monthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                                                        if (monthlyValue !== undefined && monthlyValue !== null) {
                                                                          return sum + monthlyValue;
                                                                        }
                                                                        return sum;
                                                                      }, 0);
                                                                      return (
                                                                        <span className={fringeBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                          ${formatCurrency(fringeBalance)}
                                                                        </span>
                                                                      );
                                                                    })()}
                                                                  </td>
                                                                </tr>
                                                              )}
                                                              
                                                              {/* Total Personnel Cost Row - includes all employees from all locations */}
                                                              {sortedBudgetEmployees.length > 0 && (
                                                                <tr className={`border-t-2 border-gray-400 font-semibold ${rowColors.totalPersonnelCost}`}>
                                                                  <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.totalPersonnelCost} text-xs font-bold`} style={{ width: '150px', minWidth: '150px' }}>
                                                                    Total Personnel Cost:
                                                                  </td>
                                                                  <td className={`py-2 px-2 text-right font-bold text-gray-900 sticky left-[150px] ${rowColors.totalPersonnelCost} bg-yellow-100 text-xs`} style={{ width: '100px', minWidth: '100px' }}>
                                                                    ${formatCurrency(
                                                                      budgetEmployees.reduce((sum: number, alloc: any) => sum + (alloc.allocated_amount || 0), 0) +
                                                                      (budget.fringe_benefits_amount || 0)
                                                                    )}
                                                                  </td>
                                                                  {fiscalMonths.map((month) => {
                                                                    // Employee allocations for this month (all locations including Admin)
                                                                    const employeeMonthTotal = budgetEmployees.reduce((sum: number, alloc: any) => {
                                                                      const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                      return sum + (allocMonthly[month.value] || 0);
                                                                    }, 0);
                                                                    // Fringe benefits for this month
                                                                    const fringeMonthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                                                    const fringeMonthTotal = (fringeMonthlyValue !== undefined && fringeMonthlyValue !== null) ? fringeMonthlyValue : 0;
                                                                    const monthTotal = employeeMonthTotal + fringeMonthTotal;
                                                                    return (
                                                                      <td key={month.value} className={`py-2 px-1 text-right font-bold text-gray-900 text-xs ${rowColors.totalPersonnelCost}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                        ${formatCurrency(monthTotal)}
                                                                      </td>
                                                                    );
                                                                  })}
                                                                  <td className={`py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100 ${rowColors.totalPersonnelCost}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                    ${formatCurrency(fiscalMonths.reduce((sum: number, month: { value: string; label: string }) => {
                                                                      const employeeMonthTotal = budgetEmployees.reduce((sum: number, alloc: any) => {
                                                                        const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                        return sum + (allocMonthly[month.value] || 0);
                                                                      }, 0);
                                                                      const fringeMonthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                                                      const fringeMonthTotal = (fringeMonthlyValue !== undefined && fringeMonthlyValue !== null) ? fringeMonthlyValue : 0;
                                                                      return sum + employeeMonthTotal + fringeMonthTotal;
                                                                    }, 0))}
                                                                  </td>
                                                                  <td className={`py-2 px-2 text-right font-bold text-gray-900 text-xs ${rowColors.totalPersonnelCost}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                    ${formatCurrency(
                                                                      (budgetEmployees.reduce((sum: number, alloc: any) => sum + (alloc.allocated_amount || 0), 0) +
                                                                       (budget.fringe_benefits_amount || 0)) -
                                                                      fiscalMonths.reduce((sum: number, month: { value: string; label: string }) => {
                                                                        const employeeMonthTotal = budgetEmployees.reduce((sum: number, alloc: any) => {
                                                                          const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                          return sum + (allocMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        const fringeMonthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                                                        const fringeMonthTotal = (fringeMonthlyValue !== undefined && fringeMonthlyValue !== null) ? fringeMonthlyValue : 0;
                                                                        return sum + employeeMonthTotal + fringeMonthTotal;
                                                                      }, 0)
                                                                    )}
                                                                  </td>
                                                                </tr>
                                                              )}

                                                              {/* Other (Budget Allocations) Section - Toggleable */}
                                                              {(() => {
                                                                // Map DCA category names to possible expense category variations
                                                                const dcaCategoryMap: { [key: string]: string[] } = {
                                                                  'Recognition Ceremony': ['RECOGNITION CEREMONY'],
                                                                  'Student Integration Activities': ['STUDENT INTEGRATION'],
                                                                  'Client Transportation': ['CLIENT TRANSPORTATION'],
                                                                  'Client Laptop': ['CLIENT LAPTOP'],
                                                                  'Direct Cash': ['DIRECT CASH'],
                                                                  'Housing': ['HOUSING'],
                                                                  'Utilities': ['UTILITIES'],
                                                                  'Food': ['FOOD'],
                                                                  'Health/Medical': ['HEALTH/MEDICAL'],
                                                                  'Training': ['TRAINING'],
                                                                  'Legal Assistance': ['LEGAL ASSISTANCE'],
                                                                  'Other Client Services': ['OTHER CLIENT SERVICES'],
                                                                };
                                                                
                                                                const allDcaCategoryVariations = Object.values(dcaCategoryMap).flat();
                                                                
                                                                // Filter expenses: Budget Allocations excludes DCA categories
                                                                const budgetExpenses = expenses.filter(exp => 
                                                                  exp.budget_id === budget.id && !allDcaCategoryVariations.includes(exp.category)
                                                                );
                                                                
                                                                const expensesTotal = budgetExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                                                                const isBudgetAllocationsExpanded = expandedBudgetAllocations.has(budget.id);
                                                                const allCategories = getAllExpenseCategories();
                                                                const isEditing = editingExpense[budget.id];
                                                                
                                                                // Calculate current month index for YTD calculations
                                                                const getCurrentMonth = () => {
                                                                  const now = new Date();
                                                                  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                                                };
                                                                const currentMonth = getCurrentMonth();
                                                                const currentMonthIndex = fiscalMonths.findIndex(m => m.value === currentMonth);
                                                                
                                                                // Calculate totals for Other row
                                                                const otherMonthTotals = fiscalMonths.map(month => {
                                                                  return budgetExpenses.reduce((sum: number, exp: any) => {
                                                                    const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                    return sum + (expMonthly[month.value] || 0);
                                                                  }, 0);
                                                                });
                                                                const otherYtdTotal = budgetExpenses.reduce((sum: number, exp: any) => {
                                                                  const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                  const ytdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((ytdSum: number, month: { value: string; label: string }) => {
                                                                    return ytdSum + (expMonthly[month.value] || 0);
                                                                  }, 0);
                                                                  return sum + ytdTotal;
                                                                }, 0);
                                                                const otherBalance = expensesTotal - otherYtdTotal;
                                                                
                                                                return (
                                                                  <>
                                                                    {/* Other Category Toggle Row */}
                                                                    <tr className={`border-t border-gray-300 font-semibold ${rowColors.other}`}>
                                                                      <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.other} text-xs font-bold cursor-pointer`} style={{ width: '150px', minWidth: '150px' }} onClick={() => toggleBudgetAllocations(budget.id)}>
                                                                        <div className="flex items-center gap-2">
                                                                          <span>{isBudgetAllocationsExpanded ? '▼' : '▶'}</span>
                                                                          <span>Other:</span>
                                                                          {!readOnly && (
                                                                            <button
                                                                              onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!isBudgetAllocationsExpanded) {
                                                                                  toggleBudgetAllocations(budget.id);
                                                                                }
                                                                                setShowAddExpenseForm(prev => ({ ...prev, [budget.id]: !prev[budget.id] }));
                                                                                if (!showAddExpenseForm[budget.id]) {
                                                                                  setNewExpenseCategory(prev => ({ ...prev, [budget.id]: '' }));
                                                                                  setNewExpenseAmount(prev => ({ ...prev, [budget.id]: 0 }));
                                                                                  setNewExpenseDescription(prev => ({ ...prev, [budget.id]: '' }));
                                                                                }
                                                                              }}
                                                                              className="text-xs px-1 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                                            >
                                                                              {showAddExpenseForm[budget.id] ? 'Cancel' : '+ Add'}
                                                                            </button>
                                                                          )}
                                                                        </div>
                                                                      </td>
                                                                      <td className="py-2 px-2 text-right font-bold text-gray-900 sticky left-[150px] text-xs bg-yellow-100" style={{ width: '100px', minWidth: '100px' }}>
                                                                        {!isBudgetAllocationsExpanded ? `$${formatCurrency(expensesTotal)}` : ''}
                                                                      </td>
                                                                      {fiscalMonths.map((month, idx) => (
                                                                        <td key={month.value} className={`py-2 px-1 text-right font-bold text-gray-900 text-xs ${rowColors.other}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                          {!isBudgetAllocationsExpanded ? `$${formatCurrency(otherMonthTotals[idx])}` : ''}
                                                                        </td>
                                                                      ))}
                                                                      <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                        {!isBudgetAllocationsExpanded ? `$${formatCurrency(otherYtdTotal)}` : ''}
                                                                      </td>
                                                                      <td className={`py-2 px-2 text-right font-bold text-gray-900 text-xs ${rowColors.other}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                        {!isBudgetAllocationsExpanded ? `$${formatCurrency(otherBalance)}` : ''}
                                                                      </td>
                                                                    </tr>

                                                                    {/* Budget Allocations Items (shown when expanded) */}
                                                                    {isBudgetAllocationsExpanded && (
                                                                      <>
                                                                        {!isBudgetAllocationsExpanded && (
                                                                          <>
                                                                            {/* Show total row at top when collapsed - actually we don't show it when collapsed, it's in the toggle row */}
                                                                          </>
                                                                        )}
                                                                        {showAddExpenseForm[budget.id] && !readOnly && (
                                                                          <tr>
                                                                            <td colSpan={4 + fiscalMonths.length + (readOnly ? 0 : 1)} className="px-4 py-3 bg-gray-50">
                                                                              <div className="space-y-2">
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                  <input
                                                                                    type="text"
                                                                                    list={`category-list-new-${budget.id}`}
                                                                                    value={newExpenseCategory[budget.id] || ''}
                                                                                    onChange={(e) => {
                                                                                      e.stopPropagation();
                                                                                      setNewExpenseCategory(prev => ({ ...prev, [budget.id]: e.target.value }));
                                                                                    }}
                                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    onFocus={(e) => e.stopPropagation()}
                                                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                                                    placeholder="Type to search category..."
                                                                                  />
                                                                                  <datalist id={`category-list-new-${budget.id}`}>
                                                                                    {allCategories.map((cat: string) => (
                                                                                      <option key={cat} value={cat} />
                                                                                    ))}
                                                                                  </datalist>
                                                                                  <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    placeholder="Amount"
                                                                                    value={newExpenseAmount[budget.id] || ''}
                                                                                    onChange={(e) => {
                                                                                      e.stopPropagation();
                                                                                      setNewExpenseAmount(prev => ({ ...prev, [budget.id]: parseFloat(e.target.value) || 0 }));
                                                                                    }}
                                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    onFocus={(e) => e.stopPropagation()}
                                                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                                                  />
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                  <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                      e.stopPropagation();
                                                                                      handleExpenseSave(budget.id);
                                                                                    }}
                                                                                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                                                  >
                                                                                    Save
                                                                                  </button>
                                                                                  <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                      e.stopPropagation();
                                                                                      cancelEditingExpense(budget.id);
                                                                                    }}
                                                                                    className="text-xs px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                                                                  >
                                                                                    Cancel
                                                                                  </button>
                                                                                </div>
                                                                              </div>
                                                                            </td>
                                                                          </tr>
                                                                        )}
                                                                        {budgetExpenses.map((exp: any) => {
                                                                          const isEditingThis = isEditing === exp.id;
                                                                          const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                          const ytdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((sum, month) => {
                                                                            return sum + (expMonthly[month.value] || 0);
                                                                          }, 0);
                                                                          const balance = (exp.amount || 0) - ytdTotal;
                                                                          return (
                                                                            <tr key={exp.id} className="border-b border-gray-100">
                                                                              <td className="py-2 px-2 text-gray-900 sticky left-0 bg-white z-10 text-xs" style={{ width: '150px', minWidth: '150px' }}>
                                                                                {isEditingThis && !readOnly ? (
                                                                                  <>
                                                                                    <input
                                                                                      type="text"
                                                                                      list={`category-list-${exp.id}`}
                                                                                      value={newExpenseCategory[budget.id] || exp.category}
                                                                                      onChange={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setNewExpenseCategory(prev => ({ ...prev, [budget.id]: e.target.value }));
                                                                                      }}
                                                                                      onKeyDown={(e) => e.stopPropagation()}
                                                                                      onClick={(e) => e.stopPropagation()}
                                                                                      onFocus={(e) => e.stopPropagation()}
                                                                                      className="w-full text-xs border border-gray-300 rounded px-1 py-1"
                                                                                      placeholder="Type to search..."
                                                                                    />
                                                                                    <datalist id={`category-list-${exp.id}`}>
                                                                                      {allCategories.map((cat: string) => (
                                                                                        <option key={cat} value={cat} />
                                                                                      ))}
                                                                                    </datalist>
                                                                                  </>
                                                                                ) : (
                                                                                  <div className="flex items-center gap-2">
                                                                                    <span className="truncate text-xs flex-1" title={exp.category}>{exp.category}</span>
                                                                                    {!readOnly && (
                                                                                      <div className="flex gap-1 items-center flex-shrink-0">
                                                                                        <button
                                                                                          type="button"
                                                                                          onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            e.preventDefault();
                                                                                            setNewExpenseCategory(prev => ({ ...prev, [budget.id]: exp.category }));
                                                                                            setNewExpenseAmount(prev => ({ ...prev, [budget.id]: exp.amount || 0 }));
                                                                                            setExpenseModal({
                                                                                              isOpen: true,
                                                                                              expenseId: exp.id,
                                                                                              budgetId: budget.id,
                                                                                              action: 'edit',
                                                                                              expense: exp,
                                                                                            });
                                                                                          }}
                                                                                          className="text-blue-600 hover:text-blue-900 p-0.5"
                                                                                          title="Edit"
                                                                                        >
                                                                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                                                                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                                                                          </svg>
                                                                                        </button>
                                                                                        <button
                                                                                          type="button"
                                                                                          onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            e.preventDefault();
                                                                                            setExpenseModal({
                                                                                              isOpen: true,
                                                                                              expenseId: exp.id,
                                                                                              budgetId: budget.id,
                                                                                              action: 'delete',
                                                                                              expense: exp,
                                                                                            });
                                                                                          }}
                                                                                          className="text-red-600 hover:text-red-900 p-0.5"
                                                                                          title="Delete"
                                                                                        >
                                                                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                                                                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                                                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                                                          </svg>
                                                                                        </button>
                                                                                      </div>
                                                                                    )}
                                                                                  </div>
                                                                                )}
                                                                              </td>
                                                                              <td className="py-2 px-2 text-right font-medium text-gray-900 sticky left-[150px] bg-yellow-100 z-10 text-xs" style={{ width: '100px', minWidth: '100px' }}>
                                                                                {readOnly ? (
                                                                                  <div className="text-xs">${formatCurrency(exp.amount || 0)}</div>
                                                                                ) : (
                                                                                  <input
                                                                                    type="text"
                                                                                    value={formatNumberInput(monthlyExpenseAllocations[exp.id]?._budgetAmount !== undefined ? monthlyExpenseAllocations[exp.id]._budgetAmount : exp.amount)}
                                                                                    onChange={(e) => {
                                                                                      e.stopPropagation();
                                                                                      const value = parseNumberInput(e.target.value);
                                                                                      setMonthlyExpenseAllocations(prev => ({
                                                                                        ...prev,
                                                                                        [exp.id]: {
                                                                                          ...(prev[exp.id] || {}),
                                                                                          _budgetAmount: value
                                                                                        }
                                                                                      }));
                                                                                    }}
                                                                                    onBlur={async () => {
                                                                                      const budgetAmount = monthlyExpenseAllocations[exp.id]?._budgetAmount;
                                                                                      if (budgetAmount !== undefined && budgetAmount !== exp.amount) {
                                                                                        try {
                                                                                          const budgetObj = budgets.find((b: any) => b.id === budget.id);
                                                                                          if (!budgetObj?.fiscal_year_start) {
                                                                                            alert('Could not find budget fiscal year');
                                                                                            return;
                                                                                          }
                                                                                          const res = await fetch('/api/expenses', {
                                                                                            method: 'PUT',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({
                                                                                              id: exp.id,
                                                                                              budget_id: budget.id,
                                                                                              category: exp.category,
                                                                                              amount: budgetAmount,
                                                                                              expense_month: budgetObj.fiscal_year_start
                                                                                            }),
                                                                                          });
                                                                                          if (res.ok) {
                                                                                            const updatedExpenses = await fetch('/api/expenses');
                                                                                            if (updatedExpenses.ok) {
                                                                                              const data = await updatedExpenses.json();
                                                                                              setExpenses(Array.isArray(data) ? data : []);
                                                                                            }
                                                                                            if (typeof window !== 'undefined') {
                                                                                              window.dispatchEvent(new CustomEvent('expenseUpdated'));
                                                                                            }
                                                                                            setMonthlyExpenseAllocations(prev => {
                                                                                              const updated = { ...prev };
                                                                                              delete updated[exp.id]?._budgetAmount;
                                                                                              return updated;
                                                                                            });
                                                                                          } else {
                                                                                            alert('Error updating budget amount');
                                                                                          }
                                                                                        } catch (error) {
                                                                                          console.error('Error updating budget amount:', error);
                                                                                          alert('Error updating budget amount');
                                                                                        }
                                                                                      }
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                      e.stopPropagation();
                                                                                      if (e.key === 'Enter') {
                                                                                        e.preventDefault();
                                                                                        e.currentTarget.blur();
                                                                                      }
                                                                                    }}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    onFocus={(e) => {
                                                                                      e.stopPropagation();
                                                                                      e.currentTarget.select();
                                                                                    }}
                                                                                    className="w-full text-right text-xs border border-gray-300 rounded px-1 py-1"
                                                                                    placeholder="0"
                                                                                  />
                                                                                )}
                                                                              </td>
                                                                              {fiscalMonths.map((month) => {
                                                                                const monthValue = expMonthly[month.value] || 0;
                                                                                return (
                                                                                  <td key={month.value} className="py-2 px-1 text-xs" style={{ width: '70px', minWidth: '70px' }}>
                                                                                    {readOnly ? (
                                                                                      <div className="text-right text-xs text-gray-600 font-medium">
                                                                                        ${formatCurrency(monthValue)}
                                                                                      </div>
                                                                                    ) : (
                                                                                      <input
                                                                                        type="text"
                                                                                        value={formatNumberInput(monthValue)}
                                                                                        onChange={(e) => {
                                                                                          e.stopPropagation();
                                                                                          e.preventDefault();
                                                                                          const value = parseNumberInput(e.target.value);
                                                                                          handleMonthlyExpenseAllocationChange(exp.id, month.value, value);
                                                                                        }}
                                                                                        onKeyDown={(e) => {
                                                                                          e.stopPropagation();
                                                                                          if (e.key === 'Enter') {
                                                                                            e.preventDefault();
                                                                                          }
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                          e.stopPropagation();
                                                                                          e.preventDefault();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                          e.stopPropagation();
                                                                                        }}
                                                                                        className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs"
                                                                                        placeholder="0"
                                                                                      />
                                                                                    )}
                                                                                  </td>
                                                                                );
                                                                              })}
                                                                              <td className="py-2 px-2 text-right font-medium text-gray-700 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                                ${formatCurrency(ytdTotal)}
                                                                              </td>
                                                                              <td className="py-2 px-2 text-right font-medium text-gray-900 text-xs" style={{ width: '90px', minWidth: '90px' }}>
                                                                                ${formatCurrency(balance)}
                                                                              </td>
                                                                            </tr>
                                                                          );
                                                                        })}
                                                                              {budgetExpenses.length === 0 && !showAddExpenseForm[budget.id] && (
                                                                                <tr>
                                                                                  <td colSpan={4 + fiscalMonths.length} className="py-2 px-2 text-sm text-gray-500 text-center">
                                                                                    No budget allocations for this budget.
                                                                                  </td>
                                                                                </tr>
                                                                              )}
                                                                        {/* Total Other Row - shown at bottom when expanded */}
                                                                        {budgetExpenses.length > 0 && (
                                                                          <tr className={`border-t-2 border-gray-300 font-semibold ${rowColors.other}`}>
                                                                            <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.other} text-xs font-bold`} style={{ width: '150px', minWidth: '150px' }}>
                                                                              Total Other:
                                                                            </td>
                                                                            <td className="py-2 px-2 text-right font-bold text-gray-900 sticky left-[150px] text-xs bg-yellow-100" style={{ width: '100px', minWidth: '100px' }}>
                                                                              ${formatCurrency(expensesTotal)}
                                                                            </td>
                                                                            {fiscalMonths.map((month, idx) => (
                                                                              <td key={month.value} className={`py-2 px-1 text-right font-bold text-gray-900 text-xs ${rowColors.other}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                                ${formatCurrency(otherMonthTotals[idx])}
                                                                              </td>
                                                                            ))}
                                                                            <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                              ${formatCurrency(otherYtdTotal)}
                                                                            </td>
                                                                            <td className={`py-2 px-2 text-right font-bold text-gray-900 text-xs ${rowColors.other}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                              ${formatCurrency(otherBalance)}
                                                                            </td>
                                                                          </tr>
                                                                        )}
                                                                      </>
                                                                    )}

                                                                    {/* Direct Client Assistance (DCA) - Toggleable */}
                                                                    {(() => {
                                                                      // Map DCA category names to possible expense category variations
                                                                      const dcaCategoryMap: { [key: string]: string[] } = {
                                                                        'Recognition Ceremony': ['RECOGNITION CEREMONY'],
                                                                        'Student Integration Activities': ['STUDENT INTEGRATION'],
                                                                        'Client Transportation': ['CLIENT TRANSPORTATION'],
                                                                        'Client Laptop': ['CLIENT LAPTOP'],
                                                                        'Direct Cash': ['DIRECT CASH'],
                                                                        'Housing': ['HOUSING'],
                                                                        'Utilities': ['UTILITIES'],
                                                                        'Food': ['FOOD'],
                                                                        'Health/Medical': ['HEALTH/MEDICAL'],
                                                                        'Training': ['TRAINING'],
                                                                        'Legal Assistance': ['LEGAL ASSISTANCE'],
                                                                        'Other Client Services': ['OTHER CLIENT SERVICES'],
                                                                      };
                                                                      
                                                                      const allDcaCategoryVariations = Object.values(dcaCategoryMap).flat();
                                                                      
                                                                      // Filter expenses for DCA: only DCA categories
                                                                      const dcaExpenses = expenses.filter((exp: any) => 
                                                                        exp.budget_id === budget.id && allDcaCategoryVariations.includes(exp.category)
                                                                      );
                                                                      
                                                                      const dcaTotal = dcaExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
                                                                      const isDCAExpanded = expandedDCA.has(budget.id);
                                                                      const allCategories = getAllExpenseCategories();
                                                                      const isEditing = editingExpense[budget.id];
                                                                      
                                                                      // Calculate totals for DCA row
                                                                      const dcaMonthTotals = fiscalMonths.map(month => {
                                                                        return dcaExpenses.reduce((sum: number, exp: any) => {
                                                                          const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                          return sum + (expMonthly[month.value] || 0);
                                                                        }, 0);
                                                                      });
                                                                      const dcaYtdTotal = dcaExpenses.reduce((sum: number, exp: any) => {
                                                                        const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                        const ytdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((ytdSum: number, month: { value: string; label: string }) => {
                                                                          return ytdSum + (expMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        return sum + ytdTotal;
                                                                      }, 0);
                                                                      const dcaBalance = dcaTotal - dcaYtdTotal;
                                                                      
                                                                      return (
                                                                        <>
                                                                          {/* DCA Toggle Row */}
                                                                          <tr className="font-semibold" style={{ borderTop: 'none', borderBottom: 'none', backgroundColor: 'transparent' }}>
                                                                            <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.dca} text-xs font-bold ${!isDCAExpanded || (isDCAExpanded && dcaExpenses.length === 0 && !showAddExpenseForm[`${budget.id}-dca`]) ? 'cursor-pointer' : ''}`} style={{ width: '150px', minWidth: '150px' }} onClick={() => !isDCAExpanded || (isDCAExpanded && dcaExpenses.length === 0 && !showAddExpenseForm[`${budget.id}-dca`]) ? toggleDCA(budget.id) : undefined}>
                                                                              <div className="flex items-center gap-2">
                                                                                {!isDCAExpanded || (isDCAExpanded && dcaExpenses.length === 0 && !showAddExpenseForm[`${budget.id}-dca`]) ? (
                                                                                  <>
                                                                                    <span>{isDCAExpanded ? '▼' : '▶'}</span>
                                                                                    <span>Direct Client Assistance:</span>
                                                                                    {!readOnly && (
                                                                                      <button
                                                                                        onClick={(e) => {
                                                                                          e.stopPropagation();
                                                                                          if (!isDCAExpanded) {
                                                                                            toggleDCA(budget.id);
                                                                                          }
                                                                                          setShowAddExpenseForm(prev => ({ ...prev, [`${budget.id}-dca`]: !prev[`${budget.id}-dca`] }));
                                                                                          if (!showAddExpenseForm[`${budget.id}-dca`]) {
                                                                                            setNewExpenseCategory(prev => ({ ...prev, [`${budget.id}-dca`]: '' }));
                                                                                            setNewExpenseAmount(prev => ({ ...prev, [`${budget.id}-dca`]: 0 }));
                                                                                            setNewExpenseDescription(prev => ({ ...prev, [`${budget.id}-dca`]: '' }));
                                                                                          }
                                                                                        }}
                                                                                        className="text-xs px-1 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                                                      >
                                                                                        {showAddExpenseForm[`${budget.id}-dca`] ? 'Cancel' : '+ Add'}
                                                                                      </button>
                                                                                    )}
                                                                                  </>
                                                                                ) : (
                                                                                  <>
                                                                                    <span>▼</span>
                                                                                    <span>Direct Client Assistance:</span>
                                                                                    {!readOnly && (
                                                                                      <button
                                                                                        onClick={(e) => {
                                                                                          e.stopPropagation();
                                                                                          setShowAddExpenseForm(prev => ({ ...prev, [`${budget.id}-dca`]: !prev[`${budget.id}-dca`] }));
                                                                                          if (!showAddExpenseForm[`${budget.id}-dca`]) {
                                                                                            setNewExpenseCategory(prev => ({ ...prev, [`${budget.id}-dca`]: '' }));
                                                                                            setNewExpenseAmount(prev => ({ ...prev, [`${budget.id}-dca`]: 0 }));
                                                                                            setNewExpenseDescription(prev => ({ ...prev, [`${budget.id}-dca`]: '' }));
                                                                                          }
                                                                                        }}
                                                                                        className="text-xs px-1 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                                                      >
                                                                                        {showAddExpenseForm[`${budget.id}-dca`] ? 'Cancel' : '+ Add'}
                                                                                      </button>
                                                                                    )}
                                                                                  </>
                                                                                )}
                                                                              </div>
                                                                            </td>
                                                                            {isDCAExpanded && dcaExpenses.length === 0 && !showAddExpenseForm[`${budget.id}-dca`] ? (
                                                                              <>
                                                                                <td colSpan={3 + fiscalMonths.length} className={`py-2 px-2 text-gray-500 text-xs italic text-center ${rowColors.dca}`}>
                                                                                  No direct client assistance entries for this budget.
                                                                                </td>
                                                                                {!readOnly && (
                                                                                  <td className="sticky right-0 bg-white" style={{ width: '100px', minWidth: '100px' }}></td>
                                                                                )}
                                                                              </>
                                                                            ) : (
                                                                              <>
                                                                                <td className="py-2 px-2 text-right font-bold text-gray-900 sticky left-[150px] text-xs bg-yellow-100" style={{ width: '100px', minWidth: '100px' }}>
                                                                                  {!isDCAExpanded ? `$${formatCurrency(dcaTotal)}` : ''}
                                                                                </td>
                                                                                {fiscalMonths.map((month, idx) => (
                                                                                  <td key={month.value} className={`py-2 px-1 text-right font-bold text-gray-900 text-xs ${rowColors.dca}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                                    {!isDCAExpanded ? `$${formatCurrency(dcaMonthTotals[idx])}` : ''}
                                                                                  </td>
                                                                                ))}
                                                                                <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                                  {!isDCAExpanded ? `$${formatCurrency(dcaYtdTotal)}` : ''}
                                                                                </td>
                                                                                <td className={`py-2 px-2 text-right font-bold text-gray-900 text-xs ${rowColors.dca}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                                  {!isDCAExpanded ? `$${formatCurrency(dcaBalance)}` : ''}
                                                                                </td>
                                                                                {!readOnly && (
                                                                                  <td className="sticky right-0 bg-white" style={{ width: '100px', minWidth: '100px' }}></td>
                                                                                )}
                                                                              </>
                                                                            )}
                                                                          </tr>

                                                                          {/* DCA Items (shown when expanded) */}
                                                                          {isDCAExpanded && (
                                                                            <>
                                                                              {showAddExpenseForm[`${budget.id}-dca`] && !readOnly && (
                                                                                <tr style={{ borderTop: 'none' }}>
                                                                                  <td colSpan={4 + fiscalMonths.length} className="px-4 py-3 bg-gray-50">
                                                                                    <div className="space-y-2">
                                                                                      <div className="grid grid-cols-2 gap-2">
                                                                                        <select
                                                                                          value={newExpenseCategory[`${budget.id}-dca`] || ''}
                                                                                          onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setNewExpenseCategory(prev => ({ ...prev, [`${budget.id}-dca`]: e.target.value }));
                                                                                          }}
                                                                                          onKeyDown={(e) => e.stopPropagation()}
                                                                                          onClick={(e) => e.stopPropagation()}
                                                                                          onFocus={(e) => e.stopPropagation()}
                                                                                          className="text-sm border border-gray-300 rounded px-2 py-1"
                                                                                        >
                                                                                          <option value="">Select category...</option>
                                                                                          {DCA_CATEGORIES.map((cat: string) => (
                                                                                            <option key={cat} value={cat}>{cat}</option>
                                                                                          ))}
                                                                                        </select>
                                                                                        <input
                                                                                          type="number"
                                                                                          step="0.01"
                                                                                          value={newExpenseAmount[`${budget.id}-dca`] || ''}
                                                                                          onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setNewExpenseAmount(prev => ({ ...prev, [`${budget.id}-dca`]: parseFloat(e.target.value) || 0 }));
                                                                                          }}
                                                                                          onKeyDown={(e) => e.stopPropagation()}
                                                                                          onClick={(e) => e.stopPropagation()}
                                                                                          onFocus={(e) => e.stopPropagation()}
                                                                                          className="text-sm border border-gray-300 rounded px-2 py-1"
                                                                                          placeholder="Amount"
                                                                                        />
                                                                                      </div>
                                                                                      <div className="flex gap-2">
                                                                                        <button
                                                                                          type="button"
                                                                                          onClick={async (e) => {
                                                                                            e.stopPropagation();
                                                                                            // Map DCA category to expense category format
                                                                                            const dcaCategoryMap: { [key: string]: string } = {
                                                                                              'Recognition Ceremony': 'RECOGNITION CEREMONY',
                                                                                              'Student Integration Activities': 'STUDENT INTEGRATION',
                                                                                              'Client Transportation': 'CLIENT TRANSPORTATION',
                                                                                              'Client Laptop': 'CLIENT LAPTOP',
                                                                                              'Direct Cash': 'DIRECT CASH',
                                                                                              'Housing': 'HOUSING',
                                                                                              'Utilities': 'UTILITIES',
                                                                                              'Food': 'FOOD',
                                                                                              'Health/Medical': 'HEALTH/MEDICAL',
                                                                                              'Training': 'TRAINING',
                                                                                              'Legal Assistance': 'LEGAL ASSISTANCE',
                                                                                              'Other Client Services': 'OTHER CLIENT SERVICES',
                                                                                            };
                                                                                            const dcaCategory = newExpenseCategory[`${budget.id}-dca`] || '';
                                                                                            const expenseCategory = dcaCategoryMap[dcaCategory] || '';
                                                                                            const amount = newExpenseAmount[`${budget.id}-dca`] || 0;
                                                                                            
                                                                                            if (!expenseCategory || amount <= 0) {
                                                                                              alert('Please enter a valid category and amount');
                                                                                              return;
                                                                                            }

                                                                                            try {
                                                                                              const budgetObj = budgets.find(b => b.id === budget.id);
                                                                                              if (!budgetObj?.fiscal_year_start) {
                                                                                                alert('Could not find budget fiscal year');
                                                                                                return;
                                                                                              }

                                                                                              const body = { budget_id: budget.id, category: expenseCategory, amount, expense_month: budgetObj.fiscal_year_start };

                                                                                              const res = await fetch('/api/expenses', {
                                                                                                method: 'POST',
                                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                                body: JSON.stringify(body),
                                                                                              });

                                                                                              if (res.ok) {
                                                                                                const updatedExpenses = await fetch('/api/expenses');
                                                                                                if (updatedExpenses.ok) {
                                                                                                  const data = await updatedExpenses.json();
                                                                                                  setExpenses(Array.isArray(data) ? data : []);
                                                                                                }
                                                                                                setShowAddExpenseForm(prev => ({ ...prev, [`${budget.id}-dca`]: false }));
                                                                                                setNewExpenseCategory(prev => {
                                                                                                  const updated = { ...prev };
                                                                                                  delete updated[`${budget.id}-dca`];
                                                                                                  return updated;
                                                                                                });
                                                                                                setNewExpenseAmount(prev => {
                                                                                                  const updated = { ...prev };
                                                                                                  delete updated[`${budget.id}-dca`];
                                                                                                  return updated;
                                                                                                });
                                                                                                if (typeof window !== 'undefined') {
                                                                                                  window.dispatchEvent(new CustomEvent('expenseUpdated'));
                                                                                                }
                                                                                              } else {
                                                                                                const errorData = await res.json().catch(() => ({}));
                                                                                                alert(`Error saving DCA entry: ${errorData.error || errorData.message || 'Unknown error'}`);
                                                                                              }
                                                                                            } catch (error: any) {
                                                                                              console.error('Error saving DCA entry:', error);
                                                                                              alert(`Error saving DCA entry: ${error.message || 'Please try again'}`);
                                                                                            }
                                                                                          }}
                                                                                          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                                                        >
                                                                                          Add
                                                                                        </button>
                                                                                        <button
                                                                                          type="button"
                                                                                          onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setShowAddExpenseForm(prev => ({ ...prev, [`${budget.id}-dca`]: false }));
                                                                                          }}
                                                                                          className="text-xs px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                                                                        >
                                                                                          Cancel
                                                                                        </button>
                                                                                      </div>
                                                                                    </div>
                                                                                  </td>
                                                                                  {!readOnly && (
                                                                                    <td className="py-2 px-2 text-center sticky right-0 bg-white z-10 text-xs" style={{ width: '100px', minWidth: '100px' }}></td>
                                                                                  )}
                                                                                </tr>
                                                                              )}
                                                                              {DCA_CATEGORIES.map((dcaCategory: string) => {
                                                                                const categoryVariations = dcaCategoryMap[dcaCategory] || [];
                                                                                const categoryExpenses = dcaExpenses.filter((exp: any) => categoryVariations.includes(exp.category));
                                                                                if (categoryExpenses.length === 0) return null;
                                                                                
                                                                                return categoryExpenses.map((exp: any) => {
                                                                                  const isEditingThis = isEditing === exp.id;
                                                                                  const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                                  const ytdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((sum, month) => {
                                                                                    return sum + (expMonthly[month.value] || 0);
                                                                                  }, 0);
                                                                                  const balance = (exp.amount || 0) - ytdTotal;
                                                                                  return (
                                                                                    <tr key={exp.id} className="border-b border-gray-100">
                                                                                      <td className="py-2 px-2 text-gray-900 sticky left-0 bg-white z-10 text-xs" style={{ width: '150px', minWidth: '150px' }}>
                                                                                        {isEditingThis && !readOnly ? (
                                                                                          <>
                                                                                            <select
                                                                                              value={newExpenseCategory[budget.id] || dcaCategory}
                                                                                              onChange={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setNewExpenseCategory(prev => ({ ...prev, [budget.id]: e.target.value }));
                                                                                              }}
                                                                                              onKeyDown={(e) => e.stopPropagation()}
                                                                                              onClick={(e) => e.stopPropagation()}
                                                                                              onFocus={(e) => e.stopPropagation()}
                                                                                              className="w-full text-xs border border-gray-300 rounded px-1 py-1"
                                                                                            >
                                                                                              {DCA_CATEGORIES.map((cat: string) => (
                                                                                                <option key={cat} value={cat}>{cat}</option>
                                                                                              ))}
                                                                                            </select>
                                                                                          </>
                                                                                        ) : (
                                                                                          <div className="flex items-center gap-2">
                                                                                            <span className="truncate text-xs flex-1" title={dcaCategory}>{dcaCategory}</span>
                                                                                            {!readOnly && (
                                                                                              <div className="flex gap-1 items-center flex-shrink-0">
                                                                                                <button
                                                                                                  type="button"
                                                                                                  onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    e.preventDefault();
                                                                                                    startEditingExpense(exp.id, budget.id);
                                                                                                    const expenseToDcaMap: { [key: string]: string } = {
                                                                                                      'RECOGNITION CEREMONY': 'Recognition Ceremony',
                                                                                                      'STUDENT INTEGRATION': 'Student Integration Activities',
                                                                                                      'CLIENT TRANSPORTATION': 'Client Transportation',
                                                                                                      'CLIENT LAPTOP': 'Client Laptop',
                                                                                                      'DIRECT CASH': 'Direct Cash',
                                                                                                      'HOUSING': 'Housing',
                                                                                                      'UTILITIES': 'Utilities',
                                                                                                      'FOOD': 'Food',
                                                                                                      'HEALTH/MEDICAL': 'Health/Medical',
                                                                                                      'TRAINING': 'Training',
                                                                                                      'LEGAL ASSISTANCE': 'Legal Assistance',
                                                                                                      'OTHER CLIENT SERVICES': 'Other Client Services',
                                                                                                    };
                                                                                                    const dcaCat = expenseToDcaMap[exp.category] || exp.category;
                                                                                                    setNewExpenseCategory(prev => ({ ...prev, [budget.id]: dcaCat }));
                                                                                                  }}
                                                                                                  className="text-blue-600 hover:text-blue-900 p-0.5"
                                                                                                  title="Edit"
                                                                                                >
                                                                                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                                                                                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                                                                                  </svg>
                                                                                                </button>
                                                                                                <button
                                                                                                  type="button"
                                                                                                  onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    e.preventDefault();
                                                                                                    handleExpenseDelete(exp.id, budget.id, exp.category);
                                                                                                  }}
                                                                                                  className="text-red-600 hover:text-red-900 p-0.5"
                                                                                                  title="Delete"
                                                                                                >
                                                                                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                                                                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                                                                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                                                                  </svg>
                                                                                                </button>
                                                                                              </div>
                                                                                            )}
                                                                                          </div>
                                                                                        )}
                                                                                      </td>
                                                                                      <td className="py-2 px-2 text-right sticky left-[150px] bg-yellow-100 z-10 text-xs" style={{ width: '100px', minWidth: '100px' }}>
                                                                                        {readOnly ? (
                                                                                          <div className="text-xs">${formatCurrency(exp.amount || 0)}</div>
                                                                                        ) : (
                                                                                          <input
                                                                                            type="text"
                                                                                            value={formatNumberInput(monthlyExpenseAllocations[exp.id]?._budgetAmount !== undefined ? monthlyExpenseAllocations[exp.id]._budgetAmount : exp.amount)}
                                                                                            onChange={(e) => {
                                                                                              e.stopPropagation();
                                                                                              const value = parseNumberInput(e.target.value);
                                                                                              setMonthlyExpenseAllocations(prev => ({
                                                                                                ...prev,
                                                                                                [exp.id]: {
                                                                                                  ...(prev[exp.id] || {}),
                                                                                                  _budgetAmount: value
                                                                                                }
                                                                                              }));
                                                                                            }}
                                                                                            onBlur={async () => {
                                                                                              const budgetAmount = monthlyExpenseAllocations[exp.id]?._budgetAmount;
                                                                                              if (budgetAmount !== undefined && budgetAmount !== exp.amount) {
                                                                                                try {
                                                                                                  const budgetObj = budgets.find((b: any) => b.id === budget.id);
                                                                                                  if (!budgetObj?.fiscal_year_start) {
                                                                                                    alert('Could not find budget fiscal year');
                                                                                                    return;
                                                                                                  }
                                                                                                  const dcaCategoryMap: { [key: string]: string } = {
                                                                                                    'Recognition Ceremony': 'RECOGNITION CEREMONY',
                                                                                                    'Student Integration Activities': 'STUDENT INTEGRATION',
                                                                                                    'Client Transportation': 'CLIENT TRANSPORTATION',
                                                                                                    'Client Laptop': 'CLIENT LAPTOP',
                                                                                                    'Direct Cash': 'DIRECT CASH',
                                                                                                    'Housing': 'HOUSING',
                                                                                                    'Utilities': 'UTILITIES',
                                                                                                    'Food': 'FOOD',
                                                                                                    'Health/Medical': 'HEALTH/MEDICAL',
                                                                                                    'Training': 'TRAINING',
                                                                                                    'Legal Assistance': 'LEGAL ASSISTANCE',
                                                                                                    'Other Client Services': 'OTHER CLIENT SERVICES',
                                                                                                  };
                                                                                                  const expenseCategory = dcaCategoryMap[exp.category] || exp.category;
                                                                                                  const res = await fetch('/api/expenses', {
                                                                                                    method: 'PUT',
                                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                                    body: JSON.stringify({
                                                                                                      id: exp.id,
                                                                                                      budget_id: budget.id,
                                                                                                      category: expenseCategory,
                                                                                                      amount: budgetAmount,
                                                                                                      expense_month: budgetObj.fiscal_year_start
                                                                                                    }),
                                                                                                  });
                                                                                                  if (res.ok) {
                                                                                                    const updatedExpenses = await fetch('/api/expenses');
                                                                                                    if (updatedExpenses.ok) {
                                                                                                      const data = await updatedExpenses.json();
                                                                                                      setExpenses(Array.isArray(data) ? data : []);
                                                                                                    }
                                                                                                    if (typeof window !== 'undefined') {
                                                                                                      window.dispatchEvent(new CustomEvent('expenseUpdated'));
                                                                                                    }
                                                                                                    setMonthlyExpenseAllocations(prev => {
                                                                                                      const updated = { ...prev };
                                                                                                      delete updated[exp.id]?._budgetAmount;
                                                                                                      return updated;
                                                                                                    });
                                                                                                  } else {
                                                                                                    alert('Error updating budget amount');
                                                                                                  }
                                                                                                } catch (error) {
                                                                                                  console.error('Error updating budget amount:', error);
                                                                                                  alert('Error updating budget amount');
                                                                                                }
                                                                                              }
                                                                                            }}
                                                                                            onKeyDown={(e) => {
                                                                                              e.stopPropagation();
                                                                                              if (e.key === 'Enter') {
                                                                                                e.preventDefault();
                                                                                                e.currentTarget.blur();
                                                                                              }
                                                                                            }}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            onFocus={(e) => {
                                                                                              e.stopPropagation();
                                                                                              e.currentTarget.select();
                                                                                            }}
                                                                                            className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs"
                                                                                            placeholder="0"
                                                                                          />
                                                                                        )}
                                                                                      </td>
                                                                                      {fiscalMonths.map((month) => {
                                                                                        const monthValue = expMonthly[month.value] || 0;
                                                                                        return (
                                                                                          <td key={month.value} className="py-2 px-2 text-xs" style={{ width: '70px', minWidth: '70px' }}>
                                                                                            {readOnly ? (
                                                                                              <div className="text-right text-xs text-gray-600 font-medium">
                                                                                                ${formatCurrency(monthValue)}
                                                                                              </div>
                                                                                            ) : (
                                                                                              <input
                                                                                                type="text"
                                                                                                value={formatNumberInput(monthValue)}
                                                                                                onChange={(e) => {
                                                                                                  e.stopPropagation();
                                                                                                  const value = parseNumberInput(e.target.value);
                                                                                                  handleMonthlyExpenseAllocationChange(exp.id, month.value, value);
                                                                                                }}
                                                                                                onKeyDown={(e) => {
                                                                                                  if (e.key === 'Enter') {
                                                                                                    e.stopPropagation();
                                                                                                    e.preventDefault();
                                                                                                    e.currentTarget.blur();
                                                                                                  } else {
                                                                                                    e.stopPropagation();
                                                                                                  }
                                                                                                }}
                                                                                                onClick={(e) => {
                                                                                                  e.stopPropagation();
                                                                                                  e.preventDefault();
                                                                                                }}
                                                                                                onFocus={(e) => {
                                                                                                  e.stopPropagation();
                                                                                                }}
                                                                                                className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs"
                                                                                                placeholder="0"
                                                                                              />
                                                                                            )}
                                                                                          </td>
                                                                                        );
                                                                                      })}
                                                                                      <td className="py-2 px-2 text-right font-medium text-gray-700 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                                        ${formatCurrency(ytdTotal)}
                                                                                      </td>
                                                                                      <td className="py-2 px-2 text-right font-medium text-gray-900 text-xs" style={{ width: '90px', minWidth: '90px' }}>
                                                                                        ${formatCurrency(balance)}
                                                                                      </td>
                                                                                      {isEditingThis && !readOnly && (
                                                                                        <td className="py-2 px-2 text-center sticky right-0 bg-white z-10 text-xs" style={{ width: '100px', minWidth: '100px' }}>
                                                                                          <div className="flex gap-1 justify-center">
                                                                                            <button
                                                                                              type="button"
                                                                                              onClick={async (e) => {
                                                                                                e.stopPropagation();
                                                                                                e.preventDefault();
                                                                                                const dcaCategoryMap: { [key: string]: string } = {
                                                                                                  'Recognition Ceremony': 'RECOGNITION CEREMONY',
                                                                                                  'Student Integration Activities': 'STUDENT INTEGRATION',
                                                                                                  'Client Transportation': 'CLIENT TRANSPORTATION',
                                                                                                  'Client Laptop': 'CLIENT LAPTOP',
                                                                                                  'Direct Cash': 'DIRECT CASH',
                                                                                                  'Housing': 'HOUSING',
                                                                                                  'Utilities': 'UTILITIES',
                                                                                                  'Food': 'FOOD',
                                                                                                  'Health/Medical': 'HEALTH/MEDICAL',
                                                                                                  'Training': 'TRAINING',
                                                                                                  'Legal Assistance': 'LEGAL ASSISTANCE',
                                                                                                  'Other Client Services': 'OTHER CLIENT SERVICES',
                                                                                                };
                                                                                                const dcaCategory = newExpenseCategory[budget.id] || exp.category;
                                                                                                const expenseCategory = dcaCategoryMap[dcaCategory] || dcaCategory;
                                                                                                const amount = newExpenseAmount[budget.id] ?? exp.amount ?? 0;
                                                                                                
                                                                                                if (!expenseCategory || amount <= 0) {
                                                                                                  alert('Please enter a valid category and amount');
                                                                                                  return;
                                                                                                }

                                                                                                try {
                                                                                                  const budgetObj = budgets.find(b => b.id === budget.id);
                                                                                                  if (!budgetObj?.fiscal_year_start) {
                                                                                                    alert('Could not find budget fiscal year');
                                                                                                    return;
                                                                                                  }

                                                                                                  const body = { id: exp.id, budget_id: budget.id, category: expenseCategory, amount, expense_month: budgetObj.fiscal_year_start };

                                                                                                  const res = await fetch('/api/expenses', {
                                                                                                    method: 'PUT',
                                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                                    body: JSON.stringify(body),
                                                                                                  });

                                                                                                  if (res.ok) {
                                                                                                    const updatedExpenses = await fetch('/api/expenses');
                                                                                                    if (updatedExpenses.ok) {
                                                                                                      const data = await updatedExpenses.json();
                                                                                                      setExpenses(Array.isArray(data) ? data : []);
                                                                                                    }
                                                                                                    setEditingExpense(prev => {
                                                                                                      const updated = { ...prev };
                                                                                                      delete updated[budget.id];
                                                                                                      return updated;
                                                                                                    });
                                                                                                    setNewExpenseCategory(prev => {
                                                                                                      const updated = { ...prev };
                                                                                                      delete updated[budget.id];
                                                                                                      return updated;
                                                                                                    });
                                                                                                    setNewExpenseAmount(prev => {
                                                                                                      const updated = { ...prev };
                                                                                                      delete updated[budget.id];
                                                                                                      return updated;
                                                                                                    });
                                                                                                    if (typeof window !== 'undefined') {
                                                                                                      window.dispatchEvent(new CustomEvent('expenseUpdated'));
                                                                                                    }
                                                                                                  } else {
                                                                                                    const errorData = await res.json().catch(() => ({}));
                                                                                                    alert(`Error saving DCA entry: ${errorData.error || errorData.message || 'Unknown error'}`);
                                                                                                  }
                                                                                                } catch (error: any) {
                                                                                                  console.error('Error saving DCA entry:', error);
                                                                                                  alert(`Error saving DCA entry: ${error.message || 'Please try again'}`);
                                                                                                }
                                                                                              }}
                                                                                              className="text-xs px-1 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                                                            >
                                                                                              Save
                                                                                            </button>
                                                                                            <button
                                                                                              type="button"
                                                                                              onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                e.preventDefault();
                                                                                                cancelEditingExpense(budget.id);
                                                                                              }}
                                                                                              className="text-xs px-1 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                                                                            >
                                                                                              Cancel
                                                                                            </button>
                                                                                          </div>
                                                                                        </td>
                                                                                      )}
                                                                                    </tr>
                                                                                  );
                                                                                });
                                                                              })}
                                                                              {/* Total DCA Row - shown at bottom when expanded */}
                                                                              {dcaExpenses.length > 0 && (
                                                                                <tr className="font-semibold" style={{ borderTop: 'none', borderBottom: 'none', backgroundColor: 'transparent' }}>
                                                                                  <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.dca} text-xs font-bold`} style={{ width: '150px', minWidth: '150px' }}>
                                                                                    Total Direct Client Assistance:
                                                                                  </td>
                                                                                  <td className="py-2 px-2 text-right font-bold text-gray-900 sticky left-[150px] text-xs bg-yellow-100" style={{ width: '100px', minWidth: '100px' }}>
                                                                                    ${formatCurrency(dcaTotal)}
                                                                                  </td>
                                                                                  {fiscalMonths.map((month) => {
                                                                                    const monthTotal = dcaExpenses.reduce((sum: number, exp: any) => {
                                                                                      const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                                      return sum + (expMonthly[month.value] || 0);
                                                                                    }, 0);
                                                                                    return (
                                                                                      <td key={month.value} className={`py-2 px-1 text-right font-bold text-gray-900 text-xs ${rowColors.dca}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                                        ${formatCurrency(monthTotal)}
                                                                                      </td>
                                                                                    );
                                                                                  })}
                                                                                  <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                                    ${formatCurrency(dcaExpenses.reduce((sum: number, exp: any) => {
                                                                                      const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                                      const ytdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((ytdSum: number, month: { value: string; label: string }) => {
                                                                                        return ytdSum + (expMonthly[month.value] || 0);
                                                                                      }, 0);
                                                                                      return sum + ytdTotal;
                                                                                    }, 0))}
                                                                                  </td>
                                                                                  <td className={`py-2 px-2 text-right font-bold text-gray-900 text-xs ${rowColors.dca}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                                    ${formatCurrency(dcaTotal - dcaExpenses.reduce((sum: number, exp: any) => {
                                                                                      const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                                      const ytdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((ytdSum: number, month: { value: string; label: string }) => {
                                                                                        return ytdSum + (expMonthly[month.value] || 0);
                                                                                      }, 0);
                                                                                      return sum + ytdTotal;
                                                                                    }, 0))}
                                                                                  </td>
                                                                                  {!readOnly && <td className="sticky right-0 bg-white" style={{ width: '100px', minWidth: '100px' }}></td>}
                                                                                </tr>
                                                                              )}
                                                                            </>
                                                                          )}
                                                                        </>
                                                                      );
                                                                    })()}

                                                                    {/* Indirect Cost - Toggleable */}
                                                                    {(() => {
                                                                      const indirectCostAmount = budget.indirect_cost || 0;
                                                                      const isIndirectCostExpanded = expandedIndirectCost.has(budget.id);
                                                                      
                                                                      // Calculate totals for Indirect Cost row
                                                                      const indirectCostMonthTotals = fiscalMonths.map(month => {
                                                                        const monthlyValue = monthlyIndirectCostAllocations[budget.id]?.[month.value];
                                                                        return (monthlyValue !== undefined && monthlyValue !== null) ? monthlyValue : ((indirectCostAmount / Math.max(fiscalMonths.length, 1)) || 0);
                                                                      });
                                                                      const indirectCostYtdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((sum: number, month: { value: string; label: string }) => {
                                                                        const monthlyValue = monthlyIndirectCostAllocations[budget.id]?.[month.value];
                                                                        if (monthlyValue !== undefined && monthlyValue !== null) {
                                                                          return sum + monthlyValue;
                                                                        }
                                                                        return sum;
                                                                      }, 0);
                                                                      const indirectCostBalance = indirectCostAmount - indirectCostYtdTotal;
                                                                      
                                                                      return (
                                                                        <>
                                                                          {/* Indirect Cost Row (always visible) */}
                                                                          <tr className={`font-semibold ${rowColors.indirectCost}`} style={{ borderTop: 'none' }}>
                                                                            <td className={`py-2 px-2 text-gray-900 sticky left-0 ${rowColors.indirectCost} text-xs font-bold`} style={{ width: '150px', minWidth: '150px' }}>
                                                                              Indirect Cost:
                                                                            </td>
                                                                            <td className={`py-2 px-2 text-right sticky left-[150px] ${rowColors.indirectCost} bg-yellow-100 text-xs`} style={{ width: '100px', minWidth: '100px' }}>
                                                                                  {readOnly ? (
                                                                                    <div className="font-bold text-gray-900 text-center">
                                                                                      ${formatCurrency(indirectCostAmount)}
                                                                                    </div>
                                                                                  ) : (
                                                                                    <input
                                                                                      type="text"
                                                                                      value={
                                                                                        editingIndirectCost[budget.id] !== undefined 
                                                                                          ? (editingIndirectCost[budget.id] === null ? '' : formatNumberInput(editingIndirectCost[budget.id]))
                                                                                          : formatNumberInput(budget.indirect_cost)
                                                                                      }
                                                                                      onChange={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const rawValue = e.target.value;
                                                                                        if (rawValue === '') {
                                                                                          setEditingIndirectCost(prev => ({
                                                                                            ...prev,
                                                                                            [budget.id]: null,
                                                                                          }));
                                                                                        } else {
                                                                                          const value = parseNumberInput(rawValue);
                                                                                          if (!isNaN(value)) {
                                                                                            setEditingIndirectCost(prev => ({
                                                                                              ...prev,
                                                                                              [budget.id]: value,
                                                                                            }));
                                                                                          }
                                                                                        }
                                                                                      }}
                                                                                      onBlur={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const inputValue = e.target.value;
                                                                                        const value = inputValue === '' ? null : parseNumberInput(inputValue);
                                                                                        const currentValue = budget.indirect_cost !== null && budget.indirect_cost !== undefined ? budget.indirect_cost : null;
                                                                                        if (value !== currentValue) {
                                                                                          handleIndirectCostChange(budget.id, value);
                                                                                        } else {
                                                                                          setEditingIndirectCost(prev => {
                                                                                            const updated = { ...prev };
                                                                                            delete updated[budget.id];
                                                                                            return updated;
                                                                                          });
                                                                                        }
                                                                                      }}
                                                                                      onKeyDown={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (e.key === 'Enter') {
                                                                                          e.preventDefault();
                                                                                          e.currentTarget.blur();
                                                                                        }
                                                                                      }}
                                                                                      onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                      }}
                                                                                      onFocus={(e) => {
                                                                                        e.stopPropagation();
                                                                                      }}
                                                                                      className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                                      placeholder="0"
                                                                                    />
                                                                                  )}
                                                                                </td>
                                                                                {fiscalMonths.map((month) => {
                                                                                  const hasCustomValue = monthlyIndirectCostAllocations[budget.id]?.[month.value] !== undefined;
                                                                                  const indirectMonthly = hasCustomValue
                                                                                    ? monthlyIndirectCostAllocations[budget.id]?.[month.value]
                                                                                    : null;
                                                                                  return (
                                                                                    <td key={month.value} className={`py-2 px-1 ${rowColors.indirectCost}`} style={{ width: '70px', minWidth: '70px' }}>
                                                                                      {readOnly ? (
                                                                                        <div className="text-right text-xs font-bold text-gray-900">
                                                                                          ${formatCurrency(indirectMonthly !== null && indirectMonthly !== undefined ? indirectMonthly : ((indirectCostAmount / Math.max(fiscalMonths.length, 1)) || 0))}
                                                                                        </div>
                                                                                      ) : (
                                                                                        <input
                                                                                          type="text"
                                                                                          value={formatNumberInput(indirectMonthly)}
                                                                                          onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const value = e.target.value === '' ? null : parseNumberInput(e.target.value);
                                                                                            handleMonthlyIndirectCostAllocationChange(budget.id, month.value, value);
                                                                                          }}
                                                                                          onKeyDown={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (e.key === 'Enter') {
                                                                                              e.preventDefault();
                                                                                            }
                                                                                          }}
                                                                                          onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                          }}
                                                                                          onFocus={(e) => {
                                                                                            e.stopPropagation();
                                                                                          }}
                                                                                          className="w-full text-right px-1 py-1 border border-gray-300 rounded text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                                          placeholder="0"
                                                                                        />
                                                                                      )}
                                                                                    </td>
                                                                                  );
                                                                                })}
                                                                                <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100" style={{ width: '90px', minWidth: '90px' }}>
                                                                                  ${formatCurrency(fiscalMonths.reduce((sum: number, month: { value: string; label: string }) => {
                                                                                    const monthlyValue = monthlyIndirectCostAllocations[budget.id]?.[month.value];
                                                                                    if (monthlyValue !== undefined && monthlyValue !== null) {
                                                                                      return sum + monthlyValue;
                                                                                    }
                                                                                    return sum;
                                                                                  }, 0))}
                                                                                </td>
                                                                                <td className={`py-2 px-2 text-right font-bold text-xs ${rowColors.indirectCost}`} style={{ width: '90px', minWidth: '90px' }}>
                                                                                  {(() => {
                                                                                    const indirectBalance = indirectCostAmount - fiscalMonths.reduce((sum: number, month: { value: string; label: string }) => {
                                                                                      const monthlyValue = monthlyIndirectCostAllocations[budget.id]?.[month.value];
                                                                                      if (monthlyValue !== undefined && monthlyValue !== null) {
                                                                                        return sum + monthlyValue;
                                                                                      }
                                                                                      return sum;
                                                                                    }, 0);
                                                                                    return (
                                                                                      <span className={indirectBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                                        ${formatCurrency(indirectBalance)}
                                                                                      </span>
                                                                                    );
                                                                                  })()}
                                                                                </td>
                                                                              </tr>
                                                                        </>
                                                                      );
                                                                    })()}

                                                                    {/* Total Program Cost - Toggleable */}
                                                                    {(() => {
                                                                      // Calculate totals for Total Program Cost
                                                                      const dcaCategoryMapForTotal: { [key: string]: string[] } = {
                                                                        'Recognition Ceremony': ['RECOGNITION CEREMONY'],
                                                                        'Student Integration Activities': ['STUDENT INTEGRATION'],
                                                                        'Client Transportation': ['CLIENT TRANSPORTATION'],
                                                                        'Client Laptop': ['CLIENT LAPTOP'],
                                                                      };
                                                                      const allDcaCategoryVariationsForTotal = Object.values(dcaCategoryMapForTotal).flat();
                                                                      const budgetExpensesForTotal = expenses.filter((exp: any) => 
                                                                        exp.budget_id === budget.id && !allDcaCategoryVariationsForTotal.includes(exp.category)
                                                                      );
                                                                      
                                                                      const personnelCostTotal = budgetEmployees.reduce((sum: number, alloc: any) => sum + (alloc.allocated_amount || 0), 0) + (budget.fringe_benefits_amount || 0);
                                                                      const indirectCostTotal = budget.indirect_cost || 0;
                                                                      const budgetAllocationsTotal = budgetExpensesForTotal.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
                                                                      const dcaExpensesForTotal = expenses.filter((exp: any) => 
                                                                        exp.budget_id === budget.id && allDcaCategoryVariationsForTotal.includes(exp.category)
                                                                      );
                                                                      const dcaTotalForTotal = dcaExpensesForTotal.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                                                                      const totalProgramCost = personnelCostTotal + indirectCostTotal + budgetAllocationsTotal + dcaTotalForTotal;
                                                                      const isTotalProgramCostExpanded = expandedTotalProgramCost.has(budget.id);
                                                                      
                                                                      // Calculate month totals for Total Program Cost
                                                                      const totalProgramCostMonthTotals = fiscalMonths.map(month => {
                                                                        // Employee allocations for this month
                                                                        const employeeMonthTotal = budgetEmployees.reduce((sum: number, alloc: any) => {
                                                                          const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                          return sum + (allocMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        // Fringe benefits for this month
                                                                        const fringeMonthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                                                        const fringeMonthTotal = (fringeMonthlyValue !== undefined && fringeMonthlyValue !== null) ? fringeMonthlyValue : 0;
                                                                        // Budget allocations for this month
                                                                        const budgetAllocMonthTotal = budgetExpensesForTotal.reduce((sum: number, exp: any) => {
                                                                          const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                          return sum + (expMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        // DCA for this month
                                                                        const dcaMonthTotal = dcaExpensesForTotal.reduce((sum: number, exp: any) => {
                                                                          const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                          return sum + (expMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        // Indirect cost for this month
                                                                        const indirectMonthlyValue = monthlyIndirectCostAllocations[budget.id]?.[month.value];
                                                                        const indirectMonthTotal = (indirectMonthlyValue !== undefined && indirectMonthlyValue !== null) ? indirectMonthlyValue : 0;
                                                                        
                                                                        return employeeMonthTotal + fringeMonthTotal + budgetAllocMonthTotal + dcaMonthTotal + indirectMonthTotal;
                                                                      });
                                                                      
                                                                      const totalProgramCostYtdTotal = fiscalMonths.slice(0, currentMonthIndex + 1).reduce((sum: number, month: { value: string; label: string }) => {
                                                                        // Employee allocations for this month
                                                                        const employeeMonthTotal = budgetEmployees.reduce((sum: number, alloc: any) => {
                                                                          const allocMonthly = monthlyAllocations[alloc.id] || alloc.monthly_allocations || {};
                                                                          return sum + (allocMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        // Fringe benefits for this month
                                                                        const fringeMonthlyValue = monthlyFringeAllocations[budget.id]?.[month.value];
                                                                        const fringeMonthTotal = (fringeMonthlyValue !== undefined && fringeMonthlyValue !== null) ? fringeMonthlyValue : 0;
                                                                        // Budget allocations for this month
                                                                        const budgetAllocMonthTotal = budgetExpensesForTotal.reduce((sum: number, exp: any) => {
                                                                          const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                          return sum + (expMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        // DCA for this month
                                                                        const dcaMonthTotal = dcaExpensesForTotal.reduce((sum: number, exp: any) => {
                                                                          const expMonthly = monthlyExpenseAllocations[exp.id] || exp.monthly_allocations || {};
                                                                          return sum + (expMonthly[month.value] || 0);
                                                                        }, 0);
                                                                        // Indirect cost for this month
                                                                        const indirectMonthlyValue = monthlyIndirectCostAllocations[budget.id]?.[month.value];
                                                                        const indirectMonthTotal = (indirectMonthlyValue !== undefined && indirectMonthlyValue !== null) ? indirectMonthlyValue : 0;
                                                                        
                                                                        return sum + employeeMonthTotal + fringeMonthTotal + budgetAllocMonthTotal + dcaMonthTotal + indirectMonthTotal;
                                                                      }, 0);
                                                                      
                                                                      const totalProgramCostBalance = totalProgramCost - totalProgramCostYtdTotal;
                                                                      
                                                                      return (
                                                                        <>
                                                                          {/* Total Program Cost Row (always visible) */}
                                                                          <tr className="border-t-2 border-gray-400 font-semibold bg-blue-50">
                                                                            <td className="py-2 px-2 text-gray-900 sticky left-0 bg-blue-50 z-10 text-xs font-bold" style={{ width: '150px', minWidth: '150px' }}>Total Program Cost</td>
                                                                            <td className="py-2 px-2 text-right font-bold text-gray-900 sticky left-[150px] bg-yellow-100 z-10 text-xs" style={{ width: '100px', minWidth: '100px' }}>${formatCurrency(totalProgramCost)}</td>
                                                                            {fiscalMonths.map((month, idx) => (
                                                                              <td key={month.value} className="py-2 px-1 text-right font-bold text-gray-900 text-xs bg-blue-50" style={{ width: '70px', minWidth: '70px' }}>
                                                                                ${formatCurrency(totalProgramCostMonthTotals[idx])}
                                                                              </td>
                                                                            ))}
                                                                            <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-yellow-100 bg-blue-50" style={{ width: '90px', minWidth: '90px' }}>
                                                                              ${formatCurrency(totalProgramCostYtdTotal)}
                                                                            </td>
                                                                            <td className="py-2 px-2 text-right font-bold text-gray-900 text-xs bg-blue-50" style={{ width: '90px', minWidth: '90px' }}>
                                                                              ${formatCurrency(totalProgramCostBalance)}
                                                                            </td>
                                                                          </tr>
                                                                        </>
                                                                      );
                                                                    })()}
                                                                  </>
                                                                );
                                                              })()}
                                                            </tbody>
                                                          </table>
                                                          </div>
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              ) : (
                                                <p className="text-sm text-gray-500">No employees allocated to this budget.</p>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="px-6 py-8 text-center text-gray-500">
                            No budgets assigned to this funder yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  No funders found. Please add funders in the Funders/Donors tab.
                </div>
              )}

              {/* Budgets without funder */}
              {(() => {
                const budgetsWithoutFunder = budgets.filter((b) => !b.funder_id);
                if (budgetsWithoutFunder.length > 0) {
                  return (
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Budgets Without Funder</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {budgetsWithoutFunder.length} budget{budgetsWithoutFunder.length !== 1 ? 's' : ''} not assigned to a funder
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Budget
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Location
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Total Budget
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {budgetsWithoutFunder.map((budget, index) => {
                              const isEven = index % 2 === 0;
                              return (
                              <tr 
                                key={budget.id}
                                className={`${isEven ? 'bg-gray-50' : 'bg-white'} transition-colors duration-150 hover:bg-gray-100`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {budget.budget_number}{budget.name ? ` - ${budget.name}` : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {budget.location?.code || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  ${(budget.total_budget || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Budgets without funder */}
              {(() => {
                const budgetsWithoutFunder = budgets.filter((b) => !b.funder_id);
                if (budgetsWithoutFunder.length > 0) {
                  return (
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Budgets Without Funder</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {budgetsWithoutFunder.length} budget{budgetsWithoutFunder.length !== 1 ? 's' : ''} not assigned to a funder
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Budget
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Location
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Total Budget
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {budgetsWithoutFunder.map((budget, index) => {
                              const isEven = index % 2 === 0;
                              return (
                              <tr 
                                key={budget.id}
                                className={`${isEven ? 'bg-gray-50' : 'bg-white'} transition-colors duration-150 hover:bg-gray-100`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {budget.budget_number}{budget.name ? ` - ${budget.name}` : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {budget.location?.code || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  ${(budget.total_budget || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {activeTab === 'program-line-items' && <ProgramBudgetLineItems />}

        {activeTab === 'budgets' && <BudgetManager readOnly={readOnly} />}

        {activeTab === 'employees' && <EmployeeManager readOnly={readOnly} />}

        {activeTab === 'allocations' && <AllocationManager readOnly={readOnly} />}

        {activeTab === 'funders' && <FunderManager readOnly={readOnly} />}

        {activeTab === 'fiscal-years' && <FiscalYearManager readOnly={readOnly} />}

        {activeTab === 'export' && <ExportToExcel />}

        {activeTab === 'print' && <BudgetPrint />}

        {/* Expense Edit/Delete Modal */}
        {expenseModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setExpenseModal({ isOpen: false, expenseId: null, budgetId: null, action: null, expense: null })}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              {expenseModal.action === 'edit' ? (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Budget Allocation</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        list={`category-list-edit-${expenseModal.expenseId}`}
                        value={newExpenseCategory[expenseModal.budgetId || ''] || expenseModal.expense?.category || ''}
                        onChange={(e) => {
                          setNewExpenseCategory(prev => ({ ...prev, [expenseModal.budgetId || '']: e.target.value }));
                        }}
                        className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                        placeholder="Type to search category..."
                      />
                      <datalist id={`category-list-edit-${expenseModal.expenseId}`}>
                        {getAllExpenseCategories().map((cat: string) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newExpenseAmount[expenseModal.budgetId || ''] ?? expenseModal.expense?.amount ?? 0}
                        onChange={(e) => {
                          setNewExpenseAmount(prev => ({ ...prev, [expenseModal.budgetId || '']: parseFloat(e.target.value) || 0 }));
                        }}
                        className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setExpenseModal({ isOpen: false, expenseId: null, budgetId: null, action: null, expense: null })}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (expenseModal.expenseId && expenseModal.budgetId) {
                            setNewExpenseCategory(prev => ({ ...prev, [expenseModal.budgetId!]: newExpenseCategory[expenseModal.budgetId!] || expenseModal.expense?.category || '' }));
                            setNewExpenseAmount(prev => ({ ...prev, [expenseModal.budgetId!]: newExpenseAmount[expenseModal.budgetId!] ?? expenseModal.expense?.amount ?? 0 }));
                            await handleExpenseSave(expenseModal.budgetId, expenseModal.expenseId);
                            setExpenseModal({ isOpen: false, expenseId: null, budgetId: null, action: null, expense: null });
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Budget Allocation</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete the budget allocation &quot;{expenseModal.expense?.category}&quot;?
                    <br />
                    <span className="font-medium">Amount: ${formatCurrency(expenseModal.expense?.amount || 0)}</span>
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setExpenseModal({ isOpen: false, expenseId: null, budgetId: null, action: null, expense: null })}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (expenseModal.expenseId && expenseModal.budgetId) {
                          await handleExpenseDelete(expenseModal.expenseId, expenseModal.budgetId, expenseModal.expense?.category);
                          setExpenseModal({ isOpen: false, expenseId: null, budgetId: null, action: null, expense: null });
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
