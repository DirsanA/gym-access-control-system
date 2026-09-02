"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, ScanLine, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/#schedule", label: "Future Club" },
  { href: "/admin", label: "Dashboard" },
  { href: "/scanner", label: "Scanner" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className={`app-header ${isHome ? "app-header--home" : ""}`}>
        <Link className="app-logo" href="/" onClick={close}><span className="app-logo__bars"><i /><i /><i /></span><b>N</b><strong>FIT</strong></Link>
        <nav className="app-header__nav" aria-label="Main navigation">
          {links.map(({ href, label }) => <Link key={href} href={href} className={pathname === href ? "is-active" : ""}>{label}</Link>)}
        </nav>
        <button className="app-header__menu" type="button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
        {!isHome && <Link className="app-header__scanner" href="/scanner"><ScanLine size={16} /> SCAN</Link>}
      </header>

      <div className={`app-header__menu-layer ${open ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
        <button className="app-header__menu-scrim" type="button" onClick={close} aria-label="Close menu" />
        <div className="app-header__menu-panel">
          <div className="app-header__menu-head"><b>NAVIGATION</b><button type="button" onClick={close} aria-label="Close menu"><X /></button></div>
          {links.map(({ href, label }, i) => {
            const active = pathname === href || (href === "/#schedule" && pathname === "/");
            return (
              <Link key={href} href={href} onClick={close} className={active ? "is-active" : ""}>
                <span>{active ? "●" : `0${i + 1}`}</span>
                <b>{label}</b>
                <ArrowUpRight className="app-header__menu-arrow" />
              </Link>
            );
          })}
          <div className="app-header__menu-foot">
            <Link href="/scanner" onClick={close} className="app-header__menu-scan"><ScanLine size={15} /> MEMBER SCANNER</Link>
            <p>NEXUS ATHLETIC CLUB · NAIROBI</p>
          </div>
        </div>
      </div>
    </>
  );
}
