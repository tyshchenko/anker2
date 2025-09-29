import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { SiFacebook } from "react-icons/si";
import { BsTwitterX } from "react-icons/bs";

// Declare social login objects for TypeScript
declare global {
  interface Window {
    google: any;
    FB: any;
  }
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [xLoading, setXLoading] = useState(false);
  
  const [, setLocation] = useLocation();
  const { login, loginWithGoogle, loginWithFacebook, loginWithX, isAuthenticated } = useAuth();
  const { toast } = useToast();
  // Check if there's a provider parameter in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const provider = urlParams.get('provider');

  useEffect(() => {

    // Load Google Identity Services script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (provider && provider == 'google') {
            handleGoogleSignIn();
        }
      };
      document.head.appendChild(script);
    }

    // Load Facebook SDK
    if (!window.FB) {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.FB.init({
          appId: 'YOUR_FACEBOOK_APP_ID', // This should come from environment
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        if (provider && provider == 'facebook') {
            handleFacebookSignIn();
        }
      };
      document.head.appendChild(script);
    }

    
    if (provider) {
      // Clear the URL parameter
      window.history.replaceState({}, '', '/signin');
    }
  }, []);

  useEffect(() => {
    // Redirect authenticated users to home
    if (isAuthenticated) {
      setLocation("/");
      return;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Redirect authenticated users to home
    if (provider && provider == 'x') {
            handleXSignIn();
    }
  }, [provider]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);

      if (!window.google) {
        // Simple wait for script to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!window.google) {
          toast({
            title: "Error", 
            description: "Google Sign-In is not loaded. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: "303897812754-50r2qpavk6lbgpq5easeutdrkks6rnhi.apps.googleusercontent.com", // This should come from environment
        callback: async (response: any) => {
          try {
            // Decode the JWT token to get user info
            const payload = JSON.parse(atob(response.credential.split('.')[1]));

            await loginWithGoogle({
              token: response.credential,
              email: payload.email,
              name: payload.name,
              picture: payload.picture
            });

            toast({
              title: "Welcome!",
              description: "You have successfully signed in with Google.",
            });
          } catch (error: any) {
            toast({
              title: "Google Sign-In Failed",
              description: error.message || "An error occurred during Google sign-in",
              variant: "destructive",
            });
          }
        },
      });

      // Prompt for Google Sign-In
      window.google.accounts.id.prompt();
    } catch (error: any) {
      toast({
        title: "Google Sign-In Error",
        description: "Failed to initialize Google Sign-In",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setFacebookLoading(true);

      if (!window.FB) {
        toast({
          title: "Error",
          description: "Facebook SDK is not loaded. Please try again.",
          variant: "destructive",
        });
        return;
      }

      window.FB.login(async (response: any) => {
        if (response.authResponse) {
          // Get user info from Facebook
          window.FB.api('/me', { fields: 'name,email,picture' }, async (userInfo: any) => {
            try {
              await loginWithFacebook({
                accessToken: response.authResponse.accessToken,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture?.data?.url
              });

              toast({
                title: "Welcome!",
                description: "You have successfully signed in with Facebook.",
              });
            } catch (error: any) {
              toast({
                title: "Facebook Sign-In Failed",
                description: error.message || "An error occurred during Facebook sign-in",
                variant: "destructive",
              });
            }
          });
        } else {
          toast({
            title: "Facebook Sign-In Cancelled",
            description: "Facebook sign-in was cancelled",
            variant: "destructive",
          });
        }
      }, { scope: 'email' });
    } catch (error: any) {
      toast({
        title: "Facebook Sign-In Error",
        description: "Failed to initialize Facebook sign-in",
        variant: "destructive",
      });
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleXSignIn = async () => {
    try {
      setXLoading(true);
      
      // For X/Twitter login, we'll need to use OAuth 1.0a flow
      // This is a simplified implementation - in real use, you'd redirect to X OAuth
      const xAuthUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=YOUR_OAUTH_TOKEN`;
      
      // Open popup for X OAuth
      const popup = window.open(
        xAuthUrl,
        'XSignIn',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for popup to close (simplified)
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // In real implementation, you'd get the OAuth response here
          // For now, we'll simulate a successful sign-in
          setTimeout(async () => {
            try {
              await loginWithX({
                accessToken: 'mock_x_token',
                email: 'user@example.com',
                name: 'X User',
                picture: ''
              });

              toast({
                title: "Welcome!",
                description: "You have successfully signed in with X.",
              });
            } catch (error: any) {
              toast({
                title: "X Sign-In Failed",
                description: error.message || "An error occurred during X sign-in",
                variant: "destructive",
              });
            }
          }, 1000);
        }
      }, 1000);
    } catch (error: any) {
      toast({
        title: "X Sign-In Error",
        description: "Failed to initialize X sign-in",
        variant: "destructive",
      });
    } finally {
      setXLoading(false);
    }
  };

  const handleSocialSignIn = (provider: string) => {
    switch (provider) {
      case 'Google':
        handleGoogleSignIn();
        break;
      case 'Facebook':
        handleFacebookSignIn();
        break;
      case 'X':
        handleXSignIn();
        break;
      default:
        toast({
          title: "Coming Soon",
          description: `${provider} sign-in will be available soon.`,
        });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Exchange */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="p-0 h-auto text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exchange
            </Button>
          </Link>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <p className="text-muted-foreground">Sign in to your account to continue trading</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Social Sign In Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => handleSocialSignIn('Google')}
                disabled={googleLoading}
                data-testid="button-google-signin"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Continue with Google'
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => handleSocialSignIn('Facebook')}
                disabled={facebookLoading}
                data-testid="button-facebook-signin"
              >
                <SiFacebook className="w-5 h-5 mr-3 text-blue-600" />
                {facebookLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Continue with Facebook'
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => handleSocialSignIn('X')}
                disabled={xLoading}
                data-testid="button-x-signin"
              >
                <BsTwitterX className="w-5 h-5 mr-3" />
                {xLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Continue with X'
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            {/* Email Sign In Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pr-10"
                    required
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    data-testid="checkbox-remember"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password">
                  <Button variant="link" className="px-0 text-sm">
                    Forgot password?
                  </Button>
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
                data-testid="button-email-signin"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup">
                  <Button variant="link" className="px-0 text-sm font-medium">
                    Sign up
                  </Button>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            By signing in, you agree to our{' '}
            <Link href="/terms">
              <Button variant="link" className="px-0 text-xs">
                Terms of Service
              </Button>
            </Link>
            {' '}and{' '}
            <Link href="/privacy">
              <Button variant="link" className="px-0 text-xs">
                Privacy Policy
              </Button>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
