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
            <div className="app-header__menu-brand">
              <span className="app-header__menu-badge">IB</span>
              <span className="app-header__menu-brandname">DeBug Club</span>
            </div>
            <button type="button" className="app-header__menu-close" onClick={close} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          <div className="app-header__menu-body">
            <div className="app-header__menu-section-label">MENU</div>
            <div className="app-header__menu-links">
              {[
                { href: "/", label: "Home", sub: "Hero & Overview" },
                { href: "/#about", label: "About Us", sub: "Legacy & Facilities" },
                { href: "/#services", label: "Services", sub: "Training & Turnstile QR" },
                { href: "/#faq", label: "FAQ", sub: "Questions & Access" },
                { href: "/scanner", label: "Entrance Scanner", sub: "Turnstile Live Check-in" },
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
            <Link
              href="/admin/members/new"
              onClick={close}
              className="app-header__menu-cta"
            >
              <span>Sign Up / Register Member</span>
              <ArrowUpRight size={16} />
            </Link>
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


