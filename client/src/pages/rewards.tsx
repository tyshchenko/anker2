import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle2, Clock, TrendingUp, Shield, DollarSign, Trophy, Medal, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";

interface Reward {
  id: string;
  task_id: string;
  task_type: string;
  title: string;
  description: string;
  reward_amount: string;
  reward_coin: string;
  required_amount: string | null;
  progress: number;
  completed: boolean;
  claimed: boolean;
  expires_at: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  total_volume: string;
  trade_count: number;
}

export default function RewardsPage() {
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: rewardsData, isLoading } = useQuery<{ rewards: Reward[] }>({
    queryKey: ['/api/rewards'],
  });

  const { data: leaderboardData } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ['/api/leaderboard'],
  });

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return await apiRequest('POST', '/api/rewards/claim', { reward_id: rewardId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      toast({
        title: "Success",
        description: "Reward claimed successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    },
  });

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'kyc_verification':
        return <Gift className="h-8 w-8 text-yellow-500" />;
      case 'first_deposit':
        return <Gift className="h-8 w-8 text-amber-500" />;
      case 'trading_volume':
        return <Gift className="h-8 w-8 text-yellow-600" />;
      default:
        return <Gift className="h-8 w-8 text-yellow-400" />;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-gray-500" />;
    }
  };

  const totalPotentialRewards = rewardsData?.rewards.reduce(
    (sum, reward) => sum + parseFloat(reward.reward_amount),
    0
  ) || 0;

  const claimedRewards = rewardsData?.rewards
    .filter(r => r.claimed)
    .reduce((sum, reward) => sum + parseFloat(reward.reward_amount), 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Mobile Sidebar */}
          <Sidebar
            isMobile
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-screen">
            <MobileHeader
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
            
            <div className="flex items-center justify-center h-64" data-testid="loading-rewards">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading rewards...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sidebar
          isMobile
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          <MobileHeader
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          
          <div className="space-y-6 p-6" data-testid="rewards-page">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-600/20 p-6 border-2 border-yellow-500/30">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent" data-testid="page-title">
              Mystery Box Rewards
            </h1>
          </div>
          <p className="text-muted-foreground" data-testid="page-description">
            Complete tasks to unlock golden rewards and bonuses
          </p>
        </div>
        <div className="absolute top-2 right-2 opacity-20">
          <Gift className="h-32 w-32 text-yellow-500" />
        </div>
      </div>

      {/* Rewards Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent" data-testid="card-total-rewards">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards Available</CardTitle>
            <Gift className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-total-rewards">
              R{totalPotentialRewards.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unlock all mystery boxes
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent" data-testid="card-claimed-rewards">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimed Rewards</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-claimed-rewards">
              R{claimedRewards.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Already in your wallet
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent" data-testid="card-pending-rewards">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-pending-rewards">
              R{(totalPotentialRewards - claimedRewards).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Complete tasks to unlock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trading Competition */}
      <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-amber-500/5" data-testid="card-trading-competition">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <div>
              <CardTitle className="text-2xl">🏆 Trading Competition</CardTitle>
              <CardDescription className="mt-1">
                Sign up and stand a chance to win R10,000 worth of BNB!
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
              Competition Details
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Top 3 traders by volume win prizes</li>
              <li>Competition runs for 30 days</li>
              <li>Winners announced at the end of each month</li>
              <li>Prize pool: R10,000 worth of BNB</li>
            </ul>
          </div>

          {/* Leaderboard */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-500" />
              Top Traders Leaderboard
            </h3>
            <div className="space-y-2">
              {leaderboardData?.leaderboard.slice(0, 3).map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.rank === 1
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : entry.rank === 2
                      ? 'bg-gray-500/20 border border-gray-500/50'
                      : 'bg-amber-600/20 border border-amber-600/50'
                  }`}
                  data-testid={`leaderboard-entry-${entry.rank}`}
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(entry.rank)}
                    <div>
                      <p className="font-semibold" data-testid={`text-username-${entry.rank}`}>
                        #{entry.rank} {entry.username}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-trades-${entry.rank}`}>
                        {entry.trade_count} trades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-600" data-testid={`text-volume-${entry.rank}`}>
                      R{parseFloat(entry.total_volume).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Volume</p>
                  </div>
                </div>
              ))}
              
              {(!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0) && (
                <div className="text-center py-6 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No traders yet. Start trading to get on the leaderboard!</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="section-tasks">
          <Gift className="h-6 w-6 text-yellow-500" />
          Mystery Box Tasks
        </h2>
        
        {rewardsData?.rewards.map((reward) => {
          const isExpired = new Date(reward.expires_at) < new Date();
          const expiresIn = formatDistanceToNow(new Date(reward.expires_at), { addSuffix: true });

          return (
            <Card key={reward.id} className="border-yellow-500/20 hover:border-yellow-500/40 transition-colors" data-testid={`card-reward-${reward.task_type}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
                      <div className="relative bg-gradient-to-br from-yellow-500/30 to-amber-500/30 p-3 rounded-lg border border-yellow-500/30">
                        {getTaskIcon(reward.task_type)}
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-title-${reward.task_type}`}>
                        {reward.title}
                      </CardTitle>
                      <CardDescription className="mt-1" data-testid={`text-description-${reward.task_type}`}>
                        {reward.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent" data-testid={`text-amount-${reward.task_type}`}>
                      {reward.reward_amount} {reward.reward_coin}
                    </div>
                    {reward.completed ? (
                      reward.claimed ? (
                        <Badge variant="outline" className="mt-2 bg-green-500/20 text-green-600 border-green-500/50" data-testid={`badge-claimed-${reward.task_type}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Claimed
                        </Badge>
                      ) : (
                        <Badge className="mt-2 bg-gradient-to-r from-yellow-500 to-amber-500 border-0" data-testid={`badge-ready-${reward.task_type}`}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Ready to Claim
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="mt-2 border-yellow-500/30" data-testid={`badge-progress-${reward.task_type}`}>
                        <Clock className="h-3 w-3 mr-1" />
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground" data-testid={`text-progress-label-${reward.task_type}`}>
                      Progress
                    </span>
                    <span className="font-medium text-yellow-600" data-testid={`text-progress-value-${reward.task_type}`}>
                      {reward.progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={reward.progress} 
                    className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-yellow-500 [&>div]:to-amber-500" 
                    data-testid={`progress-${reward.task_type}`} 
                  />
                  {reward.required_amount && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-requirement-${reward.task_type}`}>
                      Required: R{reward.required_amount}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span data-testid={`text-expires-${reward.task_type}`}>
                      {isExpired ? "Expired" : `Expires ${expiresIn}`}
                    </span>
                  </div>
                  
                  {reward.completed && !reward.claimed && !isExpired && (
                    <Button
                      onClick={() => claimMutation.mutate(reward.id)}
                      disabled={claimMutation.isPending}
                      className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 border-0"
                      data-testid={`button-claim-${reward.task_type}`}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      {claimMutation.isPending ? "Claiming..." : "Claim Reward"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Information Section */}
      <Card className="border-yellow-500/20" data-testid="card-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-info-title">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            How to Unlock Mystery Boxes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2" data-testid="text-info-verify">
              <Gift className="h-5 w-5 text-yellow-500" />
              Sign up and verify your identity
            </h3>
            <p className="text-sm text-muted-foreground pl-7" data-testid="text-info-verify-desc">
              Complete identity verification (KYC) to unlock your first mystery box and full platform access.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2" data-testid="text-info-deposit">
              <Gift className="h-5 w-5 text-amber-500" />
              Complete your first deposit
            </h3>
            <p className="text-sm text-muted-foreground pl-7" data-testid="text-info-deposit-desc">
              Make a first-time deposit of at least R1,000 to unlock a premium mystery box with BNB rewards.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2" data-testid="text-info-trade">
              <Gift className="h-5 w-5 text-yellow-600" />
              Trade for R1,000
            </h3>
            <p className="text-sm text-muted-foreground pl-7" data-testid="text-info-trade-desc">
              Complete R1,000 worth of trading to unlock your final mystery box with ZAR rewards.
            </p>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/30">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2" data-testid="text-info-reminder">
              ✨ Important Reminders:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li data-testid="text-reminder-claim">All mystery boxes must be claimed via this Rewards Page</li>
              <li data-testid="text-reminder-expiry">Mystery boxes expire within 2 weeks after signing up</li>
              <li data-testid="text-reminder-check">Check your progress regularly to not miss out</li>
            </ul>
          </div>
        </CardContent>
      </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
