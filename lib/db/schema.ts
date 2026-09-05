import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  date,
  text,
  boolean,
  numeric,
  index,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "SENIOR_SUPERVISOR",
  "SUPERVISOR",
  "HR",
  "BURSAR",
  "STOREKEEPER",
  "GUARD",
]);

export const shiftTypeEnum = pgEnum("shift_type", ["DAY", "NIGHT"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["PRESENT", "ABSENT", "LATE"]);
export const absenceCategoryEnum = pgEnum("absence_category", [
  "SICK",
  "PERMITTED_REASON",
  "NOT_PERMITTED",
]);
export const transferStatusEnum = pgEnum("transfer_status", ["PENDING", "APPROVED", "REJECTED"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "IN", // Stock bought / received into the main store
  "ISSUED", // Stock given to a station / storekeeper
  "OUT", // Stock handed out to end users (consumed)
  "RETURNED", // Stock returned from a station / storekeeper
  "LOST", // Recorded loss
  "TRANSFER", // Station ↔ station / region ↔ region transfer
  "ADJUSTMENT", // Stock-take correction
]);
export const creditTypeEnum = pgEnum("credit_type", [
  "FISH", // Fish taken from the office fish business
  "MAIZE_FLOUR", // Maize flour taken from the office flour business
  "MEDICAL", // Medical treatment given on credit
  "OTHER", // Anything else lent on credit
]);
export const creditStatusEnum = pgEnum("credit_status", [
  "OUTSTANDING", // Still owed — will be deducted from salary
  "DEDUCTED", // Cut from salary by the bursar
  "WRITTEN_OFF", // Cancelled (e.g. approved by the office)
]);
export const saleTypeEnum = pgEnum("sale_type", ["CASH", "CREDIT_GUARD"]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "RESTOCK", // Buying new stock for the business
  "TRANSPORT",
  "OTHER",
]);


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
    minutesLate: integer("minutes_late"),
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
    // Non-unique: only speeds up per-shift lookups. (Was incorrectly UNIQUE,
    // which allowed only ONE guard's log per shift per day.)
    index("attendance_logs_date_shift_idx").on(table.date, table.shift),
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

// ─────────────────────────────────────────────────────────────────────────────
// Store Management
// ─────────────────────────────────────────────────────────────────────────────

// Regions group stations geographically / operationally.
export const regions = pgTable("regions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stations are physical outposts inside a region. Each may map to a
// supervisor who oversees its guards.
export const stations = pgTable(
  "stations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    regionId: uuid("region_id")
      .references(() => regions.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    supervisorId: uuid("supervisor_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("stations_region_name_unique").on(table.regionId, table.name)]
);

// Stockable items (uniforms, boots, torches, ...).
export const storeItems = pgTable("store_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  unit: varchar("unit", { length: 50 }).notNull().default("pcs"),
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Movement ledger — every stock change is a row here.
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .references(() => storeItems.id, { onDelete: "restrict" })
      .notNull(),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    fromStationId: uuid("from_station_id").references(() => stations.id, {
      onDelete: "set null",
    }),
    toStationId: uuid("to_station_id").references(() => stations.id, {
      onDelete: "set null",
    }),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }), // purchases only
    reference: varchar("reference", { length: 150 }), // supplier / invoice / note ref
    reason: text("reason"), // mandatory for LOST / ADJUSTMENT
    returnedMovementId: uuid("returned_movement_id"), // links RETURNED → original ISSUED
    transferId: uuid("transfer_id"), // set when part of a stock transfer
    performedBy: uuid("performed_by")
      .references(() => users.id)
      .notNull(),
    receivedBy: uuid("received_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("stock_movements_item_created_idx").on(table.itemId, table.createdAt),
    index("stock_movements_type_idx").on(table.type),
    index("stock_movements_from_station_idx").on(table.fromStationId),
    index("stock_movements_to_station_idx").on(table.toStationId),
  ]
);

// Station ↔ station stock transfer requests (approval flow like HR transfers).
export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .references(() => storeItems.id, { onDelete: "restrict" })
    .notNull(),
  fromStationId: uuid("from_station_id")
    .references(() => stations.id, { onDelete: "cascade" })
    .notNull(),
  toStationId: uuid("to_station_id")
    .references(() => stations.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").notNull(),
  status: transferStatusEnum("status").default("PENDING").notNull(),
  requestedBy: uuid("requested_by")
    .references(() => users.id)
    .notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  reason: text("reason").notNull(),
  reviewerNotes: text("reviewer_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Denormalized current quantity per item per station for fast reporting.
export const stockBalances = pgTable(
  "stock_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .references(() => storeItems.id, { onDelete: "cascade" })
      .notNull(),
    stationId: uuid("station_id")
      .references(() => stations.id, { onDelete: "cascade" })
      .notNull(),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("stock_balances_item_station_unique").on(table.itemId, table.stationId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Office Businesses (fish & maize flour) + Guard Credit / Debts
// ─────────────────────────────────────────────────────────────────────────────

// A business run by the office (e.g. Fish, Maize Flour). Guards can take goods
// or medical treatment on credit; the office tracks sales/expenses/profit.
export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  unit: varchar("unit", { length: 50 }).notNull().default("pcs"),
  buyPrice: numeric("buy_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sellPrice: numeric("sell_price", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Denormalized on-hand quantity per business (kept in sync by sales/restocks).
export const businessStock = pgTable(
  "business_stock",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("0"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("business_stock_business_unique").on(table.businessId)]
);

// Every credit entry owed by a guard — goods taken from an office business
// (FISH / MAIZE_FLOUR) or medical treatment given on credit. At month end the
// bursar deducts OUTSTANDING amounts from the guard's salary.
export const guardCredits = pgTable(
  "guard_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guardId: uuid("guard_id")
      .references(() => guardProfiles.id, { onDelete: "cascade" })
      .notNull(),
    type: creditTypeEnum("type").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }), // goods only
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    date: date("date").notNull(),
    status: creditStatusEnum("status").notNull().default("OUTSTANDING"),
    deductionMonth: varchar("deduction_month", { length: 7 }), // "YYYY-MM" when deducted
    deductedBy: uuid("deducted_by").references(() => users.id, { onDelete: "set null" }),
    deductedAt: timestamp("deducted_at"),
    notes: text("notes"),
    documentUrl: text("document_url"), // optional medical receipt / doctor's note
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
    recordedBy: uuid("recorded_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("guard_credits_guard_status_idx").on(table.guardId, table.status),
    index("guard_credits_status_idx").on(table.status),
    index("guard_credits_deduction_month_idx").on(table.deductionMonth),
  ]
);

// Sales ledger for office businesses. CREDIT_GUARD sales also create a
// guard_credits debt (linked via guardCreditId).
export const businessSales = pgTable(
  "business_sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "restrict" })
      .notNull(),
    date: date("date").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    saleType: saleTypeEnum("sale_type").notNull().default("CASH"),
    guardCreditId: uuid("guard_credit_id").references(() => guardCredits.id, {
      onDelete: "set null",
    }),
    recordedBy: uuid("recorded_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("business_sales_business_date_idx").on(table.businessId, table.date),
  ]
);

// Expense ledger: restock purchases (with optional quantity), transport, etc.
export const businessExpenses = pgTable(
  "business_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "restrict" })
      .notNull(),
    date: date("date").notNull(),
    category: expenseCategoryEnum("category").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }), // restock only
    recordedBy: uuid("recorded_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("business_expenses_business_date_idx").on(table.businessId, table.date),
  ]
);

export type Role = (typeof roleEnum.enumValues)[number];
export type ShiftType = (typeof shiftTypeEnum.enumValues)[number];
export type AttendanceStatus = (typeof attendanceStatusEnum.enumValues)[number];
export type AbsenceCategory = (typeof absenceCategoryEnum.enumValues)[number];
export type TransferStatus = (typeof transferStatusEnum.enumValues)[number];
export type StockMovementType = (typeof stockMovementTypeEnum.enumValues)[number];
export type StoreItem = (typeof storeItems.$inferSelect);
export type StockMovement = (typeof stockMovements.$inferSelect);
export type StockTransfer = (typeof stockTransfers.$inferSelect);
export type StockBalance = (typeof stockBalances.$inferSelect);
export type Region = (typeof regions.$inferSelect);
export type Station = (typeof stations.$inferSelect);
export type Business = (typeof businesses.$inferSelect);
export type GuardCredit = (typeof guardCredits.$inferSelect);
export type BusinessSale = (typeof businessSales.$inferSelect);
export type BusinessExpense = (typeof businessExpenses.$inferSelect);
export type CreditType = (typeof creditTypeEnum.enumValues)[number];
export type CreditStatus = (typeof creditStatusEnum.enumValues)[number];
export type SaleType = (typeof saleTypeEnum.enumValues)[number];
export type ExpenseCategory = (typeof expenseCategoryEnum.enumValues)[number];