import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {db, storage} from "@/firebase/config";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Shield, Globe, Settings, UserPlus, MapPin } from "lucide-react";

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  // State for storing counts
  const [counts, setCounts] = useState({
    shooters: 0,
    rangeOwners: 0,
    ranges: 0,
    events: 0,
    loading: true
  });

  // Fetch data from Firebase collections
  useEffect(() => {
    const fetchCounts = async () => {
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Calculate percentages for system statistics
  const totalUsers = counts.shooters + counts.rangeOwners;
  const shootersPercentage = totalUsers > 0 ? ((counts.shooters / totalUsers) * 100).toFixed(1) : 0;
  const rangeOwnersPercentage = totalUsers > 0 ? ((counts.rangeOwners / totalUsers) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
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

          <Card onClick={() => navigate("/dashboard/admin/range-owners")}>
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

          <Card  onClick={() => navigate("/dashboard/admin/ranges")}>
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

          <Card>
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
                <CardTitle className="text-3xl text-center">User Management</CardTitle>
                <CardDescription className="text-xl text-center">Recent Owners Registrations</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Role</th>
                      <th className="text-left py-3 px-4 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">John Smith</td>
                      <td className="py-3 px-4">john@example.com</td>
                      <td className="py-3 px-4">Shooter</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">Sarah Johnson</td>
                      <td className="py-3 px-4">sarah@example.com</td>
                      <td className="py-3 px-4">Range Owner</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 px-4">Michael Davis</td>
                      <td className="py-3 px-4">michael@example.com</td>
                      <td className="py-3 px-4">Shooter</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
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