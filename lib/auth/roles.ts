/**
 * Single source of truth for user roles. Plain module (no DB imports) so it
 * is safe in client components. `lib/db/schema.ts` builds the `user_role`
 * Postgres enum from this list — adding a role here also needs a migration.
 */
export const ROLE_VALUES = [
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "SENIOR_SUPERVISOR",
  "OPERATION_OFFICER",
  "SUPERVISOR",
  "IN_CHARGE",
  "HR",
  "BURSAR",
  "STOREKEEPER",
  "SECRETARY",
  "OFFICE_ASSISTANT",
  "GUARD",
] as const;

export type RoleValue = (typeof ROLE_VALUES)[number];
