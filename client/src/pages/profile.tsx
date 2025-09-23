import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Smartphone,
  Mail,
  Lock,
  Camera,
  CheckCircle,
  AlertTriangle,
  Settings,
  Key,
  Download,
  Eye,
  EyeOff,
  Building2,
  Plus,
  Loader2,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchNumber: string;
  isWhitelisted?: boolean;
}

interface InsertBankAccount {
  userId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchNumber: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create profile state from authenticated user data, with defaults for missing fields
  const [profile, setProfile] = useState<UserProfile>({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: user?.country || '',
    language: user?.language || '',
    timezone: user?.timezone || '',
    verificationLevel: user?.verification_level as 'unverified' | 'basic' | 'advanced' || 'unverified',
    twoFactorEnabled: user?.two_factor_enabled || false,
    emailNotifications: user?.email_notifications || false,
    smsNotifications: user?.sms_notifications || false,
    tradingNotifications: user?.trading_notifications || false,
    securityAlerts: user?.security_alerts || false
  });
  
  const [activeTab, setActiveTab] = useState('personal');
  
  // Bank account form state
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [newBankData, setNewBankData] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    branchNumber: ""
  });

  // Update profile state when user data changes
  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        country: user.country || '',
        language: user.language || '',
        timezone: user.timezone || '',
        verificationLevel: user.verification_level as 'unverified' | 'basic' | 'advanced' || 'unverified',
        twoFactorEnabled: user.two_factor_enabled || false,
        emailNotifications: user.email_notifications || false,
        smsNotifications: user.sms_notifications || false,
        tradingNotifications: user.trading_notifications || false,
        securityAlerts: user.security_alerts || false
      }));
    }
  }, [user]);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const userId = user?.id || "demo-user-123"; // Fallback for demo

  // Fetch user's bank accounts
  const { data: bankAccounts = [], isLoading: isLoadingBankAccounts } = useQuery<BankAccount[]>({
    queryKey: ["/api/bankaccounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bankaccounts");
      const data = await response.json();
      return data.bank_accounts || [];
    },
  });

  // Create bank account mutation
  const createBankAccountMutation = useMutation({
    mutationFn: async (bankAccountData: InsertBankAccount) => {
      const response = await apiRequest("POST", "/api/bankaccount/create", bankAccountData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Added",
        description: "Your bank account has been added and is ready for withdrawals.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bankaccounts"] });
      setShowAddBankForm(false);
      setNewBankData({ bankName: "", accountNumber: "", accountName: "", branchNumber: "" });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to add bank account";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete bank account mutation (disabled - no backend endpoint available)
  const deleteBankAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      throw new Error("Bank account deletion is not currently supported");
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Removed",
        description: "Your bank account has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bankaccounts"] });
    },
    onError: (error: any) => {
      const errorMessage = "Bank account deletion is not currently supported";
      toast({
        title: "Notice",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAddBank = () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User not found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    createBankAccountMutation.mutate({
      userId,
      ...newBankData,
    });
  };

  const handleDeleteBank = (accountId: string) => {
    deleteBankAccountMutation.mutate(accountId);
  };

  // Helper function to mask account number for display
  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return "****" + accountNumber.slice(-4);
  };

  const getVerificationBadge = (level: string) => {
    switch (level) {
      case 'advanced':
        return <Badge className="bg-green-100 text-green-700">Advanced Verified</Badge>;
      case 'basic':
        return <Badge className="bg-blue-100 text-blue-700">Basic Verified</Badge>;
      default:
        return <Badge variant="destructive">Unverified</Badge>;
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings }
  ];

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
          {/* Mobile Header */}
          <MobileHeader
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />

          {/* Market Ticker */}
          <MarketTicker />

          {/* Page Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Profile Settings</h1>
                <p className="text-muted-foreground">
                  Manage your account information and preferences
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex">
            {/* Profile Navigation */}
            <div className="w-64 border-r border-border p-6">
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <Separator className="my-6" />

              {/* Profile Summary */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                {getVerificationBadge(profile.verificationLevel)}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
              {activeTab === 'personal' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                    <Card className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={profile.firstName}
                            onChange={(e) => handleProfileUpdate('firstName', e.target.value)}
                            data-testid="input-firstName"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={profile.lastName}
                            onChange={(e) => handleProfileUpdate('lastName', e.target.value)}
                            data-testid="input-lastName"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            onChange={(e) => handleProfileUpdate('email', e.target.value)}
                            data-testid="input-email"
                            disabled={true}
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={profile.phone}
                            onChange={(e) => handleProfileUpdate('phone', e.target.value)}
                            data-testid="input-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Select value={profile.country} onValueChange={(value) => handleProfileUpdate('country', value)}>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="South Africa">South Africa</SelectItem>
                              <SelectItem value="United States">United States</SelectItem>
                              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                              <SelectItem value="Canada">Canada</SelectItem>
                              <SelectItem value="Australia">Australia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-6">
                        <Button data-testid="button-save-personal">Save Changes</Button>
                      </div>
                    </Card>
                  </div>

                  {/* Verification Status */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
                    <Card className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">Email Verification</p>
                              <p className="text-sm text-muted-foreground">Email address verified</p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700">Verified</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">Identity Verification</p>
                              <p className="text-sm text-muted-foreground">Government ID verified</p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700">Verified</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <div>
                              <p className="font-medium">Address Verification</p>
                              <p className="text-sm text-muted-foreground">Proof of residence required</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">Upload Document</Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
                    
                    {/* Two-Factor Authentication */}
                    <Card className="p-6 mb-6">
                      <h3 className="font-semibold mb-4">Two-Factor Authentication</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Authenticator App</p>
                            <p className="text-sm text-muted-foreground">
                              {profile.twoFactorEnabled ? 'Enabled and active' : 'Not configured'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {profile.twoFactorEnabled && (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          )}
                          <Switch
                            checked={profile.twoFactorEnabled}
                            onCheckedChange={(checked) => handleProfileUpdate('twoFactorEnabled', checked)}
                            data-testid="switch-2fa"
                          />
                        </div>
                      </div>
                      {!profile.twoFactorEnabled && (
                        <div className="mt-4">
                          <Button variant="outline" data-testid="button-setup-2fa">
                            <Key className="w-4 h-4 mr-2" />
                            Set up 2FA
                          </Button>
                        </div>
                      )}
                    </Card>

                    {/* Change Password */}
                    <Card className="p-6 mb-6">
                      <h3 className="font-semibold mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              data-testid="input-current-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="newPassword">New Password</Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                              data-testid="input-new-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            data-testid="input-confirm-password"
                          />
                        </div>
                        <Button data-testid="button-change-password">Update Password</Button>
                      </div>
                    </Card>

                    {/* Bank Account Management */}
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 mr-2" />
                        Bank Account for Withdrawals
                      </h3>
                      
                      {isLoadingBankAccounts ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="ml-2 text-muted-foreground">Loading bank account...</span>
                        </div>
                      ) : (
                        <>
                          {bankAccounts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Building2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                              <p className="font-medium">No bank account added</p>
                              <p className="text-sm">Add a bank account for ZAR withdrawals</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {bankAccounts.map((account) => (
                                <Card key={account.id} className="p-4 border border-border">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <p className="font-medium">{account.bankName}</p>
                                        {account.isWhitelisted && (
                                          <Badge className="bg-green-100 text-green-700 text-xs">Whitelisted</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {maskAccountNumber(account.accountNumber)}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {account.accountName}
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteBank(account.id)}
                                      disabled={deleteBankAccountMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}

                          {!showAddBankForm ? (
                            <div className="mt-4">
                              <Button 
                                variant="outline" 
                                onClick={() => setShowAddBankForm(true)}
                                className="w-full"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Bank Account
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-4 space-y-4 border-t pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="bankName">Bank Name</Label>
                                  <Input
                                    id="bankName"
                                    value={newBankData.bankName}
                                    onChange={(e) => setNewBankData(prev => ({ ...prev, bankName: e.target.value }))}
                                    placeholder="e.g. Standard Bank"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="accountName">Account Holder Name</Label>
                                  <Input
                                    id="accountName"
                                    value={newBankData.accountName}
                                    onChange={(e) => setNewBankData(prev => ({ ...prev, accountName: e.target.value }))}
                                    placeholder="Full name on account"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="accountNumber">Account Number</Label>
                                  <Input
                                    id="accountNumber"
                                    value={newBankData.accountNumber}
                                    onChange={(e) => setNewBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                    placeholder="Account number"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="branchNumber">Branch Number</Label>
                                  <Input
                                    id="branchNumber"
                                    value={newBankData.branchNumber}
                                    onChange={(e) => setNewBankData(prev => ({ ...prev, branchNumber: e.target.value }))}
                                    placeholder="Branch code"
                                  />
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  onClick={handleAddBank}
                                  disabled={createBankAccountMutation.isPending}
                                  className="flex-1"
                                >
                                  {createBankAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Add Account
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setShowAddBankForm(false);
                                    setNewBankData({ bankName: "", accountNumber: "", accountName: "", branchNumber: "" });
                                  }}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                    <Card className="p-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Email Notifications</p>
                              <p className="text-sm text-muted-foreground">Receive updates via email</p>
                            </div>
                          </div>
                          <Switch
                            checked={profile.emailNotifications}
                            onCheckedChange={(checked) => handleProfileUpdate('emailNotifications', checked)}
                            data-testid="switch-email-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Smartphone className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">SMS Notifications</p>
                              <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                            </div>
                          </div>
                          <Switch
                            checked={profile.smsNotifications}
                            onCheckedChange={(checked) => handleProfileUpdate('smsNotifications', checked)}
                            data-testid="switch-sms-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Bell className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Trading Notifications</p>
                              <p className="text-sm text-muted-foreground">Order updates and trade confirmations</p>
                            </div>
                          </div>
                          <Switch
                            checked={profile.tradingNotifications}
                            onCheckedChange={(checked) => handleProfileUpdate('tradingNotifications', checked)}
                            data-testid="switch-trading-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Shield className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Security Alerts</p>
                              <p className="text-sm text-muted-foreground">Login alerts and security notifications</p>
                            </div>
                          </div>
                          <Switch
                            checked={profile.securityAlerts}
                            onCheckedChange={(checked) => handleProfileUpdate('securityAlerts', checked)}
                            data-testid="switch-security-alerts"
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Account Preferences</h2>
                    <Card className="p-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="language">Language</Label>
                          <Select value={profile.language} onValueChange={(value) => handleProfileUpdate('language', value)}>
                            <SelectTrigger data-testid="select-language">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="English">English</SelectItem>
                              <SelectItem value="Afrikaans">Afrikaans</SelectItem>
                              <SelectItem value="Zulu">Zulu</SelectItem>
                              <SelectItem value="Xhosa">Xhosa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select value={profile.timezone} onValueChange={(value) => handleProfileUpdate('timezone', value)}>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Africa/Johannesburg">South Africa Standard Time</SelectItem>
                              <SelectItem value="Europe/London">Greenwich Mean Time</SelectItem>
                              <SelectItem value="America/New_York">Eastern Standard Time</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Standard Time</SelectItem>
                              <SelectItem value="Asia/Tokyo">Japan Standard Time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-6">
                        <Button data-testid="button-save-preferences">Save Preferences</Button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}