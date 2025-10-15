import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle2, Clock, TrendingUp, Shield, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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

export default function RewardsPage() {
  const { toast } = useToast();

  const { data: rewardsData, isLoading } = useQuery<{ rewards: Reward[] }>({
    queryKey: ['/api/rewards'],
  });

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return await apiRequest('/api/rewards/claim', {
        method: 'POST',
        body: JSON.stringify({ reward_id: rewardId }),
      });
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
        return <Shield className="h-6 w-6 text-blue-500" />;
      case 'first_deposit':
        return <DollarSign className="h-6 w-6 text-green-500" />;
      case 'trading_volume':
        return <TrendingUp className="h-6 w-6 text-purple-500" />;
      default:
        return <Gift className="h-6 w-6 text-gray-500" />;
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
      <div className="flex items-center justify-center h-64" data-testid="loading-rewards">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="rewards-page">
      <div>
        <h1 className="text-3xl font-bold" data-testid="page-title">Rewards Center</h1>
        <p className="text-muted-foreground mt-2" data-testid="page-description">
          Complete tasks to earn rewards and bonuses
        </p>
      </div>

      {/* Rewards Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-rewards">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards Available</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-rewards">
              R{totalPotentialRewards.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Complete all tasks to maximize rewards
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-claimed-rewards">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimed Rewards</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-claimed-rewards">
              R{claimedRewards.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Already added to your wallet
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-rewards">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-rewards">
              R{(totalPotentialRewards - claimedRewards).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Complete tasks to unlock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" data-testid="section-tasks">Available Tasks</h2>
        
        {rewardsData?.rewards.map((reward) => {
          const isExpired = new Date(reward.expires_at) < new Date();
          const expiresIn = formatDistanceToNow(new Date(reward.expires_at), { addSuffix: true });

          return (
            <Card key={reward.id} data-testid={`card-reward-${reward.task_type}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getTaskIcon(reward.task_type)}</div>
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
                    <div className="text-2xl font-bold text-primary" data-testid={`text-amount-${reward.task_type}`}>
                      {reward.reward_amount} {reward.reward_coin}
                    </div>
                    {reward.completed ? (
                      reward.claimed ? (
                        <Badge variant="outline" className="mt-2 bg-green-500/10 text-green-500" data-testid={`badge-claimed-${reward.task_type}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Claimed
                        </Badge>
                      ) : (
                        <Badge variant="default" className="mt-2 bg-blue-500" data-testid={`badge-ready-${reward.task_type}`}>
                          Ready to Claim
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="mt-2" data-testid={`badge-progress-${reward.task_type}`}>
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
                    <span className="font-medium" data-testid={`text-progress-value-${reward.task_type}`}>
                      {reward.progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={reward.progress} className="h-2" data-testid={`progress-${reward.task_type}`} />
                  {reward.required_amount && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-requirement-${reward.task_type}`}>
                      Required: R{reward.required_amount}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span data-testid={`text-expires-${reward.task_type}`}>
                      {isExpired ? "Expired" : `Expires ${expiresIn}`}
                    </span>
                  </div>
                  
                  {reward.completed && !reward.claimed && !isExpired && (
                    <Button
                      onClick={() => claimMutation.mutate(reward.id)}
                      disabled={claimMutation.isPending}
                      data-testid={`button-claim-${reward.task_type}`}
                    >
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
      <Card data-testid="card-info">
        <CardHeader>
          <CardTitle data-testid="text-info-title">How to Earn Rewards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2" data-testid="text-info-verify">
              <Shield className="h-4 w-4 text-blue-500" />
              Sign up and verify your identity
            </h3>
            <p className="text-sm text-muted-foreground pl-6" data-testid="text-info-verify-desc">
              Complete identity verification (KYC) to unlock rewards and full platform access.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2" data-testid="text-info-deposit">
              <DollarSign className="h-4 w-4 text-green-500" />
              Complete your first deposit
            </h3>
            <p className="text-sm text-muted-foreground pl-6" data-testid="text-info-deposit-desc">
              Make a first-time deposit of at least R1,000 to receive your welcome bonus.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2" data-testid="text-info-trade">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Trade for R1,000
            </h3>
            <p className="text-sm text-muted-foreground pl-6" data-testid="text-info-trade-desc">
              Complete R1,000 worth of trading to earn your trading bonus.
            </p>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2" data-testid="text-info-reminder">Important Reminders:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li data-testid="text-reminder-claim">All rewards must be claimed via this Rewards Page</li>
              <li data-testid="text-reminder-expiry">Rewards typically expire within 2 weeks after signing up</li>
              <li data-testid="text-reminder-check">Check your progress and validity period regularly</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
