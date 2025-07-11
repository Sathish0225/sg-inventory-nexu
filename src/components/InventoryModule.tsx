import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Scan, 
  Package,
  AlertTriangle,
  Edit,
  Eye,
  MapPin,
  Calendar,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import InventoryForm from "@/components/forms/InventoryForm";
import DeleteConfirmation from "@/components/DeleteConfirmation";
import { generateInventoryPDF } from "@/components/PDFGenerator";

const InventoryModule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Mock inventory data
  const [inventoryItems, setInventoryItems] = useState([
    {
      id: "INV001",
      name: "Network Cable CAT6",
      category: "Electronics",
      brand: "Schneider",
      model: "SC-CAT6-100M",
      serialNumber: "SN20240001",
      location: "Warehouse A - Shelf 1",
      currentStock: 150,
      minStock: 20,
      unitCost: 25.50,
      totalValue: 3825.00,
      lastUpdated: "2024-01-15",
      status: "In Stock",
      assignedTo: null
    },
    {
      id: "INV002",
      name: "LED Bulb 12W",
      category: "Lighting",
      brand: "Philips",
      model: "PH-LED-12W",
      serialNumber: "SN20240002",
      location: "Warehouse B - Shelf 3",
      currentStock: 15,
      minStock: 25,
      unitCost: 8.90,
      totalValue: 133.50,
      lastUpdated: "2024-01-14",
      status: "Low Stock",
      assignedTo: null
    },
    {
      id: "INV003",
      name: "Security Camera 4MP",
      category: "Security",
      brand: "Hikvision",
      model: "HK-CAM-4MP",
      serialNumber: "SN20240003",
      location: "Marina Bay Site",
      currentStock: 1,
      minStock: 5,
      unitCost: 185.00,
      totalValue: 185.00,
      lastUpdated: "2024-01-13",
      status: "Assigned",
      assignedTo: "Tech Team A"
    },
    {
      id: "INV004",
      name: "Ethernet Switch 24-Port",
      category: "Networking",
      brand: "Cisco",
      model: "CS-SW-24P",
      serialNumber: "SN20240004",
      location: "Warehouse A - Shelf 2",
      currentStock: 8,
      minStock: 3,
      unitCost: 450.00,
      totalValue: 3600.00,
      lastUpdated: "2024-01-16",
      status: "In Stock",
      assignedTo: null
    }
  ]);

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "electronics", label: "Electronics" },
    { value: "lighting", label: "Lighting" },
    { value: "security", label: "Security" },
    { value: "networking", label: "Networking" }
  ];

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           item.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "bg-green-100 text-green-800";
      case "Low Stock": return "bg-orange-100 text-orange-800";
      case "Out of Stock": return "bg-red-100 text-red-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleAddStock = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteItem = (item: any) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setInventoryItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast.success(`${itemToDelete.name} deleted successfully`);
    }
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleSaveItem = (formData: any) => {
    if (editingItem) {
      // Update existing item
      setInventoryItems(prev => 
        prev.map(item => 
          item.id === editingItem.id 
            ? { ...item, ...formData, totalValue: formData.currentStock * formData.unitCost }
            : item
        )
      );
    } else {
      // Add new item
      const newItem = {
        ...formData,
        id: `INV${String(Date.now()).slice(-3)}`,
        totalValue: formData.currentStock * formData.unitCost,
        lastUpdated: new Date().toISOString().split('T')[0],
        status: formData.currentStock > formData.minStock ? "In Stock" : "Low Stock",
        assignedTo: null
      };
      setInventoryItems(prev => [...prev, newItem]);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  const handleScanBarcode = () => {
    toast.info("Barcode scanner activated - Scan item barcode");
  };

  const handleExportPDF = () => {
    generateInventoryPDF(filteredItems);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-600">Manage stock levels, track items, and monitor usage</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleScanBarcode} variant="outline">
            <Scan className="h-4 w-4 mr-2" />
            Scan Item
          </Button>
          <Button onClick={handleAddStock}>
            <Plus className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{inventoryItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">S${inventoryItems.reduce((sum, item) => sum + item.totalValue, 0).toFixed(0)}K</p>
              </div>
              <div className="text-green-600 text-2xl font-bold">$</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">
                  {inventoryItems.filter(item => item.currentStock <= item.minStock).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned</p>
                <p className="text-2xl font-bold">
                  {inventoryItems.filter(item => item.assignedTo).length}
                </p>
              </div>
              <div className="text-blue-600 text-2xl font-bold">↗</div>
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
                placeholder="Search by name, serial number, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
            
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Showing {filteredItems.length} of {inventoryItems.length} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">Item Details</th>
                  <th className="text-left p-3 font-medium text-gray-600">Location</th>
                  <th className="text-left p-3 font-medium text-gray-600">Stock</th>
                  <th className="text-left p-3 font-medium text-gray-600">Value (S$)</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.brand} - {item.model}</p>
                        <p className="text-xs text-gray-400">SN: {item.serialNumber}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span>{item.location}</span>
                      </div>
                      {item.assignedTo && (
                        <p className="text-xs text-blue-600 mt-1">Assigned to: {item.assignedTo}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{item.currentStock}</p>
                        <p className="text-xs text-gray-500">Min: {item.minStock}</p>
                        {item.currentStock <= item.minStock && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs mt-1">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{item.totalValue.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Unit: {item.unitCost.toFixed(2)}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{item.lastUpdated}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stock Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleAddStock}>
          <CardContent className="p-6 text-center">
            <Plus className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900">Stock In</h3>
            <p className="text-sm text-gray-500">Add new inventory items</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900">Stock Out</h3>
            <p className="text-sm text-gray-500">Issue items to technicians</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900">Stock Transfer</h3>
            <p className="text-sm text-gray-500">Move between locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Forms and Modals */}
      {showForm && (
        <InventoryForm
          item={editingItem}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {showDeleteConfirm && itemToDelete && (
        <DeleteConfirmation
          title="Delete Inventory Item"
          message="Are you sure you want to delete this inventory item? This action cannot be undone."
          itemName={`${itemToDelete.name} (${itemToDelete.serialNumber})`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setItemToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default InventoryModule;
