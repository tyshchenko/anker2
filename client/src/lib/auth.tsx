import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setGlobalUnauthenticatedHandler } from "./queryClient";

interface User {
  id: string;
  email?: string;
  username?: string;
  reference?: string;
  phone?: string;
  country?: string;
  language?: string;
  timezone?: string;
  verification_level?: string;
  password_hash?: string;
  google_id?: string;
  first_name?: string;
  second_names?: string;
  last_name?: string;
  profile_image_url?: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  trading_notifications?: boolean;
  security_alerts?: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  loginWithGoogle: (googleData: { token: string; email: string; name: string; picture?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUnauthenticated: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Query to get current user
  const { data: userResponse, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.status === 401) {
          setIsAuthenticated(false);
          return null;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        setIsAuthenticated(!!data?.user);
        return data;
      } catch (error) {
        setIsAuthenticated(false);
        throw error;
      }
    },
  });
  
  // Update authentication state when userResponse changes
  useEffect(() => {
    setIsAuthenticated(!!(userResponse as any)?.user);
  }, [userResponse]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await apiRequest("POST", "/api/auth/login", { email, password });
        return response.json();
      } catch (error: any) {
        if (error.message?.includes('401')) {
          setIsAuthenticated(false);
        }
        throw error;
      }
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      first_name, 
      last_name 
    }: { 
      email: string; 
      password: string; 
      first_name?: string; 
      last_name?: string; 
    }) => {
      try {
        const response = await apiRequest("POST", "/api/auth/register", { 
          email, 
          password, 
          first_name, 
          last_name 
        });
        return response.json();
      } catch (error: any) {
        if (error.message?.includes('401')) {
          setIsAuthenticated(false);
        }
        throw error;
      }
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const googleAuthMutation = useMutation({
    mutationFn: async (googleData: { token: string; email: string; name: string; picture?: string }) => {
      try {
        const response = await apiRequest("POST", "/api/auth/google", googleData);
        return response.json();
      } catch (error: any) {
        if (error.message?.includes('401')) {
          setIsAuthenticated(false);
        }
        throw error;
      }
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest("POST", "/api/auth/logout", {});
        return response.json();
      } catch (error: any) {
        // Even if logout fails, we still want to clear auth state
        setIsAuthenticated(false);
        throw error;
      }
    },
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    await registerMutation.mutateAsync({ 
      email, 
      password, 
      first_name: firstName, 
      last_name: lastName 
    });
  };

  const loginWithGoogle = async (googleData: { token: string; email: string; name: string; picture?: string }) => {
    await googleAuthMutation.mutateAsync(googleData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };
  
  const setUnauthenticated = () => {
    setIsAuthenticated(false);
    queryClient.setQueryData(["/api/auth/me"], null);
  };

  // Set up global 401 handler
  useEffect(() => {
    setGlobalUnauthenticatedHandler(setUnauthenticated);
  }, []);

  const value: AuthContextType = {
    user: (userResponse as any)?.user || null,
    isLoading,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    logout,
    setUnauthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}