"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Flow states: 1 = Enter Email, 2 = Enter OTP & Set New Password, 3 = Reset Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 1: Request OTP
  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to dispatch reset code.");
        return;
      }

      setSuccessMsg(data.message || "Verification code dispatched to your email.");
      setStep(2);
      startResendTimer();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP and Reset Password
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to reset password.");
        return;
      }

      setStep(3);
    } catch {
      setError("Network error resetting password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP code
  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to resend code.");
        return;
      }

      setSuccessMsg("A new 6-digit code has been dispatched to your email.");
      startResendTimer();
    } catch {
      setError("Network error resending code.");
    } finally {
      setLoading(false);
    }
  }

  function startResendTimer() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-[#040405] pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 flex flex-col items-center">
      <div className="w-full max-w-md my-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff331e] animate-pulse" />
            <span className="text-xs font-mono text-gray-400">PASSWORD RECOVERY</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0d0d10] p-8 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_right,rgba(255,51,30,0.18),transparent_70%)] pointer-events-none" />

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <div>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff331e]/10 border border-[#ff331e]/20 text-[#ff4733] text-xs font-bold tracking-wider uppercase mb-3">
                  <Dumbbell size={14} />
                  <span>Elite Fitness Security</span>
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Forgot Password?</h1>
                <p className="text-sm text-gray-400 mt-2">
                  No worries! Enter your registered email address and we will dispatch a 6-digit OTP code to verify your identity.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Registered Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full mt-4 py-3 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-sm shadow-[0_4px_24px_rgba(255,51,30,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Dispatching Code...</span>
                    </>
                  ) : (
                    "Send Reset Code"
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-gray-400">
                Remember your password?{" "}
                <Link href="/login" className="text-[#ff4733] font-semibold hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: Enter OTP & Set New Password */}
          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-[#ff331e]/15 border border-[#ff331e]/40 flex items-center justify-center text-[#ff331e] mb-4">
                  <KeyRound size={26} />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Reset Credentials</h2>
                <p className="text-xs text-gray-400 mt-2">
                  We sent a 6-digit code to <span className="text-white font-semibold">{email}</span>.
                </p>
              </div>

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 text-center mb-2">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="w-full text-center text-2xl font-mono tracking-[0.25em] font-bold py-2.5 px-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff331e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6 || !newPassword || !confirmPassword}
                  className="w-full mt-4 py-3 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-sm shadow-[0_4px_24px_rgba(255,51,30,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    "Reset Password & Finish"
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="hover:text-white transition-colors"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[#ff4733] font-semibold hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Reset Complete */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-5">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Password Updated!</h2>
              <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                Your password has been securely reset. You can now log into your account using your new credentials.
              </p>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full mt-8 py-3.5 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-sm shadow-[0_4px_24px_rgba(255,51,30,0.5)] transition-all"
              >
                Sign In With New Password
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
