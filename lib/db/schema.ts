import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  date,
  text,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "SENIOR_SUPERVISOR",
  "SUPERVISOR",
  "HR",
  "BURSAR",
  "GUARD",
]);

export const shiftTypeEnum = pgEnum("shift_type", ["DAY", "NIGHT"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["PRESENT", "ABSENT"]);
export const absenceCategoryEnum = pgEnum("absence_category", [
  "SICK",
  "PERMITTED_REASON",
  "NOT_PERMITTED",
]);
export const transferStatusEnum = pgEnum("transfer_status", ["PENDING", "APPROVED", "REJECTED"]);

// Core Users Table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: text("password_hash"),
  googleId: varchar("google_id", { length: 255 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  role: roleEnum("role").notNull().default("GUARD"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Guard Profiles (extends user data; contains PII — role gated)
export const guardProfiles = pgTable("guard_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  age: integer("age").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  homeLocation: varchar("home_location", { length: 255 }).notNull(),
  workLocation: varchar("work_location", { length: 255 }).notNull(),
  kinName: varchar("kin_name", { length: 255 }).notNull(),
  kinRelation: varchar("kin_relation", { length: 100 }).notNull(),
  kinPhone: varchar("kin_phone", { length: 20 }).notNull(),
  registrationDate: date("registration_date").notNull(),
  assignedSupervisorId: uuid("assigned_supervisor_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Per-shift attendance logs (one row per (guard, date, shift))
export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guardId: uuid("guard_id")
      .references(() => guardProfiles.id, { onDelete: "cascade" })
      .notNull(),
    supervisorId: uuid("supervisor_id")
      .references(() => users.id)
      .notNull(),
    date: date("date").notNull(),
    shift: shiftTypeEnum("shift").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    absenceCategory: absenceCategoryEnum("absence_category"),
    allowedDays: integer("allowed_days"),
    reason: text("reason"),
    documentUrl: text("document_url"), // Firebase file URL for sick notes
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("attendance_logs_guard_date_shift_unique").on(
      table.guardId,
      table.date,
      table.shift
    ),
    uniqueIndex("attendance_logs_date_shift_idx").on(table.date, table.shift),
  ]
);

// Guard transfer requests
export const transferRequests = pgTable("transfer_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  guardId: uuid("guard_id")
    .references(() => guardProfiles.id, { onDelete: "cascade" })
    .notNull(),
  fromSupervisorId: uuid("from_supervisor_id").references(() => users.id).notNull(),
  toSupervisorId: uuid("to_supervisor_id").references(() => users.id).notNull(),
  requestedBy: uuid("requested_by").references(() => users.id).notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  status: transferStatusEnum("status").default("PENDING").notNull(),
  reason: text("reason").notNull(),
  reviewerNotes: text("reviewer_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit trail for compliance / payroll dispute resolution
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Role = (typeof roleEnum.enumValues)[number];
export type ShiftType = (typeof shiftTypeEnum.enumValues)[number];
export type AttendanceStatus = (typeof attendanceStatusEnum.enumValues)[number];
export type AbsenceCategory = (typeof absenceCategoryEnum.enumValues)[number];
export type TransferStatus = (typeof transferStatusEnum.enumValues)[number];