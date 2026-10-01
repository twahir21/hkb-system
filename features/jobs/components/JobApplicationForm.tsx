"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Send, Upload } from "lucide-react";
import {
  EDUCATION_LEVELS,
  JOB_DOCUMENT_ACCEPT,
  JOB_DOCUMENT_FIELDS,
  TRAINING_OPTIONS,
  WORK_STATIONS,
} from "@/features/jobs/validators/jobs.schema";
import {
  submitJobApplication,
  type JobApplicationState,
} from "@/features/jobs/actions/jobs.actions";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Kiume" },
  { value: "FEMALE", label: "Kike" },
] as const;

const TRAINING_LABELS: Record<(typeof TRAINING_OPTIONS)[number], string> = {
  JKU: "JKU — Jeshi la Kujenga Uchumi",
  JKT: "JKT — Jeshi la Kujenga Taifa",
  MGAMBO: "Mgambo",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-slate-500";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-rose-600">{message}</p>;
}

export default function JobApplicationForm() {
  const [state, formAction, pending] = useActionState<JobApplicationState, FormData>(
    submitJobApplication,
    { ok: false }
  );
  const [submitted, setSubmitted] = useState(false);

  const fieldErrors = state.fieldErrors ?? {};

  if (state.ok && submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h3 className="mt-4 font-display text-2xl font-semibold text-emerald-900">
          Maombi Yamepokelewa
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-emerald-800">
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Tuma maombi mpya
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setSubmitted(true);
      }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8"
    >
      <div className="mb-6 border-b border-slate-100 pb-5">
        <h3 className="font-display text-2xl font-semibold text-ink">
          Fomu ya Maombi ya Kazi
        </h3>
        <p className="mt-1.5 text-sm text-slate-500">
          Jaza taarifa zako zote chini. Sehemu zenye alama ya{" "}
          <span className="text-rose-600">*</span> ni lazima.
        </p>
      </div>

      {!state.ok && state.error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="fullName">
            Jina kamili <span className="text-rose-600">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            maxLength={255}
            placeholder="Mfano: Juma Hassan Juma"
            className={`mt-1.5 ${inputClass}`}
          />
          <FieldError message={fieldErrors.fullName} />
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Namba ya simu <span className="text-rose-600">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            maxLength={32}
            placeholder="Mfano: 0759789196"
            className={`mt-1.5 ${inputClass}`}
          />
          <FieldError message={fieldErrors.phone} />
        </div>

        <div>
          <label className={labelClass} htmlFor="email">
            Barua pepe (hiari)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={255}
            placeholder="Mfano: juma@email.com"
            className={`mt-1.5 ${inputClass}`}
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div>
          <label className={labelClass} htmlFor="age">
            Umri <span className="text-rose-600">*</span>
          </label>
          <input
            id="age"
            name="age"
            type="number"
            required
            min={18}
            max={40}
            placeholder="Miaka 18 – 40"
            className={`mt-1.5 ${inputClass}`}
          />
          <FieldError message={fieldErrors.age} />
        </div>

        <div>
          <label className={labelClass} htmlFor="gender">
            Jinsia <span className="text-rose-600">*</span>
          </label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className={`mt-1.5 ${inputClass}`}
          >
            <option value="" disabled>
              Chagua…
            </option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.gender} />
        </div>

        <div>
          <label className={labelClass} htmlFor="residence">
            Mkoa wa kuishi <span className="text-rose-600">*</span>
          </label>
          <input
            id="residence"
            name="residence"
            type="text"
            required
            maxLength={150}
            placeholder="Mfano: Dar es Salaam"
            className={`mt-1.5 ${inputClass}`}
          />
          <FieldError message={fieldErrors.residence} />
        </div>

        <div>
          <label className={labelClass} htmlFor="educationLevel">
            Elimu <span className="text-rose-600">*</span>
          </label>
          <select
            id="educationLevel"
            name="educationLevel"
            required
            defaultValue=""
            className={`mt-1.5 ${inputClass}`}
          >
            <option value="" disabled>
              Chagua…
            </option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.educationLevel} />
        </div>

        <div>
          <label className={labelClass} htmlFor="training">
            Mafunzo uliyopita <span className="text-rose-600">*</span>
          </label>
          <select
            id="training"
            name="training"
            required
            defaultValue=""
            className={`mt-1.5 ${inputClass}`}
          >
            <option value="" disabled>
              Chagua…
            </option>
            {TRAINING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {TRAINING_LABELS[option]}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.training} />
        </div>

        <div>
          <label className={labelClass} htmlFor="preferredStation">
            Eneo la kazi unalopendelea <span className="text-rose-600">*</span>
          </label>
          <select
            id="preferredStation"
            name="preferredStation"
            required
            defaultValue=""
            className={`mt-1.5 ${inputClass}`}
          >
            <option value="" disabled>
              Chagua…
            </option>
            {WORK_STATIONS.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.preferredStation} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Maelezo ya ziada (hiari)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Uzoefu wa kazi, nafasi ulizofanya kazi kabla, n.k."
            className={`mt-1.5 ${inputClass}`}
          />
          <FieldError message={fieldErrors.notes} />
        </div>
      </div>

      {/* Viambatanisho */}
      <div className="mt-8 rounded-2xl border border-brass/30 bg-brand-50/60 p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-brand-700" />
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Viambatanisho <span className="text-rose-600">*</span>
          </h4>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Pakia kila faili. Kila faili uwe MB 2 au chini (barua ya maombi lazima iwe
          PDF).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {JOB_DOCUMENT_FIELDS.map((doc) => (
            <div key={doc.name}>
              <label
                className={labelClass}
                htmlFor={doc.name}
              >
                {doc.label} <span className="text-rose-600">*</span>
              </label>
              <input
                id={doc.name}
                name={doc.name}
                type="file"
                required
                accept={doc.pdfOnly ? "application/pdf" : JOB_DOCUMENT_ACCEPT}
                className="mt-1.5 block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-200"
              />
              <FieldError message={fieldErrors[doc.name]} />
            </div>
          ))}
        </div>
      </div>

      <input type="hidden" name="source" value="jobs-page" />

      <button
        type="submit"
        disabled={pending}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-body text-sm font-semibold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Inatuma maombi…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Tuma Maombi
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-slate-400">
        Kwa maswali piga: 0759789196 au 0756006679
      </p>
    </form>
  );
}
