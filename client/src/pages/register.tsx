import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// Declare social login objects for TypeScript
declare global {
  interface Window {
    google: any;
    FB: any;
  }
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register: registerUser, loginWithGoogle, loginWithFacebook, loginWithX, isAuthenticated } = useAuth();
  const { toast } = useToast();
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
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    // Redirect authenticated users to home
    if (isAuthenticated) {
      setLocation("/");
      return;
    }

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
          appId: 'YOUR_FACEBOOK_APP_ID', // This should come from environment
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
      };
      document.head.appendChild(script);
    }

    // Check if there's a provider parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    
    if (provider) {
      // Clear the URL parameter
      window.history.replaceState({}, '', '/signup');
      
      // Delay the social register to allow scripts to load
      const timer = setTimeout(() => {
        switch (provider) {
          case 'google':
            handleGoogleRegister();
            break;
          case 'facebook':
            handleFacebookRegister();
            break;
          case 'x':
            handleXRegister();
            break;
        }
      }, 500); // Reduced delay

      return () => clearTimeout(timer);
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
      setLocation("/");
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

      if (!window.google) {
        toast({
          title: "Error",
          description: "Google Sign-In is not loaded. Please try again.",
          variant: "destructive",
        });
        return;
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
              title: "Success",
              description: "You have been registered with Google!",
            });
            setLocation("/");
          } catch (error: any) {
            toast({
              title: "Google Registration Failed",
              description: error.message || "An error occurred during Google registration",
              variant: "destructive",
            });
          }
        },
      });

      // Prompt for Google Sign-In
      window.google.accounts.id.prompt();
    } catch (error: any) {
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
                title: "Success",
                description: "You have been registered with Facebook!",
              });
              setLocation("/");
            } catch (error: any) {
              toast({
                title: "Facebook Registration Failed",
                description: error.message || "An error occurred during Facebook registration",
                variant: "destructive",
              });
            }
          });
        } else {
          toast({
            title: "Facebook Registration Cancelled",
            description: "Facebook registration was cancelled",
            variant: "destructive",
          });
        }
      }, { scope: 'email' });
    } catch (error: any) {
      toast({
        title: "Facebook Registration Error",
        description: "Failed to initialize Facebook registration",
        variant: "destructive",
      });
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleXRegister = async () => {
    try {
      setIsXLoading(true);
      
      // For X/Twitter login, we'll need to use OAuth 1.0a flow
      // This is a simplified implementation - in real use, you'd redirect to X OAuth
      const xAuthUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=YOUR_OAUTH_TOKEN`;
      
      // Open popup for X OAuth
      const popup = window.open(
        xAuthUrl,
        'XRegister',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for popup to close (simplified)
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // In real implementation, you'd get the OAuth response here
          // For now, we'll simulate a successful registration
          setTimeout(async () => {
            try {
              await loginWithX({
                accessToken: 'mock_x_token',
                email: 'user@example.com',
                name: 'X User',
                picture: ''
              });

              toast({
                title: "Success",
                description: "You have been registered with X!",
              });
              setLocation("/");
            } catch (error: any) {
              toast({
                title: "X Registration Failed",
                description: error.message || "An error occurred during X registration",
                variant: "destructive",
              });
            }
          }, 1000);
        }
      }, 1000);
    } catch (error: any) {
      toast({
        title: "X Registration Error",
        description: "Failed to initialize X registration",
        variant: "destructive",
      });
    } finally {
      setIsXLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <Link href="/signin">
              <Button variant="link" className="p-0 h-auto font-semibold" data-testid="link-login">
                Sign in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
