"use client";

/**
 * HKB Protection — Navbar
 * ------------------------------------------------------------------
 * Design tokens (from brief):
 *   --ink      #111315   background / primary
 *   --brass    #C59B4E   accent / authority mark
 *   --paper    #F8F9FA   text on dark
 *   --charcoal #212529   secondary surfaces
 *
 * Signature element: a brass "clearance" corner-clip used on the mark
 * and the CTA (checkpoint badge / ID-card language), and a hairline
 * brass rule beneath the bar that fills left→right with scroll depth —
 * a literal, functional progress read rather than decoration.
 *
 * Fonts (add to app/layout.tsx via next/font/google and expose as
 * CSS vars, then reference here as font-display / font-body):
 *
 *   import { Oswald, Inter } from "next/font/google";
 *   const oswald = Oswald({ subsets: ["latin"], weight: ["500","600","700"], variable: "--font-display" });
 *   const inter  = Inter({ subsets: ["latin"], weight: ["400","500"], variable: "--font-body" });
 *   // <html className={`${oswald.variable} ${inter.variable}`}>
 *
 * tailwind.config.ts:
 *   theme.extend.fontFamily = {
 *     display: ["var(--font-display)", "sans-serif"],
 *     body: ["var(--font-body)", "sans-serif"],
 *   }
 *   theme.extend.colors = {
 *     ink: "#111315", brass: "#C59B4E", paper: "#F8F9FA", charcoal: "#212529",
 *   }
 *
 * Deps: gsap, lenis, framer-motion, lucide-react
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "News", href: "/news" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Entrance: badge locks into place, like a clearance card being issued.
  useEffect(() => {
    gsap.fromTo(
      logoRef.current,
      { opacity: 0, y: -12, clipPath: "inset(0 100% 0 0)" },
      {
        opacity: 1,
        y: 0,
        clipPath: "inset(0 0% 0 0)",
        duration: 0.9,
        ease: "power3.out",
      },
    );
  }, []);

  // Scroll state + brass progress rule (Lenis dispatches native scroll events,
  // so this stays in sync whether Lenis is mounted or not).
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, y / max) : 0;
      gsap.to(progressRef.current, {
        scaleX: pct,
        duration: 0.15,
        ease: "none",
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const underline = (
    e: React.MouseEvent<HTMLAnchorElement>,
    enter: boolean,
  ) => {
    const el = e.currentTarget.querySelector<HTMLSpanElement>(".nav-underline");
    if (!el) return;
    gsap.to(el, { scaleX: enter ? 1 : 0, duration: 0.35, ease: "power2.out" });
  };

  return (
    <>
      <header
        ref={barRef}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "bg-ink/95 backdrop-blur-sm"
            : "bg-ink/70 backdrop-blur-[2px]"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Mark */}
          <a
            href="#home"
            className="flex items-center gap-3 group"
            aria-label="HKB Protection — Home"
          >
            <div
              ref={logoRef}
              className="relative h-10 w-10 overflow-hidden bg-brass"
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 20% 100%, 0 80%)",
              }}
            >
              <Image
                src="/logo.jpg"
                alt="HKB Protection logo"
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold tracking-[0.14em] text-paper">
                H.K.B
              </div>
              <div className="font-body text-[9px] uppercase tracking-[0.28em] text-brass">
                Protection &amp; Management
              </div>
            </div>
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onMouseEnter={(e) => underline(e, true)}
                  onMouseLeave={(e) => underline(e, false)}
                  className="relative font-body text-[13px] font-medium uppercase tracking-[0.12em] text-paper/85 transition-colors hover:text-paper"
                >
                  {link.label}
                  <span className="nav-underline absolute -bottom-1.5 left-0 h-[1.5px] w-full origin-left scale-x-0 bg-brass" />
                </a>
              </li>
            ))}
          </ul>

          {/* CTA — desktop */}
          <Link
            href="/contacts"
            className="relative hidden overflow-hidden bg-brass px-5 py-2.5 font-body text-[12px] font-semibold uppercase tracking-[0.14em] text-ink transition-transform hover:-translate-y-0.5 md:inline-block"
            style={{
              clipPath:
                "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)",
            }}
          >
            Request Coverage
          </Link>

          {/* Mobile trigger */}
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative z-60 flex h-10 w-10 items-center justify-center text-paper md:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Scroll-depth rule */}
        <div className="h-0.5 w-full bg-charcoal/60">
          <div
            ref={progressRef}
            className="h-full w-full origin-left scale-x-0 bg-brass"
          />
        </div>
      </header>

      {/* Mobile menu — gate-bar reveal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 flex flex-col bg-ink pt-24 md:hidden"
          >
            <ul className="flex flex-1 flex-col gap-1 px-6">
              {NAV_LINKS.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.15 + i * 0.07,
                    duration: 0.4,
                    ease: [0.76, 0, 0.24, 1],
                  }}
                  className="border-b border-charcoal"
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-5 font-display text-2xl font-medium tracking-wide text-paper"
                  >
                    {link.label}
                    <span className="font-body text-xs text-brass">
                      0{i + 1}
                    </span>
                  </a>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="px-6 pb-10"
            >
              <Link
                href="/contacts"
                onClick={() => setOpen(false)}
                className="block bg-brass px-6 py-4 text-center font-body text-sm font-semibold uppercase tracking-[0.14em] text-ink"
                style={{
                  clipPath:
                    "polygon(6% 0, 100% 0, 100% 70%, 94% 100%, 0 100%, 0 30%)",
                }}
              >
                Request Coverage
              </Link>
              <p className="mt-4 text-center font-body text-[11px] uppercase tracking-[0.2em] text-paper/40">
                Guarding · Event Security · Traffic Control — Tanzania
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
