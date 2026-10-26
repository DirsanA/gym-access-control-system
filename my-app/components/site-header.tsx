"use client";

import Link from "next/link";
import { ArrowUpRight, Dumbbell, Menu, QrCode, ScanLine, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About Us" },
  { href: "/#services", label: "Service" },
  { href: "/#faq", label: "FAQ" },
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
          {/* Logo brand lockup: IB monogram / Dumbbell in circle */}
          <Link className="debug-nav-logo" href="/" onClick={close}>
            <span className="debug-nav-logo__badge">
              <span className="debug-nav-logo__monogram">IB</span>
            </span>
            <span className="debug-nav-logo__name">DeBug</span>
          </Link>

          {/* Center Links */}
          <nav className="debug-nav-links" aria-label="Main navigation">
            <Link href="/" className={`debug-nav-item ${pathname === "/" ? "is-active" : ""}`}>
              Home
            </Link>
            <a href="/#about" className="debug-nav-item">
              About Us
            </a>
            <a href="/#services" className="debug-nav-item">
              Service
            </a>
            <a href="/#faq" className="debug-nav-item">
              FAQ
            </a>
          </nav>

          {/* Right Button: Sign Up */}
          <div className="debug-nav-cta-wrap">
            <Link className="debug-signup-btn" href="/admin/members/new">
              Sign Up
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


