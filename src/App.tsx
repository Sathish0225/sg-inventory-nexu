import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
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
const UserManagement = lazy(() => import("@/components/UserManagement"));
const SettingsModule = lazy(() => import("@/components/SettingsModule"));

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider>
      <Sonner richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="service" element={<ServicePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="sales" element={<SalesOrdersPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="reports" element={<ReportsModule />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="settings" element={<SettingsModule />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
