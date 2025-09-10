import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Smartphone, Check } from "lucide-react";

interface PhoneVerificationProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export function PhoneVerification({ onComplete, isCompleted }: PhoneVerificationProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(isCompleted);

  const sendCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("POST", "/api/verification/phone/send", { phoneNumber: phone });
      return response.json();
    },
    onSuccess: () => {
      setCodeSent(true);
      toast({
        title: "Verification Code Sent",
        description: "A 6-digit verification code has been sent to your phone via SMS.",
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
      const response = await apiRequest("POST", "/api/verification/phone/verify", { 
        phoneNumber, 
        code 
      });
      return response.json();
    },
    onSuccess: () => {
      setIsVerified(true);
      toast({
        title: "Phone Verified",
        description: "Your phone number has been successfully verified!",
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
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid South African phone number",
        variant: "destructive",
      });
      return;
    }
    sendCodeMutation.mutate(phoneNumber);
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
            <h3 className="font-semibold text-green-800">Phone Number Verified</h3>
            <p className="text-sm text-green-600">{phoneNumber}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Smartphone className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Phone Number Verification</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+27 82 123 4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={codeSent}
            data-testid="input-phone-number"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter your South African mobile number
          </p>
        </div>

        {!codeSent ? (
          <Button 
            onClick={handleSendCode}
            disabled={sendCodeMutation.isPending || !phoneNumber}
            className="w-full"
            data-testid="button-send-code"
          >
            {sendCodeMutation.isPending ? "Sending..." : "Send Verification Code"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                data-testid="input-verification-code"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-digit code sent to {phoneNumber}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleVerifyCode}
                disabled={verifyCodeMutation.isPending || !verificationCode}
                className="flex-1"
                data-testid="button-verify-code"
              >
                {verifyCodeMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode("");
                }}
                data-testid="button-change-number"
              >
                Change Number
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}