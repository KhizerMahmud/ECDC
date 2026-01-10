'use client';

import { useState } from 'react';

interface ExportOptions {
  includeBudgets: boolean;
  includeEmployees: boolean;
  includeAllocations: boolean;
  includeTimeEntries: boolean;
  includeExpenses: boolean;
  fiscalYear?: string;
}

export default function ExportToExcel() {
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeBudgets: true,
    includeEmployees: true,
    includeAllocations: true,
    includeTimeEntries: false,
    includeExpenses: false,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Export successful!');
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Export to Excel</h3>
      <p className="text-sm text-gray-500 mb-4">
        Export your budget data to an Excel file for analysis or backup.
      </p>

      <div className="space-y-3 mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeBudgets}
            onChange={(e) => setOptions({ ...options, includeBudgets: e.target.checked })}
            className="mr-2"
          />
          <span>Include Budgets</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeEmployees}
            onChange={(e) => setOptions({ ...options, includeEmployees: e.target.checked })}
            className="mr-2"
          />
          <span>Include Employees</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeAllocations}
            onChange={(e) => setOptions({ ...options, includeAllocations: e.target.checked })}
            className="mr-2"
          />
          <span>Include Allocations</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeTimeEntries}
            onChange={(e) => setOptions({ ...options, includeTimeEntries: e.target.checked })}
            className="mr-2"
          />
          <span>Include Time Entries</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeExpenses}
            onChange={(e) => setOptions({ ...options, includeExpenses: e.target.checked })}
            className="mr-2"
          />
          <span>Include Expenses</span>
        </label>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? 'Exporting...' : '📥 Export to Excel'}
      </button>
    </div>
  );
}

