"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Check, CreditCard, QrCode, ScanLine, Sparkles, UserPlus } from "lucide-react";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<CreateMemberResponse["member"]>();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
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
      window.localStorage.setItem(`gym-mock-member:${data.member.memberId}`, JSON.stringify(data.member));
      event.currentTarget.reset();
      setStartDate(new Date().toISOString().slice(0, 10));
      setDuration("1");
    } catch {
      setError("The member server is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
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
              <span className="field-label">Phone Number <span className="text-[#c2f83a]">*</span></span>
              <input
                className="modern-input"
                name="phone"
                required
                minLength={5}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+254 700 000 000"
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

