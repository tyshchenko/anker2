import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Clock, CheckCircle } from "lucide-react";
import { VerificationModal } from "@/components/verification/verification-modal";
import { useAuth } from "@/lib/auth";

export function VerificationBanner() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Don't show if user isn't authenticated or is already verified
  if (!user || user?.verificationStatus === "approved") {
    return null;
  }

  const getStatusInfo = () => {
    switch (user?.verificationStatus) {
      case "submitted":
        return {
          icon: Clock,
          title: "Verification In Progress",
          description: "Your documents are being reviewed. This typically takes 24-48 hours.",
          buttonText: null,
          variant: "default" as const,
        };
      case "rejected":
        return {
          icon: Shield,
          title: "Verification Required",
          description: "Please resubmit your verification documents. Previous submission was incomplete.",
          buttonText: "Resubmit Documents",
          variant: "destructive" as const,
        };
      default:
        return {
          icon: Shield,
          title: "Verify Your Account",
          description: "Complete account verification to unlock full trading features. Upload ID, proof of address, and selfie.",
          buttonText: "Start Verification",
          variant: "default" as const,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <div className="px-4 lg:px-6 py-2">
        <Alert variant={statusInfo.variant} data-testid="verification-banner">
          <StatusIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div>
              <span className="font-semibold">{statusInfo.title}</span>
              <br />
              <span className="text-sm">{statusInfo.description}</span>
            </div>
            {statusInfo.buttonText && (
              <Button
                onClick={() => setShowModal(true)}
                variant="outline"
                size="sm"
                className="ml-4 flex-shrink-0"
                data-testid="button-start-verification"
              >
                {statusInfo.buttonText}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>

      <VerificationModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}