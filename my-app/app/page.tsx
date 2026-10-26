import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Play,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { HomeMotion } from "@/components/home-motion";

export default function Home() {
  return (
    <main className="fitness-home">
      <HomeMotion />

      {/* Hero Section Exactly Matching Reference Design */}
      <section className="debug-hero" id="home">
        {/* Ambient subtle glow & backdrop grid */}
        <div className="debug-hero__backdrop" />

        <div className="debug-hero__container">
          {/* Left Column: Copy & Actions */}
          <div className="debug-hero__content">
            <h1 className="debug-hero__title">
              <span className="debug-hero__highlight">Stronger</span> Every Day<br />
              Starts Here
            </h1>

            <p className="debug-hero__desc">
              Our space is designed to empower you physically, mentally, and emotionally, helping you connect with your purpose while transforming your body—whether you&apos;re a seasoned athlete or just beginning your journey.
            </p>

            <div className="debug-hero__actions">
              <Link href="/admin/members/new" className="debug-btn-primary">
                Get Started
              </Link>

              <Link href="/scanner" className="debug-btn-watch">
                <span className="debug-btn-watch__icon">
                  <Play size={13} fill="currentColor" />
                </span>
                <span>Watch Scanner</span>
              </Link>
            </div>

            {/* Bottom floating badge widget (matching reference 25K+ badge) */}
            <div className="debug-badge-widget">
              <div className="debug-badge-widget__card">
                <div className="debug-avatar-stack">
                  <div className="debug-avatar">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                      alt="Member"
                    />
                  </div>
                  <div className="debug-avatar">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                      alt="Member"
                    />
                  </div>
                  <div className="debug-avatar debug-avatar--count">
                    <span>+4</span>
                  </div>
                </div>

                <div className="debug-badge-widget__meta">
                  <span className="debug-badge-widget__reviews">25K+ Reviews</span>
                  <p className="debug-badge-widget__sub">Active Athletes</p>
                </div>

                <div className="debug-badge-widget__stat">
                  <b>25K+</b>
                </div>

                <Link href="/admin" className="debug-badge-widget__arrow" aria-label="View members">
                  <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Deadlifter / Athlete Cutout */}
          <div className="debug-hero__visual" aria-hidden="true">
            <div className="debug-hero__lifter-glow" />
            <img
              src="/athlete-hero.png"
              alt="Male athlete lifting barbell"
              className="debug-hero__lifter-img"
            />
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="fitness-pillars" data-reveal>
        <div className="fitness-pillars__grid">
          <div className="fitness-pillar-card">
            <div className="fitness-pillar-card__icon">
              <QrCode size={24} />
            </div>
            <h3>Instant Digital Pass</h3>
            <p>
              Cryptographically verified QR code passes issued in seconds, shareable directly to members&apos; phones or printed.
            </p>
          </div>

          <div className="fitness-pillar-card fitness-pillar-card--featured">
            <div className="fitness-pillar-card__icon">
              <ScanLine size={24} />
            </div>
            <h3>Zero-Friction Access</h3>
            <p>
              Live camera optical scanner with auto audio feedback, instant expiration checks, and live status verification.
            </p>
          </div>

          <div className="fitness-pillar-card">
            <div className="fitness-pillar-card__icon">
              <ShieldCheck size={24} />
            </div>
            <h3>Admin Command Center</h3>
            <p>
              Real-time membership dashboard to renew expired plans, search records, and manage check-ins with precision.
            </p>
          </div>
        </div>
      </section>

      {/* Future Club Preview */}
      <section className="fitness-future" id="schedule" data-reveal>
        <div className="fitness-future__visual" aria-label="A preview of the future Nexus training space">
          <div className="fitness-future__grid" />
          <div className="fitness-future__label">
            <span>NEXUS ARCHITECTURE</span>
            <strong>TOUR OUR<br />FUTURE<br />FACILITY</strong>
            <i>⌁</i>
          </div>
          <div className="fitness-future__photo fitness-future__photo--main" />
          <div className="fitness-future__photo fitness-future__photo--top" />
          <div className="fitness-future__photo fitness-future__photo--bottom" />
          <div className="fitness-future__pulse" />
          <p>NEXT-GEN FACILITY · NAIROBI</p>
        </div>

        <div className="fitness-future__copy">
          <div className="fitness-pill fitness-pill--dark">
            <Sparkles size={12} className="text-[#ff3b30]" />
            <span>A NEW STANDARD IS COMING</span>
          </div>
          <h2>WELCOME TO THE FUTURE<br /><em>OF ATHLETIC EXCELLENCE</em></h2>
          <h3>Bigger space. Smarter technology. Higher standards.</h3>
          <p>
            We are creating a state-of-the-art training ecosystem designed around athletic progression, high vibration energy, and smart entrance systems.
          </p>
          <ul className="fitness-future__list">
            <li>
              <CheckCircle2 size={16} className="text-[#ff3b30]" />
              <span>Olympic lifting platforms & turf sprinting zones</span>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-[#ff3b30]" />
              <span>Contactless member turnstiles with sub-second QR sync</span>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-[#ff3b30]" />
              <span>Hydrotherapy, infrared saunas, and cold plunge recovery</span>
            </li>
          </ul>
          <Link href="/admin/members/new" className="fitness-future__link">
            REGISTER A MEMBER <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="fitness-testimonials" id="success-stories" data-reveal>
        <header>
          <div className="fitness-pill">
            <Users size={12} className="text-[#ff3b30]" />
            <span>THE NEXUS COMMUNITY</span>
          </div>
          <h2>TESTIMONIALS</h2>
          <span />
        </header>

        <div className="fitness-testimonials__list">
          <article>
            <i>“</i>
            <blockquote>
              Nexus completely transformed how our club handles access. Checking in takes half a second with the digital card, and the atmosphere inspires everyone.
            </blockquote>
            <footer>
              <b>AMINA W.</b>
              <span>ATHLETE & MEMBER · 8 MONTHS</span>
            </footer>
          </article>

          <article>
            <i>“</i>
            <blockquote>
              The cleanest gym facility and smoothest check-in flow in Nairobi. You just tap your pass at the scanner and get straight to your workout.
            </blockquote>
            <footer>
              <b>BRIAN O.</b>
              <span>POWERLIFTING COACH · 1 YEAR</span>
            </footer>
          </article>
        </div>

        <div className="fitness-testimonials__meter">
          <span />
          <span className="is-active" />
          <span />
        </div>
      </section>

      {/* Modern High-End Footer */}
      <footer className="fitness-footer" data-reveal>
        <div className="fitness-footer__top">
          <div>
            <Link className="app-logo mb-3 inline-flex" href="/">
              <span className="app-logo__badge">
                <span className="app-logo__bars">
                  <i /><i /><i />
                </span>
              </span>
              <div className="app-logo__text">
                <b>DeBug</b>
                <span>ATHLETIC CLUB</span>
              </div>
            </Link>
            <p>High performance fitness, contactless access engineering, and member management.</p>
          </div>

          <div>
            <h3>SYSTEM ACCESS</h3>
            <Link href="/admin/members/new">NEW MEMBER REGISTRATION <ArrowRight size={14} /></Link>
            <Link href="/scanner">ENTRANCE SCANNER TERMINAL <ScanLine size={14} /></Link>
            <Link href="/admin">OPERATIONS DASHBOARD <ArrowRight size={14} /></Link>
          </div>

          <div>
            <h3>QUICK NAVIGATION</h3>
            <a href="#home">BACK TO TOP</a>
            <a href="#schedule">FACILITY PREVIEW</a>
            <a href="#success-stories">MEMBER STORIES</a>
          </div>

          <div>
            <h3>LOCATION & HOURS</h3>
            <p>NAIROBI · KENYA</p>
            <p>MON — SUN · 05:00 - 23:00</p>
            <p className="text-[#ff3b30] font-semibold mt-2">ACCESS TERMINAL ACTIVE</p>
          </div>
        </div>

        <div className="fitness-footer__bottom">
          <small>© {new Date().getFullYear()} NEXUS ATHLETIC CLUB. ALL RIGHTS RESERVED.</small>
          <small>ENGINEERED FOR HIGH PERFORMANCE.</small>
        </div>
      </footer>
    </main>
  );
}


