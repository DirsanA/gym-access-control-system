"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#040405] flex items-center justify-center text-white">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#ff331e] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-gray-400">Redirecting to Secure Authentication...</p>
      </div>
    </main>
  );
}
