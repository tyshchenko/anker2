import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, Home, Camera, Upload, Check } from "lucide-react";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PhoneVerification } from "./phone-verification";

interface VerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DocumentUpload {
  type: "id" | "poa" | "selfie";
  path?: string;
  uploaded: boolean;
  file?: File;
  fileName?: string;
}

export function VerificationModal({ open, onOpenChange }: VerificationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: "id", uploaded: false },
    { type: "poa", uploaded: false },
    { type: "selfie", uploaded: false },
  ]);

  const submitVerificationMutation = useMutation({
    mutationFn: async (data: { idDocumentPath: string; proofOfAddressPath: string; selfiePath: string }) => {
      return apiRequest("POST", "/api/verification/submit", data);
    },
    onSuccess: () => {
      toast({
        title: "Verification Submitted",
        description: "Your documents have been submitted for review. You'll receive confirmation within 24-48 hours.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/verification-status"] });
      onOpenChange(false);
      // Reset form
      setDocuments([
        { type: "id", uploaded: false },
        { type: "poa", uploaded: false },
        { type: "selfie", uploaded: false },
      ]);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit verification documents",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (type: "id" | "poa" | "selfie", file: File) => {
    try {
      // Get upload URL from backend
      const response = await apiRequest("POST", "/api/objects/upload");
      const data = await response.json();
      
      // Upload file directly to storage
      const uploadResponse = await fetch(data.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Update document state
      setDocuments(prev => prev.map(doc => 
        doc.type === type 
          ? { 
              ...doc, 
              path: data.uploadURL.split('?')[0], // Remove query params for clean URL
              uploaded: true,
              file,
              fileName: file.name
            }
          : doc
      ));

      toast({
        title: "Upload Successful",
        description: `${getDocumentName(type)} uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFile = (type: "id" | "poa" | "selfie") => {
    setDocuments(prev => prev.map(doc => 
      doc.type === type 
        ? { type, uploaded: false, path: undefined, file: undefined, fileName: undefined }
        : doc
    ));
  };


  const getDocumentName = (type: string) => {
    switch (type) {
      case "id": return "ID Document";
      case "poa": return "Proof of Address";
      case "selfie": return "Selfie Photo";
      default: return "Document";
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "id": return FileText;
      case "poa": return Home;
      case "selfie": return Camera;
      default: return FileText;
    }
  };

  const getDocumentDescription = (type: string) => {
    switch (type) {
      case "id": return "Upload a clear photo of your South African ID, passport, or driver's license";
      case "poa": return "Upload a bank statement, utility bill, or municipal bill (not older than 3 months)";
      case "selfie": return "Take a clear selfie while holding your ID document next to your face";
      default: return "";
    }
  };

  const canSubmit = phoneVerified && documents.every(doc => doc.uploaded);

  const handleSubmit = () => {
    const idDoc = documents.find(d => d.type === "id");
    const poaDoc = documents.find(d => d.type === "poa");
    const selfieDoc = documents.find(d => d.type === "selfie");

    if (idDoc?.path && poaDoc?.path && selfieDoc?.path) {
      submitVerificationMutation.mutate({
        idDocumentPath: idDoc.path,
        proofOfAddressPath: poaDoc.path,
        selfiePath: selfieDoc.path,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="verification-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Account Verification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What you'll need:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Valid South African mobile number</li>
              <li>• South African ID, passport, or driver's license</li>
              <li>• Proof of address (bank statement, utility bill, municipal bill - max 3 months old)</li>
              <li>• Selfie photo holding your ID document</li>
              <li>• Processing time: 24-48 hours</li>
            </ul>
          </div>

          <div className="space-y-6">
            {/* Phone Verification Section */}
            <div>
              <PhoneVerification 
                onComplete={() => setPhoneVerified(true)}
                isCompleted={phoneVerified}
              />
            </div>

            <Separator />
          </div>

          <div className="space-y-6">
            {documents.map((doc, index) => {
              const Icon = getDocumentIcon(doc.type);
              return (
                <div key={doc.type}>
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-full ${doc.uploaded ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        {doc.uploaded ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div>
                        <Label className="text-base font-medium">
                          {getDocumentName(doc.type)}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getDocumentDescription(doc.type)}
                        </p>
                      </div>

                      <FileDropzone
                        onFileSelect={(file) => handleFileSelect(doc.type, file)}
                        accept={doc.type === "selfie" ? "image/*" : "image/*,.pdf"}
                        maxSizeMB={10}
                        label={`Upload ${getDocumentName(doc.type)}`}
                        description={getDocumentDescription(doc.type)}
                        uploaded={doc.uploaded}
                        fileName={doc.fileName}
                        onRemove={() => handleRemoveFile(doc.type)}
                      />
                    </div>
                  </div>
                  
                  {index < documents.length - 1 && <Separator />}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-verification"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitVerificationMutation.isPending}
              className="flex-1"
              data-testid="button-submit-verification"
            >
              {submitVerificationMutation.isPending ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
