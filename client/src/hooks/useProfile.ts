import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  timezone: string;
  verificationLevel: 'unverified' | 'basic' | 'advanced';
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  tradingNotifications: boolean;
  securityAlerts: boolean;
}

// Convert server user data to frontend profile format
const mapUserToProfile = (user: User): UserProfile => {
  return {
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    email: user.email || '',
    phone: '', // Not available from server
    country: 'South Africa', // Default value
    language: 'English', // Default value
    timezone: 'Africa/Johannesburg', // Default value
    verificationLevel: 'basic', // Default value - could be enhanced
    twoFactorEnabled: false, // Default value - could be enhanced
    emailNotifications: true, // Default value
    smsNotifications: false, // Default value
    tradingNotifications: true, // Default value
    securityAlerts: true, // Default value
  };
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const {
    data: userData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async (): Promise<User> => {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include session cookies
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const data = await response.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (userData) {
      setProfile(mapUserToProfile(userData));
    }
  }, [userData]);

  const updateProfile = (field: keyof UserProfile, value: any) => {
    if (profile) {
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  return {
    profile,
    updateProfile,
    isLoading,
    isError,
    refetch,
    userData // Raw user data from server
  };
};