import {
  BarChart3,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Hidden from roles without this permission. */
  permission?: Permission;
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { title: "Inventory", path: "/inventory", icon: Package, permission: "inventory:read" },
      { title: "Service Jobs", path: "/service", icon: Wrench, permission: "jobs:read" },
      { title: "Attendance", path: "/attendance", icon: ClipboardCheck },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Customers", path: "/customers", icon: Users, permission: "customers:read" },
      { title: "Quotations", path: "/quotations", icon: FileSpreadsheet, permission: "sales:read" },
      { title: "Sales Orders", path: "/sales", icon: ShoppingCart, permission: "sales:read" },
      { title: "Invoices", path: "/invoices", icon: Receipt, permission: "invoices:read" },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Reports", path: "/reports", icon: BarChart3, permission: "invoices:read" },
      { title: "Users", path: "/users", icon: UserCog, permission: "users:manage" },
      { title: "Settings", path: "/settings", icon: Settings, permission: "settings:write" },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items);
