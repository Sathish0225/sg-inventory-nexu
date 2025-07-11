import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Camera,
  FileText,
  Wrench,
  Edit,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import ServiceForm from "@/components/forms/ServiceForm";
import DeleteConfirmation from "@/components/DeleteConfirmation";
import { generateServicePDF } from "@/components/PDFGenerator";

const ServiceModule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  // Mock service reports data
  const [serviceReports, setServiceReports] = useState([
    {
      id: "SR001",
      jobNumber: "JOB-2024-001",
      customer: "Marina Bay Sands Pte Ltd",
      site: "Tower 1 - Level 55",
      serviceType: "Preventive Maintenance",
      technician: "Alex Lim",
      dateScheduled: "2024-01-16",
      timeScheduled: "09:00",
      status: "Completed",
      priority: "Medium",
      description: "HVAC system quarterly maintenance",
      partsUsed: [
        { item: "Air Filter", quantity: 4, cost: 45.00 },
        { item: "Coolant", quantity: 2, cost: 28.50 }
      ],
      totalCost: 73.50,
      customerSignature: true,
      photos: 3,
      notes: "System running optimally. Next service due in 3 months."
    },
    {
      id: "SR002",
      jobNumber: "JOB-2024-002",
      customer: "Raffles Hotel Singapore",
      site: "Main Lobby",
      serviceType: "Corrective Maintenance",
      technician: "Sarah Tan",
      dateScheduled: "2024-01-17",
      timeScheduled: "14:30",
      status: "In Progress",
      priority: "High",
      description: "Network connectivity issues",
      partsUsed: [
        { item: "Network Cable CAT6", quantity: 2, cost: 51.00 },
        { item: "Ethernet Switch", quantity: 1, cost: 450.00 }
      ],
      totalCost: 501.00,
      customerSignature: false,
      photos: 1,
      notes: "Replaced faulty switch. Testing in progress."
    },
    {
      id: "SR003",
      jobNumber: "JOB-2024-003",
      customer: "Changi Airport Terminal 3",
      site: "Departure Hall B",
      serviceType: "Installation",
      technician: "David Wong",
      dateScheduled: "2024-01-18",
      timeScheduled: "08:00",
      status: "Scheduled",
      priority: "Medium",
      description: "Security camera installation - 8 units",
      partsUsed: [],
      totalCost: 0,
      customerSignature: false,
      photos: 0,
      notes: "Pre-installation site survey completed."
    }
  ]);

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const filteredReports = serviceReports.filter(report => {
    const matchesSearch = report.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.technician.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         report.status.toLowerCase().replace(" ", "-") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "Scheduled": return "bg-orange-100 text-orange-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleCreateReport = () => {
    setEditingReport(null);
    setShowForm(true);
  };

  const handleEditReport = (report: any) => {
    setEditingReport(report);
    setShowForm(true);
  };

  const handleDeleteReport = (report: any) => {
    setReportToDelete(report);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      setServiceReports(prev => prev.filter(report => report.id !== reportToDelete.id));
      toast.success(`Service report ${reportToDelete.jobNumber} deleted successfully`);
    }
    setShowDeleteConfirm(false);
    setReportToDelete(null);
  };

  const handleSaveReport = (formData: any) => {
    if (editingReport) {
      // Update existing report
      setServiceReports(prev => 
        prev.map(report => 
          report.id === editingReport.id 
            ? { ...report, ...formData }
            : report
        )
      );
    } else {
      // Add new report
      const newReport = {
        ...formData,
        id: `SR${String(Date.now()).slice(-3)}`,
        partsUsed: [],
        totalCost: 0,
        customerSignature: false,
        photos: 0
      };
      setServiceReports(prev => [...prev, newReport]);
    }
    setShowForm(false);
    setEditingReport(null);
  };

  const handleGeneratePDF = (report: any) => {
    generateServicePDF(report);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Reports</h2>
          <p className="text-gray-600">Manage service jobs, track progress, and generate reports</p>
        </div>
        <Button onClick={handleCreateReport}>
          <Plus className="h-4 w-4 mr-2" />
          New Service Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Jobs</p>
                <p className="text-2xl font-bold">
                  {serviceReports.filter(r => r.dateScheduled === new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">
                  {serviceReports.filter(r => r.status === "In Progress").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">
                  {serviceReports.filter(r => r.status === "Completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue (MTD)</p>
                <p className="text-2xl font-bold">S${serviceReports.reduce((sum, r) => sum + r.totalCost, 0).toFixed(0)}K</p>
              </div>
              <div className="text-green-600 text-2xl font-bold">$</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by customer, job number, or technician..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Reports</CardTitle>
          <CardDescription>
            Showing {filteredReports.length} of {serviceReports.length} reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg">{report.jobNumber}</h3>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Customer</p>
                        <p className="font-medium">{report.customer}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Site Location</p>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">{report.site}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Technician</p>
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">{report.technician}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Scheduled</p>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">{report.dateScheduled} {report.timeScheduled}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleGeneratePDF(report)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditReport(report)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteReport(report)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Service Type & Description</p>
                      <p className="text-sm font-medium">{report.serviceType}</p>
                      <p className="text-sm text-gray-700">{report.description}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Parts Used & Cost</p>
                      {report.partsUsed && report.partsUsed.length > 0 ? (
                        <div className="space-y-1">
                          {report.partsUsed.map((part: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{part.item} (x{part.quantity})</span>
                              <span>S${part.cost.toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t pt-1 flex justify-between font-medium text-sm">
                            <span>Total Cost:</span>
                            <span>S${report.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No parts used yet</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Camera className="h-4 w-4" />
                        <span>{report.photos} photos</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{report.customerSignature ? 'Signed' : 'Pending signature'}</span>
                      </div>
                    </div>
                    
                    {report.notes && (
                      <div className="text-sm text-gray-700 max-w-md">
                        <span className="font-medium">Notes: </span>
                        {report.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleCreateReport}>
          <CardContent className="p-6 text-center">
            <Plus className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900">New Service Job</h3>
            <p className="text-sm text-gray-500">Create a new service report</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900">Schedule Maintenance</h3>
            <p className="text-sm text-gray-500">Plan preventive maintenance</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Wrench className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900">Emergency Service</h3>
            <p className="text-sm text-gray-500">Log urgent repair requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Forms and Modals */}
      {showForm && (
        <ServiceForm
          report={editingReport}
          onSave={handleSaveReport}
          onCancel={() => {
            setShowForm(false);
            setEditingReport(null);
          }}
        />
      )}

      {showDeleteConfirm && reportToDelete && (
        <DeleteConfirmation
          title="Delete Service Report"
          message="Are you sure you want to delete this service report? This action cannot be undone and will remove all associated data."
          itemName={`${reportToDelete.jobNumber} - ${reportToDelete.customer}`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setReportToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default ServiceModule;
