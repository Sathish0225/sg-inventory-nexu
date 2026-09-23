
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Building, 
  Users, 
  Bell, 
  Shield, 
  Database,
  Palette,
  Globe,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import CompanySettingsCard from "@/components/settings/CompanySettingsCard";
import DataManagementCard from "@/components/settings/DataManagementCard";

const SettingsModule = () => {
  const [systemSettings, setSystemSettings] = useState({
    lowStockThreshold: 20,
    autoNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    backupFrequency: "daily",
    timezone: "Asia/Singapore",
    dateFormat: "DD/MM/YYYY",
    currency: "SGD"
  });

  const [userSettings, setUserSettings] = useState({
    defaultRole: "Technician",
    sessionTimeout: 60,
    passwordPolicy: "strong",
    twoFactorAuth: false
  });

  const handleSaveSystem = () => {
    toast.success("System settings saved successfully");
  };

  const handleSaveUser = () => {
    toast.success("User settings saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Settings</h2>
          <p className="text-muted-foreground">Configure system preferences and company information</p>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="company" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Company</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>System</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <CompanySettingsCard />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>Configure system-wide settings and defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lowStock">Low Stock Threshold</Label>
                  <Input
                    id="lowStock"
                    type="number"
                    value={systemSettings.lowStockThreshold}
                    onChange={(e) => setSystemSettings({...systemSettings, lowStockThreshold: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={systemSettings.timezone}
                    onChange={(e) => setSystemSettings({...systemSettings, timezone: e.target.value})}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (GMT+8)</option>
                    <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <select
                    id="dateFormat"
                    value={systemSettings.dateFormat}
                    onChange={(e) => setSystemSettings({...systemSettings, dateFormat: e.target.value})}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Singapore)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="SGD">Singapore Dollar (SGD)</option>
                    <option value="MYR">Malaysian Ringgit (MYR)</option>
                    <option value="USD">US Dollar (USD)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="backup">Backup Frequency</Label>
                <select
                  id="backup"
                  value={systemSettings.backupFrequency}
                  onChange={(e) => setSystemSettings({...systemSettings, backupFrequency: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <Button onClick={handleSaveSystem}>Save System Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoNotif">Automatic Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for system events</p>
                  </div>
                  <input
                    id="autoNotif"
                    type="checkbox"
                    checked={systemSettings.autoNotifications}
                    onChange={(e) => setSystemSettings({...systemSettings, autoNotifications: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotif">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <input
                    id="emailNotif"
                    type="checkbox"
                    checked={systemSettings.emailNotifications}
                    onChange={(e) => setSystemSettings({...systemSettings, emailNotifications: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smsNotif">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                  </div>
                  <input
                    id="smsNotif"
                    type="checkbox"
                    checked={systemSettings.smsNotifications}
                    onChange={(e) => setSystemSettings({...systemSettings, smsNotifications: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveSystem}>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and access control settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={userSettings.sessionTimeout}
                    onChange={(e) => setUserSettings({...userSettings, sessionTimeout: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="passwordPolicy">Password Policy</Label>
                  <select
                    id="passwordPolicy"
                    value={userSettings.passwordPolicy}
                    onChange={(e) => setUserSettings({...userSettings, passwordPolicy: e.target.value})}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="basic">Basic (6+ characters)</option>
                    <option value="medium">Medium (8+ chars, mixed case)</option>
                    <option value="strong">Strong (12+ chars, mixed case, numbers, symbols)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                </div>
                <input
                  id="twoFactor"
                  type="checkbox"
                  checked={userSettings.twoFactorAuth}
                  onChange={(e) => setUserSettings({...userSettings, twoFactorAuth: e.target.checked})}
                  className="h-4 w-4"
                />
              </div>
              
              <Button onClick={handleSaveUser}>Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <DataManagementCard />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Defaults</CardTitle>
              <CardDescription>Set default settings for new users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="defaultRole">Default Role for New Users</Label>
                <select
                  id="defaultRole"
                  value={userSettings.defaultRole}
                  onChange={(e) => setUserSettings({...userSettings, defaultRole: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="Technician">Technician</option>
                  <option value="Storekeeper">Storekeeper</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              
              <Button onClick={handleSaveUser}>Save User Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsModule;
