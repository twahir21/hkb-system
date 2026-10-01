import type { Metadata } from "next";
import {
  BadgeCheck,
  FileText,
  GraduationCap,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import JobApplicationForm from "@/features/jobs/components/JobApplicationForm";
import {
  OFFICE_ADDRESS,
  OFFICE_MAP_URL,
  RECRUITMENT_PHONES,
  RECRUITMENT_PHONE_TELS,
} from "@/const/links.const";

export const metadata: Metadata = {
  title: "Nafasi za Ajira — Walinzi 100 | HKB Protection & Management",
  description:
    "Tangazo la ajira: nafasi 100 za walinzi. Dar es Salaam, Dodoma na Morogoro. Sifa: umri miaka 18–40, mafunzo JKU/JKT/Mgambo, elimu darasa la saba na kuendelea. Tuma maombi mtandaoni.",
};

const REQUIREMENTS = [
  "Awe raia wa Tanzania kwa kufuata sheria za nchi.",
  "Awe na umri kati ya miaka 18 hadi 40.",
  "Amepita mafunzo ya JKU, JKT au Mgambo.",
  "Awe na elimu kuanzia darasa la saba na kuendelea.",
  "Awe na tabia njema na hana kesi za jinai.",
  "Awe na afya njema (hana ugonjwa unaomzuia kufanya kazi).",
];

const STATIONS = ["Dar es Salaam", "Dodoma", "Morogoro"];

const ATTACHMENTS = [
  "Barua ya maombi ya kazi (PDF, chini ya MB 2)",
  "Vyeti vya taaluma",
  "CV (Wasifu wa muombaji)",
  "Kitambulisho cha mdamini (wawili)",
  "Hati ya afya njema",
  "Hati ya tabia njema",
];

export default function JobsPage() {
  return (
    <>
      <Navbar />

      {/* Poster hero */}
      <header className="relative overflow-hidden bg-ink bg-grid-ink">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-30%] h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brass/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-4 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-brass">
            <Users className="h-3.5 w-3.5" /> Tangazo la Ajira
          </span>

          <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold uppercase leading-[1.05] tracking-wide text-paper sm:text-6xl">
            Nafasi za Ajira: <span className="text-brass">Walinzi 100</span>
          </h1>

          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-paper/70">
            HKB Protection &amp; Management Company Limited inawakaribisha
            Watanzania wenye nia ya kazi ya ulinzi kuomba nafasi 100 za walinzi
            kwa mwaka huu.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {STATIONS.map((station) => (
              <span
                key={station}
                className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-paper/5 px-3.5 py-1.5 text-xs font-medium text-paper/80"
              >
                <MapPin className="h-3.5 w-3.5 text-brass" /> {station}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Poster body + application form */}
      <main className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-ink p-6 shadow-xl sm:p-8">
              <div className="flex items-center gap-2.5 border-b border-brass/25 pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brass/15">
                  <BadgeCheck className="h-4 w-4 text-brass" />
                </span>
                <h3 className="font-display text-base font-semibold uppercase tracking-[0.12em] text-paper">
                  Sifa za Walinzi
                </h3>
              </div>
              <ul className="mt-4 space-y-3">
                {REQUIREMENTS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 font-body text-sm leading-relaxed text-paper/80"
                  >
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                  <FileText className="h-4 w-4 text-brand-700" />
                </span>
                <h3 className="font-display text-base font-semibold uppercase tracking-[0.12em] text-ink">
                  Viambatanisho
                </h3>
              </div>
              <ol className="mt-4 space-y-2.5">
                {ATTACHMENTS.map((item, index) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 font-body text-sm text-slate-600"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                      {index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Kila kiambatanisho kisichozidi MB 2. Barua ya maombi lazima iwe
                faili ya PDF.
              </p>
            </section>

            {/* Contact card */}
            <section className="rounded-3xl border border-brass/30 bg-charcoal p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2.5 border-b border-brass/25 pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brass/15">
                  <MapPin className="h-4 w-4 text-brass" />
                </span>
                <h3 className="font-display text-base font-semibold uppercase tracking-[0.12em] text-paper">
                  Wasiliana Nasi
                </h3>
              </div>

              <div className="mt-4 space-y-4 font-body text-sm text-paper/80">
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
                  <span>
                    {OFFICE_ADDRESS}
                    <a
                      href={OFFICE_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline font-semibold text-brass underline-offset-2 hover:underline"
                    >
                      Fuatilia ramani (Google Maps)
                    </a>
                  </span>
                </p>

                <ul className="space-y-2">
                  {RECRUITMENT_PHONES.map((phone, index) => (
                    <li key={phone} className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 shrink-0 text-brass" />
                      <a
                        href={RECRUITMENT_PHONE_TELS[index]}
                        className="font-semibold text-paper hover:text-brass"
                      >
                        {phone}
                      </a>
                      {index === 0 && (
                        <span className="text-xs text-paper/40">(mkuu)</span>
                      )}
                    </li>
                  ))}
                </ul>

                <p className="rounded-xl bg-paper/5 px-3.5 py-2.5 text-xs leading-relaxed text-paper/60">
                  Au fika moja kwa moja ofisini iliyo{" "}
                  <span className="text-paper/85">{OFFICE_ADDRESS}</span> —
                  Jumatatu hadi Jumamosi, saa 1:00 asubuhi hadi saa 11 jioni.
                </p>
              </div>
            </section>
          </div>

          {/* Application form */}
          <div>
            <div className="lg:sticky lg:top-24">
              <JobApplicationForm />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
