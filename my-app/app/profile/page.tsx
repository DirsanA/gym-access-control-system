"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Dumbbell,
  ExternalLink,
  History,
  Lock,
  LogOut,
  Mail,
  Phone,
  QrCode,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { MemberCard } from "@/components/member-card";
import { PhotoIdUploader } from "@/components/profile/photo-id-uploader";

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Mandatory Photo ID Gate for Checkout
  const [photoGateOpen, setPhotoGateOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  async function loadProfile(retryCount = 0) {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.status === 401) {
        if (retryCount < 2) {
          await new Promise((r) => setTimeout(r, 600));
          return loadProfile(retryCount + 1);
        }
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Unable to load profile data.");
        return;
      }
      setData(json);
      setFullName(json.user?.fullName || "");
      setPhone(json.user?.phone || "");
    } catch {
      setError("Network error loading profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setEditing(false);
        await loadProfile();
      } else {
        alert(json.message || "Failed to update profile.");
      }
    } catch {
      alert("Error saving profile changes.");
    } finally {
      setSaveLoading(false);
    }
  }

  // Mandatory Photo Check before checkout (waived for administrators)
  function handleCheckout(planId: string) {
    if (data?.user?.role !== "admin" && !data?.user?.photoUrl) {
      setPendingPlanId(planId);
      setPhotoGateOpen(true);
      return;
    }
    void executeCheckout(planId);
  }

  async function executeCheckout(planId: string) {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/payments/chapa/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.checkoutUrl) {
        alert(json.message || "Failed to initiate payment gateway.");
        return;
      }
      // Redirect customer to Chapa checkout
      window.location.href = json.checkoutUrl;
    } catch {
      alert("Network error connecting to payment gateway.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePhotoSaved(newPhotoUrl: string) {
    setData((prev: any) => ({
      ...prev,
      user: { ...prev.user, photoUrl: newPhotoUrl },
      memberPassData: prev.memberPassData ? { ...prev.memberPassData, profileImage: newPhotoUrl } : null,
    }));

    // If checkout was waiting on photo, proceed automatically!
    if (pendingPlanId) {
      setPhotoGateOpen(false);
      const planToBuy = pendingPlanId;
      setPendingPlanId(null);
      void executeCheckout(planToBuy);
    }

    router.refresh();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050507] pt-32 pb-20 px-4 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={32} className="animate-spin text-[#ff331e]" />
          <p className="text-sm font-semibold text-gray-400">Loading your Elite Fitness portal...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#050507] pt-32 pb-20 px-4 flex items-center justify-center text-white">
        <div className="rounded-2xl border border-red-500/20 bg-[#121216] p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">{error || "Something went wrong"}</p>
          <Link href="/login" className="px-6 py-2.5 rounded-full bg-[#ff331e] text-white text-xs font-bold">
            Sign In Again
          </Link>
        </div>
      </main>
    );
  }

  const { user, hasActiveMembership, activeSubscription, memberPassData, allSubscriptions, payments, availablePlans } = data;
  const isAdmin = user?.role === "admin";

  return (
    <main className="min-h-screen bg-[#040405] pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full ${isAdmin ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
              <span className={`text-xs font-mono font-semibold ${isAdmin ? "text-amber-400" : "text-emerald-400"}`}>
                {isAdmin ? "ADMINISTRATOR OPERATIONS PORTAL" : "VERIFIED CUSTOMER PORTAL"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user.fullName || user.username}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {isAdmin ? (
                <span>
                  Role: <span className="font-mono text-amber-400 font-bold">SYSTEM ADMINISTRATOR</span> &bull; Full Turnstile & Console Access &bull; {user.email}
                </span>
              ) : (
                <span>
                  Member ID: <span className="font-mono text-white font-bold">{user.memberId || "Pending Membership"}</span> &bull; {user.email}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-400/20"
              >
                <Shield size={14} />
                <span>Admin Console</span>
                <ArrowRight size={14} />
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin Operational Banner */}
        {isAdmin && (
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#121216] to-[#0d0d10] border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="text-amber-400" size={20} />
                <span className="text-xs font-bold font-mono text-amber-400 tracking-wider">
                  ADMINISTRATOR PRIVILEGES ACTIVE
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">Full Operations & Turnstile Control</h2>
              <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                You are logged in with administrative privileges. You can manage members, record manual cash memberships, view real-time turnstile attendance logs, and oversee the Addis Ababa hub.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
              <Link
                href="/admin"
                className="px-6 py-3 rounded-full bg-[#c2f83a] hover:bg-[#b0e82c] text-[#081310] font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Shield size={14} />
                <span>Open Admin Console</span>
              </Link>
            </div>
          </div>
        )}

        {/* Member & Administrator Photo Identification Uploader */}
        <PhotoIdUploader
          currentPhotoUrl={user.photoUrl}
          memberName={user.fullName || user.username}
          onPhotoSaved={handlePhotoSaved}
          isOpen={photoGateOpen ? true : undefined}
          onOpenChange={(open) => {
            if (!open) {
              setPhotoGateOpen(false);
              setPendingPlanId(null);
            }
          }}
          requiredForCheckout={photoGateOpen}
        />

        {/* SECTION 2: Active Pass & Card Presentation */}
        {hasActiveMembership && memberPassData ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#ff331e]" />
                <h2 className="text-xl font-bold text-white">Your Digital Entrance Pass</h2>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                ACTIVE &bull; READY FOR ENTRANCE
              </span>
            </div>

            <div className="p-6 md:p-8 rounded-3xl border border-[#ff331e]/30 bg-gradient-to-b from-[#121216] to-[#0a0a0d] shadow-2xl relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8">
                  <MemberCard member={memberPassData} />
                </div>
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400">PLAN</div>
                    <div className="text-lg font-bold text-white">{activeSubscription.planName}</div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Valid Until</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {new Date(activeSubscription.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#ff331e]/10 border border-[#ff331e]/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#ff4733]">
                      <QrCode size={16} />
                      <span>TURNSTILE READY</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Hold this QR code directly against the camera scanner at the Elite Fitness Addis Ababa entrance turnstile for instant contactless admission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : isAdmin ? (
          <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-[#0d0d10] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Shield size={16} />
              <span className="font-mono">ADMINISTRATOR TURNSTILE CLEARANCE</span>
            </div>
            <h2 className="text-xl font-bold text-white">Staff Superuser Privileges Active</h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Staff accounts bypass customer turnstile subscriptions. To register new members, record manual cash receipts, or audit gate check-ins, access the{" "}
              <Link href="/admin" className="text-[#c2f83a] underline font-bold">
                Admin Console
              </Link>{" "}
              or launch the{" "}
              <Link href="/scanner" className="text-[#c2f83a] underline font-bold">
                Entrance Gate Scanner
              </Link>.
            </p>
          </div>
        ) : (
          <div className="p-8 rounded-3xl border border-white/10 bg-[#0d0d10] text-center max-w-2xl mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <CreditCard size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">No Active Membership</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Your email is verified! To unlock the turnstile scanner and receive your digital entrance pass, choose a membership plan below.
            </p>
          </div>
        )}

        {/* SECTION 3: Membership Plans & Chapa Checkout */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Available Membership Plans</h2>
            <p className="text-xs text-gray-400 mt-1">
              Select a plan to checkout instantly with Chapa in Ethiopian Birr (ETB).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map((plan: any) => (
              <div
                key={plan._id}
                className="p-6 rounded-3xl border border-white/10 bg-[#0d0d10] hover:border-[#ff331e]/40 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-[#ff4733] px-2.5 py-1 rounded-md bg-[#ff331e]/10">
                      {plan.durationDays} DAYS
                    </span>
                    <span className="text-xs font-semibold text-gray-400">ETB</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {plan.priceETB.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-gray-400">ETB</span>
                  </div>
                  <p className="mt-3 text-xs text-gray-400 leading-relaxed">{plan.description}</p>

                  <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
                    {plan.features?.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle2 size={14} className="text-[#ff331e] shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleCheckout(plan._id)}
                  disabled={checkoutLoading === plan._id}
                  className="w-full py-3 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-xs shadow-[0_4px_20px_rgba(255,51,30,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkoutLoading === plan._id ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Connecting Chapa...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Pay {plan.priceETB.toLocaleString()} ETB with Chapa</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: Account Info & Payment History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Info */}
          <div className="p-6 rounded-3xl border border-white/10 bg-[#0d0d10] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Personal Information</h3>
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-[#ff4733] font-semibold hover:underline"
              >
                {editing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2 px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Phone Number (09... format)</label>
                  <input
                    type="tel"
                    value={phone}
                    placeholder="0911 234 567"
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2 px-3 text-sm text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-full bg-[#ff331e] text-white text-xs font-bold"
                >
                  {saveLoading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            ) : (
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Username</span>
                  <span className="text-white font-medium">{user.username}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Phone</span>
                  <span className="text-white font-medium">{user.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Photo ID Status</span>
                  <span className={`font-semibold ${user.photoUrl ? "text-emerald-400" : "text-amber-400"}`}>
                    {user.photoUrl ? "✓ Verified Photo on File" : "⚠️ Missing (Required for Entry)"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Gender</span>
                  <span className="text-white font-medium">{user.gender || "Not specified"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="p-6 rounded-3xl border border-white/10 bg-[#0d0d10] space-y-4">
            <h3 className="text-lg font-bold text-white">Transaction & Payment History</h3>
            {payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div
                    key={p._id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {p.amountETB.toLocaleString()} ETB ({p.method})
                      </div>
                      <div className="text-gray-400 text-[11px] font-mono mt-0.5">
                        Ref: {p.chapaReference || p.txRef || p._id.slice(-8)}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        p.status === "SUCCESS"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">No payment records found yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
