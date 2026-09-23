import { NavLink, useLocation } from "react-router-dom";
import { Package } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { invoiceDisplayStatus, stockStatus } from "@/lib/calc";
import { can } from "@/lib/permissions";
import { useStore } from "@/store/useStore";
import { navGroups } from "./nav";

/** Small counters next to nav items so attention-worthy work is visible from anywhere. */
const useNavBadges = (): Record<string, number> => {
  const inventory = useStore((s) => s.inventory);
  const invoices = useStore((s) => s.invoices);
  const attendance = useStore((s) => s.attendance);
  return {
    "/inventory": inventory.filter((i) => ["Low Stock", "Out of Stock"].includes(stockStatus(i))).length,
    "/invoices": invoices.filter((i) => invoiceDisplayStatus(i) === "Overdue").length,
    "/attendance": attendance.filter((a) => !a.checkOut).length,
  };
};

const AppSidebar = () => {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const companyName = useStore((s) => s.settings.name);
  const badges = useNavBadges();
  const role = useStore((s) => s.user?.role);
  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(role, i.permission)) }))
    .filter((g) => g.items.length > 0);

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold leading-tight">InvenTrack SG</p>
            <p className="truncate text-xs text-muted-foreground">{companyName}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.title}>
                      <NavLink to={item.path} end={item.path === "/"} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {badges[item.path] > 0 && <SidebarMenuBadge>{badges[item.path]}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">SGT +8 · GST ready</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
