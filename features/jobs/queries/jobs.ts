import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobApplications, users } from "@/lib/db/schema";
import type { JobApplicationStatus } from "@/lib/db/schema";

export type JobApplicationRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  age: number;
  gender: string;
  residence: string;
  educationLevel: string;
  training: string | null;
  notes: string | null;
  letterUrl: string;
  certificatesUrl: string | null;
  cvUrl: string;
  refereesUrl: string | null;
  healthUrl: string;
  conductUrl: string;
  passportUrl: string;
  localGovLetterUrl: string;
  mdhamini1LocalGovUrl: string;
  mdhamini1NidaUrl: string;
  mdhamini1SponsorUrl: string;
  mdhamini2LocalGovUrl: string;
  mdhamini2NidaUrl: string;
  mdhamini2SponsorUrl: string;
  status: JobApplicationStatus;
  internalNotes: string | null;
  handledByName: string | null;
  createdAt: Date;
};

export async function listJobApplications(
  status?: JobApplicationStatus,
  limit = 500
): Promise<JobApplicationRow[]> {
  const rows = await db
    .select({
      id: jobApplications.id,
      fullName: jobApplications.fullName,
      phone: jobApplications.phone,
      email: jobApplications.email,
      age: jobApplications.age,
      gender: jobApplications.gender,
      residence: jobApplications.residence,
      educationLevel: jobApplications.educationLevel,
      training: jobApplications.training,
      notes: jobApplications.notes,
      letterUrl: jobApplications.letterUrl,
      certificatesUrl: jobApplications.certificatesUrl,
      cvUrl: jobApplications.cvUrl,
      refereesUrl: jobApplications.refereesUrl,
      healthUrl: jobApplications.healthUrl,
      conductUrl: jobApplications.conductUrl,
      passportUrl: jobApplications.passportUrl,
      localGovLetterUrl: jobApplications.localGovLetterUrl,
      mdhamini1LocalGovUrl: jobApplications.mdhamini1LocalGovUrl,
      mdhamini1NidaUrl: jobApplications.mdhamini1NidaUrl,
      mdhamini1SponsorUrl: jobApplications.mdhamini1SponsorUrl,
      mdhamini2LocalGovUrl: jobApplications.mdhamini2LocalGovUrl,
      mdhamini2NidaUrl: jobApplications.mdhamini2NidaUrl,
      mdhamini2SponsorUrl: jobApplications.mdhamini2SponsorUrl,
      status: jobApplications.status,
      internalNotes: jobApplications.internalNotes,
      handledByName: users.fullName,
      createdAt: jobApplications.createdAt,
    })
    .from(jobApplications)
    .leftJoin(users, eq(jobApplications.handledById, users.id))
    .where(status ? eq(jobApplications.status, status) : undefined)
    .orderBy(desc(jobApplications.createdAt))
    .limit(limit);

  return rows;
}
