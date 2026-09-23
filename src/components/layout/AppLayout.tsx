import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationSystem from "@/components/NotificationSystem";
import AppSidebar from "./AppSidebar";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { allNavItems } from "./nav";

const PageFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
    <Skeleton className="h-80" />
  </div>
);

const AppLayout = () => {
  const { pathname } = useLocation();
  const title =
    allNavItems.find((i) => (i.path === "/" ? pathname === "/" : pathname.startsWith(i.path)))?.title ?? "";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="pt-safe sticky top-0 z-20 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <h1 className="truncate text-sm font-medium">{title}</h1>
          <div className="ml-auto flex items-center gap-1">
            <NotificationSystem />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
