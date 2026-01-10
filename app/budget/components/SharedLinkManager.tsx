'use client';

import { useState, useEffect } from 'react';

interface SharedLink {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export default function SharedLinkManager() {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const res = await fetch('/api/shared-links');
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      console.error('Error loading shared links:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLink = async () => {
    try {
      const res = await fetch('/api/shared-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const newLink = await res.json();
        setLinks([newLink, ...links]);
        setShowModal(false);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error creating shared link:', errorData);
        alert(`Error creating shared link: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating shared link:', error);
      alert(`Error creating shared link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleLink = async (link: SharedLink) => {
    try {
      const res = await fetch('/api/shared-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: link.id,
          is_active: !link.is_active,
          expires_at: link.expires_at,
        }),
      });

      if (res.ok) {
        await loadLinks();
      } else {
        alert('Error updating shared link');
      }
    } catch (error) {
      console.error('Error updating shared link:', error);
      alert('Error updating shared link');
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shared link?')) {
      return;
    }

    try {
      const res = await fetch(`/api/shared-links?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadLinks();
      } else {
        alert('Error deleting shared link');
      }
    } catch (error) {
      console.error('Error deleting shared link:', error);
      alert('Error deleting shared link');
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/budget/shared/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(token);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  const getSharedUrl = (token: string) => {
    return `${window.location.origin}/budget/shared/${token}`;
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Share (Read-Only)
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Manage Shared Links</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <button
                  onClick={createLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create New Link
                </button>
              </div>

              {links.length === 0 ? (
                <p className="text-gray-500">No shared links yet. Create one to get started.</p>
              ) : (
                <div className="space-y-3">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            link.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {link.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {link.expires_at && new Date(link.expires_at) < new Date() && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          <strong>URL:</strong> {getSharedUrl(link.token)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(link.created_at).toLocaleString()}
                          {link.expires_at && (
                            <> | Expires: {new Date(link.expires_at).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => copyToClipboard(link.token)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copySuccess === link.token ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => toggleLink(link)}
                          className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
                        >
                          {link.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

