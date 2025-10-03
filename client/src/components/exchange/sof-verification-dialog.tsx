import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

interface SOFVerificationDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
}

const SOF_OPTIONS = [
  { value: "salary_wages", label: "Salary/Wages" },
  { value: "savings", label: "Savings" },
  { value: "loan", label: "Loan" },
  { value: "gift_inheritance", label: "Gift/Inheritance" },
  { value: "other", label: "Other" },
];

export function SOFVerificationDialog({ isOpen, onSuccess }: SOFVerificationDialogProps) {
  const [selectedSource, setSelectedSource] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sofMutation = useMutation({
    mutationFn: async (source: string) => {
      const response = await fetch('/api/sof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit source of funds');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Source of Funds Verified",
        description: "Your source of funds has been recorded. You can now proceed with deposits.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "An error occurred while submitting your source of funds.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedSource) {
      toast({
        title: "Selection Required",
        description: "Please select a source of funds to continue.",
        variant: "destructive",
      });
      return;
    }
    sofMutation.mutate(selectedSource);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary" />
            Source Verification Required
          </DialogTitle>
          <DialogDescription>
            Please provide the source of funds for this account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={selectedSource} onValueChange={setSelectedSource}>
            {SOF_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value}
                  data-testid={`radio-sof-${option.value}`}
                />
                <Label 
                  htmlFor={option.value} 
                  className="cursor-pointer flex-1"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Button
            onClick={handleSubmit}
            disabled={!selectedSource || sofMutation.isPending}
            className="w-full"
            data-testid="button-submit-sof"
          >
            {sofMutation.isPending ? "Submitting..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
