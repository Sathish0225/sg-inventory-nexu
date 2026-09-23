
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  Package,
  Wrench,
  DollarSign,
  Users
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { toast } from "sonner";

const ReportsModule = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Mock data for charts
  const inventoryMovement = [
    { month: 'Jan', stockIn: 450, stockOut: 380, value: 12500 },
    { month: 'Feb', stockIn: 520, stockOut: 420, value: 15200 },
    { month: 'Mar', stockIn: 480, stockOut: 510, value: 13800 },
    { month: 'Apr', stockIn: 600, stockOut: 580, value: 18400 },
    { month: 'May', stockIn: 650, stockOut: 620, value: 19800 },
    { month: 'Jun', stockIn: 580, stockOut: 540, value: 17200 }
  ];

  const serviceMetrics = [
    { month: 'Jan', preventive: 45, corrective: 32, emergency: 12, installation: 28 },
    { month: 'Feb', preventive: 52, corrective: 28, emergency: 8, installation: 35 },
    { month: 'Mar', preventive: 48, corrective: 35, emergency: 15, installation: 42 },
    { month: 'Apr', preventive: 55, corrective: 42, emergency: 10, installation: 38 },
    { month: 'May', preventive: 62, corrective: 38, emergency: 18, installation: 45 },
    { month: 'Jun', preventive: 58, corrective: 45, emergency: 12, installation: 52 }
  ];

  const technicianPerformance = [
    { name: 'Alex Lim', completed: 85, pending: 5, efficiency: 94 },
    { name: 'Sarah Tan', completed: 78, pending: 8, efficiency: 91 },
    { name: 'David Wong', completed: 72, pending: 12, efficiency: 86 },
    { name: 'Mary Chen', completed: 68, pending: 6, efficiency: 92 },
    { name: 'John Kumar', completed: 82, pending: 4, efficiency: 95 }
  ];

  const topUsedItems = [
    { name: 'Network Cable CAT6', quantity: 145, value: 3625, category: 'Electronics' },
    { name: 'LED Bulb 12W', quantity: 128, value: 1139, category: 'Lighting' },
    { name: 'Air Filter', quantity: 95, value: 950, category: 'HVAC' },
    { name: 'Security Camera', quantity: 35, value: 6475, category: 'Security' },
    { name: 'Ethernet Switch', quantity: 22, value: 9900, category: 'Networking' }
  ];

  const gstData = [
    { month: 'Jan', services: 12500, gst: 875, total: 13375 },
    { month: 'Feb', services: 15200, gst: 1064, total: 16264 },
    { month: 'Mar', services: 13800, gst: 966, total: 14766 },
    { month: 'Apr', services: 18400, gst: 1288, total: 19688 },
    { month: 'May', services: 19800, gst: 1386, total: 21186 },
    { month: 'Jun', services: 17200, gst: 1204, total: 18404 }
  ];

  const handleExportReport = (reportType: string) => {
    toast.success(`Exporting ${reportType} report to PDF/Excel`);
  };

  const handleGenerateCustomReport = () => {
    toast.info("Custom report builder would open here");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports & Analytics</h2>
          <p className="text-muted-foreground">Comprehensive reporting for inventory and service operations</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-input rounded-md"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button onClick={handleGenerateCustomReport}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">Inventory Reports</TabsTrigger>
          <TabsTrigger value="service">Service Reports</TabsTrigger>
          <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          <TabsTrigger value="performance">Performance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Inventory Movement Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Movement Trend</CardTitle>
                <CardDescription>Stock in vs Stock out over time</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('Inventory Movement')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={inventoryMovement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="stockIn" fill="#10B981" name="Stock In" />
                  <Bar dataKey="stockOut" fill="#EF4444" name="Stock Out" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Used Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Used Items</CardTitle>
                <CardDescription>Most frequently used inventory items</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('Top Used Items')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Qty: {item.quantity}</p>
                      <p className="text-sm text-muted-foreground">S${item.value.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service" className="space-y-6">
          {/* Service Job Distribution */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Job Distribution</CardTitle>
                <CardDescription>Types of service jobs over time</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('Service Distribution')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={serviceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="preventive" stroke="#10B981" strokeWidth={2} name="Preventive" />
                  <Line type="monotone" dataKey="corrective" stroke="#F59E0B" strokeWidth={2} name="Corrective" />
                  <Line type="monotone" dataKey="emergency" stroke="#EF4444" strokeWidth={2} name="Emergency" />
                  <Line type="monotone" dataKey="installation" stroke="#3B82F6" strokeWidth={2} name="Installation" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Service Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">342</p>
                  </div>
                  <Wrench className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-green-100 text-green-800">+15% vs last month</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold">2.5h</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-green-100 text-green-800">-30min vs target</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">94.2%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-purple-100 text-purple-800">Above target</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
                    <p className="text-2xl font-bold">4.8/5</p>
                  </div>
                  <div className="text-yellow-500 text-2xl">⭐</div>
                </div>
                <div className="mt-2">
                  <Badge className="bg-yellow-100 text-yellow-800">Excellent</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {/* GST Revenue Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Revenue with GST (7%)</CardTitle>
                <CardDescription>Service revenue including Singapore GST</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('GST Revenue')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={gstData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [`S$${value}`, name]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="services" fill="#3B82F6" name="Services" />
                  <Bar dataKey="gst" fill="#10B981" name="GST (7%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue (YTD)</p>
                    <p className="text-2xl font-bold">S$96,900</p>
                    <p className="text-sm text-green-600">+18.5% vs last year</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">GST Collected (YTD)</p>
                    <p className="text-2xl font-bold">S$6,783</p>
                    <p className="text-sm text-blue-600">7% of revenue</p>
                  </div>
                  <div className="text-blue-600 text-2xl">🏛️</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                    <p className="text-2xl font-bold">S$245,680</p>
                    <p className="text-sm text-purple-600">Current stock value</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Technician Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Technician Performance</CardTitle>
                <CardDescription>Individual technician metrics and efficiency</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('Technician Performance')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technicianPerformance.map((tech, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{tech.name}</p>
                        <p className="text-sm text-muted-foreground">Jobs completed: {tech.completed}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="font-medium">{tech.pending}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Efficiency</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${tech.efficiency}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{tech.efficiency}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">On-time Completion Rate</span>
                  <span className="text-green-600 font-bold">92.5%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">First-time Fix Rate</span>
                  <span className="text-blue-600 font-bold">87.3%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Average Job Duration</span>
                  <span className="text-purple-600 font-bold">3.2 hrs</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Parts Utilization</span>
                  <span className="text-orange-600 font-bold">94.1%</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Targets vs Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Service Jobs</span>
                    <span>342 / 300 (114%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '114%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Revenue Target</span>
                    <span>S$68K / S$60K (113%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '113%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Customer Satisfaction</span>
                    <span>4.8 / 4.5 (107%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '107%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsModule;
