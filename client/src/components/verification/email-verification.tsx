import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Check } from "lucide-react";

interface EmailVerificationProps {
  onComplete: () => void;
  isCompleted: boolean;
  email?: string;
}

export function EmailVerification({ onComplete, isCompleted, email }: EmailVerificationProps) {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(isCompleted);

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/verification/email/send", {});
      return response.json();
    },
    onSuccess: () => {
      setCodeSent(true);
      toast({
        title: "Verification Code Sent",
        description: "A 6-digit verification code has been sent to your email address.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/verification/email/verify", { 
        code 
      });
      return response.json();
    },
    onSuccess: () => {
      setIsVerified(true);
      toast({
        title: "Email Verified",
        description: "Your email address has been successfully verified!",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid Code",
        description: error.message || "The verification code is incorrect or has expired",
        variant: "destructive",
      });
    },
  });

  const handleSendCode = () => {
    sendCodeMutation.mutate();
  };

  const handleVerifyCode = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(verificationCode);
  };

  if (isVerified) {
    return (
      <Card className="p-6 border-green-200 bg-green-50">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Email Address Verified</h3>
            <p className="text-sm text-green-600">{email}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Mail className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Email Address Verification</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label>Email Address</Label>
          <Input
            type="email"
            value={email || ""}
            disabled
            className="bg-muted"
            data-testid="input-email-address"
          />
          <p className="text-xs text-muted-foreground mt-1">
            We'll send a verification code to this email address
          </p>
        </div>

        {!codeSent ? (
          <Button 
            onClick={handleSendCode}
            disabled={sendCodeMutation.isPending}
            className="w-full"
            data-testid="button-send-email-code"
          >
            {sendCodeMutation.isPending ? "Sending..." : "Send Verification Code"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="emailVerificationCode">Verification Code</Label>
              <Input
                id="emailVerificationCode"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                data-testid="input-email-verification-code"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-digit code sent to {email}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleVerifyCode}
                disabled={verifyCodeMutation.isPending || !verificationCode}
                className="flex-1"
                data-testid="button-verify-email-code"
              >
                {verifyCodeMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode("");
                }}
                data-testid="button-resend-email-code"
              >
                Resend Code
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}