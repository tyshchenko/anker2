import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { BsTwitterX } from "react-icons/bs";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
}

// Declare social login objects for TypeScript
declare global {
  interface Window {
    google: any;
    FB: any;
  }
}

export function RegisterDialog({ open, onOpenChange, onSwitchToLogin }: RegisterDialogProps) {
  const { register: registerUser, loginWithGoogle, loginWithFacebook, loginWithX, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isXLoading, setIsXLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      onOpenChange(false);
    }
  }, []);
  
  useEffect(() => {
    // Load Google Identity Services script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
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
          appId: 'YOUR_FACEBOOK_APP_ID',
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
      };
      document.head.appendChild(script);
    }
  }, []);

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      await registerUser(data.email, data.password, data.firstName, data.lastName);
      toast({
        title: "Success",
        description: "Your account has been created successfully!",
      });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsGoogleLoading(true);
      console.log('🔵 Google register initiated');

      if (!window.google) {
        console.error('❌ Google SDK not loaded');
        toast({
          title: "Error",
          description: "Google Sign-In is not loaded. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Google SDK loaded');

      window.google.accounts.id.initialize({
        client_id: "303897812754-50r2qpavk6lbgpq5easeutdrkks6rnhi.apps.googleusercontent.com",
        callback: async (response: any) => {
          try {
            console.log('🔵 Google callback received:', response);
            
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            console.log('🔵 Google user payload:', payload);

            await loginWithGoogle({
              token: response.credential,
              email: payload.email,
              name: payload.name,
              picture: payload.picture
            });

            console.log('✅ Google register successful');
            toast({
              title: "Success",
              description: "Your account has been created with Google!",
            });
            onOpenChange(false);
          } catch (error: any) {
            console.error('❌ Google register error:', error);
            toast({
              title: "Google Registration Failed",
              description: error.message || "An error occurred during Google registration",
              variant: "destructive",
            });
          }
        },
      });

      console.log('🔵 Prompting for Google Sign-In');
      window.google.accounts.id.prompt((notification: any) => {
        console.log('🔵 Google prompt notification:', notification);
        
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          const reason = notification.getNotDisplayedReason() || notification.getSkippedReason();
          console.log('⚠️ Google prompt not displayed, reason:', reason);
          
          if (reason === 'opt_out_or_no_session') {
            toast({
              title: "Google Sign-In Required",
              description: "Please sign in to your Google account first, then try again.",
              variant: "destructive",
            });
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Google register initialization error:', error);
      toast({
        title: "Google Registration Error",
        description: "Failed to initialize Google Sign-In",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookRegister = async () => {
    try {
      setIsFacebookLoading(true);
      console.log('🔵 Facebook register initiated');

      if (!window.FB) {
        console.error('❌ Facebook SDK not loaded');
        toast({
          title: "Error",
          description: "Facebook SDK is not loaded. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Facebook SDK loaded');

      window.FB.login(async (response: any) => {
        console.log('🔵 Facebook login response:', response);
        
        if (response.authResponse) {
          console.log('✅ Facebook authResponse received');
          
          window.FB.api('/me', { fields: 'name,email,picture' }, async (userInfo: any) => {
            console.log('🔵 Facebook user info:', userInfo);
            
            try {
              await loginWithFacebook({
                accessToken: response.authResponse.accessToken,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture?.data?.url
              });

              console.log('✅ Facebook register successful');
              toast({
                title: "Success",
                description: "Your account has been created with Facebook!",
              });
              onOpenChange(false);
            } catch (error: any) {
              console.error('❌ Facebook register error:', error);
              toast({
                title: "Facebook Registration Failed",
                description: error.message || "An error occurred during Facebook registration",
                variant: "destructive",
              });
            }
          });
        } else {
          console.warn('⚠️ Facebook login cancelled');
          toast({
            title: "Facebook Registration Cancelled",
            description: "Facebook registration was cancelled",
            variant: "destructive",
          });
        }
      }, { scope: 'email' });
    } catch (error: any) {
      console.error('❌ Facebook register initialization error:', error);
      toast({
        title: "Facebook Registration Error",
        description: "Failed to initialize Facebook login",
        variant: "destructive",
      });
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleXRegister = async () => {
    try {
      setIsXLoading(true);
      console.log('🔵 X/Twitter register initiated');
      
      const handleXCallback = (event: MessageEvent) => {
        console.log('🔵 X OAuth callback received:', event.data);
        
        if (event.data.type === 'X_OAUTH_SUCCESS') {
          const { accessToken, email, name, picture, username } = event.data;
          
          console.log('🔵 X user data:', { email, name, username });
          
          loginWithX({
            accessToken,
            email: email || `${username}@twitter.com`,
            name: name || username,
            picture: picture || ''
          }).then(() => {
            console.log('✅ X register successful');
            toast({
              title: "Success",
              description: "Your account has been created with X!",
            });
            onOpenChange(false);
          }).catch((error: any) => {
            console.error('❌ X register error:', error);
            toast({
              title: "X Registration Failed",
              description: error.message || "An error occurred during X registration",
              variant: "destructive",
            });
          }).finally(() => {
            setIsXLoading(false);
            window.removeEventListener('message', handleXCallback);
          });
        } else if (event.data.type === 'X_OAUTH_ERROR') {
          console.error('❌ X OAuth error:', event.data.error);
          toast({
            title: "X Registration Failed",
            description: event.data.error || "X authentication failed",
            variant: "destructive",
          });
          setIsXLoading(false);
          window.removeEventListener('message', handleXCallback);
        }
      };
      
      window.addEventListener('message', handleXCallback);
      
      const response = await fetch('/api/auth/x/request', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate X OAuth');
      }
      
      const { auth_url } = await response.json();
      console.log('🔵 X OAuth URL:', auth_url);
      
      const popup = window.open(
        auth_url,
        'XRegister',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setTimeout(() => {
            setIsXLoading(false);
            window.removeEventListener('message', handleXCallback);
          }, 500);
        }
      }, 1000);
    } catch (error: any) {
      console.error('❌ X register initialization error:', error);
      toast({
        title: "X Registration Error",
        description: error.message || "Failed to initialize X login",
        variant: "destructive",
      });
      setIsXLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => {
          // Check if the click is on an OAuth element
          const target = e.target as Element;
          const isGoogleOAuth = target.closest('[data-testid*="google"]') || 
                               target.closest('.google-oauth') ||
                               target.closest('[id*="google"]') ||
                               target.id?.includes('credential_picker') ||
                               target.closest('[role="dialog"]');
          const isFacebookOAuth = target.closest('[data-testid*="facebook"]') || 
                                 target.closest('.fb-login-button') ||
                                 target.closest('#facebook-jssdk');
          const isXOAuth = target.closest('[data-testid*="x"]') || 
                          target.closest('.twitter-oauth');
          
          // Allow interactions with OAuth popups by not preventing default
          if (isGoogleOAuth || isFacebookOAuth || isXOAuth) {
            return;
          }
          
          // Prevent closing dialog for other outside interactions
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>
            Enter your details to create your account
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register("firstName")}
                  data-testid="input-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register("lastName")}
                  data-testid="input-lastname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                data-testid="input-email"
              />
              {errors.email && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.email.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  {...register("password")}
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.password.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  {...register("confirmPassword")}
                  data-testid="input-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.confirmPassword.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase hidden">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 hidden">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleRegister}
              disabled={isGoogleLoading}
              data-testid="button-google-register"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </Button>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleFacebookRegister}
              disabled={isFacebookLoading}
              data-testid="button-facebook-register"
            >
              <SiFacebook className="h-4 w-4 text-blue-600" />
            </Button>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleXRegister}
              disabled={isXLoading}
              data-testid="button-x-register"
            >
              <BsTwitterX className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={onSwitchToLogin}
              data-testid="button-switch-login"
            >
              Sign in
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
