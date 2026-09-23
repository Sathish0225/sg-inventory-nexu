import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  User,
  Mail,
  Phone,
  Calendar,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import UserForm from "@/components/forms/UserForm";
import type { AppUser } from "@/types";
import { uid } from "@/lib/id";
import DeleteConfirmation from "@/components/DeleteConfirmation";

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  // Mock user data
  const [users, setUsers] = useState<AppUser[]>([
    {
      id: "USR001",
      name: "John Tan",
      email: "john.tan@company.com",
      phone: "+65 9123 4567",
      role: "Admin",
      department: "IT Management",
      status: "Active",
      lastLogin: "2024-01-16 14:30",
      permissions: ["Full Access", "User Management", "System Settings"],
      joinDate: "2023-01-15"
    },
    {
      id: "USR002",
      name: "Sarah Lim",
      email: "sarah.lim@company.com",
      phone: "+65 9234 5678",
      role: "Manager",
      department: "Operations",
      status: "Active",
      lastLogin: "2024-01-16 16:45",
      permissions: ["Reports Access", "Service Management", "Inventory View"],
      joinDate: "2023-03-20"
    },
    {
      id: "USR003",
      name: "Alex Wong",
      email: "alex.wong@company.com",
      phone: "+65 9345 6789",
      role: "Technician",
      department: "Field Service",
      status: "Active",
      lastLogin: "2024-01-16 12:15",
      permissions: ["Service Reports", "Inventory Issue", "Mobile App"],
      joinDate: "2023-06-10"
    },
    {
      id: "USR004",
      name: "Mary Chen",
      email: "mary.chen@company.com",
      phone: "+65 9456 7890",
      role: "Storekeeper",
      department: "Warehouse",
      status: "Active",
      lastLogin: "2024-01-16 08:30",
      permissions: ["Inventory Management", "Stock Control", "Receiving"],
      joinDate: "2023-02-28"
    },
    {
      id: "USR005",
      name: "David Kumar",
      email: "david.kumar@company.com",
      phone: "+65 9567 8901",
      role: "Technician",
      department: "Field Service",
      status: "Inactive",
      lastLogin: "2024-01-10 17:20",
      permissions: ["Service Reports", "Inventory Issue"],
      joinDate: "2023-08-15"
    }
  ]);

  const roles = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "technician", label: "Technician" },
    { value: "storekeeper", label: "Storekeeper" }
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || 
                       user.role.toLowerCase() === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-red-100 text-red-800";
      case "Manager": return "bg-blue-100 text-blue-800";
      case "Technician": return "bg-green-100 text-green-800";
      case "Storekeeper": return "bg-purple-100 text-purple-800";
      default: return "bg-muted text-foreground/90";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Inactive": return "bg-muted text-foreground/90";
      case "Suspended": return "bg-red-100 text-red-800";
      default: return "bg-muted text-foreground/90";
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user: AppUser) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDeleteUser = (user: AppUser) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setUsers(prev => prev.filter(user => user.id !== userToDelete.id));
      toast.success(`User ${userToDelete.name} deleted successfully`);
    }
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleSaveUser = (formData: Partial<AppUser>) => {
    if (editingUser) {
      // Update existing user
      setUsers(prev => 
        prev.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...formData }
            : user
        )
      );
    } else {
      // Add new user
      const newUser = {
        ...(formData as AppUser),
        id: formData.id || uid(),
        lastLogin: "Never",
        permissions: getDefaultPermissions(formData.role ?? "")
      };
      setUsers(prev => [...prev, newUser]);
    }
    setShowForm(false);
    setEditingUser(null);
  };

  const getDefaultPermissions = (role: string) => {
    switch (role) {
      case "Admin": return ["Full Access", "User Management", "System Settings"];
      case "Manager": return ["Reports Access", "Service Management", "Inventory View"];
      case "Technician": return ["Service Reports", "Inventory Issue", "Mobile App"];
      case "Storekeeper": return ["Inventory Management", "Stock Control", "Receiving"];
      default: return ["Basic Access"];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        <Button onClick={handleAddUser}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{users.filter(u => u.status === "Active").length}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Technicians</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === "Technician").length}</p>
              </div>
              <Settings className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === "Admin").length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.department}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{user.phone}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Joined: {user.joinDate}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.map((permission: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Last Login:</p>
                      <p className="text-sm font-medium">{user.lastLogin}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Overview</CardTitle>
          <CardDescription>Permission matrix for different user roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Permission</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Admin</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Manager</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Technician</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Storekeeper</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3">System Administration</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">❌</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">User Management</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">👀</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">❌</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Inventory Management</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">👀</td>
                  <td className="text-center p-3">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Service Reports</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">👀</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Financial Reports</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">❌</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Legend: ✅ Full Access | 👀 View Only | ❌ No Access</p>
          </div>
        </CardContent>
      </Card>

      {/* Forms and Modals */}
      {showForm && (
        <UserForm
          user={editingUser}
          onSave={handleSaveUser}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {showDeleteConfirm && userToDelete && (
        <DeleteConfirmation
          title="Delete User Account"
          message="Are you sure you want to delete this user account? This will remove all access and cannot be undone."
          itemName={`${userToDelete.name} (${userToDelete.email})`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
