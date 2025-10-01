import { useState, useEffect, useRef } from "react";
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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToRegister: () => void;
}

// Declare social login objects for TypeScript
declare global {
  interface Window {
    google: any;
    FB: any;
  }
}

export function LoginDialog({ open, onOpenChange, onSwitchToRegister }: LoginDialogProps) {
  const { login, loginWithGoogle, loginWithFacebook, loginWithX, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isXLoading, setIsXLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
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
      script.onload = () => {
        initializeGoogleButton();
      };
      document.head.appendChild(script);
    } else if (open && googleButtonRef.current) {
      initializeGoogleButton();
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
  }, [open]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password);
      toast({
        title: "Success",
        description: "You have been logged in successfully!",
      });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGoogleButton = () => {
    if (!window.google || !googleButtonRef.current || !open) return;

    console.log('🔵 Initializing Google button');

    try {
      // Initialize Google Sign-In with button
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

            console.log('✅ Google login successful');
            toast({
              title: "Success",
              description: "You have been logged in with Google!",
            });
            onOpenChange(false);
          } catch (error: any) {
            console.error('❌ Google login error:', error);
            toast({
              title: "Google Login Failed",
              description: error.message || "An error occurred during Google login",
              variant: "destructive",
            });
          }
        },
      });

      // Render the Google button
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: "outline",
          size: "large",
          width: googleButtonRef.current.offsetWidth || 200,
          text: "signin_with",
          shape: "rectangular"
        }
      );

      console.log('✅ Google button rendered');
    } catch (error: any) {
      console.error('❌ Failed to initialize Google button:', error);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsFacebookLoading(true);
      console.log('🔵 Facebook login initiated');

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
          
          // Get user info from Facebook
          window.FB.api('/me', { fields: 'name,email,picture' }, async (userInfo: any) => {
            console.log('🔵 Facebook user info:', userInfo);
            
            try {
              await loginWithFacebook({
                accessToken: response.authResponse.accessToken,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture?.data?.url
              });

              console.log('✅ Facebook login successful');
              toast({
                title: "Success",
                description: "You have been logged in with Facebook!",
              });
              onOpenChange(false);
            } catch (error: any) {
              console.error('❌ Facebook login error:', error);
              toast({
                title: "Facebook Login Failed",
                description: error.message || "An error occurred during Facebook login",
                variant: "destructive",
              });
            }
          });
        } else {
          console.warn('⚠️ Facebook login cancelled');
          toast({
            title: "Facebook Login Cancelled",
            description: "Facebook login was cancelled",
            variant: "destructive",
          });
        }
      }, { scope: 'email' });
    } catch (error: any) {
      console.error('❌ Facebook login initialization error:', error);
      toast({
        title: "Facebook Login Error",
        description: "Failed to initialize Facebook login",
        variant: "destructive",
      });
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleXLogin = async () => {
    try {
      setIsXLoading(true);
      console.log('🔵 X/Twitter login initiated');
      
      // Create a callback endpoint listener
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
            console.log('✅ X login successful');
            toast({
              title: "Success",
              description: "You have been logged in with X!",
            });
            onOpenChange(false);
          }).catch((error: any) => {
            console.error('❌ X login error:', error);
            toast({
              title: "X Login Failed",
              description: error.message || "An error occurred during X login",
              variant: "destructive",
            });
          }).finally(() => {
            setIsXLoading(false);
            window.removeEventListener('message', handleXCallback);
          });
        } else if (event.data.type === 'X_OAUTH_ERROR') {
          console.error('❌ X OAuth error:', event.data.error);
          toast({
            title: "X Login Failed",
            description: event.data.error || "X authentication failed",
            variant: "destructive",
          });
          setIsXLoading(false);
          window.removeEventListener('message', handleXCallback);
        }
      };
      
      window.addEventListener('message', handleXCallback);
      
      // Request X OAuth from backend
      const response = await fetch('/api/auth/x/request', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate X OAuth');
      }
      
      const { auth_url } = await response.json();
      console.log('🔵 X OAuth URL:', auth_url);
      
      // Open popup for X OAuth
      const popup = window.open(
        auth_url,
        'XLogin',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for popup to close without success
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
      console.error('❌ X login initialization error:', error);
      toast({
        title: "X Login Error",
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
          // Allow interactions with Google OAuth, Facebook OAuth, and other auth popups
          const target = e.target as Element;
          const isGoogleOAuth = target.closest('[data-testid*="google"]') || 
                               target.closest('.google-oauth') ||
                               target.closest('[id*="google"]') ||
                               document.querySelector('#credential_picker_container') ||
                               document.querySelector('.g-oauth-button');
          const isFacebookOAuth = target.closest('[data-testid*="facebook"]') || 
                                 target.closest('.fb-login-button') ||
                                 target.closest('#facebook-jssdk');
          const isXOAuth = target.closest('[data-testid*="x"]') || 
                          target.closest('.twitter-oauth');
          
          // Prevent closing if it's an OAuth interaction
          if (isGoogleOAuth || isFacebookOAuth || isXOAuth) {
            return;
          }
          
          // Prevent closing for other outside interactions
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Welcome back</DialogTitle>
          <DialogDescription>
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  placeholder="Enter your password"
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div 
              ref={googleButtonRef}
              className="w-full flex items-center justify-center"
              data-testid="button-google-login"
            />

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleFacebookLogin}
              disabled={isFacebookLoading}
              data-testid="button-facebook-login"
            >
              <SiFacebook className="h-4 w-4 text-blue-600" />
            </Button>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleXLogin}
              disabled={isXLoading}
              data-testid="button-x-login"
            >
              <BsTwitterX className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={onSwitchToRegister}
              data-testid="button-switch-register"
            >
              Sign up
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
