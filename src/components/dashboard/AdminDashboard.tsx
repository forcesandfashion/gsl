import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  query, 
  doc, 
  updateDoc, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { User } from "firebase/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Shield, 
  Globe, 
  MapPin, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Edit 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Type definitions
interface SubAdmin {
  id: string;
  username: string;
  email: string;
  uid: string;
  role: string;
  active: boolean;
  createdAt: Timestamp | Date | null;
  createdBy?: string;
  updatedAt?: Timestamp | Date | null;
  updatedBy?: string;
}

interface Counts {
  shooters: number;
  rangeOwners: number;
  ranges: number;
  events: number;
  loading: boolean;
}

interface NewSubAdminForm {
  username: string;
  email: string;
  password: string;
}

interface EditSubAdminForm {
  username: string;
  email: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  subAdminId?: string;
  data?: any;
}

interface CreateSubAdminRequest {
  username: string;
  email: string;
  password: string;
}

interface DeleteSubAdminRequest {
  subAdminId: string;
}

const AdminDashboard: React.FC = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  // State for storing counts
  const [counts, setCounts] = useState<Counts>({
    shooters: 0,
    rangeOwners: 0,
    ranges: 0,
    events: 0,
    loading: true
  });

  // State for sub-admins
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loadingSubAdmins, setLoadingSubAdmins] = useState<boolean>(true);

  // State for add sub-admin modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSubAdmin, setNewSubAdmin] = useState<NewSubAdminForm>({
    username: "",
    email: "",
    password: ""
  });
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // State for edit sub-admin modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [editSubAdmin, setEditSubAdmin] = useState<EditSubAdminForm>({
    username: "",
    email: ""
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // State for messages
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Fetch data from Firebase collections
  useEffect(() => {
    const fetchCounts = async (): Promise<void> => {
      try {
        // Query shooters collection
        const shootersSnapshot = await getDocs(collection(db, "shooters"));
        const shootersCount = shootersSnapshot.size;

        // Query range-owners collection
        const rangeOwnersSnapshot = await getDocs(collection(db, "range-owners"));
        const rangeOwnersCount = rangeOwnersSnapshot.size;

        // Query ranges collection
        const rangesSnapshot = await getDocs(collection(db, "ranges"));
        const rangesCount = rangesSnapshot.size;

        // Query events collection
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const eventsCount = eventsSnapshot.size;

        // Update state with fetched counts
        setCounts({
          shooters: shootersCount,
          rangeOwners: rangeOwnersCount,
          ranges: rangesCount,
          events: eventsCount,
          loading: false
        });
      } catch (error) {
        console.error("Error fetching collection counts:", error);
        setCounts(prev => ({ ...prev, loading: false }));
      }
    };

    fetchCounts();
  }, []);

  // Fetch sub-admins directly from Firestore
  const fetchSubAdmins = async (): Promise<void> => {
    try {
      setLoadingSubAdmins(true);
      const subAdminsQuery = query(
        collection(db, "sub-admin"),
        orderBy('createdAt', 'desc')
      );
      const subAdminsSnapshot = await getDocs(subAdminsQuery);
      const subAdminsData: SubAdmin[] = subAdminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SubAdmin));
      setSubAdmins(subAdminsData);
      setError("");
    } catch (error) {
      console.error("Error fetching sub-admins:", error);
      setError("Error fetching sub-admins: " + (error as Error).message);
    } finally {
      setLoadingSubAdmins(false);
    }
  };

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate("/");
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handle creating new sub-admin using Firebase Functions HTTP endpoint
  const handleCreateSubAdmin = async (): Promise<void> => {
    if (!newSubAdmin.username || !newSubAdmin.email || !newSubAdmin.password) {
      setError("Please fill in all fields");
      return;
    }

    if (newSubAdmin.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!user) {
      setError("You must be logged in as an admin");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      // Get Firebase ID token
      const idToken = await user.getIdToken(true);

      // Call Firebase Function via HTTP
      const response = await fetch(`https://us-central1-global-shooting-league.cloudfunctions.net/createSubAdmin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          username: newSubAdmin.username,
          email: newSubAdmin.email,
          password: newSubAdmin.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccess("Sub-admin created successfully!");
        
        // Reset form and close modal
        setNewSubAdmin({ username: "", email: "", password: "" });
        setIsAddModalOpen(false);
        
        // Refresh sub-admins list
        await fetchSubAdmins();
      } else {
        setError(result.message || "Error creating sub-admin");
      }
    } catch (error: any) {
      console.error("Error creating sub-admin:", error);
      setError("❌ " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle deleting sub-admin using Firebase Functions HTTP endpoint
  const handleDeleteSubAdmin = async (subAdminId: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this sub-admin? This action cannot be undone.")) {
      return;
    }

    if (!user) {
      setError("You must be logged in as an admin");
      return;
    }

    setError("");
    setSuccess("");

    try {
      // Get Firebase ID token
      const idToken = await user.getIdToken(true);

      // Call Firebase Function via HTTP
      const response = await fetch(`https://us-central1-global-shooting-league.cloudfunctions.net/deleteSubAdmin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subAdminId: subAdminId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccess("Sub-admin deleted successfully!");
        
        // Refresh sub-admins list
        await fetchSubAdmins();
      } else {
        setError(result.message || "Error deleting sub-admin");
      }
    } catch (error: any) {
      console.error("Error deleting sub-admin:", error);
      setError("❌ " + error.message);
    }
  };

  // Handle editing sub-admin
  const handleEditSubAdmin = (admin: SubAdmin): void => {
    setEditingSubAdmin(admin);
    setEditSubAdmin({
      username: admin.username,
      email: admin.email
    });
    setIsEditModalOpen(true);
  };

  // Handle updating sub-admin (directly in Firestore)
  const handleUpdateSubAdmin = async (): Promise<void> => {
    if (!editSubAdmin.username || !editSubAdmin.email) {
      setError("Please fill in all fields");
      return;
    }

    if (!editingSubAdmin || !user) {
      setError("Invalid operation");
      return;
    }

    setIsUpdating(true);
    setError("");
    setSuccess("");

    try {
      // Update in Firestore
      await updateDoc(doc(db, "sub-admin", editingSubAdmin.id), {
        username: editSubAdmin.username,
        email: editSubAdmin.email,
        updatedAt: new Date(),
        updatedBy: user.uid
      });

      setSuccess("Sub-admin updated successfully!");
      
      // Reset form and close modal
      setEditSubAdmin({ username: "", email: "" });
      setEditingSubAdmin(null);
      setIsEditModalOpen(false);
      
      // Refresh sub-admins list
      await fetchSubAdmins();
    } catch (error) {
      console.error("Error updating sub-admin:", error);
      setError("Error updating sub-admin: " + (error as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate percentages for system statistics
  const totalUsers: number = counts.shooters + counts.rangeOwners;
  const shootersPercentage: string = totalUsers > 0 ? 
    ((counts.shooters / totalUsers) * 100).toFixed(1) : "0";
  const rangeOwnersPercentage: string = totalUsers > 0 ? 
    ((counts.rangeOwners / totalUsers) * 100).toFixed(1) : "0";

  // Format date helper
  const formatDate = (date: Timestamp | Date | null): string => {
    if (!date) return "N/A";
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return "N/A";
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.displayName?.split(' | ')[0] || user?.email} 
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Admin
              </span>
            </span>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="text-sm"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
          onClick={() => navigate("/dashboard/admin/shooter-data")}
           className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.loading ? "Loading..." : totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">Shooters + Range Owners</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate("/dashboard/admin/range-owners")}
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Range Owners
              </CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.loading ? "..." : counts.rangeOwners}
              </div>
              <p className="text-xs text-gray-500">Registered owners</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate("/dashboard/admin/ranges")}
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Ranges
              </CardTitle>
              <MapPin className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.loading ? "..." : counts.ranges}
              </div>
              <p className="text-xs text-gray-500">Total ranges</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/dashboard/admin/events")}
            className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Globe className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.loading ? "..." : counts.events}
              </div>
              <p className="text-xs text-gray-500">All events</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Sub-Admin Management</CardTitle>
                <CardDescription className="text-base">Manage Sub-Administrators</CardDescription>
              </div>

              {/* Add Sub-Admin Modal */}
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Sub-Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Sub-Admin</DialogTitle>
                    <DialogDescription>
                      Create a new sub-administrator account with username, email, and password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newSubAdmin.username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setNewSubAdmin(prev => ({...prev, username: e.target.value}))
                        }
                        placeholder="Enter username"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newSubAdmin.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setNewSubAdmin(prev => ({...prev, email: e.target.value}))
                        }
                        placeholder="Enter email address"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newSubAdmin.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setNewSubAdmin(prev => ({...prev, password: e.target.value}))
                        }
                        placeholder="Enter password (min. 6 characters)"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setNewSubAdmin({ username: "", email: "", password: "" });
                        setError("");
                      }}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSubAdmin} disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Sub-Admin"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Sub-Admin Modal */}
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Sub-Admin</DialogTitle>
                    <DialogDescription>
                      Update sub-administrator information.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit_username">Username</Label>
                      <Input
                        id="edit_username"
                        value={editSubAdmin.username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setEditSubAdmin(prev => ({...prev, username: e.target.value}))
                        }
                        placeholder="Enter username"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_email">Email</Label>
                      <Input
                        id="edit_email"
                        type="email"
                        value={editSubAdmin.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setEditSubAdmin(prev => ({...prev, email: e.target.value}))
                        }
                        placeholder="Enter email address"
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setEditSubAdmin({ username: "", email: "" });
                        setEditingSubAdmin(null);
                        setError("");
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateSubAdmin} disabled={isUpdating}>
                      {isUpdating ? "Updating..." : "Update Sub-Admin"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Username</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Role</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSubAdmins ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          Loading sub-admins...
                        </td>
                      </tr>
                    ) : subAdmins.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No sub-admins found
                        </td>
                      </tr>
                    ) : (
                      subAdmins.map((admin: SubAdmin) => (
                        <tr key={admin.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{admin.username}</td>
                          <td className="py-3 px-4">{admin.email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {admin.role === 'sub_admin' ? 'Sub-Admin' : 'Sub-Admin'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              admin.active !== false 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {admin.active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2"
                                onClick={() => handleEditSubAdmin(admin)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 text-red-600 hover:text-red-800"
                                onClick={() => handleDeleteSubAdmin(admin.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Statistics</CardTitle>
              <CardDescription>Overall platform metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Shooters</span>
                    <span className="text-sm font-medium">
                      {counts.loading ? "Loading..." : `${counts.shooters} (${shootersPercentage}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${shootersPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Range Owners</span>
                    <span className="text-sm font-medium">
                      {counts.loading ? "Loading..." : `${counts.rangeOwners} (${rangeOwnersPercentage}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full"
                      style={{ width: `${rangeOwnersPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Ranges</span>
                    <span className="text-sm font-medium">
                      {counts.loading ? "Loading..." : counts.ranges}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-red-600 h-2.5 rounded-full"
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Events</span>
                    <span className="text-sm font-medium">
                      {counts.loading ? "Loading..." : counts.events}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full"
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-3">
                    Collection Summary
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>Shooters: {counts.loading ? "Loading..." : counts.shooters}</p>
                    <p>Range Owners: {counts.loading ? "Loading..." : counts.rangeOwners}</p>
                    <p>Ranges: {counts.loading ? "Loading..." : counts.ranges}</p>
                    <p>Events: {counts.loading ? "Loading..." : counts.events}</p>
                    <p>Sub-Admins: {loadingSubAdmins ? "Loading..." : subAdmins.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;