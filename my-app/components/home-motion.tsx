"use client";

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".fitness-hero");
    const updateLight = (event: PointerEvent) => {
      if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const box = hero.getBoundingClientRect();
      hero.style.setProperty("--pointer-x", `${((event.clientX - box.left) / box.width) * 100}%`);
      hero.style.setProperty("--pointer-y", `${((event.clientY - box.top) / box.height) * 100}%`);
    };
    hero?.addEventListener("pointermove", updateLight);

    const targets = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }),
      { threshold: 0.16 }
    );
    targets.forEach((target) => observer.observe(target));
    document.documentElement.classList.add("motion-ready");

    return () => { hero?.removeEventListener("pointermove", updateLight); observer.disconnect(); document.documentElement.classList.remove("motion-ready"); };
  }, []);

  return null;
}
