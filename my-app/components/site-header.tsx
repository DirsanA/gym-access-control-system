"use client";

import Link from "next/link";
import { ArrowUpRight, Dumbbell, LogOut, Menu, QrCode, Shield, User, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: "customer" | "admin";
  memberId?: string;
  photoUrl?: string;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const close = () => setOpen(false);

  // Check auth session
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.authenticated && json.user) {
            setCurrentUser(json.user);
          } else if (isMounted) {
            setCurrentUser(null);
          }
        } else if (isMounted) {
          setCurrentUser(null);
        }
      } catch {
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setAuthChecked(true);
      }
    }

    void checkAuth();

    const handlePhotoUpdated = (e: any) => {
      if (e?.detail?.photoUrl) {
        setCurrentUser((prev) => (prev ? { ...prev, photoUrl: e.detail.photoUrl } : prev));
      }
    };
    window.addEventListener("profile-photo-updated", handlePhotoUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("profile-photo-updated", handlePhotoUpdated);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      close();
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  }

  const displayName = currentUser?.fullName || currentUser?.username || "Athlete";
  const userInitials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="debug-nav-wrapper">
        <div className="debug-nav-capsule">
          {/* Logo brand lockup: EF monogram */}
          <Link className="debug-nav-logo" href="/" onClick={close}>
            <span className="debug-nav-logo__badge">
              <span className="debug-nav-logo__monogram">EF</span>
            </span>
            <span className="debug-nav-logo__name">Elite Fitness</span>
          </Link>

          {/* Center Links */}
          <nav className="debug-nav-links" aria-label="Main navigation">
            <Link href="/" className={`debug-nav-item ${pathname === "/" ? "is-active" : ""}`}>
              Home
            </Link>
            <Link href="/#about" className="debug-nav-item">
              About Us
            </Link>
            <Link href="/#services" className="debug-nav-item">
              Service
            </Link>
            <Link href="/#faq" className="debug-nav-item">
              FAQ
            </Link>
          </nav>

          {/* Right Action: Signed In Profile Capsule vs Sign In / Sign Up */}
          <div className="debug-nav-cta-wrap">
            {authChecked && currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href={currentUser.role === "admin" ? "/admin" : "/profile"}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all ${
                    (currentUser.role === "admin" ? pathname.startsWith("/admin") : pathname === "/profile")
                      ? "bg-[#ff331e]/20 border-[#ff331e]/50 shadow-[0_0_15px_rgba(255,51,30,0.3)]"
                      : "bg-white/5 hover:bg-white/10 border-white/15"
                  }`}
                  title={currentUser.role === "admin" ? "Open Admin Console" : "View Member Profile & Pass"}
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-[#ff331e] border border-white/20 flex items-center justify-center text-xs font-black text-white shrink-0">
                    {currentUser.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentUser.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{userInitials}</span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-white leading-tight max-w-[110px] truncate">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {currentUser.role === "admin" ? "ADMIN" : currentUser.memberId || "MEMBER"}
                    </span>
                  </div>
                </Link>

                {currentUser.role === "admin" && (
                  <Link
                    href="/admin"
                    className="hidden lg:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all"
                  >
                    <Shield size={12} />
                    <span>Admin</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : authChecked ? (
              <>
                <Link className="debug-nav-item" href="/login">
                  Sign In
                </Link>
                <Link className="debug-signup-btn" href="/register">
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="w-24 h-8" />
            )}

            <button
              className="debug-mobile-toggle"
              type="button"
              onClick={() => setOpen(!open)}
              aria-label="Toggle navigation"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <div
        className={`app-header__menu-layer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          className="app-header__menu-scrim"
          type="button"
          onClick={close}
          aria-label="Close menu"
        />
        <div className="app-header__menu-panel">
          <div className="app-header__menu-head">
            <div className="app-header__menu-brand">
              <span className="app-header__menu-badge">EF</span>
              <span className="app-header__menu-brandname">Elite Fitness</span>
            </div>
            <button type="button" className="app-header__menu-close" onClick={close} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          {/* User Profile Card in Mobile Menu if signed in */}
          {currentUser && (
            <div className="px-5 pt-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#ff331e] border border-white/30 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {currentUser.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentUser.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{userInitials}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{displayName}</div>
                    <div className="text-xs text-gray-400 font-mono">
                      {currentUser.memberId || currentUser.email}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  {currentUser.role === "admin" ? "ADMIN" : "VERIFIED"}
                </span>
              </div>
            </div>
          )}

          <div className="app-header__menu-body">
            <div className="app-header__menu-section-label">NAVIGATION</div>
            <div className="app-header__menu-links">
              {[
                { href: "/", label: "Home", sub: "Hero & Overview" },
                { href: "/#about", label: "About Us", sub: "Legacy & Facilities" },
                { href: "/#services", label: "Services", sub: "Training & Turnstile QR" },
                { href: "/#faq", label: "FAQ", sub: "Questions & Access" },
                { href: "/profile", label: "Member Profile", sub: "Subscriptions & Digital Pass" },
                { href: "/scanner", label: "Entrance Scanner", sub: "Turnstile Live Check-in" },
                ...(currentUser?.role === "admin"
                  ? [{ href: "/admin", label: "Admin Console", sub: "Management & Operations" }]
                  : []),
              ].map(({ href, label, sub }, i) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className={`app-header__menu-link ${active ? "is-active" : ""}`}
                  >
                    <div className="app-header__menu-link-left">
                      <span className="app-header__menu-num">0{i + 1}</span>
                      <div className="app-header__menu-info">
                        <span className="app-header__menu-title">{label}</span>
                        <span className="app-header__menu-sub">{sub}</span>
                      </div>
                    </div>
                    <ArrowUpRight size={18} className="app-header__menu-arrow" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="app-header__menu-foot">
            {currentUser ? (
              <div className="space-y-2">
                <Link
                  href={currentUser.role === "admin" ? "/admin" : "/profile"}
                  onClick={close}
                  className="app-header__menu-cta"
                >
                  {currentUser.role === "admin" ? (
                    <>
                      <Shield size={16} />
                      <span>Open Admin Operations Console</span>
                      <ArrowUpRight size={16} />
                    </>
                  ) : (
                    <>
                      <QrCode size={16} />
                      <span>Open Digital Entrance Pass</span>
                      <ArrowUpRight size={16} />
                    </>
                  )}
                </Link>
                {currentUser.role === "admin" && (
                  <Link
                    href="/profile"
                    onClick={close}
                    className="w-full py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <User size={14} />
                    <span>My Account Details</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut size={14} />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={close}
                  className="app-header__menu-cta"
                >
                  <span>Sign Up / Register Member</span>
                  <ArrowUpRight size={16} />
                </Link>
                <div className="mt-2 text-center">
                  <Link href="/login" onClick={close} className="text-xs text-gray-400 hover:text-white">
                    Already registered? <span className="text-[#ff331e] font-bold">Sign In</span>
                  </Link>
                </div>
              </>
            )}
            <div className="app-header__menu-meta">
              <span>ADDIS ABABA, ETHIOPIA</span>
              <span>•</span>
              <span>24/7 ENTRANCE</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
