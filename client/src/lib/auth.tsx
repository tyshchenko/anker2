import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // Query to get current user
  const { data: userResponse, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
      const response = await apiRequest("POST", "/api/auth/register", { 
        email, 
        password, 
        first_name, 
        last_name 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const googleAuthMutation = useMutation({
    mutationFn: async (googleData: { token: string; email: string; name: string; picture?: string }) => {
      const response = await apiRequest("POST", "/api/auth/google", googleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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

  const value: AuthContextType = {
    user: (userResponse as any)?.user || null,
    isLoading,
    isAuthenticated: !!(userResponse as any)?.user,
    login,
    register,
    loginWithGoogle,
    logout,
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