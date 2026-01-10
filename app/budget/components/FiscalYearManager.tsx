'use client';

import { useState, useEffect } from 'react';

interface FiscalYear {
  id?: string;
  start_date: string;
  end_date: string;
  name: string;
  is_active: boolean;
}

interface FiscalYearManagerProps {
  readOnly?: boolean;
}

export default function FiscalYearManager({ readOnly = false }: FiscalYearManagerProps = {}) {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    name: '',
    is_active: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiscalYears();
  }, []);

  const loadFiscalYears = async () => {
    try {
      // Get unique fiscal years from budgets
      const res = await fetch('/api/budgets');
      const budgets = res.ok ? await res.json() : [];
      
      // Extract unique fiscal year ranges
      const yearMap = new Map<string, FiscalYear>();
      budgets.forEach((budget: any) => {
        const key = `${budget.fiscal_year_start}_${budget.fiscal_year_end}`;
        if (!yearMap.has(key)) {
          const start = new Date(budget.fiscal_year_start);
          const end = new Date(budget.fiscal_year_end);
          const name = `FY${start.getFullYear().toString().slice(-2)}-${end.getFullYear().toString().slice(-2)}`;
          
          yearMap.set(key, {
            start_date: budget.fiscal_year_start,
            end_date: budget.fiscal_year_end,
            name,
            is_active: false,
          });
        }
      });

      const years = Array.from(yearMap.values()).sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );

      // Mark current fiscal year as active
      const now = new Date();
      years.forEach(year => {
        const start = new Date(year.start_date);
        const end = new Date(year.end_date);
        year.is_active = now >= start && now <= end;
      });

      setFiscalYears(years);
      if (years.length > 0 && !selectedFiscalYear) {
        const activeYear = years.find(y => y.is_active) || years[0];
        setSelectedFiscalYear(`${activeYear.start_date}_${activeYear.end_date}`);
      }
    } catch (error) {
      console.error('Error loading fiscal years:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      
      if (end <= start) {
        alert('End date must be after start date');
        return;
      }

      // Create a new fiscal year by creating a sample budget (or you could create a fiscal_years table)
      // For now, we'll just validate and show success
      const name = formData.name || `FY${start.getFullYear().toString().slice(-2)}-${end.getFullYear().toString().slice(-2)}`;
      
      alert(`Fiscal year ${name} will be created when you create budgets for this period.`);
      
      setFormData({
        start_date: '',
        end_date: '',
        name: '',
        is_active: false,
      });
      setShowForm(false);
      await loadFiscalYears();
    } catch (error) {
      console.error('Error creating fiscal year:', error);
      alert('Error creating fiscal year');
    }
  };

  const handleFiscalYearChange = (yearKey: string) => {
    setSelectedFiscalYear(yearKey);
    // Store in localStorage to persist across page reloads
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedFiscalYear', yearKey);
      // Trigger a custom event to notify parent component
      window.dispatchEvent(new CustomEvent('fiscalYearChanged', { detail: yearKey }));
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fiscal Year Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage fiscal years and switch between different budget periods
          </p>
        </div>
        <button
          onClick={() => {
            // Set default to next fiscal year (Oct 1 to Sept 30)
            const now = new Date();
            const currentYear = now.getFullYear();
            const month = now.getMonth();
            
            let startYear = currentYear;
            if (month >= 9) { // October or later
              startYear = currentYear + 1;
            }
            
            const startDate = `${startYear}-10-01`;
            const endDate = `${startYear + 1}-09-30`;
            
            setFormData({
              start_date: startDate,
              end_date: endDate,
              name: `FY${startYear.toString().slice(-2)}-${(startYear + 1).toString().slice(-2)}`,
              is_active: false,
            });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create New Fiscal Year
        </button>
      </div>

      {/* Current Fiscal Year Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Select Fiscal Year</h3>
        <div className="flex flex-wrap gap-3">
          {fiscalYears.map((year) => {
            const yearKey = `${year.start_date}_${year.end_date}`;
            return (
              <button
                key={yearKey}
                onClick={() => handleFiscalYearChange(yearKey)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  selectedFiscalYear === yearKey
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : year.is_active
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">{year.name}</div>
                <div className="text-xs mt-1">
                  {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                </div>
                {year.is_active && (
                  <div className="text-xs mt-1 font-semibold">(Current)</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Create New Fiscal Year Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Fiscal Year</h3>
          <form onSubmit={handleCreateFiscalYear} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    const start = e.target.value;
                    setFormData({ ...formData, start_date: start });
                    // Auto-generate name if not set
                    if (!formData.name && start) {
                      const startYear = new Date(start).getFullYear();
                      const endYear = startYear + 1;
                      setFormData(prev => ({
                        ...prev,
                        start_date: start,
                        name: `FY${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`,
                      }));
                    }
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., FY25-26"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to auto-generate from dates
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Fiscal Year
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    start_date: '',
                    end_date: '',
                    name: '',
                    is_active: false,
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

