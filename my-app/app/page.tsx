import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { HomeMotion } from "@/components/home-motion";

export default function Home() {
  return (
    <main className="fitness-home">
      <HomeMotion />
      <section className="fitness-hero" id="home">
        <div className="fitness-hero__shade" /><div className="fitness-hero__grain" />
        <div className="fitness-hero__copy"><p className="fitness-eyebrow">NEXUS ATHLETIC CLUB · NAIROBI</p><h1>NEXUS<br /><em>FITNESS</em></h1><p>I push my clients to</p><h2>Look and feel amazing</h2><div className="fitness-hero__buttons"><Link href="/admin/members/new">START TODAY <ArrowRight size={17} /></Link><Link href="/scanner"><ScanLine size={17} /> MEMBER SCANNER</Link></div></div>
        <div className="fitness-hero__portrait" aria-hidden="true"><div className="fitness-hero__portrait-image" /><div className="fitness-hero__line" /><span>DISCIPLINE<br />CREATES<br />RESULTS</span></div>
        <div className="fitness-hero__scroll">SCROLL TO EXPLORE <i /></div>
      </section>

      <section className="fitness-future" id="schedule" data-reveal>
        <div className="fitness-future__visual" aria-label="A preview of the future Nexus training space">
          <div className="fitness-future__grid" />
          <div className="fitness-future__label"><span>NEXUS</span><strong>TOUR OUR<br />FUTURE<br />CLUB</strong><i>⌁</i></div>
          <div className="fitness-future__photo fitness-future__photo--main" /><div className="fitness-future__photo fitness-future__photo--top" /><div className="fitness-future__photo fitness-future__photo--bottom" />
          <div className="fitness-future__pulse" /><p>FUTURE-READY FITNESS</p>
        </div>
        <div className="fitness-future__copy"><p className="fitness-eyebrow">A NEW STANDARD IS COMING</p><h2>WELCOME TO THE FUTURE<br /><em>OF NEXUS ATHLETIC CLUB</em></h2><h3>Bigger space. Smarter design. Higher standards.</h3><p>We are creating a next-generation fitness destination designed around progress, energy, and the way you actually train. This is a complete evolution of what a gym can feel like.</p><p>Purpose-built zones for strength, conditioning, cardio, recovery, and movement will give every member the space to work toward more—whether you are beginning, rebuilding, or raising your standard.</p><Link href="/admin/members/new" className="fitness-future__link">EXPLORE MEMBERSHIP <ArrowRight size={17} /></Link></div>
      </section>

      <section className="fitness-testimonials" id="success-stories" data-reveal><header><p className="fitness-eyebrow">THE NEXUS COMMUNITY</p><h2>TESTIMONIALS</h2><span /></header><div className="fitness-testimonials__list"><article><i>“</i><blockquote>Joining Nexus changed how I feel about exercise. I&apos;m stronger, more confident, and I finally look forward to showing up for myself.</blockquote><footer><b>AMINA W.</b><span>MEMBER · 8 MONTHS</span></footer></article><article><i>“</i><blockquote>Group training is the highlight of my week. Everyone brings the energy, and it feels like a real community—not just another workout.</blockquote><footer><b>BRIAN O.</b><span>MEMBER · 1 YEAR</span></footer></article></div><div className="fitness-testimonials__meter"><span /><span className="is-active" /><span /></div></section>

      <footer className="fitness-footer" data-reveal><div className="fitness-footer__top"><div><Link className="fitness-logo" href="/"><span className="fitness-logo__bars"><i /><i /><i /></span><b>N</b><strong>FIT</strong></Link><p>Train hard. Live strong.</p></div><div><h3>CLUB ACCESS</h3><Link href="/admin/members/new">JOIN NEXUS <ArrowRight size={15} /></Link><Link href="/scanner">MEMBER SCANNER <ScanLine size={15} /></Link></div><div><h3>QUICK LINKS</h3><a href="#schedule">FUTURE CLUB</a><a href="/admin/members/new">MEMBERSHIP</a><a href="#success-stories">TESTIMONIALS</a></div><div><h3>FOLLOW THE ENERGY</h3><p>NAIROBI · KENYA</p><p>EVERY DAY IS A NEW REP.</p></div></div><div className="fitness-footer__bottom"><small>© {new Date().getFullYear()} NEXUS ATHLETIC CLUB</small><small>BUILT FOR THE NEXT REP.</small></div></footer>
    </main>
  );
}
