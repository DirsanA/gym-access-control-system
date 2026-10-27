"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, Dumbbell, Eye, EyeOff, KeyRound, Lock, Mail, Phone, RefreshCw, ShieldCheck, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // Form states
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+251 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gender, setGender] = useState("MALE");

  // Flow states: 1 = Register form, 2 = OTP verification screen
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Submit registration form
  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          fullName,
          email,
          phone,
          password,
          gender,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Registration failed.");
        return;
      }

      setSuccessMsg(data.message);
      setStep(2);
      startResendTimer();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Submit OTP verification
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Invalid or expired verification code.");
        return;
      }

      // Success! Account is verified and session cookie is set
      router.push("/profile");
    } catch {
      setError("Network error verifying code.");
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP code
  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to resend code.");
        return;
      }
      setSuccessMsg("A new verification code has been dispatched to your email.");
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
    <main className="min-h-screen bg-[#040405] pt-28 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff331e] animate-pulse" />
            <span className="text-xs font-mono text-gray-400">ADDIS ABABA • 24/7 ENTRANCE</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0d0d10] p-7 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_top_right,rgba(255,51,30,0.15),transparent_70%)] pointer-events-none" />

          {/* STEP 1: Registration Form */}
          {step === 1 && (
            <div>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff331e]/10 border border-[#ff331e]/20 text-[#ff4733] text-xs font-bold tracking-wider uppercase mb-3">
                  <Dumbbell size={14} />
                  <span>Elite Fitness Membership</span>
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Your Account</h1>
                <p className="text-sm text-gray-400 mt-2">
                  Register for seamless contactless turnstile access and intelligent digital pass management.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Username *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="athlete_alex"
                        className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Abebe"
                      className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address *</label>
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

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+251 91 123 4567"
                        className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password *</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Confirm Password *</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
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
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[#ff331e]"
                  >
                    <option value="MALE" className="bg-[#121216]">Male</option>
                    <option value="FEMALE" className="bg-[#121216]">Female</option>
                    <option value="OTHER" className="bg-[#121216]">Other / Prefer not to say</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-sm shadow-[0_4px_24px_rgba(255,51,30,0.5)] transition-all disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Create Account & Send Verification Code"}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-gray-400">
                Already registered?{" "}
                <Link href="/login" className="text-[#ff4733] font-semibold hover:underline">
                  Sign in here
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: Email OTP Verification Screen */}
          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-[#ff331e]/15 border border-[#ff331e]/40 flex items-center justify-center text-[#ff331e] mb-4">
                  <Mail size={26} />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Check Your Email</h2>
                <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
                  We sent a 6-digit verification code to <span className="text-white font-semibold">{email}</span> via Brevo SMTP.
                </p>
              </div>

              {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 text-center mb-2">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="w-full text-center text-3xl font-mono tracking-[0.3em] font-bold py-3.5 px-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff331e]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3.5 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-sm shadow-[0_4px_24px_rgba(255,51,30,0.5)] transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Open Dashboard"}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="hover:text-white"
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
        </div>
      </div>
    </main>
  );
}
