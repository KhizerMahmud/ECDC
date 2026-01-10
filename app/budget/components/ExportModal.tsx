'use client';

import { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: 'budgets' | 'employees' | 'all';
  onExport: (options: {
    format: 'xlsx' | 'csv' | 'json';
    filename: string;
    includeBudgets?: boolean;
    includeEmployees?: boolean;
    includeAllocations?: boolean;
    includeTimeEntries?: boolean;
    includeExpenses?: boolean;
  }) => void;
}

export default function ExportModal({ isOpen, onClose, exportType, onExport }: ExportModalProps) {
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [filename, setFilename] = useState(() => {
    const date = new Date().toISOString().split('T')[0];
    return exportType === 'budgets' 
      ? `budgets-export-${date}`
      : exportType === 'employees'
      ? `employees-export-${date}`
      : `budget-data-export-${date}`;
  });
  const [includeBudgets, setIncludeBudgets] = useState(exportType === 'budgets' || exportType === 'all');
  const [includeEmployees, setIncludeEmployees] = useState(exportType === 'employees' || exportType === 'all');
  const [includeAllocations, setIncludeAllocations] = useState(exportType === 'all');
  const [includeTimeEntries, setIncludeTimeEntries] = useState(false);
  const [includeExpenses, setIncludeExpenses] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({
      format,
      filename,
      includeBudgets: exportType === 'all' ? includeBudgets : exportType === 'budgets',
      includeEmployees: exportType === 'all' ? includeEmployees : exportType === 'employees',
      includeAllocations: exportType === 'all' ? includeAllocations : false,
      includeTimeEntries: exportType === 'all' ? includeTimeEntries : false,
      includeExpenses: exportType === 'all' ? includeExpenses : false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'xlsx' | 'csv' | 'json')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="json">JSON (.json)</option>
            </select>
          </div>

          {/* Filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter filename"
            />
            <p className="mt-1 text-xs text-gray-500">
              File will be saved as: {filename}.{format}
            </p>
          </div>

          {/* Data Options (only for 'all' type) */}
          {exportType === 'all' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Data
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeBudgets}
                    onChange={(e) => setIncludeBudgets(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Budgets</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeEmployees}
                    onChange={(e) => setIncludeEmployees(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Employees</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeAllocations}
                    onChange={(e) => setIncludeAllocations(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Allocations</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeTimeEntries}
                    onChange={(e) => setIncludeTimeEntries(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Time Entries</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeExpenses}
                    onChange={(e) => setIncludeExpenses(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Expenses</span>
                </label>
              </div>
            </div>
          )}

          {/* Download Location Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              The file will be downloaded to your default downloads folder. You can move it after downloading.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

