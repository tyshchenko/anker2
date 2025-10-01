import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setGlobalUnauthenticatedHandler } from "./queryClient";
import { TwoFactorDialog } from "@/components/auth/two-factor-dialog";

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
  loginWithFacebook: (facebookData: { accessToken: string; email: string; name: string; picture?: string }) => Promise<void>;
  loginWithX: (xData: { accessToken: string; email: string; name: string; picture?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUnauthenticated: () => void;
  addLoginCallback: (id: string, callback: () => void) => void;
  removeLoginCallback: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [tempSession, setTempSession] = useState('');
  const [loginCallbacks] = useState<Map<string, () => void>>(new Map());
  
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
        
        if (response.status === 303) {
          // 2FA required
          const data = await response.json();
          setTempSession(data.temp_session);
          setShow2FAVerification(true);
          return { requires_2fa: true };
        }
        
        return response.json();
      } catch (error: any) {
        if (error.message?.includes('401')) {
          setIsAuthenticated(false);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data.requires_2fa) {
        setIsAuthenticated(true);
        if (data.sessionId) {
          localStorage.setItem('sessionId', data.sessionId);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
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
        
        if (response.status === 303) {
          // 2FA required
          const data = await response.json();
          setTempSession(data.temp_session);
          setShow2FAVerification(true);
          return { requires_2fa: true };
        }
        
        return response.json();
      } catch (error: any) {
        if (error.message?.includes('401')) {
          setIsAuthenticated(false);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data.requires_2fa) {
        setIsAuthenticated(true);
        if (data.sessionId) {
          localStorage.setItem('sessionId', data.sessionId);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const facebookAuthMutation = useMutation({
    mutationFn: async (facebookData: { accessToken: string; email: string; name: string; picture?: string }) => {
      const response = await apiRequest("POST", "/api/auth/facebook", facebookData);
      
      if (response.status === 303) {
        // 2FA required
        const data = await response.json();
        setTempSession(data.temp_session);
        setShow2FAVerification(true);
        return { requires_2fa: true };
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (!data.requires_2fa) {
        setIsAuthenticated(true);
        if (data.sessionId) {
          localStorage.setItem('sessionId', data.sessionId);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const xAuthMutation = useMutation({
    mutationFn: async (xData: { accessToken: string; email: string; name: string; picture?: string }) => {
      const response = await apiRequest("POST", "/api/auth/x", xData);
      
      if (response.status === 303) {
        // 2FA required
        const data = await response.json();
        setTempSession(data.temp_session);
        setShow2FAVerification(true);
        return { requires_2fa: true };
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (!data.requires_2fa) {
        setIsAuthenticated(true);
        if (data.sessionId) {
          localStorage.setItem('sessionId', data.sessionId);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/auth/2fa", { 
        temp_session: tempSession, 
        code 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsAuthenticated(true);
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      setShow2FAVerification(false);
      setTempSession('');
      executeLoginCallbacks();
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
      localStorage.removeItem('sessionId');
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

  const loginWithFacebook = async (facebookData: { accessToken: string; email: string; name: string; picture?: string }) => {
    await facebookAuthMutation.mutateAsync(facebookData);
  };

  const loginWithX = async (xData: { accessToken: string; email: string; name: string; picture?: string }) => {
    await xAuthMutation.mutateAsync(xData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };
  
  const setUnauthenticated = () => {
    setIsAuthenticated(false);
    queryClient.setQueryData(["/api/auth/me"], null);
  };

  const addLoginCallback = (id: string, callback: () => void) => {
    loginCallbacks.set(id, callback);
  };

  const removeLoginCallback = (id: string) => {
    loginCallbacks.delete(id);
  };

  const executeLoginCallbacks = () => {
    loginCallbacks.forEach(callback => callback());
    loginCallbacks.clear();
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
    loginWithFacebook,
    loginWithX,
    logout,
    setUnauthenticated,
    addLoginCallback,
    removeLoginCallback,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* 2FA Verification Dialog */}
      {show2FAVerification && (
        <TwoFactorDialog 
          isOpen={show2FAVerification}
          onClose={() => {
            setShow2FAVerification(false);
            setTempSession('');
            executeLoginCallbacks();
          }}
          onVerify={verify2FAMutation.mutate}
          isLoading={verify2FAMutation.isPending}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
