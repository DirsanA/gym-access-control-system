"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Dumbbell, RefreshCw, XCircle } from "lucide-react";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const txRef = searchParams.get("tx_ref");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!txRef) {
      setLoading(false);
      setMessage("Transaction reference missing.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/payments/chapa/verify?tx_ref=${encodeURIComponent(txRef!)}`);
        const data = await res.json();
        if (res.ok && data.success && data.status === "COMPLETED") {
          setSuccess(true);
          setMessage("Payment verified! Your membership is active and your entrance pass is ready.");
        } else {
          setSuccess(false);
          setMessage(data.message || "Payment verification failed.");
        }
      } catch {
        setSuccess(false);
        setMessage("Unable to confirm payment with the server.");
      } finally {
        setLoading(false);
      }
    }

    void verify();
  }, [txRef]);

  return (
    <main className="min-h-screen bg-[#040405] pt-32 pb-20 px-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d10] p-8 text-center space-y-6">
        {loading ? (
          <div className="py-12 space-y-4">
            <RefreshCw size={36} className="animate-spin text-[#ff331e] mx-auto" />
            <h2 className="text-xl font-bold text-white">Verifying Transaction...</h2>
            <p className="text-xs text-gray-400">Communicating with Chapa payment gateway</p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Payment Confirmed!</h1>
            <p className="text-xs text-gray-300 leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link
                href="/profile"
                prefetch={false}
                className="w-full inline-block py-3 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-xs shadow-lg transition-all"
              >
                View Your Digital Entrance Pass (Get Ticket)
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
              <XCircle size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Payment Incomplete</h1>
            <p className="text-xs text-red-400 leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link
                href="/profile"
                className="w-full inline-block py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all"
              >
                Return to Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#040405] pt-32 pb-20 px-4 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={32} className="animate-spin text-[#ff331e]" />
            <p className="text-sm font-semibold text-gray-400">Loading payment status...</p>
          </div>
        </main>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}

