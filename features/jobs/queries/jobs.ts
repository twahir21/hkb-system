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
  training: string;
  preferredStation: string;
  notes: string | null;
  letterUrl: string;
  certificatesUrl: string;
  cvUrl: string;
  refereesUrl: string;
  healthUrl: string;
  conductUrl: string;
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
      preferredStation: jobApplications.preferredStation,
      notes: jobApplications.notes,
      letterUrl: jobApplications.letterUrl,
      certificatesUrl: jobApplications.certificatesUrl,
      cvUrl: jobApplications.cvUrl,
      refereesUrl: jobApplications.refereesUrl,
      healthUrl: jobApplications.healthUrl,
      conductUrl: jobApplications.conductUrl,
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
