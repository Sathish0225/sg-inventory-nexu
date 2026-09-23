import { lazy, type ReactElement } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import AuthGate from "@/components/layout/AuthGate";
import RequirePermission from "@/components/layout/RequirePermission";
import type { Permission } from "@/lib/permissions";
import NotFound from "./pages/NotFound";

// Each module is its own chunk so the first load only pays for the page being opened.
const Dashboard = lazy(() => import("@/components/Dashboard"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const QuotationsPage = lazy(() => import("./pages/QuotationsPage"));
const SalesOrdersPage = lazy(() => import("./pages/SalesOrdersPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const ReportsModule = lazy(() => import("@/components/ReportsModule"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const SettingsModule = lazy(() => import("@/components/SettingsModule"));

const guarded = (permission: Permission, element: ReactElement) => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider>
      <Sonner richColors closeButton />
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={guarded("inventory:read", <InventoryPage />)} />
              <Route path="service" element={guarded("jobs:read", <ServicePage />)} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="customers" element={guarded("customers:read", <CustomersPage />)} />
              <Route path="quotations" element={guarded("sales:read", <QuotationsPage />)} />
              <Route path="sales" element={guarded("sales:read", <SalesOrdersPage />)} />
              <Route path="invoices" element={guarded("invoices:read", <InvoicesPage />)} />
              <Route path="reports" element={guarded("invoices:read", <ReportsModule />)} />
              <Route path="users" element={guarded("users:manage", <UsersPage />)} />
              <Route path="settings" element={guarded("settings:write", <SettingsModule />)} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
