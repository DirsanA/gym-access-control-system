"use client";

import Link from "next/link";
import { ArrowUpRight, Dumbbell, Menu, QrCode, ScanLine, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#schedule", label: "About us" },
  { href: "/admin", label: "Service" },
  { href: "/admin/members/new", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="debug-nav-wrapper">
        <div className="debug-nav-capsule">
          {/* Logo brand lockup: IB / Dumbbell inside oval pill */}
          <Link className="debug-nav-logo" href="/" onClick={close}>
            <span className="debug-nav-logo__badge">
              <Dumbbell size={16} strokeWidth={2.4} />
            </span>
            <span className="debug-nav-logo__name">DeBug</span>
          </Link>

          {/* Center Links */}
          <nav className="debug-nav-links" aria-label="Main navigation">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`debug-nav-item ${active ? "is-active" : ""}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right Button: Sign up (Red Oval Capsule Button) */}
          <div className="debug-nav-cta-wrap">
            <Link className="debug-signup-btn" href="/admin/members/new">
              Sign up
            </Link>

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
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ff3b30]" />
              <b>NAVIGATION</b>
            </div>
            <button type="button" onClick={close} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          <div className="app-header__menu-links">
            {[...navLinks, { href: "/scanner", label: "Entrance Scanner" }].map(
              ({ href, label }, i) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className={active ? "is-active" : ""}
                  >
                    <span className="app-header__menu-idx">0{i + 1}</span>
                    <b>{label}</b>
                    <ArrowUpRight className="app-header__menu-arrow" />
                  </Link>
                );
              }
            )}
          </div>

          <div className="app-header__menu-foot">
            <Link
              href="/admin/members/new"
              onClick={close}
              className="debug-signup-btn text-center justify-center w-full"
            >
              Sign up / New Member
            </Link>
            <p className="mt-3 text-center text-xs text-gray-500">
              DEBUG ATHLETIC CLUB · ACCESS & PASSES
            </p>
          </div>
        </div>
      </div>
    </>
  );
}


