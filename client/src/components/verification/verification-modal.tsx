import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Home, Camera, Upload, Check, CheckCircle } from "lucide-react";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PhoneVerification } from "./phone-verification";
import { EmailVerification } from "./email-verification";

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
  const [emailVerified, setEmailVerified] = useState(false);
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: "id", uploaded: false },
    { type: "poa", uploaded: false },
    { type: "selfie", uploaded: false },
  ]);

  // Check verification status
  const { data: verificationStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/auth/verification-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/verification-status");
      return response.json();
    },
    enabled: open, // Only fetch when modal is open
  });

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
      // Upload file directly to storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const uploadResponse = await fetch("/api/objects/upload", {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      const data = await uploadResponse.json();

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

        {isLoadingStatus ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Checking verification status...</p>
            </div>
          </div>
        ) : verificationStatus?.identity_verified && verificationStatus?.address_verified && verificationStatus?.phone_verified && verificationStatus?.email_verified ? (
          // User is fully verified
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Account Fully Verified</h3>
            <p className="text-muted-foreground mb-6">
              Your account has been successfully verified. You can now access all platform features.
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Email Verified</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Phone Verified</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Identity Verified</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Address Verified</span>
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          // User needs verification
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Verification Status:</h3>
              <div className="space-y-2">
                {/* Email verification status */}
                {verificationStatus?.verification_status?.email?.status === 'pending' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Email verification pending</span>
                  </div>
                ) : !verificationStatus?.email_verified && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Email verification needed</span>
                  </div>
                )}
                
                {/* Phone verification status */}
                {verificationStatus?.verification_status?.phone?.status === 'pending' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Phone verification pending</span>
                  </div>
                ) : !verificationStatus?.phone_verified && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Phone verification needed</span>
                  </div>
                )}
                
                {/* Identity verification status */}
                {verificationStatus?.verification_status?.identity?.status === 'pending' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Identity verification pending review</span>
                  </div>
                ) : !verificationStatus?.identity_verified && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Identity document upload needed</span>
                  </div>
                )}
                
                {/* Address verification status */}
                {verificationStatus?.verification_status?.address?.status === 'pending' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Address verification pending review</span>
                  </div>
                ) : !verificationStatus?.address_verified && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Proof of address upload needed</span>
                  </div>
                )}
              </div>
            </div>

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
              {/* Email Verification Section */}
              {!verificationStatus?.email_verified && (
                <div>
                  <EmailVerification 
                    onComplete={() => setEmailVerified(true)}
                    isCompleted={emailVerified}
                    email={verificationStatus?.verification_status?.email?.email}
                  />
                  <Separator className="mt-6" />
                </div>
              )}

              {/* Phone Verification Section */}
              {!verificationStatus?.phone_verified && (
                <div>
                  <PhoneVerification 
                    onComplete={() => setPhoneVerified(true)}
                    isCompleted={phoneVerified}
                  />
                  <Separator className="mt-6" />
                </div>
              )}
            </div>

            <div className="space-y-6">
              {documents.map((doc, index) => {
                // Skip documents that are already verified or pending review
                if (doc.type === "id" && (verificationStatus?.identity_verified || verificationStatus?.verification_status?.identity?.status === 'pending')) return null;
                if (doc.type === "poa" && (verificationStatus?.address_verified || verificationStatus?.verification_status?.address?.status === 'pending')) return null;
                if (doc.type === "selfie" && (verificationStatus?.identity_verified || verificationStatus?.verification_status?.identity?.status === 'pending')) return null;

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
                    
                    {index < documents.filter(d => 
                      !((d.type === "id" || d.type === "selfie") && (verificationStatus?.identity_verified || verificationStatus?.verification_status?.identity?.status === 'pending')) &&
                      !(d.type === "poa" && (verificationStatus?.address_verified || verificationStatus?.verification_status?.address?.status === 'pending'))
                    ).length - 1 && <Separator />}
                  </div>
                );
              }).filter(Boolean)}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
