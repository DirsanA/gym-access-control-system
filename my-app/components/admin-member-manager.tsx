"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  UserX,
  UsersRound,
  X,
} from "lucide-react";
import { MemberCard } from "@/components/member-card";
import type { ScannerMember } from "@/types/scanner";

type Member = ScannerMember & { phone: string; gender?: string; isActive: boolean; createdAt: string };
type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
type GlobalCounts = {
  total: number;
  active: number;
  expired: number;
};
type ListResponse = {
  success: boolean;
  members?: Member[];
  pagination?: PaginationMeta;
  counts?: GlobalCounts;
  message?: string;
};
type FilterStatus = "ALL" | "ACTIVE" | "EXPIRED";

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function status(member: Member) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  return member.isActive && member.membershipEndDate >= today ? "ACTIVE" : "EXPIRED";
}

function endDateFor(startDate: string, months: "1" | "3"): string {
  if (!startDate) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  const targetMonth = month - 1 + Number(months);
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay)));
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

export function AdminMemberManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [selected, setSelected] = useState<Member | null>(null);
  const [renewing, setRenewing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [days, setDays] = useState("30");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState<"1" | "3">("1");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Server-side pagination & global database counts
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [counts, setCounts] = useState<GlobalCounts>({
    total: 0,
    active: 0,
    expired: 0,
  });

  async function loadMembers(currentPage = page, currentFilter = filterStatus, searchQuery = query, currentLimit = limit) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: currentLimit.toString(),
        status: currentFilter,
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      const response = await fetch(`/api/members?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as ListResponse | null;
      if (!response.ok || !data?.members) throw new Error(data?.message ?? "Unable to load members.");
      setMembers(data.members);
      if (data.pagination) setPagination(data.pagination);
      if (data.counts) setCounts(data.counts);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load members.");
    } finally {
      setLoading(false);
    }
  }

  // Debounced indexed query on search/filter/page/limit changes
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadMembers(page, filterStatus, query, limit);
    }, 250);
    return () => clearTimeout(timer);
  }, [page, filterStatus, query, limit]);

  const endDate = useMemo(() => endDateFor(startDate, duration), [startDate, duration]);

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renewing) return;
    setActionLoading(true);
    const renewalDays = Number(days);
    try {
      const response = await fetch(`/api/members/${encodeURIComponent(renewing.memberId)}/renew`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: renewalDays }),
      });
      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        member?: Member;
        message?: string;
      } | null;
      if (!response.ok || !data?.member) {
        setNotice(data?.message ?? "Unable to renew membership.");
        return;
      }
      setMembers((current) =>
        current.map((member) => (member.memberId === data.member?.memberId ? data.member : member))
      );
      setRenewing(null);
      setNotice(`${data.member.fullName} extended by ${renewalDays} days. Pass is immediately active.`);
      void loadMembers(page, filterStatus, query, limit);
    } catch {
      setNotice("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function removeMember() {
    if (!deleting) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/members/${encodeURIComponent(deleting.memberId)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!response.ok) {
        setNotice(data?.message ?? "Unable to delete member.");
        return;
      }
      setMembers((current) => current.filter((m) => m.memberId !== deleting.memberId));
      setDeleting(null);
      setNotice(`${deleting.fullName} has been removed.`);
      void loadMembers(page, filterStatus, query, limit);
    } catch {
      setNotice("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
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
      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        member?: Member;
        message?: string;
      } | null;
      if (!response.ok || !data?.member) {
        setNotice(data?.message ?? "Unable to register this member.");
        return;
      }
      setAdding(false);
      setStartDate(new Date().toISOString().slice(0, 10));
      setDuration("1");
      setSelected(data.member);
      setNotice(`${data.member.fullName} registered. Digital card generated.`);
      setPage(1);
      void loadMembers(1, filterStatus, query, limit);
    } catch {
      setNotice("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-console-wrapper w-full">
      {/* Top Hero / Metrics Header */}
      <section className="admin-console__hero">
        <div className="admin-console__hero-info">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-[#ff331e] animate-pulse" />
            <p className="admin-eyebrow">OPERATIONS CONTROL · ADDIS ABABA HUB, ETHIOPIA</p>
          </div>
          <h1>
            Member <em>Console</em>
          </h1>
          <p>
            Manage active memberships, extend access validity, issue cryptographic passes, and oversee real-time turnstile privileges.
          </p>
        </div>

        <div className="admin-console__hero-actions">
          <button className="admin-add-member" type="button" onClick={() => setAdding(true)}>
            <Plus size={16} />
            <span>ENROLL NEW MEMBER</span>
          </button>

          <div className="admin-console__stats">
            <div className="stat-card">
              <div className="stat-card__icon text-slate-400">
                <UsersRound size={18} />
              </div>
              <div className="stat-card__data">
                <b>{counts.total}</b>
                <small>TOTAL MEMBERS</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon text-[#c2f83a]">
                <UserCheck size={18} />
              </div>
              <div className="stat-card__data">
                <b className="text-[#c2f83a]">{counts.active}</b>
                <small>ACTIVE PASSES</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon text-[#ff8c42]">
                <UserX size={18} />
              </div>
              <div className="stat-card__data">
                <b className={counts.expired > 0 ? "text-[#ff8c42]" : ""}>{counts.expired}</b>
                <small>EXPIRED</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Flash Notice */}
      {notice && (
        <div className="admin-notice animate-rise-in">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-[#c2f83a]" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Directory & Controls */}
      <section className="admin-directory">
        <header className="admin-directory__header">
          <div>
            <h2>Member Directory</h2>
            <p>Real-time membership database and access records.</p>
          </div>

          <div className="admin-directory__controls">
            <label className="admin-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, ID or phone..."
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <div className="admin-filter">
              {(["ALL", "ACTIVE", "EXPIRED"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`admin-filter__btn ${filterStatus === s ? "admin-filter__btn--active" : ""}`}
                  onClick={() => {
                    setFilterStatus(s);
                    setPage(1);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="admin-loading">
            <span className="h-5 w-5 border-2 border-[#c2f83a] border-t-transparent rounded-full animate-spin inline-block mr-3" />
            <span>Retrieving member records...</span>
          </div>
        ) : (
          <div className="admin-members">
            {members.map((member) => {
              const currentStatus = status(member);
              const isActive = currentStatus === "ACTIVE";
              return (
                <article key={member.memberId} className="admin-member">
                  <div className="admin-member__identity">
                    <div className="admin-member__avatar overflow-hidden">
                      {member.profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.profileImage} alt={member.fullName} className="w-full h-full object-cover" />
                      ) : (
                        member.fullName
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                      )}
                    </div>
                    <div className="admin-member__info">
                      <b>{member.fullName}</b>
                      <small>
                        <span className="text-[#c2f83a] font-mono">{member.memberId}</span> &bull; {member.phone}
                      </small>
                    </div>
                  </div>

                  <span
                    className={`admin-status ${
                      isActive ? "admin-status--active" : "admin-status--expired"
                    }`}
                  >
                    <span className="admin-status__dot" />
                    {currentStatus}
                  </span>

                  <span className="admin-member__end">
                    <span className="text-[11px] text-[#7d8b85]">EXPIRES</span>
                    <b>{member.membershipEndDate}</b>
                  </span>

                  <div className="admin-member__actions">
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--card"
                      onClick={() => setSelected(member)}
                    >
                      <CreditCard size={14} />
                      <span>PASS</span>
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--renew"
                      onClick={() => {
                        setRenewing(member);
                        setDays("30");
                      }}
                    >
                      <CalendarPlus size={14} />
                      <span>EXTEND</span>
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--delete"
                      onClick={() => setDeleting(member)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}

            {members.length === 0 && (
              <div className="admin-loading text-center py-16">
                <p className="text-base text-gray-400">
                  {query || filterStatus !== "ALL" ? "No members match that filter query." : "No members registered yet."}
                </p>
                {members.length === 0 && !query && filterStatus === "ALL" && (
                  <button
                    onClick={() => setAdding(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#c2f83a] text-[#081310] font-bold text-xs"
                  >
                    Add First Member
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {!loading && pagination.total > 0 && (
          <footer className="admin-directory__pagination">
            <div className="admin-pagination__info">
              <span>
                Showing <strong>{Math.min((page - 1) * limit + 1, pagination.total)}</strong> to{" "}
                <strong>{Math.min(page * limit, pagination.total)}</strong> of{" "}
                <strong>{pagination.total}</strong> members
              </span>

              <div className="admin-pagination__select-wrap">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="admin-pagination__select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="admin-pagination__nav">
              <button
                type="button"
                className="admin-pagination__btn"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers(page, pagination.totalPages).map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} className="admin-pagination__dots">
                    &bull;&bull;&bull;
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`admin-pagination__btn ${page === p ? "admin-pagination__btn--active" : ""}`}
                    onClick={() => setPage(Number(p))}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                className="admin-pagination__btn"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* Modal: View & Export Card */}
      {selected && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Reissue membership card">
          <button className="admin-modal__backdrop" onClick={() => setSelected(null)} aria-label="Close card" />
          <div className="admin-modal__panel">
            <button className="admin-modal__close" onClick={() => setSelected(null)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#c2f83a]" />
              <p className="admin-eyebrow">DIGITAL ACCESS PASS</p>
            </div>
            <MemberCard member={selected} />
          </div>
        </div>
      )}

      {/* Modal: Renew Membership */}
      {renewing && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Renew membership">
          <button
            className="admin-modal__backdrop"
            onClick={() => {
              if (!actionLoading) setRenewing(null);
            }}
            aria-label="Close renewal"
          />
          <form className="admin-renewal" onSubmit={renew}>
            <button
              className="admin-modal__close"
              type="button"
              onClick={() => {
                if (!actionLoading) setRenewing(null);
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <p className="admin-eyebrow">MEMBERSHIP EXTENSION</p>
            <h2>{renewing.fullName}</h2>
            <p className="text-sm text-[#9eaaa5] mt-1 mb-5">
              Current expiry date: <strong className="text-white font-mono">{renewing.membershipEndDate}</strong>. Select or type additional days to extend.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {["15", "30", "90"].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`px-3 py-2 text-xs font-bold rounded-xl border ${
                    days === d
                      ? "border-[#c2f83a] bg-[#c2f83a]/15 text-[#c2f83a]"
                      : "border-white/10 bg-white/5 text-gray-300"
                  }`}
                  onClick={() => setDays(d)}
                >
                  +{d} Days
                </button>
              ))}
            </div>

            <label className="field-group">
              <span className="field-label">Custom Days</span>
              <input
                className="modern-input"
                type="number"
                min="1"
                max="730"
                value={days}
                onChange={(event) => setDays(event.target.value)}
                required
                autoFocus
                disabled={actionLoading}
              />
            </label>

            <button type="submit" className="submit-member-btn mt-5" disabled={actionLoading}>
              {actionLoading ? (
                "EXTENDING ACCESS..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} />
                  <span>CONFIRM EXTENSION</span>
                </span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Modal: Delete Member */}
      {deleting && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Delete member">
          <button
            className="admin-modal__backdrop"
            onClick={() => {
              if (!actionLoading) setDeleting(null);
            }}
            aria-label="Close delete"
          />
          <div className="admin-confirm">
            <button
              className="admin-modal__close"
              type="button"
              onClick={() => {
                if (!actionLoading) setDeleting(null);
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <p className="admin-eyebrow text-red-400">REVOKE ENROLLMENT</p>
            <h2>Remove {deleting.fullName}?</h2>
            <p>
              This will permanently delete member ID <strong className="font-mono">{deleting.memberId}</strong> and invalidate their digital pass immediately at entrance checkpoints.
            </p>
            <div className="admin-confirm__actions">
              <button
                type="button"
                className="admin-confirm__cancel"
                onClick={() => setDeleting(null)}
                disabled={actionLoading}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="admin-confirm__danger"
                onClick={removeMember}
                disabled={actionLoading}
              >
                <Trash2 size={15} />
                <span>{actionLoading ? "REMOVING..." : "CONFIRM DELETE"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Fast Add Member in Dashboard */}
      {adding && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Add new member">
          <button
            className="admin-modal__backdrop"
            onClick={() => {
              if (!actionLoading) setAdding(false);
            }}
            aria-label="Close registration"
          />
          <form className="admin-registration" onSubmit={addMember}>
            <button
              className="admin-modal__close"
              type="button"
              onClick={() => {
                if (!actionLoading) setAdding(false);
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-[#c2f83a]" />
              <p className="admin-eyebrow">FAST ENROLLMENT</p>
            </div>
            <h2>New Member Registration</h2>
            <p>Issue an entrance pass immediately without leaving the operations console.</p>

            <div className="admin-registration__grid">
              <label className="field-group sm:col-span-2">
                <span className="field-label">FULL NAME</span>
                <input
                  className="modern-input"
                  name="fullName"
                  minLength={2}
                  placeholder="e.g. Samuel Odhiambo"
                  required
                  autoFocus
                  disabled={actionLoading}
                />
              </label>

              <label className="field-group">
                <span className="field-label">PHONE NUMBER (09... FORMAT)</span>
                <input
                  className="modern-input"
                  name="phone"
                  minLength={9}
                  inputMode="tel"
                  placeholder="0911 234 567"
                  required
                  disabled={actionLoading}
                />
              </label>

              <label className="field-group">
                <span className="field-label">GENDER</span>
                <select className="modern-select" name="gender" defaultValue="PREFER_NOT_TO_SAY" disabled={actionLoading}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </label>

              <label className="field-group">
                <span className="field-label">MEMBERSHIP PLAN</span>
                <select
                  className="modern-select"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value as "1" | "3")}
                  disabled={actionLoading}
                >
                  <option value="1">1 Month (Monthly)</option>
                  <option value="3">3 Months (Quarterly)</option>
                </select>
              </label>

              <label className="field-group">
                <span className="field-label">START DATE</span>
                <input
                  className="modern-input"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  disabled={actionLoading}
                />
              </label>

              <div className="field-group sm:col-span-2 validity-preview">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="field-label">Calculated Expiry Date</span>
                    <p className="text-xl font-bold text-[#c2f83a] font-mono mt-0.5">{endDate}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Active Immediately
                    </span>
                  </div>
                </div>
                <input name="membershipEndDate" type="hidden" value={endDate} />
              </div>
            </div>

            <button type="submit" className="submit-member-btn mt-6" disabled={!endDate || actionLoading}>
              {actionLoading ? (
                "CREATING MEMBER..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CreditCard size={17} />
                  <span>ENROLL & GENERATE DIGITAL CARD</span>
                </span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

