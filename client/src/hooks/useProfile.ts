import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

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
    phone: user.phone || '',
    country: user.country || 'South Africa',
    language: user.language || 'English',
    timezone: user.timezone || 'Africa/Johannesburg',
    verificationLevel: (user.verification_level as 'unverified' | 'basic' | 'advanced') || 'basic',
    twoFactorEnabled: user.two_factor_enabled || false,
    emailNotifications: user.email_notifications || false,
    smsNotifications: user.sms_notifications || false,
    tradingNotifications: user.trading_notifications || false,
    securityAlerts: user.security_alerts || false,
  };
};

export const useProfile = () => {
  const { user, isLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      setProfile(mapUserToProfile(user));
    }
  }, [user]);

  const updateProfile = (field: keyof UserProfile, value: any) => {
    if (profile) {
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  return {
    profile,
    updateProfile,
    isLoading,
    isError: false, // No separate error since we use auth context
    refetch: () => {}, // No need to refetch since data comes from auth
    userData: user // Raw user data from auth context
  };
};