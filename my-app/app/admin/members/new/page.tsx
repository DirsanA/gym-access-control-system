"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MemberCard } from "@/components/member-card";
import type { ScannerMember } from "@/types/scanner";

type CreateMemberResponse = { success: boolean; message?: string; member?: ScannerMember & { isActive?: boolean } };

export default function NewMemberPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<CreateMemberResponse["member"]>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setSuccess(undefined);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => null) as CreateMemberResponse | null;
      if (!response.ok || !data?.success || !data.member) { setError(data?.message ?? "Unable to register the member."); return; }
      setSuccess(data.member);
      window.localStorage.setItem(`gym-mock-member:${data.member.memberId}`, JSON.stringify(data.member));
      event.currentTarget.reset();
    } catch { setError("The member server is unavailable. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#07100f] px-5 py-10 text-[#f6fbf7]">
      <section className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.2em] text-[#bdfc42]">ADMIN MANAGEMENT · MOCK MODE</p><h1 className="mt-2 text-4xl font-black tracking-tight">Register new member</h1><p className="mt-2 text-sm text-[#9eaaa5]">A unique Gym ID and a printable verification card are created automatically.</p></div><Link className="rounded-xl border border-white/15 px-4 py-3 text-xs font-black tracking-wide text-[#bdfc42]" href="/scanner">SCANNER</Link></header>
        {success && <><div className="mb-6 rounded-2xl border border-[#bdfc42]/40 bg-[#bdfc42]/10 p-5"><p className="font-black text-[#bdfc42]">MEMBER REGISTERED — CARD READY</p><p className="mt-1 text-sm">{success.fullName} — <strong>{success.memberId}</strong></p></div><MemberCard member={success} /></>}
        {error && <p className="mb-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
        <form className="grid gap-5 rounded-3xl border border-white/10 bg-[#10201c] p-6 md:grid-cols-2" onSubmit={submit}>
          <label className="field">Full name<input name="fullName" required minLength={2} /></label>
          <label className="field">Phone number<input name="phone" required /></label>
          <label className="field">Email<input name="email" type="email" /></label>
          <label className="field">Gender<select name="gender" defaultValue="PREFER_NOT_TO_SAY"><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
          <label className="field">Date of birth<input name="dateOfBirth" type="date" /></label>
          <label className="field">Membership plan<input name="membershipPlan" placeholder="Premium" required minLength={2} /></label>
          <label className="field">Membership start date<input name="membershipStartDate" type="date" required /></label>
          <label className="field">Membership end date<input name="membershipEndDate" type="date" required /></label>
          <label className="field md:col-span-2">Profile image URL <span className="font-normal text-[#9eaaa5]">(optional)</span><input name="profileImage" type="url" placeholder="https://..." /></label>
          <button className="rounded-xl bg-[#bdfc42] px-5 py-4 text-sm font-black tracking-wide text-[#10200d] disabled:opacity-60 md:col-span-2" disabled={loading} type="submit">{loading ? "REGISTERING..." : "REGISTER & GENERATE CARD"}</button>
        </form>
      </section>
    </main>
  );
}
