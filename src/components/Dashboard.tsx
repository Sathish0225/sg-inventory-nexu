
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Wrench, 
  AlertTriangle, 
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  MapPin,
  BarChart3
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  // Mock data for charts
  const inventoryTrend = [
    { month: 'Jan', stockIn: 150, stockOut: 120 },
    { month: 'Feb', stockIn: 180, stockOut: 140 },
    { month: 'Mar', stockIn: 165, stockOut: 155 },
    { month: 'Apr', stockIn: 200, stockOut: 180 },
    { month: 'May', stockIn: 220, stockOut: 190 },
    { month: 'Jun', stockIn: 195, stockOut: 175 }
  ];

  const serviceJobs = [
    { type: 'Preventive', count: 45, color: '#10B981' },
    { type: 'Corrective', count: 32, color: '#F59E0B' },
    { type: 'Emergency', count: 12, color: '#EF4444' },
    { type: 'Installation', count: 28, color: '#3B82F6' }
  ];

  const topItems = [
    { name: 'Network Cable CAT6', used: 85, stock: 150 },
    { name: 'LED Bulb 12W', used: 72, stock: 200 },
    { name: 'Security Camera', used: 28, stock: 45 },
    { name: 'Ethernet Switch', used: 15, stock: 30 }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S$245,680</div>
            <p className="text-xs text-blue-100">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Service Jobs</CardTitle>
            <Wrench className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-green-100">
              6 scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-orange-100">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S$68,420</div>
            <p className="text-xs text-purple-100">
              +8.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Movement Trend</CardTitle>
            <CardDescription>Stock In vs Stock Out (Last 6 Months)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={inventoryTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="stockIn" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="stockOut" stroke="#EF4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Job Distribution</CardTitle>
            <CardDescription>Jobs by Type (Current Month)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceJobs}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {serviceJobs.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest inventory and service updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Stock Received</p>
                <p className="text-xs text-gray-500">Network cables - Qty: 50</p>
              </div>
              <Badge variant="secondary">2h ago</Badge>
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
              <Wrench className="h-8 w-8 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Service Completed</p>
                <p className="text-xs text-gray-500">HVAC Maintenance - Marina Bay</p>
              </div>
              <Badge variant="secondary">4h ago</Badge>
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Low Stock Alert</p>
                <p className="text-xs text-gray-500">LED Bulbs - Only 15 remaining</p>
              </div>
              <Badge variant="destructive">1h ago</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Used Items</CardTitle>
            <CardDescription>Most frequently used inventory items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(item.used / item.stock) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {item.used}/{item.stock}
                    </span>
                  </div>
                </div>
                <Badge variant="outline">{Math.round((item.used / item.stock) * 100)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col space-y-2">
              <Package className="h-6 w-6" />
              <span>Add Stock</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Wrench className="h-6 w-6" />
              <span>New Service</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span>Generate Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Assign Job</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
