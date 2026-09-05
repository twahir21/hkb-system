"use client";

/**
 * HKB Protection — Enterprise Footer
 * ------------------------------------------------------------------
 * A comprehensive dark footer with:
 *   1. Company info + social links
 *   2. Quick Links (anchor navigation)
 *   3. Services (from the Services section)
 *   4. Business Lines (from the Business Diversification section)
 *   5. Newsletter signup
 *   6. Back-to-top button
 *   7. Copyright bar
 *
 * Brand tokens: ink #111315 (background), brass #C59B4E (accent),
 * paper #F8F9FA (text), charcoal #212529 (panels).
 *
 * Deps: framer-motion, lucide-react, next/image
 */

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowUp,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { PHONE_TELS, PHONES } from "@/const/links.const";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Copyright year — read via useSyncExternalStore so the live year is only
   computed on the client, never during the prerender. */
const EMPTY_SUBSCRIBE = () => () => {};
const getCurrentYear = () => new Date().getFullYear();
const getStaticYear = () => 2026;

/* Hero's grid field — now shared as the `bg-grid-ink` utility in globals.css */

const QUICK_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "About Us", href: "#about" },
  { label: "Training Program", href: "#training" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact Us", href: "/contacts" },
];

const SERVICES = [
  "Manned Guarding",
  "VIP Protection",
  "Event Security",
  "Industrial Security",
  "Commercial Security",
  "Residential Security",
  "Risk Assessment",
  "Access Control",
  "Emergency Response",
  "Security Consultancy",
  "Patrol Services",
  "Technology Integration",
];

const BUSINESS_LINES = [
  "Tanzania Veterans Football Sports",
  "Agricultural Products",
  "Fish Supply",
  "Tailoring Services",
  "Security Equipment Supply",
  "Corporate Catering",
  "Transportation Services",
];

const COMPANY_INFO = [
  {
    icon: MapPin,
    label: "Head Office",
    value: "Temeke, Dar es Salaam, Tanzania",
  },
  {
    icon: Phone,
    label: "Phone",
    value: PHONES[0],
    href: PHONE_TELS[0],
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@hkbprotection.co.tz",
    href: "mailto:info@hkbprotection.co.tz",
  },
  {
    icon: Clock,
    label: "Office Hours",
    value: "Mon – Sat: 08:00 – 17:00",
  },
];

/* ------------------------------------------------------------------ */
/*  Inline SVG brand icons — lucide-react has no brand glyphs          */
/* ------------------------------------------------------------------ */
const SOCIAL_ICONS = {
  facebook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  ),
} as const;

const SOCIALS = [
  {
    icon: SOCIAL_ICONS.facebook,
    label: "Facebook",
    href: "https://facebook.com",
  },
  {
    icon: SOCIAL_ICONS.instagram,
    label: "Instagram",
    href: "https://instagram.com/hkbprotection",
  },
  {
    icon: SOCIAL_ICONS.twitter,
    label: "Twitter / X",
    href: "https://twitter.com",
  },
  {
    icon: SOCIAL_ICONS.linkedin,
    label: "LinkedIn",
    href: "https://linkedin.com",
  },
  {
    icon: SOCIAL_ICONS.youtube,
    label: "YouTube",
    href: "https://youtube.com/@hkbprotection",
  },
];

export default function Footer() {
  const year = useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    getCurrentYear,
    getStaticYear,
  );

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      {/* Hero grid field + brass ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.06] bg-grid-ink" />
        <div className="absolute left-1/2 top-[-10%] h-105 w-195 -translate-x-1/2 rounded-full bg-brass/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-75 w-75 rounded-full bg-brass/5 blur-[100px]" />
      </div>

      <div className="relative">
        {/* ============================= Main footer grid ============================= */}
        <div className="mx-auto max-w-7xl px-5 pb-14 pt-20 sm:px-8 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            {/* ======================== Company info ======================== */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="lg:col-span-4"
            >
              {/* Mark */}
              <a
                href="#home"
                className="group inline-flex items-center gap-3"
                aria-label="HKB Protection — Home"
              >
                <div
                  className="relative h-12 w-12 overflow-hidden bg-brass"
                  style={{
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 20% 100%, 0 80%)",
                  }}
                >
                  <Image
                    src="/logo.jpg"
                    alt="HKB Protection logo"
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="leading-tight">
                  <div className="font-display text-lg font-semibold tracking-[0.14em] text-paper">
                    H.K.B
                  </div>
                  <div className="font-body text-[10px] uppercase tracking-[0.28em] text-brass">
                    Protection & Management
                  </div>
                </div>
              </a>

              {/* Company blurb */}
              <p className="mt-6 max-w-sm font-body text-[14px] leading-relaxed text-paper/55">
                For more than 2 years, HKB Protection & Management Company
                Limited has delivered reliable, professional and
                technology-driven security solutions across Tanzania — a
                registered, licensed and fully insured partner you can trust.
              </p>

              {/* Social media */}
              <div className="mt-7">
                <span className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-paper/40">
                  Follow Us
                </span>
                <div className="mt-3.5 flex items-center gap-2.5">
                  {SOCIALS.map((social) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      whileHover={{ y: -3 }}
                      className="flex h-10 w-10 items-center justify-center border border-charcoal bg-charcoal/40 text-paper/55 transition-all duration-300 hover:border-brass/50 hover:bg-brass hover:text-ink"
                    >
                      {social.icon}
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Contact strip */}
              <div className="mt-8 space-y-3 border-t border-paper/10 pt-6">
                {COMPANY_INFO.map((info) => {
                  const Icon = info.icon;
                  return (
                    <div key={info.label} className="flex items-start gap-3">
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-brass"
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0">
                        <span className="font-body text-[10px] uppercase tracking-[0.16em] text-paper/40">
                          {info.label}
                        </span>
                        {info.href ? (
                          <a
                            href={info.href}
                            className="block font-body text-[13.5px] font-medium leading-snug text-paper/75 transition-colors hover:text-brass"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <span className="block font-body text-[13.5px] font-medium leading-snug text-paper/75">
                            {info.value}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Emergency hotline */}
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    className="mt-0.5 h-4 w-4 shrink-0 text-brass"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0">
                    <span className="font-body text-[10px] uppercase tracking-[0.16em] text-paper/40">
                      Emergency Hotline
                    </span>
                    <a
                      href={PHONE_TELS[1]}
                      className="block font-body text-[13.5px] font-semibold text-brass transition-colors hover:text-brass/80"
                    >
                      {PHONES[1]}
                    </a>
                    <span className="font-body text-[10px] uppercase tracking-[0.12em] text-brass/60">
                      24/7 Response
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ======================== Quick links ======================== */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
              className="lg:col-span-2"
            >
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-brass">
                Quick Links
              </h3>
              <span className="mt-3 block h-0.5 w-8 bg-brass/40" />

              <ul className="mt-6 space-y-3">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="group flex items-center gap-2 font-body text-[13.5px] text-paper/60 transition-colors duration-300 hover:text-brass"
                    >
                      <span className="h-px w-3 bg-brass/30 transition-all duration-300 group-hover:w-5 group-hover:bg-brass" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* ======================== Services ======================== */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="lg:col-span-3"
            >
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-brass">
                Our Services
              </h3>
              <span className="mt-3 block h-0.5 w-8 bg-brass/40" />

              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {SERVICES.slice(0, 8).map((service) => (
                  <li key={service}>
                    <a
                      href="#services"
                      className="group flex items-center gap-2 font-body text-[13.5px] text-paper/60 transition-colors duration-300 hover:text-brass"
                    >
                      <span className="h-px w-3 bg-brass/30 transition-all duration-300 group-hover:w-5 group-hover:bg-brass" />
                      {service}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* ======================== Business lines + Newsletter ======================== */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
              className="lg:col-span-3"
            >
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-brass">
                Business Lines
              </h3>
              <span className="mt-3 block h-0.5 w-8 bg-brass/40" />

              <ul className="mt-6 space-y-3">
                {BUSINESS_LINES.slice(0, 6).map((line) => (
                  <li key={line}>
                    <a
                      href="#business-diversification"
                      className="group flex items-center gap-2 font-body text-[13.5px] text-paper/60 transition-colors duration-300 hover:text-brass"
                    >
                      <span className="h-px w-3 bg-brass/30 transition-all duration-300 group-hover:w-5 group-hover:bg-brass" />
                      {line}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* ============================= Bottom bar ============================= */}
        <div className="relative border-t border-charcoal/80">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row sm:px-8">
            <p className="font-body text-[12px] text-paper/40">
              © {year} HKB Protection & Management
              Company Limited. All rights reserved.
            </p>

            <div className="flex items-center gap-5">
              <span className="font-body text-[10px] uppercase tracking-[0.18em] text-paper/30">
                Registered · Licensed · Insured
              </span>
              <span className="hidden h-3 w-px bg-charcoal sm:block" />
              <a
                href="/terms"
                className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-paper/40 transition-colors hover:text-brass"
              >
                Terms and Condition
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ============================= Back to top ============================= */}
      <motion.button
        type="button"
        onClick={scrollTop}
        aria-label="Back to top"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.95 }}
        className="group fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center border border-charcoal bg-charcoal/80 text-paper/70 backdrop-blur-sm transition-colors duration-300 hover:border-brass/60 hover:bg-brass hover:text-ink sm:bottom-8 sm:right-8"
        style={{
          clipPath: "polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)",
        }}
      >
        <ArrowUp
          className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5"
          strokeWidth={1.75}
        />
      </motion.button>
    </footer>
  );
}