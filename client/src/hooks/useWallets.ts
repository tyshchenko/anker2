import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface Wallet {
  id: string;
  email: string;
  coin: string;
  address: string;
  balance: string;
  pending: string;
  fee: string;
  is_active: boolean;
  created: string | null;
  updated: string | null;
}

interface WalletsResponse {
  success: boolean;
  wallets: Wallet[];
}

export function useWallets() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['/api/wallets', user?.email, user?.id],
    queryFn: async (): Promise<WalletsResponse> => {
      if (!isAuthenticated || !user?.email) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies for authentication
        body: JSON.stringify({
          email: user.email,
          user_id: user.id, // Include user ID for session validation
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }

      return response.json();
    },
    enabled: isAuthenticated && !!user?.email,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}