import { z } from "zod";

/**
 * Validators for the public /jobs application (Nafasi za Ajira — Walinzi 100).
 * Error messages are in Kiswahili because the whole page is Swahili-facing;
 * they are surfaced directly to the applicant by the form.
 */

export const JOB_APPLICATION_STATUSES = [
  "NEW",
  "IN_REVIEW",
  "SHORTLISTED",
  "HIRED",
  "REJECTED",
] as const;

export const EDUCATION_LEVELS = [
  "Darasa la Saba",
  "Kidato cha Nne",
  "Kidato cha Sita",
  "Chuo / Zaidi ya Kidato cha Sita",
] as const;

export const TRAINING_OPTIONS = ["JKU", "JKT", "MGAMBO"] as const;

/* -------------------------------------------------------------------------- */
/*  Viambatanisho (attachments) — shared by the client form and the action     */
/* -------------------------------------------------------------------------- */

/** 2 MB ceiling for every uploaded document (poster: "PDF < 2MB"). */
export const JOB_DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;
export const JOB_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

export type JobDocumentField = {
  /** FormData field name (also the column suffix in job_applications). */
  name: string;
  /** Kiswahili label shown on the poster and beside the file input. */
  label: string;
  /** `letterFile` must be a PDF per the poster; others may be PDF/JPG/PNG. */
  pdfOnly: boolean;
};

export const JOB_DOCUMENT_FIELDS: JobDocumentField[] = [
  {
    name: "letterFile",
    label: "Barua ya maombi ya kazi",
    pdfOnly: true,
  },
  {
    name: "localGovLetterFile",
    label: "Barua ya utambulisho wa serikali za mitaa",
    pdfOnly: false,
  },
  {
    name: "certificatesFile",
    label: "Vyeti vya taaluma",
    pdfOnly: false,
  },
  {
    name: "cvFile",
    label: "CV (Wasifu wa muombaji)",
    pdfOnly: false,
  },
  {
    name: "passportFile",
    label: "Picha ya pasipoti (passport size)",
    pdfOnly: false,
  },
  {
    name: "refereesFile",
    label: "Kitambulisho cha mdhamini (wawili)",
    pdfOnly: false,
  },
  {
    name: "healthFile",
    label: "Hati ya afya njema",
    pdfOnly: false,
  },
  {
    name: "conductFile",
    label: "Hati ya tabia njema",
    pdfOnly: false,
  },
];

/** Accept attribute shared by the eight file inputs. */
export const JOB_DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

/** Returns a Kiswahili error message, or null when the file is acceptable. */
export function isAllowedJobDocument(
  file: { type: string; size: number },
  pdfOnly: boolean
): string | null {
  const allowed = pdfOnly
    ? ["application/pdf"]
    : [...JOB_DOCUMENT_MIME_TYPES];
  if (!allowed.includes(file.type as (typeof JOB_DOCUMENT_MIME_TYPES)[number])) {
    return pdfOnly
      ? "Lazima iwe faili ya PDF."
      : "Lazima iwe faili ya PDF, PNG au JPG.";
  }
  if (file.size > JOB_DOCUMENT_MAX_BYTES) {
    return "Faili ni kubwa mno (kiwango cha juu ni MB 2).";
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Application payload                                                       */
/* -------------------------------------------------------------------------- */

const phoneRegex = /^\+?[0-9][0-9\s\-()]{6,25}$/;

export const jobApplicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Jina kamili linahitajika.")
    .max(255, "Jina ni ndefu mno."),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Weka namba sahihi ya simu (mfano 0712345678).")
    .max(32),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Barua pepe si sahihi.")
    .max(255)
    .optional()
    .or(z.literal("")),
  age: z.coerce
    .number({ error: "Weka umri sahihi." })
    .int("Weka umri sahihi.")
    .min(18, "Umri uwe kuanzia miaka 18 hadi 40.")
    .max(40, "Umri uwe kuanzia miaka 18 hadi 40."),
  gender: z.enum(["MALE", "FEMALE"], { error: "Chagua jinsia." }),
  residence: z
    .string()
    .trim()
    .min(2, "Mkoa wa kuishi unahitajika.")
    .max(150),
  educationLevel: z.enum(EDUCATION_LEVELS, { error: "Chagua kiwango cha elimu." }),
  training: z
    .enum(TRAINING_OPTIONS, { error: "Chagua mafunzo uliyopita (JKU, JKT au Mgambo)." })
    .optional(),
  source: z.string().trim().max(100).optional(),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;

/** Payload for HR / Super Admin managing an application from the dashboard. */
export const jobApplicationUpdateSchema = z.object({
  status: z.enum(JOB_APPLICATION_STATUSES, { error: "Hali si sahihi." }),
  internalNotes: z.string().trim().max(5000, "Maelezo ni ndefu mno.").optional(),
});
