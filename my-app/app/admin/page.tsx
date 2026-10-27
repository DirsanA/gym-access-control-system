"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Dumbbell,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { AdminMemberManager } from "@/components/admin-member-manager";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "cash" | "scans">("overview");

  // Turnstile Scan Logs state & pagination
  const [scans, setScans] = useState<any[]>([]);
  const [scanPage, setScanPage] = useState(1);
  const [scanTotalPages, setScanTotalPages] = useState(1);
  const [scanTotal, setScanTotal] = useState(0);
  const [scansLoading, setScansLoading] = useState(false);
  const [scanFilter, setScanFilter] = useState("ALL");
  const [scanSearch, setScanSearch] = useState("");

  // Cash recording modal state
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [cashNotice, setCashNotice] = useState("");

  async function loadScans(page = scanPage, filter = scanFilter, search = scanSearch) {
    setScansLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
      });
      if (filter && filter !== "ALL") params.set("result", filter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/check-ins?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setScans(data.scans || []);
        if (data.pagination) {
          setScanTotal(data.pagination.total);
          setScanTotalPages(data.pagination.totalPages);
        }
      }
    } catch {
      // fallback
    } finally {
      setScansLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "scans") {
      const timer = setTimeout(() => {
        void loadScans(scanPage, scanFilter, scanSearch);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, scanPage, scanFilter, scanSearch]);

  async function checkAdminAndLoadStats() {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated || meData.user?.role !== "admin") {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      // Load stats
      const statsRes = await fetch("/api/admin/stats");
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.success) {
        setStats(statsData);
      }

      // Load members & plans for cash payment recording (unpaginated list)
      const membersRes = await fetch("/api/members?all=true");
      const membersData = await membersRes.json();
      if (membersData.members) setMembersList(membersData.members);

      const plansRes = await fetch("/api/plans");
      const plansData = await plansRes.json();
      if (plansData.plans) setPlansList(plansData.plans);
    } catch {
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkAdminAndLoadStats();
  }, []);

  async function handleRecordCash(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !selectedPlanId) {
      alert("Please select both a customer and a membership plan.");
      return;
    }
    setCashSubmitting(true);
    setCashNotice("");

    try {
      const res = await fetch("/api/admin/payments/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          planId: selectedPlanId,
          amountETB: Number(cashAmount) || undefined,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCashNotice("Cash payment recorded! Membership pass activated.");
        setSelectedUserId("");
        setSelectedPlanId("");
        setCashAmount("");
        setAdminNotes("");
        await checkAdminAndLoadStats();
      } else {
        alert(data.message || "Failed to record cash payment.");
      }
    } catch {
      alert("Error processing cash recording.");
    } finally {
      setCashSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#040405] pt-32 pb-20 px-4 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={32} className="animate-spin text-[#ff331e]" />
          <p className="text-sm font-semibold text-gray-400">Verifying administrative credentials...</p>
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
            Administrative privileges required. Please sign in with an authorized manager account.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 rounded-full bg-[#ff331e] text-white text-xs font-bold shadow-lg"
            >
              Sign In to Admin Console
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#040405] pt-20 sm:pt-24 pb-20 px-3 sm:px-6 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-[#ff331e] animate-pulse" />
              <span className="text-xs font-mono font-bold text-[#ff4733]">OPERATIONS CONSOLE &bull; ADDIS ABABA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Elite Fitness Administration</h1>
            <p className="text-xs text-gray-400 mt-1">
              Manage member records, record cash revenues, audit turnstile scanner logs, and oversee passes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCashModalOpen(true)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-400 transition-all flex items-center gap-1.5"
            >
              <Banknote size={15} />
              <span>Record Cash Payment</span>
            </button>
            <Link
              href="/scanner"
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5"
            >
              <ScanLine size={15} />
              <span>Scanner Terminal</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5"
            >
              <LogOut size={15} />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-[#ff331e] text-white shadow-[0_2px_12px_rgba(255,51,30,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Overview & Revenue
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "members"
                ? "bg-[#ff331e] text-white shadow-[0_2px_12px_rgba(255,51,30,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Member Directory & Passes
          </button>
          <button
            onClick={() => setActiveTab("scans")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "scans"
                ? "bg-[#ff331e] text-white shadow-[0_2px_12px_rgba(255,51,30,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Turnstile Scan Logs
          </button>
        </div>

        {/* TAB 1: OVERVIEW & REVENUE */}
        {activeTab === "overview" && stats && (
          <div className="space-y-8">
            {/* Metric Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-[#0d0d10] border border-white/10 space-y-2">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>TOTAL REVENUE</span>
                  <TrendingUp size={16} className="text-[#ff331e]" />
                </div>
                <div className="text-2xl font-black text-white">
                  {stats.stats?.totalRevenueETB?.toLocaleString()} <span className="text-xs font-normal text-gray-400">ETB</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  Cash: {stats.stats?.cashRevenueETB?.toLocaleString()} ETB &bull; Chapa: {stats.stats?.onlineRevenueETB?.toLocaleString()} ETB
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d0d10] border border-white/10 space-y-2">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>ACTIVE PASSES</span>
                  <UsersRound size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {stats.stats?.activeSubscriptions}
                </div>
                <div className="text-[11px] text-emerald-400">Members with turnstile access</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d0d10] border border-white/10 space-y-2">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>REGISTERED USERS</span>
                  <UserCheck size={16} className="text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {stats.stats?.totalMembers}
                </div>
                <div className="text-[11px] text-gray-400">{stats.stats?.verifiedMembers} Verified via Brevo OTP</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d0d10] border border-white/10 space-y-2">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>EXPIRING SOON</span>
                  <Clock size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {stats.expiringSoon?.length || 0}
                </div>
                <div className="text-[11px] text-amber-400">Passes expiring in 7 days</div>
              </div>
            </div>

            {/* Recent Payments & Expiring Members Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Payments */}
              <div className="p-6 rounded-3xl bg-[#0d0d10] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard size={18} className="text-[#ff331e]" />
                    <span>Recent Transactions & Payments</span>
                  </h3>
                  <span className="text-[10px] text-gray-400">ETB CURRENCY</span>
                </div>

                {stats.recentPayments && stats.recentPayments.length > 0 ? (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2">
                    {stats.recentPayments.map((p: any) => (
                      <div key={p._id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">
                            {p.userId?.fullName || p.userId?.username || "Direct Enrollment"}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{p.txRef}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-white">{p.amountETB?.toLocaleString()} ETB</div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {p.provider} &bull; {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-6 text-center">No payment history recorded yet.</p>
                )}
              </div>

              {/* Expiring Soon */}
              <div className="p-6 rounded-3xl bg-[#0d0d10] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock size={18} className="text-amber-400" />
                    <span>Memberships Nearing Expiry</span>
                  </h3>
                  <span className="text-[10px] text-amber-400 font-mono">&le; 7 DAYS</span>
                </div>

                {stats.expiringSoon && stats.expiringSoon.length > 0 ? (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2">
                    {stats.expiringSoon.map((sub: any) => (
                      <div key={sub._id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{sub.userId?.fullName || "Member"}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{sub.userId?.memberId} &bull; {sub.userId?.phone}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400">Expires</div>
                          <div className="font-mono text-amber-400 font-bold">
                            {new Date(sub.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-6 text-center">No memberships expiring within the next 7 days.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBER DIRECTORY & PASSES */}
        {activeTab === "members" && (
          <div>
            <AdminMemberManager />
          </div>
        )}

        {/* TAB 3: TURNSTILE SCAN LOGS */}
        {activeTab === "scans" && (
          <div className="p-6 rounded-3xl bg-[#0d0d10] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ScanLine size={20} className="text-[#ff331e]" />
                  <span>Turnstile Entrance Scan Logs & Attendance</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">Real-time gate check-ins with server-side indexing & pagination</p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={scanSearch}
                    onChange={(e) => {
                      setScanSearch(e.target.value);
                      setScanPage(1);
                    }}
                    placeholder="Search Member ID / log..."
                    className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff331e] w-48"
                  />
                  {scanSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setScanSearch("");
                        setScanPage(1);
                      }}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
                  {(["ALL", "SUCCESS", "EXPIRED", "NOT_FOUND"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setScanFilter(status);
                        setScanPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                        scanFilter === status
                          ? "bg-[#ff331e] text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {scansLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-xs">
                <RefreshCw size={18} className="animate-spin text-[#ff331e] mr-2" />
                <span>Querying indexed scan records...</span>
              </div>
            ) : scans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-gray-400 font-mono">
                    <tr>
                      <th className="py-3 px-4">TIMESTAMP</th>
                      <th className="py-3 px-4">MEMBER ID</th>
                      <th className="py-3 px-4">SCANNER</th>
                      <th className="py-3 px-4">RESULT</th>
                      <th className="py-3 px-4">AUDIT MESSAGE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {scans.map((scan: any) => (
                      <tr key={scan._id} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {new Date(scan.scannedAt).toLocaleTimeString()} &bull; {new Date(scan.scannedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{scan.memberId}</td>
                        <td className="py-3 px-4 font-mono text-gray-400">{scan.scannerId || "TERMINAL-01"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              scan.result === "SUCCESS"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {scan.result}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{scan.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-8 text-center">
                {scanSearch || scanFilter !== "ALL"
                  ? "No turnstile scans match the selected filter."
                  : "No turnstile scans recorded yet."}
              </p>
            )}

            {/* Pagination Controls for Scans */}
            {!scansLoading && scanTotal > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-gray-400">
                <span>
                  Showing <strong>{Math.min((scanPage - 1) * 12 + 1, scanTotal)}</strong> to{" "}
                  <strong>{Math.min(scanPage * 12, scanTotal)}</strong> of{" "}
                  <strong>{scanTotal}</strong> scans
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={scanPage <= 1}
                    onClick={() => setScanPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                    aria-label="Previous scan page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-mono text-gray-300">
                    Page {scanPage} of {scanTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={scanPage >= scanTotalPages}
                    onClick={() => setScanPage((p) => Math.min(scanTotalPages, p + 1))}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                    aria-label="Next scan page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASH RECORDING MODAL */}
        {cashModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#121216] p-5 sm:p-7 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Banknote size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Record Cash Payment</h3>
                </div>
                <button onClick={() => setCashModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {cashNotice && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs">
                  {cashNotice}
                </div>
              )}

              <form onSubmit={handleRecordCash} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Select Customer *</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="" className="bg-[#121216]">-- Choose Member --</option>
                    {membersList.map((m: any) => (
                      <option key={m.userId || m.memberId} value={m.userId || m.memberId} className="bg-[#121216]">
                        {m.fullName} ({m.memberId || m.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">Select Membership Plan *</label>
                  <select
                    required
                    value={selectedPlanId}
                    onChange={(e) => {
                      setSelectedPlanId(e.target.value);
                      const p = plansList.find((item) => item._id === e.target.value);
                      if (p) setCashAmount(p.priceETB.toString());
                    }}
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="" className="bg-[#121216]">-- Choose Plan --</option>
                    {plansList.map((p: any) => (
                      <option key={p._id} value={p._id} className="bg-[#121216]">
                        {p.name} ({p.priceETB.toLocaleString()} ETB)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">Amount Received (ETB) *</label>
                  <input
                    type="number"
                    required
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">Audit Notes / Receipt Ref</label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Paid cash at front desk"
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-3 text-xs text-white"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCashModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={cashSubmitting}
                    className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-all disabled:opacity-50"
                  >
                    {cashSubmitting ? "Activating..." : "Confirm & Activate Pass"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
