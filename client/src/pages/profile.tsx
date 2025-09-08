import { useState } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
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
  EyeOff
} from "lucide-react";

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

const MOCK_PROFILE: UserProfile = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '+27 82 123 4567',
  country: 'South Africa',
  language: 'English',
  timezone: 'Africa/Johannesburg',
  verificationLevel: 'basic',
  twoFactorEnabled: true,
  emailNotifications: true,
  smsNotifications: false,
  tradingNotifications: true,
  securityAlerts: true
};

export default function ProfilePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(MOCK_PROFILE);
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
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
                          />
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
                    <Card className="p-6">
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
                              <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                              <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                              <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                              <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-6">
                        <Button data-testid="button-save-preferences">Save Preferences</Button>
                      </div>
                    </Card>
                  </div>

                  {/* Data Export */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Data Management</h2>
                    <Card className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium">Export Account Data</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Download a copy of your account data including transaction history and profile information.
                          </p>
                          <Button variant="outline" data-testid="button-export-data">
                            <Download className="w-4 h-4 mr-2" />
                            Request Data Export
                          </Button>
                        </div>
                        <Separator />
                        <div>
                          <h3 className="font-medium">Account Deletion</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                          <Button variant="destructive" data-testid="button-delete-account">
                            Delete Account
                          </Button>
                        </div>
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