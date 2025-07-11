
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Wrench, 
  BarChart3, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  MapPin,
  Scan,
  FileText,
  Settings,
  Bell
} from "lucide-react";
import Dashboard from "@/components/Dashboard";
import InventoryModule from "@/components/InventoryModule";
import ServiceModule from "@/components/ServiceModule";
import ReportsModule from "@/components/ReportsModule";
import UserManagement from "@/components/UserManagement";
import SettingsModule from "@/components/SettingsModule";
import NotificationSystem from "@/components/NotificationSystem";
import { toast } from "sonner";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user] = useState({
    name: "John Tan",
    role: "Admin",
    company: "Singapore Tech Solutions Pte Ltd"
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">InvenTrack SG</h1>
                  <p className="text-xs text-gray-500">Inventory & Service Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationSystem />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center space-x-2">
              <Wrench className="h-4 w-4" />
              <span>Service</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Reports</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryModule />
          </TabsContent>

          <TabsContent value="service" className="space-y-6">
            <ServiceModule />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsModule />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SettingsModule />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>© 2024 InvenTrack SG. Built for Singapore businesses.</p>
            <div className="flex items-center space-x-4">
              <span>SGT +8 | GST Ready</span>
              <span>🇸🇬</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
