import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Play,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { HomeMotion } from "@/components/home-motion";


export default function Home() {
  return (
    <main className="fitness-home">
      <HomeMotion />

      {/* Hero Section Exactly Matching Reference Design */}
      <section className="debug-screen-frame" id="home">
        {/* Outer glowing border frame (matching outer rounded red line border) */}
        <div className="debug-inner-card">
          {/* Background image & smart gradient blend */}
          <div className="debug-bg-athlete" />
          <div className="debug-bg-scrim" />
          <div className="debug-top-glow" />

          <div className="debug-hero__container">
            {/* Left Column: Copy & Actions */}
            <div className="debug-hero__content">
              <h1 className="debug-hero__title">
                <span className="debug-hero__highlight">Stronger</span> Every Day<br />
                Starts Here
              </h1>

              <p className="debug-hero__desc">
                Our Space Is Designed To Empower You Physically, Mentally, And Emotionally, Helping You Connect With Your Purpose While Transforming Your Body. Whether You&apos;re A Seasoned Athlete Or Just Beginning Your Journey
              </p>

              <div className="debug-hero__actions">
                <Link href="/admin/members/new" className="debug-btn-primary">
                  Get Started
                </Link>

                <Link href="/scanner" className="debug-btn-watch">
                  <span className="debug-btn-watch__icon">
                    <Play size={13} fill="currentColor" />
                  </span>
                  <span>Watch Now</span>
                </Link>
              </div>

              {/* Bottom floating dual badge widget (matching reference exactly) */}
              <div className="debug-badge-widget-wrap">
                {/* 1. Frosted Glass Reviews Card with Top-Right Orange/Red Sunburst Spark */}
                <div className="debug-glass-reviews">
                  <div className="debug-spark-badge">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#ff3b20">
                      <path d="M12 0L14 8L22 4L18 12L24 16L16 18L18 24L12 18L6 24L8 18L0 16L6 12L2 4L10 8Z" />
                    </svg>
                  </div>

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

                  <div className="debug-glass-reviews__text">
                    <b>20k+ <span className="font-normal text-xs text-gray-300">Reviews</span></b>
                    <div className="flex gap-0.5 text-[#ffc83b] text-xs mt-1">
                      {"★★★★★"}
                    </div>
                  </div>
                </div>

                {/* 2. Bold Orange/Red 25K+ Stat Block */}
                <div className="debug-solid-stat">
                  <div className="debug-solid-stat__body">
                    <div className="flex items-start justify-between">
                      <b className="debug-solid-stat__number">25K+</b>
                      <Link href="/admin" className="debug-stat-arrow" aria-label="Open members directory">
                        <ArrowUpRight size={17} />
                      </Link>
                    </div>
                    <p className="debug-solid-stat__label">Take Training For Fitness</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ABOUT US SECTION */}
      <section className="debug-section" id="about" data-reveal>
        <div className="debug-section__container">
          <div className="debug-grid-2">
            {/* Left side: Visual photo composite with ambient red backlighting */}
            <div className="debug-about__visual">
              <div className="debug-about__frame">
                <img
                  src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1000&q=85"
                  alt="Athletic training facility"
                  className="debug-about__img"
                />
                <div className="debug-about__glow" />
              </div>

              {/* Floating mini stats pill */}
              <div className="debug-about__stat-pill">
                <span className="debug-about__stat-dot" />
                <div>
                  <b>10,000+ SQ FT</b>
                  <p>State-Of-The-Art Training Facility</p>
                </div>
              </div>
            </div>

            {/* Right side: Story & Core Values */}
            <div className="debug-about__copy">
              <div className="debug-pill">
                <span className="debug-pill__dot" />
                <span>ABOUT ELITE FITNESS</span>
              </div>

              <h2 className="debug-section__title">
                Forging Elite Bodies,<br />
                <em>Unstoppable Mindsets.</em>
              </h2>

              <p className="debug-section__desc">
                Founded with a relentless commitment to high performance, Elite Fitness is more than a gym—it is an athletic sanctuary. We fuse cutting-edge biomechanics with frictionless digital access control so your focus remains strictly on your progression.
              </p>

              <div className="debug-feature-cards">
                <div className="debug-feature-card">
                  <div className="debug-feature-card__icon">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h4>Championship Culture</h4>
                    <p>Coaches and athletes devoted to lifting your standards every single session.</p>
                  </div>
                </div>

                <div className="debug-feature-card">
                  <div className="debug-feature-card__icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4>Sub-Second Pass Verification</h4>
                    <p>Instant contactless QR checks eliminate queues and secure your club privileges 24/7.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/admin/members/new" className="debug-btn-primary">
                  <span>Join The Movement</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="debug-section debug-section--tint" id="services" data-reveal>
        <div className="debug-section__container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="debug-pill mx-auto mb-4">
              <span className="debug-pill__dot" />
              <span>ELITE SERVICES & DISCIPLINES</span>
            </div>
            <h2 className="debug-section__title text-center">
              Built For Every <em>Dimension</em> of Strength
            </h2>
            <p className="debug-section__desc text-center mx-auto">
              Customized training pathways tailored to hypertrophy, conditioning, athletic agility, and rapid recovery.
            </p>
          </div>

          <div className="debug-services-grid">
            {/* Service 1 */}
            <div className="debug-service-card">
              <div className="debug-service-card__badge">01</div>
              <div className="debug-service-card__icon">
                <Flame size={24} />
              </div>
              <h3>Hypertrophy & Strength</h3>
              <p>Custom barbell racks, calibrated plates, and advanced biomechanical machines engineered for peak muscular development.</p>
              <div className="debug-service-card__footer">
                <span>Free weights &bull; Plate loaded &bull; Power cages</span>
              </div>
            </div>

            {/* Service 2 - Featured */}
            <div className="debug-service-card debug-service-card--featured">
              <div className="debug-service-card__badge">02</div>
              <div className="debug-service-card__icon">
                <ScanLine size={24} />
              </div>
              <h3>Contactless Pass Access</h3>
              <p>Instant optical QR scanner at all turnstiles. Members tap their phone pass for sub-0.3s verification with audio feedback.</p>
              <div className="debug-service-card__footer">
                <Link href="/scanner" className="debug-service-card__link">
                  Open Scanner Terminal <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>

            {/* Service 3 */}
            <div className="debug-service-card">
              <div className="debug-service-card__badge">03</div>
              <div className="debug-service-card__icon">
                <Users size={24} />
              </div>
              <h3>Athletic Conditioning</h3>
              <p>Sprint turfs, sled pushing lanes, Olympic lifting platforms, and heart-rate monitored group intensity sessions.</p>
              <div className="debug-service-card__footer">
                <span>Conditioning turf &bull; Olympic platforms</span>
              </div>
            </div>

            {/* Service 4 */}
            <div className="debug-service-card">
              <div className="debug-service-card__badge">04</div>
              <div className="debug-service-card__icon">
                <Sparkles size={24} />
              </div>
              <h3>Recovery & Wellness</h3>
              <p>Infrared saunas, cold plunge ice baths, and physical therapy recovery protocols to ensure you return ready for every rep.</p>
              <div className="debug-service-card__footer">
                <span>Contrast therapy &bull; Ice plunge &bull; Sauna</span>
              </div>
            </div>

            {/* Service 5 */}
            <div className="debug-service-card">
              <div className="debug-service-card__badge">05</div>
              <div className="debug-service-card__icon">
                <QrCode size={24} />
              </div>
              <h3>Instant Digital Pass Sharing</h3>
              <p>Export your verified member pass to Apple Wallet, Telegram, WhatsApp, or printable PNG with auto-expiry calculation.</p>
              <div className="debug-service-card__footer">
                <Link href="/admin/members/new" className="debug-service-card__link">
                  Generate Member Pass <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Service 6 */}
            <div className="debug-service-card">
              <div className="debug-service-card__badge">06</div>
              <div className="debug-service-card__icon">
                <ShieldCheck size={24} />
              </div>
              <h3>Command Dashboard</h3>
              <p>Staff console to oversee real-time turnstile check-ins, renew active packages, search records, and analyze peak attendance.</p>
              <div className="debug-service-card__footer">
                <Link href="/admin" className="debug-service-card__link">
                  View Admin Console <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="debug-section" id="faq" data-reveal>
        <div className="debug-section__container">
          <div className="debug-grid-2 items-start">
            <div>
              <div className="debug-pill mb-4">
                <span className="debug-pill__dot" />
                <span>FREQUENTLY ASKED QUESTIONS</span>
              </div>
              <h2 className="debug-section__title">
                Everything You Need<br />
                <em>To Know About Elite Fitness.</em>
              </h2>
              <p className="debug-section__desc mb-8">
                Got questions on memberships, our contactless digital pass, or club facilities? Find clear answers below or visit our front desk.
              </p>

              <div className="debug-faq-contact-card">
                <h4>Have more questions?</h4>
                <p>Our team is on standby 24/7 to assist with registration and access tokens.</p>
                <Link href="/admin/members/new" className="debug-btn-primary mt-4">
                  Register Today
                </Link>
              </div>
            </div>

            {/* FAQ Accordion List */}
            <div className="debug-faq-list">
              <details className="debug-faq-item" open>
                <summary className="debug-faq-question">
                  <span>How does the digital member pass work at the entrance?</span>
                  <span className="debug-faq-arrow">▼</span>
                </summary>
                <div className="debug-faq-answer">
                  When you register, an encrypted high-resolution QR card is generated instantly. You can keep it on your phone or share it to Telegram/WhatsApp. Holding it up to the entrance camera verifies your access in less than 0.3 seconds with audio feedback.
                </div>
              </details>

              <details className="debug-faq-item">
                <summary className="debug-faq-question">
                  <span>What happens when my membership expires?</span>
                  <span className="debug-faq-arrow">▼</span>
                </summary>
                <div className="debug-faq-answer">
                  The scanner terminal will identify expired passes with an orange warning state. You can extend your pass in seconds at the front desk or via the admin console by adding 15, 30, or 90 renewal days without re-issuing a new card.
                </div>
              </details>

              <details className="debug-faq-item">
                <summary className="debug-faq-question">
                  <span>What are the gym hours and peak training times?</span>
                  <span className="debug-faq-arrow">▼</span>
                </summary>
                <div className="debug-faq-answer">
                  Elite Fitness is open Monday to Sunday from 05:00 to 23:00. Peak hours are generally 06:30 - 08:30 and 17:30 - 20:00. Contactless access turnstiles are operational throughout all operating hours.
                </div>
              </details>

              <details className="debug-faq-item">
                <summary className="debug-faq-question">
                  <span>Can I print a physical card if I don&apos;t want to use my phone?</span>
                  <span className="debug-faq-arrow">▼</span>
                </summary>
                <div className="debug-faq-answer">
                  Yes! Every generated member pass features a 1-click &ldquo;Print Card&rdquo; button configured with high-contrast printer margins, as well as a downloadable PNG for physical wallet badges.
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* LUXURY DEEP FOOTER */}
      <footer className="debug-footer" data-reveal>
        <div className="debug-footer__top">
          <div className="debug-footer__brand">
            <Link className="debug-nav-logo inline-flex mb-4" href="/">
              <span className="debug-nav-logo__badge">
                <span className="debug-nav-logo__monogram">EF</span>
              </span>
              <span className="debug-nav-logo__name">Elite Fitness</span>
            </Link>
            <p className="debug-footer__desc">
              Stronger every day. The premier athletic training destination and contactless digital access ecosystem.
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-[#ff331e]">
              <span className="h-2 w-2 rounded-full bg-[#ff331e] animate-pulse" />
              <span>TERMINAL STATUS: ONLINE & SECURE</span>
            </div>
          </div>

          <div className="debug-footer__col">
            <h3>PORTAL NAVIGATION</h3>
            <a href="#home">Home</a>
            <a href="#about">About Us</a>
            <a href="#services">Services</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="debug-footer__col">
            <h3>ACCESS TOOLS</h3>
            <Link href="/scanner">Entrance Scanner Terminal</Link>
            <Link href="/admin/members/new">New Member Registration</Link>
            <Link href="/admin">Operations Console</Link>
          </div>

          <div className="debug-footer__col">
            <h3>LOCATION & CONTACT</h3>
            <p>ADDIS ABABA &bull; ETHIOPIA</p>
            <p className="mt-1">MON — SUN &bull; 05:00 - 23:00</p>
            <div className="mt-4">
              <Link href="/admin/members/new" className="debug-signup-btn text-xs">
                Join Elite Fitness
              </Link>
            </div>
          </div>
        </div>

        <div className="debug-footer__bottom">
          <small>&copy; {new Date().getFullYear()} ELITE FITNESS CLUB. ALL RIGHTS RESERVED.</small>
          <small className="text-gray-400">POWERED BY NEXT-GEN BIOMETRIC &amp; OPTICAL ACCESS</small>
        </div>
      </footer>
    </main>
  );
}



