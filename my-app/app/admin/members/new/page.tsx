"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CreditCard, QrCode, ScanLine, ShieldAlert, Sparkles, UserPlus } from "lucide-react";
import { MemberCard } from "@/components/member-card";
import type { ScannerMember } from "@/types/scanner";

type CreateMemberResponse = { success: boolean; message?: string; member?: ScannerMember & { isActive?: boolean } };

function endDateFor(startDate: string, months: "1" | "3"): string {
  if (!startDate) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  const targetMonth = month - 1 + Number(months);
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  const nextPeriodStart = new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay)));
  nextPeriodStart.setUTCDate(nextPeriodStart.getUTCDate() - 1);
  return nextPeriodStart.toISOString().slice(0, 10);
}

export default function NewMemberPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<CreateMemberResponse["member"]>();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!res.ok || !data.authenticated || data.user?.role !== "admin") {
          setUnauthorized(true);
        }
      } catch {
        setUnauthorized(true);
      } finally {
        setAuthChecking(false);
      }
    }
    void checkAdmin();
  }, []);
  const [duration, setDuration] = useState<"1" | "3">("1");
  const endDate = useMemo(() => endDateFor(startDate, duration), [startDate, duration]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(undefined);
    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      gender: form.get("gender"),
      membershipStartDate: startDate,
      membershipEndDate: endDate,
      membershipPlan: duration === "3" ? "3 Month Membership" : "1 Month Membership",
    };
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as CreateMemberResponse | null;
      if (!response.ok || !data?.success || !data.member) {
        setError(data?.message ?? "Unable to register the member.");
        return;
      }
      setSuccess(data.member);
      event.currentTarget.reset();
      setStartDate(new Date().toISOString().slice(0, 10));
      setDuration("1");
    } catch {
      setError("The member server is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <main className="min-h-screen bg-[#040405] pt-32 pb-20 px-4 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ff331e] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-400">Verifying administrative access...</p>
        </div>
      </main>
    );
  }

  if (unauthorized) {
    return (
      <main className="min-h-screen bg-[#040405] pt-32 pb-20 px-4 flex items-center justify-center text-white">
        <div className="rounded-3xl border border-red-500/20 bg-[#0d0d10] p-8 text-center max-w-md space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Administrative privileges required to register members directly from the staff portal. Please sign in with an authorized account.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white text-xs font-bold shadow-lg text-center transition-all"
            >
              Sign In to Admin Portal
            </Link>
            <Link
              href="/profile"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold text-center transition-colors"
            >
              Back to Member Portal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page-container">
      <div className="admin-page-inner">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin" className="admin-back-btn">
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/scanner" className="admin-pill-link">
              <ScanLine size={15} />
              <span>Scanner Terminal</span>
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#c2f83a] animate-pulse" />
            <p className="admin-eyebrow">MEMBER ENROLLMENT · ONBOARDING</p>
          </div>
          <h1 className="admin-title">Create Member Pass</h1>
          <p className="admin-subtitle">
            Generate an official encrypted digital card with instantaneous QR verification and entrance privileges.
          </p>
        </header>

        {/* Result alert + Card Presentation */}
        {success && (
          <div className="mb-10 animate-rise-in">
            <div className="registration-success-banner">
              <div className="flex items-center gap-3">
                <div className="success-icon-wrap">
                  <Check size={20} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Member Registered Successfully</h4>
                  <p className="text-sm text-[#9eaaa5]">
                    {success.fullName} &bull; <span className="text-[#c2f83a] font-mono font-bold">{success.memberId}</span> &bull; Valid until {success.membershipEndDate}
                  </p>
                </div>
              </div>
            </div>
            <MemberCard member={success} />
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200 backdrop-blur-md flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <p>{error}</p>
          </div>
        )}

        {/* Clean Modern Form */}
        <form
          className="admin-form-card"
          onSubmit={submit}
        >
          <div className="admin-form-header">
            <div className="flex items-center gap-3">
              <div className="admin-form-icon">
                <UserPlus size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Member Credentials</h3>
                <p className="text-xs text-[#8f9b96]">Fill required details to produce their entrance token.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#c2f83a]/10 text-[#c2f83a] border border-[#c2f83a]/20">
              Auto-Calculated Validity
            </span>
          </div>

          <div className="admin-form-grid">
            <label className="field-group md:col-span-2">
              <span className="field-label">Full Name <span className="text-[#c2f83a]">*</span></span>
              <input
                className="modern-input"
                name="fullName"
                required
                minLength={2}
                autoComplete="name"
                placeholder="e.g. John Kamau"
              />
            </label>

            <label className="field-group">
              <span className="field-label">Phone Number (09... format) <span className="text-[#c2f83a]">*</span></span>
              <input
                className="modern-input"
                name="phone"
                required
                minLength={9}
                autoComplete="tel"
                inputMode="tel"
                placeholder="0911 234 567"
              />
            </label>

            <label className="field-group">
              <span className="field-label">Gender</span>
              <select className="modern-select" name="gender" defaultValue="PREFER_NOT_TO_SAY">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </label>

            <div className="field-group">
              <span className="field-label">Membership Tier</span>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  className={`plan-toggle-btn ${duration === "1" ? "is-active" : ""}`}
                  onClick={() => setDuration("1")}
                >
                  <span className="plan-name">1 Month</span>
                  <span className="plan-desc">Standard Monthly</span>
                </button>
                <button
                  type="button"
                  className={`plan-toggle-btn ${duration === "3" ? "is-active" : ""}`}
                  onClick={() => setDuration("3")}
                >
                  <span className="plan-name">3 Months</span>
                  <span className="plan-desc">Quarterly Tier</span>
                </button>
              </div>
            </div>

            <label className="field-group">
              <span className="field-label">Start Date <span className="text-[#c2f83a]">*</span></span>
              <input
                className="modern-input"
                name="membershipStartDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </label>

            <div className="field-group md:col-span-2 validity-preview">
              <div className="flex items-center justify-between">
                <div>
                  <span className="field-label">Expiration Date</span>
                  <p className="text-xl font-bold text-[#c2f83a] font-mono mt-0.5">
                    {endDate || "Select start date"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#8f9b96]">Card Access Status</span>
                  <p className="text-sm font-semibold text-emerald-400 flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Instant Entry Enabled
                  </p>
                </div>
              </div>
              <input name="membershipEndDate" type="hidden" value={endDate} />
            </div>
          </div>

          <button
            className="submit-member-btn"
            disabled={loading || !endDate}
            type="submit"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>PROCESSING PASS...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CreditCard size={18} />
                <span>GENERATE OFFICIAL MEMBER CARD</span>
              </span>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

