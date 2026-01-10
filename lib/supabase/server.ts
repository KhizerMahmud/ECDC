import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Custom fetch with timeout to prevent hanging requests
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = 30000; // 30 second timeout for server-side requests
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Merge the abort signal with any existing signal in init
  const fetchOptions: RequestInit = {
    ...init,
    signal: init?.signal 
      ? (() => {
          // If there's already a signal, we need to handle both
          const combinedController = new AbortController();
          init.signal?.addEventListener('abort', () => combinedController.abort());
          controller.signal.addEventListener('abort', () => combinedController.abort());
          return combinedController.signal;
        })()
      : controller.signal,
  };
  
  return fetch(input, fetchOptions)
    .finally(() => clearTimeout(timeoutId))
    .catch((error) => {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: The Supabase request took too long. Please check your connection and try again.');
      }
      throw error;
    });
}

export async function createClient() {
  const cookieStore = await cookies();

  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        fetch: fetchWithTimeout,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

