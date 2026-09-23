// Role-based access, shared by the API (enforcement) and the web app (hiding what a role can't use).

export const roles = ["ADMIN", "MANAGER", "ACCOUNTS", "TECHNICIAN"] as const;
export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  ACCOUNTS: "Accounts",
  TECHNICIAN: "Technician",
};

export type Permission =
  | "inventory:read"
  | "inventory:write"
  | "jobs:read"
  /** Update jobs (technicians: only jobs assigned to them). */
  | "jobs:write"
  /** Create, reassign and delete jobs. */
  | "jobs:manage"
  | "attendance:read"
  /** Check in / out as yourself. */
  | "attendance:self"
  /** Check in / out on behalf of any technician, delete visits. */
  | "attendance:manage"
  | "customers:read"
  | "customers:write"
  | "sales:read"
  | "sales:write"
  | "invoices:read"
  | "invoices:write"
  | "settings:write"
  | "users:manage";

const all: Permission[] = [
  "inventory:read",
  "inventory:write",
  "jobs:read",
  "jobs:write",
  "jobs:manage",
  "attendance:read",
  "attendance:self",
  "attendance:manage",
  "customers:read",
  "customers:write",
  "sales:read",
  "sales:write",
  "invoices:read",
  "invoices:write",
  "settings:write",
  "users:manage",
];

export const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set(all),
  MANAGER: new Set(all.filter((p) => p !== "users:manage" && p !== "settings:write")),
  ACCOUNTS: new Set<Permission>([
    "inventory:read",
    "jobs:read",
    "attendance:read",
    "customers:read",
    "customers:write",
    "sales:read",
    "sales:write",
    "invoices:read",
    "invoices:write",
  ]),
  TECHNICIAN: new Set<Permission>(["inventory:read", "jobs:read", "jobs:write", "attendance:self", "customers:read"]),
};

export const can = (role: Role | undefined | null, permission: Permission): boolean =>
  Boolean(role && rolePermissions[role]?.has(permission));
