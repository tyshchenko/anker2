import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface Wallet {
  id: string;
  email: string;
  coin: string;
  address: string;
  balance: string;
  is_active: boolean;
  created: string | null;
  updated: string | null;
}

interface WalletsResponse {
  success: boolean;
  wallets: Wallet[];
}

export function useWallets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['/api/wallets', user?.password_hash],
    queryFn: async (): Promise<WalletsResponse> => {
      if (!user?.password_hash) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password_hash: user.password_hash
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }

      return response.json();
    },
    enabled: !!user?.password_hash,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}