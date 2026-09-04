"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, CreditCard, Filter, Plus, RefreshCw, Search, Trash2, UsersRound, X } from "lucide-react";
import { MemberCard } from "@/components/member-card";
import type { ScannerMember } from "@/types/scanner";

type Member = ScannerMember & { phone: string; gender?: string; isActive: boolean; createdAt: string };
type ListResponse = { success: boolean; members?: Member[]; message?: string };
type FilterStatus = "ALL" | "ACTIVE" | "EXPIRED";

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
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState<"1" | "3">("1");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadMembers() {
    setLoading(true);
    try {
      const response = await fetch("/api/members", { cache: "no-store" });
      const data = await response.json().catch(() => null) as ListResponse | null;
      if (!response.ok || !data?.members) throw new Error(data?.message ?? "Unable to load members.");
      setMembers(data.members);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load members."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadMembers(); }, []);
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesSearch = !search || `${member.fullName} ${member.memberId} ${member.phone}`.toLowerCase().includes(search);
      const matchesStatus = filterStatus === "ALL" || status(member) === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [members, query, filterStatus]);
  const endDate = useMemo(() => endDateFor(startDate, duration), [startDate, duration]);

  const activeCount = useMemo(() => members.filter((m) => status(m) === "ACTIVE").length, [members]);
  const expiredCount = useMemo(() => members.filter((m) => status(m) === "EXPIRED").length, [members]);

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renewing) return;
    setActionLoading(true);
    const renewalDays = Number(days);
    try {
      const response = await fetch(`/api/members/${encodeURIComponent(renewing.memberId)}/renew`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days: renewalDays }) });
      const data = await response.json().catch(() => null) as { success?: boolean; member?: Member; message?: string } | null;
      if (!response.ok || !data?.member) { setNotice(data?.message ?? "Unable to renew membership."); return; }
      setMembers((current) => current.map((member) => member.memberId === data.member?.memberId ? data.member : member));
      setRenewing(null); setNotice(`${data.member.fullName} renewed for ${renewalDays} days. Card is still valid.`);
    } catch { setNotice("Network error. Please try again."); }
    finally { setActionLoading(false); }
  }

  async function removeMember() {
    if (!deleting) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/members/${encodeURIComponent(deleting.memberId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;
      if (!response.ok) { setNotice(data?.message ?? "Unable to delete member."); return; }
      setMembers((current) => current.filter((m) => m.memberId !== deleting.memberId));
      setDeleting(null); setNotice(`${deleting.fullName} has been removed.`);
    } catch { setNotice("Network error. Please try again."); }
    finally { setActionLoading(false); }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: form.get("fullName"), phone: form.get("phone"), gender: form.get("gender"),
      membershipStartDate: startDate, membershipEndDate: endDate,
      membershipPlan: duration === "3" ? "3 Month Membership" : "1 Month Membership",
    };
    try {
      const response = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => null) as { success?: boolean; member?: Member; message?: string } | null;
      if (!response.ok || !data?.member) { setNotice(data?.message ?? "Unable to register this member."); return; }
      window.localStorage.setItem(`gym-mock-member:${data.member.memberId}`, JSON.stringify(data.member));
      setMembers((current) => [data.member!, ...current]);
      setAdding(false); setStartDate(""); setDuration("1"); setSelected(data.member);
      setNotice(`${data.member.fullName} registered. Their QR card is ready.`);
    } catch { setNotice("Network error. Please try again."); }
    finally { setActionLoading(false); }
  }

  return (
    <main className="admin-console">
      <section className="admin-console__hero"><div><p className="admin-eyebrow">MEMBER OPERATIONS</p><h1>Member <em>console.</em></h1><p>Find any record, renew access by days, reissue a member&apos;s QR card, or add a new member without leaving this page.</p></div><div className="admin-console__hero-actions"><button className="admin-add-member" type="button" onClick={() => setAdding(true)}><Plus size={17} /> ADD NEW MEMBER</button><div className="admin-console__stats"><span><UsersRound /> {members.length}<small>MEMBERS</small></span><span><CreditCard /> {activeCount}<small>ACTIVE</small></span><span style={{ color: expiredCount > 0 ? "var(--orange)" : undefined }}><CreditCard /> {expiredCount}<small>EXPIRED</small></span></div></div></section>
      {notice && <button className="admin-notice" type="button" onClick={() => setNotice("")}>{notice}<X size={15} /></button>}
      <section className="admin-directory"><header><div><h2>All members</h2><p>Search by name, phone, or membership ID. Filter by status.</p></div><div className="admin-directory__controls"><label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a member" /></label><div className="admin-filter"><Filter size={14} />{(["ALL", "ACTIVE", "EXPIRED"] as FilterStatus[]).map((s) => <button key={s} type="button" className={`admin-filter__btn${filterStatus === s ? " admin-filter__btn--active" : ""}`} onClick={() => setFilterStatus(s)}>{s}</button>)}</div></div></header>{loading ? <p className="admin-loading">Loading member records…</p> : <div className="admin-members">{visible.map((member) => <article key={member.memberId} className="admin-member"><div className="admin-member__identity"><div>{member.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><span><b>{member.fullName}</b><small>{member.memberId} · {member.phone}</small></span></div><span className={`admin-status admin-status--${status(member).toLowerCase()}`}>{status(member)}</span><span className="admin-member__end">ENDS <b>{member.membershipEndDate}</b></span><div className="admin-member__actions"><button type="button" onClick={() => setSelected(member)}><CreditCard size={15} /> CARD</button><button type="button" onClick={() => { setRenewing(member); setDays("30"); }}><CalendarPlus size={15} /> RENEW</button><button type="button" className="admin-member__delete" onClick={() => setDeleting(member)}><Trash2 size={15} /> DELETE</button></div></article>)}{visible.length === 0 && <p className="admin-loading">{members.length === 0 ? "No members registered yet." : "No members match that search."}</p>}</div>}</section>
      {selected && <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Reissue membership card"><button className="admin-modal__backdrop" onClick={() => setSelected(null)} aria-label="Close card" /><div className="admin-modal__panel"><button className="admin-modal__close" onClick={() => setSelected(null)} aria-label="Close"><X /></button><p className="admin-eyebrow">REISSUE MEMBER CARD</p><MemberCard member={selected} /></div></div>}
      {renewing && <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Renew membership"><button className="admin-modal__backdrop" onClick={() => { if (!actionLoading) setRenewing(null); }} aria-label="Close renewal" /><form className="admin-renewal" onSubmit={renew}><button className="admin-modal__close" type="button" onClick={() => { if (!actionLoading) setRenewing(null); }} aria-label="Close"><X /></button><p className="admin-eyebrow">RENEW MEMBERSHIP</p><h2>{renewing.fullName}</h2><p>Current access ends <strong>{renewing.membershipEndDate}</strong>. Add the number of renewal days below.</p><label>Renewal days<input type="number" min="1" max="730" value={days} onChange={(event) => setDays(event.target.value)} required autoFocus disabled={actionLoading} /></label><button type="submit" disabled={actionLoading}>{actionLoading ? "RENEWING…" : <><RefreshCw size={16} /> ADD RENEWAL DAYS</>}</button></form></div>}
      {deleting && <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Delete member"><button className="admin-modal__backdrop" onClick={() => { if (!actionLoading) setDeleting(null); }} aria-label="Close delete" /><div className="admin-confirm"><button className="admin-modal__close" type="button" onClick={() => { if (!actionLoading) setDeleting(null); }} aria-label="Close"><X /></button><p className="admin-eyebrow">DELETE MEMBER</p><h2>Remove {deleting.fullName}?</h2><p>This will permanently remove <strong>{deleting.memberId}</strong> from the system. This action cannot be undone.</p><div className="admin-confirm__actions"><button type="button" className="admin-confirm__cancel" onClick={() => setDeleting(null)} disabled={actionLoading}>CANCEL</button><button type="button" className="admin-confirm__danger" onClick={removeMember} disabled={actionLoading}><Trash2 size={15} /> {actionLoading ? "DELETING…" : "DELETE MEMBER"}</button></div></div></div>}
      {adding && <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Add new member"><button className="admin-modal__backdrop" onClick={() => { if (!actionLoading) setAdding(false); }} aria-label="Close registration" /><form className="admin-registration" onSubmit={addMember}><button className="admin-modal__close" type="button" onClick={() => { if (!actionLoading) setAdding(false); }} aria-label="Close"><X /></button><p className="admin-eyebrow">NEW MEMBER REGISTRATION</p><h2>Add a member. <em>Create their card.</em></h2><p>Only the details your staff need at the front desk.</p><div className="admin-registration__grid"><label>FULL NAME<input name="fullName" minLength={2} placeholder="Member's full name" required autoFocus disabled={actionLoading} /></label><label>PHONE NUMBER<input name="phone" minLength={5} inputMode="tel" placeholder="+254 700 000 000" required disabled={actionLoading} /></label><label>GENDER<select name="gender" defaultValue="PREFER_NOT_TO_SAY" disabled={actionLoading}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label><label>MEMBERSHIP PERIOD<select value={duration} onChange={(event) => setDuration(event.target.value as "1" | "3")} disabled={actionLoading}><option value="1">1 month</option><option value="3">3 months</option></select></label><label>START DATE<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required disabled={actionLoading} /></label><label>END DATE <small>AUTOMATIC</small><input type="date" value={endDate} readOnly required /></label></div><button type="submit" disabled={!endDate || actionLoading}>{actionLoading ? "REGISTERING…" : <><CreditCard size={16} /> REGISTER & CREATE CARD</>}</button></form></div>}
    </main>
  );
}
