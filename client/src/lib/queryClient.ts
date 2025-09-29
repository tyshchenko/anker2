import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Global reference to auth setUnauthenticated function
let globalSetUnauthenticated: (() => void) | null = null;

export function setGlobalUnauthenticatedHandler(handler: () => void) {
  globalSetUnauthenticated = handler;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const sessionId = localStorage.getItem('sessionId');
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 responses globally
  if (res.status === 401 && globalSetUnauthenticated) {
    globalSetUnauthenticated();
  }

  // Don't throw error for 303 (2FA required) - let the calling code handle it
  if (res.status !== 303) {
    await throwIfResNotOk(res);
  }
  return res;
}

// Helper function for fetch calls that handles 401s
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // Handle 401 responses globally
  if (response.status === 401 && globalSetUnauthenticated) {
    globalSetUnauthenticated();
  }

  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const sessionId = localStorage.getItem('sessionId');
    const headers: Record<string, string> = {};
    
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
