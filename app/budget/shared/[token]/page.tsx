import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetDashboardClient from '../../budget-dashboard-client';

export default async function SharedBudgetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const supabase = await createClient();
    const { token } = params;

    if (!token) {
      redirect('/budget');
    }

    // Verify the token
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
            <p className="text-gray-600">This shared link is no longer valid.</p>
          </div>
        </div>
      );
    }

    // Check if link has expired
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      if (now > expiresAt) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
              <p className="text-gray-600">This shared link has expired.</p>
            </div>
          </div>
        );
      }
    }

    // Render the dashboard in read-only mode
    return <BudgetDashboardClient readOnly={true} sharedToken={token} />;
  } catch (error) {
    console.error('Error loading shared budget page:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">An error occurred while loading this page.</p>
        </div>
      </div>
    );
  }
}

