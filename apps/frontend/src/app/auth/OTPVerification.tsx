/**
 * OTP Verification Component
 * 
 * Handles 6-digit OTP code input for email 2FA verification.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, RefreshCw } from "lucide-react";

interface OTPVerificationProps {
  token: string;
  username: string;
  onSuccess?: () => void;
}

export function OTPVerification({ token, username, onSuccess }: OTPVerificationProps) {
  const navigate = useNavigate();
  const { validateOTP, requestOTP, isLoading, error, clearError } = useAuth();
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = [
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
  ];

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(0, 1);
    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    
    // Handle paste
    if (e.key === "Enter" && otpCode.every(digit => digit)) {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = pastedData.split("").concat(Array(6 - pastedData.length).fill(""));
    setOtpCode(newOtp);
    
    // Focus the last filled input or the first empty one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs[nextIndex].current?.focus();
  };

  const handleSubmit = async () => {
    const code = otpCode.join("");
    
    if (code.length !== 6) {
      return;
    }

    try {
      await validateOTP(token, code);
      onSuccess?.();
      // Navigate to dashboard on success
      navigate("/dashboard");
    } catch (err) {
      // Error is handled by the auth store
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    clearError();
    
    try {
      await requestOTP(token);
      // Clear OTP inputs
      setOtpCode(["", "", "", "", "", ""]);
      inputRefs[0].current?.focus();
    } catch (err) {
      // Error is handled by the auth store
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to login
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to {username}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label>Enter verification code</Label>
            <div className="flex justify-center gap-2">
              {otpCode.map((digit, index) => (
                <Input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-12 text-center text-lg font-semibold"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={isLoading || otpCode.some(digit => !digit)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={isLoading || isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>The code will expire in 15 minutes.</p>
            <p>If you don't see the email, check your spam folder.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
