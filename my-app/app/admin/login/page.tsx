"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  useEffect(() => router.replace("/admin/members/new"), [router]);

  return (
    <main className="min-h-screen bg-[#07100f] px-5 py-12 text-[#f6fbf7]">
      <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#10201c] p-8 shadow-2xl">
        <p className="text-xs font-black tracking-[.2em] text-[#bdfc42]">NEXUS ATHLETIC CLUB</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Opening admin tools</h1>
        <p className="mt-2 text-sm text-[#9eaaa5]">The mock deployment does not need a separate backend or administrator account.</p>
        <Link className="mt-6 block text-center text-xs font-bold text-[#bdfc42]" href="/admin/members/new">CONTINUE TO ADMIN</Link>
      </section>
    </main>
  );
}
