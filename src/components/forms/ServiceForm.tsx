
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { toast } from "sonner";

interface ServiceFormProps {
  report?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const ServiceForm = ({ report, onSave, onCancel }: ServiceFormProps) => {
  const [formData, setFormData] = useState({
    jobNumber: report?.jobNumber || `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    customer: report?.customer || "",
    site: report?.site || "",
    serviceType: report?.serviceType || "",
    technician: report?.technician || "",
    dateScheduled: report?.dateScheduled || new Date().toISOString().split('T')[0],
    timeScheduled: report?.timeScheduled || "09:00",
    priority: report?.priority || "Medium",
    description: report?.description || "",
    notes: report?.notes || "",
    ...report
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, status: report?.status || "Scheduled" });
    toast.success(report ? "Service report updated successfully" : "Service report created successfully");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl mx-4 my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{report ? "Edit Service Report" : "Create New Service Report"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobNumber">Job Number</Label>
                <Input
                  id="jobNumber"
                  value={formData.jobNumber}
                  onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="site">Site Location</Label>
                <Input
                  id="site"
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="technician">Technician</Label>
                <select
                  id="technician"
                  value={formData.technician}
                  onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Technician</option>
                  <option value="Alex Lim">Alex Lim</option>
                  <option value="Sarah Tan">Sarah Tan</option>
                  <option value="David Wong">David Wong</option>
                  <option value="Mary Chen">Mary Chen</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serviceType">Service Type</Label>
                <select
                  id="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Preventive Maintenance">Preventive Maintenance</option>
                  <option value="Corrective Maintenance">Corrective Maintenance</option>
                  <option value="Installation">Installation</option>
                  <option value="Emergency Repair">Emergency Repair</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="dateScheduled">Date</Label>
                  <Input
                    id="dateScheduled"
                    type="date"
                    value={formData.dateScheduled}
                    onChange={(e) => setFormData({ ...formData, dateScheduled: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="timeScheduled">Time</Label>
                  <Input
                    id="timeScheduled"
                    type="time"
                    value={formData.timeScheduled}
                    onChange={(e) => setFormData({ ...formData, timeScheduled: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-20"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-16"
              />
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="flex-1">
                {report ? "Update" : "Create"} Service Report
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceForm;
