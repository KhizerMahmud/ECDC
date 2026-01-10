'use client';

import { useState, useEffect, useRef } from 'react';

interface Funder {
  id: string;
  code: string;
  name: string;
  description?: string;
  color_code?: string;
}

interface FunderManagerProps {
  readOnly?: boolean;
}

export default function FunderManager({ readOnly = false }: FunderManagerProps = {}) {
  const [funders, setFunders] = useState<Funder[]>([]);
  const [selectedFunder, setSelectedFunder] = useState<Funder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    color_code: '#3B82F6', // Default blue
  });
  const [loading, setLoading] = useState(true);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState<string>('#3B82F6');
  const colorPickerRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/funders');
      const data = res.ok ? await res.json() : [];
      setFunders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setFunders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = selectedFunder ? 'PUT' : 'POST';
      const body = selectedFunder ? { id: selectedFunder.id, ...formData } : formData;

      const res = await fetch('/api/funders', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadData();
        window.dispatchEvent(new CustomEvent('funderUpdated'));
        setShowForm(false);
        setSelectedFunder(null);
        setFormData({
          code: '',
          name: '',
          color_code: '#3B82F6',
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Error saving funder');
      }
    } catch (error) {
      console.error('Error saving funder:', error);
      alert('Error saving funder');
    }
  };

  const handleEdit = (funder: Funder) => {
    setSelectedFunder(funder);
    setFormData({
      code: funder.code,
      name: funder.name,
      color_code: funder.color_code || '#3B82F6',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this funder? This will remove the funder from all budgets.')) return;

    try {
      const res = await fetch(`/api/funders?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error deleting funder');
      }
    } catch (error) {
      console.error('Error deleting funder:', error);
      alert('Error deleting funder');
    }
  };

  const handleColorPickerOpen = (funder: Funder, event: React.MouseEvent) => {
    event.stopPropagation();
    setTempColor(funder.color_code || '#3B82F6');
    setColorPickerOpen(funder.id);
  };

  const handleColorUpdate = async (funderId: string, newColor: string) => {
    try {
      const funder = funders.find(f => f.id === funderId);
      if (!funder) return;

      const res = await fetch('/api/funders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: funderId,
          code: funder.code,
          name: funder.name,
          color_code: newColor,
        }),
      });

      if (res.ok) {
        await loadData();
        setColorPickerOpen(null);
        // Dispatch event to notify other components of the update
        window.dispatchEvent(new CustomEvent('funderUpdated'));
      } else {
        const error = await res.json();
        alert(error.error || 'Error updating color');
      }
    } catch (error) {
      console.error('Error updating color:', error);
      alert('Error updating color');
    }
  };

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerOpen) {
        const ref = colorPickerRef.current[colorPickerOpen];
        if (ref && !ref.contains(event.target as Node)) {
          setColorPickerOpen(null);
        }
      }
    };

    if (colorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [colorPickerOpen]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Funder/Donor Management</h2>
        <button
          onClick={() => {
            setSelectedFunder(null);
            setFormData({
              code: '',
              name: '',
              description: '',
              color_code: '#3B82F6',
            });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Funder
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedFunder ? 'Edit Funder' : 'Add New Funder'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  placeholder="e.g., ONA, MORA, DV, PC"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unique code for the funder (e.g., ONA, MORA, DV, VFHY, PC, MG, R&P, NOFO, AFHS)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  placeholder="Full name or description"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Color Code</label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="color"
                    value={formData.color_code}
                    onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color_code}
                    onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    placeholder="#3B82F6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: formData.color_code }}
                    title="Preview"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Choose a color to identify this funder in the UI
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedFunder ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedFunder(null);
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(funders) && funders.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No funders found. Click "Add Funder" to create one.
                </td>
              </tr>
            ) : (
              Array.isArray(funders) && funders.map((funder, index) => {
                const isEven = index % 2 === 0;
                const baseBgColor = isEven ? 'bg-gray-50' : 'bg-white';
                
                return (
                <tr 
                  key={funder.id}
                  className={`${baseBgColor} transition-colors duration-150`}
                  style={funder.color_code ? {
                    backgroundColor: isEven ? `${funder.color_code}08` : `${funder.color_code}12`,
                    borderLeft: `3px solid ${funder.color_code}`
                  } : {}}
                  onMouseEnter={(e) => {
                    if (funder.color_code) {
                      e.currentTarget.style.backgroundColor = isEven ? `${funder.color_code}18` : `${funder.color_code}16`;
                    } else {
                      e.currentTarget.style.backgroundColor = isEven ? '#d1d5db' : '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (funder.color_code) {
                      e.currentTarget.style.backgroundColor = isEven ? `${funder.color_code}08` : `${funder.color_code}12`;
                    } else {
                      e.currentTarget.style.backgroundColor = isEven ? '#f9fafb' : '';
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2 relative">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: funder.color_code ? `${funder.color_code}20` : '#dbeafe',
                          color: funder.color_code || '#1e40af',
                          border: funder.color_code ? `1px solid ${funder.color_code}` : '1px solid #93c5fd'
                        }}
                      >
                        {funder.code}
                      </span>
                      <button
                        onClick={(e) => handleColorPickerOpen(funder, e)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit color"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z" />
                        </svg>
                      </button>
                      {colorPickerOpen === funder.id && (
                        <div
                          ref={(el) => {
                            colorPickerRef.current[funder.id] = el;
                          }}
                          className="absolute z-50 left-0 top-full mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[280px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Choose Color
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={tempColor}
                                onChange={(e) => setTempColor(e.target.value)}
                                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={tempColor}
                                onChange={(e) => setTempColor(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                                placeholder="#3B82F6"
                                pattern="^#[0-9A-Fa-f]{6}$"
                              />
                              <div
                                className="w-10 h-10 rounded border border-gray-300"
                                style={{ backgroundColor: tempColor }}
                                title="Preview"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setColorPickerOpen(null)}
                                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleColorUpdate(funder.id, tempColor)}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {funder.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(funder)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(funder.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

