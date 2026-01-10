'use client';

import { useState, useEffect, useMemo } from 'react';

interface TimeEntry {
  id: string;
  employee_id: string;
  budget_id: string;
  pay_period_start: string;
  pay_period_end: string;
  hours_worked: number;
  wage_amount: number;
  manual_adjustment?: number;
  bonus?: number;
  notes?: string;
  is_biweekly?: boolean;
  employee?: { first_name: string; last_name: string };
  budget?: { budget_number: string; name: string };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  hourly_rate: number;
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  color_code?: string;
}

interface TimeEntryManagerProps {
  readOnly?: boolean;
}

export default function TimeEntryManager({ readOnly = false }: TimeEntryManagerProps = {}) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    budget_id: '',
    pay_period_start: '',
    pay_period_end: '',
    hours_worked: 0,
    manual_adjustment: 0,
    bonus: 0,
    notes: '',
    is_biweekly: true,
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [sortBy, setSortBy] = useState<'hours' | 'wage' | 'adjustment' | 'bonus' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const [entriesRes, employeesRes, budgetsRes] = await Promise.all([
        fetch(`/api/time-entries?month=${selectedMonth}`),
        fetch('/api/employees'),
        fetch('/api/budgets'),
      ]);

      const entriesData = entriesRes.ok ? await entriesRes.json() : [];
      const employeesData = employeesRes.ok ? await employeesRes.json() : [];
      const budgetsData = budgetsRes.ok ? await budgetsRes.json() : [];

      setTimeEntries(Array.isArray(entriesData) ? entriesData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setEntries([]);
      setEmployees([]);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = selectedEntry ? 'PUT' : 'POST';
      const body = selectedEntry ? { id: selectedEntry.id, ...formData } : formData;

      const res = await fetch('/api/time-entries', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadData();
        setShowForm(false);
        setSelectedEntry(null);
        setFormData({
          employee_id: '',
          budget_id: '',
          pay_period_start: '',
          pay_period_end: '',
          hours_worked: 0,
          manual_adjustment: 0,
          bonus: 0,
          notes: '',
          is_biweekly: true,
        });
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
      alert('Error saving time entry');
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      budget_id: entry.budget_id,
      pay_period_start: entry.pay_period_start,
      pay_period_end: entry.pay_period_end,
      hours_worked: entry.hours_worked,
      manual_adjustment: entry.manual_adjustment || 0,
      bonus: entry.bonus || 0,
      notes: entry.notes || '',
      is_biweekly: entry.is_biweekly !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      const res = await fetch(`/api/time-entries?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert('Error deleting time entry');
    }
  };

  const handleSort = (column: 'hours' | 'wage' | 'adjustment' | 'bonus' | 'total') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const sortedEntries = useMemo(() => {
    if (!sortBy) return timeEntries;
    
    const sorted = [...timeEntries].sort((a, b) => {
      let diff = 0;
      
      if (sortBy === 'hours') {
        diff = (a.hours_worked || 0) - (b.hours_worked || 0);
      } else if (sortBy === 'wage') {
        diff = (a.wage_amount || 0) - (b.wage_amount || 0);
      } else if (sortBy === 'adjustment') {
        diff = (a.manual_adjustment || 0) - (b.manual_adjustment || 0);
      } else if (sortBy === 'bonus') {
        diff = (a.bonus || 0) - (b.bonus || 0);
      } else if (sortBy === 'total') {
        const totalA = (a.wage_amount || 0) + (a.manual_adjustment || 0) + (a.bonus || 0);
        const totalB = (b.wage_amount || 0) + (b.manual_adjustment || 0) + (b.bonus || 0);
        diff = totalA - totalB;
      }
      
      return sortDirection === 'asc' ? diff : -diff;
    });
    
    return sorted;
  }, [timeEntries, sortBy, sortDirection]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const SortIcon = ({ column }: { column: 'hours' | 'wage' | 'adjustment' | 'bonus' | 'total' }) => (
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
        <h2 className="text-2xl font-bold text-gray-900">Timesheets</h2>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setSelectedEntry(null);
              setFormData({
                employee_id: '',
                budget_id: '',
                pay_period_start: '',
                pay_period_end: '',
                hours_worked: 0,
              });
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Time Entry
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedEntry ? 'Edit Time Entry' : 'Add Time Entry'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select employee</option>
                  {Array.isArray(employees) && employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (${emp.hourly_rate || 0}/hr)
                    </option>
                  ))}
                </select>
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
                  {Array.isArray(budgets) && budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.budget_number} - {budget.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pay Period Start</label>
                <input
                  type="date"
                  value={formData.pay_period_start}
                  onChange={(e) => {
                    const start = e.target.value;
                    let end = formData.pay_period_end;
                    // Auto-calculate biweekly end date (14 days later)
                    if (formData.is_biweekly && start) {
                      const endDate = new Date(start);
                      endDate.setDate(endDate.getDate() + 13); // 14 days total (inclusive)
                      end = endDate.toISOString().split('T')[0];
                    }
                    setFormData({ ...formData, pay_period_start: start, pay_period_end: end });
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pay Period End</label>
                <input
                  type="date"
                  value={formData.pay_period_end}
                  onChange={(e) => setFormData({ ...formData, pay_period_end: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Biweekly Pay Period</label>
                <input
                  type="checkbox"
                  checked={formData.is_biweekly}
                  onChange={(e) => {
                    const isBiweekly = e.target.checked;
                    let end = formData.pay_period_end;
                    // Auto-calculate end date if biweekly
                    if (isBiweekly && formData.pay_period_start) {
                      const endDate = new Date(formData.pay_period_start);
                      endDate.setDate(endDate.getDate() + 13);
                      end = endDate.toISOString().split('T')[0];
                    }
                    setFormData({ ...formData, is_biweekly: isBiweekly, pay_period_end: end });
                  }}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">Some months have 3 pay periods</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hours Worked</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hours_worked}
                  onChange={(e) => setFormData({ ...formData, hours_worked: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Wage amount will be calculated automatically
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manual Adjustment</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.manual_adjustment}
                  onChange={(e) => setFormData({ ...formData, manual_adjustment: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Positive or negative amount"
                />
                <p className="mt-1 text-xs text-gray-500">
                  For manual adjustments (can be positive or negative)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bonus</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Add notes about this time entry..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedEntry ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedEntry(null);
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('hours')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Hours
                  <SortIcon column="hours" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('wage')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Wage
                  <SortIcon column="wage" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('adjustment')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Adjustment
                  <SortIcon column="adjustment" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('bonus')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Bonus
                  <SortIcon column="bonus" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('total')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Total
                  <SortIcon column="total" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(sortedEntries) && sortedEntries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {entry.employee?.first_name} {entry.employee?.last_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    {budgets.find(b => b.id === entry.budget_id)?.color_code && (
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: budgets.find(b => b.id === entry.budget_id)?.color_code }}
                      />
                    )}
                    {entry.budget?.budget_number}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(entry.pay_period_start).toLocaleDateString()} - {new Date(entry.pay_period_end).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{entry.hours_worked}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${entry.wage_amount || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${entry.manual_adjustment || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${entry.bonus || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  ${(entry.wage_amount || 0) + (entry.manual_adjustment || 0) + (entry.bonus || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
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

