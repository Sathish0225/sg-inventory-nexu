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

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { title: "Inventory", path: "/inventory", icon: Package },
      { title: "Service Jobs", path: "/service", icon: Wrench },
      { title: "Attendance", path: "/attendance", icon: ClipboardCheck },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Customers", path: "/customers", icon: Users },
      { title: "Quotations", path: "/quotations", icon: FileSpreadsheet },
      { title: "Sales Orders", path: "/sales", icon: ShoppingCart },
      { title: "Invoices", path: "/invoices", icon: Receipt },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Reports", path: "/reports", icon: BarChart3 },
      { title: "Users", path: "/users", icon: UserCog },
      { title: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items);
