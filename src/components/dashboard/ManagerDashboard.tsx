import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Calendar, MapPin, BarChart, ArrowRightCircle, CheckCircle, AlertTriangle, XCircle, TrendingUp, Clock, Star, FileText, MessageSquare } from "lucide-react";
import RangeListingManager from "./RangeListingFormManager";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import BlockUserModal from "./BlockedUserModal";

const eventStatus = {
  Open: { color: "bg-emerald-100 text-emerald-800 border border-emerald-200", icon: <CheckCircle className="inline w-4 h-4 mr-1" /> },
  "Almost Full": { color: "bg-amber-100 text-amber-800 border border-amber-200", icon: <AlertTriangle className="inline w-4 h-4 mr-1" /> },
  Full: { color: "bg-rose-100 text-rose-800 border border-rose-200", icon: <XCircle className="inline w-4 h-4 mr-1" /> },
};

const ManagerDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalRanges: 0,
    totalMembers: 0,
    monthlyRevenue: 0,
    upcomingEvents: [],
    recentBookings: 0,
    totalPosts: 0,
    loading: true
  });
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [managerStatus, setManagerStatus] = useState(null);
  const [rangeOwnerId, setRangeOwnerId] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      checkManagerStatus();
    }
  }, [user]);

  const checkManagerStatus = async () => {
    try {
      console.log("Checking manager status for user:", user.uid);
      
      // Check directly in the managers collection
      const managersQuery = query(
        collection(db, "managers"),
        where("uid", "==", user.uid)
      );
      const managersSnapshot = await getDocs(managersQuery);
      
      console.log("Managers found:", managersSnapshot.docs.length);
      
      if (!managersSnapshot.empty) {
        const managerDoc = managersSnapshot.docs[0];
        const managerData = managerDoc.data();
        console.log("Manager data found:", managerData);
        
        setManagerStatus(managerData.status);
        setRangeOwnerId(managerData.rangeOwnerId);
        
        if (managerData.status === "active") {
          console.log("Manager status is active, fetching dashboard data");
          await fetchDashboardData(managerData.rangeOwnerId);
        } else {
          console.log("Manager status is not active:", managerData.status);
        }
      } else {
        console.log("No manager document found for user:", user.uid);
        // Set status to indicate no access
        setManagerStatus("not_found");
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error checking manager status:", error);
      setManagerStatus("error");
      setLoading(false);
    }
  };

  const fetchDashboardData = async (ownerId) => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      console.log("Fetching dashboard data for range owner:", ownerId);

      // Fetch ranges owned by the range owner this manager works for
      const rangesQuery = query(
        collection(db, "ranges"),
        where("ownerId", "==", ownerId)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      const ranges = rangesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Array<any>;
      
      console.log("Found ranges:", ranges.length, ranges);
      const rangeIds = ranges.map(range => range.id);

      // Fetch posts data for the manager
      let totalPosts = 0;
      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", ownerId)
        );
        const postsSnapshot = await getDocs(postsQuery);
        totalPosts = postsSnapshot.docs.length;
        console.log("Total posts found:", totalPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }

      // Fetch events - Try multiple approaches
      let events: Array<any> = [];
      
      if (rangeIds.length > 0) {
        try {
          // First try: Query events by rangeId with orderBy
          const eventsQuery = query(
            collection(db, "events"),
            where("rangeId", "in", rangeIds),
            orderBy("date", "asc"),
            limit(10)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          events = eventsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          console.log("Events with orderBy:", events.length);
        } catch (orderByError) {
          console.log("Events orderBy failed, trying without orderBy:", orderByError);
          
          // Second try: Query without orderBy
          const simpleEventsQuery = query(
            collection(db, "events"),
            where("rangeId", "in", rangeIds)
          );
          const simpleEventsSnapshot = await getDocs(simpleEventsQuery);
          events = simpleEventsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          console.log("Events without orderBy:", events.length);
        }
      }

      // Fetch bookings - Try multiple approaches
      let monthlyRevenue = 0;
      let totalMembers = 0;
      let recentBookings = 0;
      
      if (rangeIds.length > 0) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
        
        let bookings: Array<{
          id: string;
          totalPrice?: number;
          price?: number;
          userId?: string;
          rangeId?: string;
          createdAt?: any;
          [key: string]: any;
        }> = [];

        try {
          // First try: Query bookings by rangeId
          const bookingsQuery = query(
            collection(db, "bookings"),
            where("rangeId", "in", rangeIds)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          bookings = bookingsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          console.log("Bookings found:", bookings.length);
        } catch (bookingsError) {
          console.log("Bookings query failed, trying all bookings:", bookingsError);
          
          // Second try: Fetch all bookings and filter manually
          try {
            const allBookingsQuery = query(collection(db, "bookings"));
            const allBookingsSnapshot = await getDocs(allBookingsQuery);
            const allBookings = allBookingsSnapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            })) as Array<{
              id: string;
              totalPrice?: number;
              price?: number;
              userId?: string;
              rangeId?: string;
              createdAt?: any;
              [key: string]: any;
            }>;
            console.log("All bookings:", allBookings.length);
            
            // Filter bookings that belong to the range owner's ranges
            bookings = allBookings.filter(booking => rangeIds.includes(booking.rangeId || ''));
            console.log("Filtered bookings:", bookings.length);
          } catch (allBookingsError) {
            console.error("Error fetching all bookings:", allBookingsError);
          }
        }

        if (bookings.length > 0) {
          console.log("Sample booking data:", bookings[0]);
          
          // Calculate monthly revenue
          monthlyRevenue = bookings
            .filter(booking => {
              if (!booking.createdAt) return false;
              try {
                const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
                return bookingDate >= startOfMonth && bookingDate <= endOfMonth;
              } catch (error) {
                console.warn("Error parsing booking date:", booking.createdAt, error);
                return false;
              }
            })
            .reduce((sum, booking) => {
              const price = booking.totalPrice || booking.price || 0;
              return sum + (typeof price === 'string' ? parseFloat(price) : price);
            }, 0);

          // Count unique users (members)
          const uniqueUserIds = [...new Set(bookings
            .map(booking => booking.userId)
            .filter(userId => userId && userId !== null && userId !== undefined)
          )];
          totalMembers = uniqueUserIds.length;
          console.log("Unique user IDs:", uniqueUserIds);

          // Count recent bookings (last 7 days)
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          recentBookings = bookings.filter(booking => {
            if (!booking.createdAt) return false;
            try {
              const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
              return bookingDate >= weekAgo;
            } catch (error) {
              console.warn("Error parsing recent booking date:", booking.createdAt, error);
              return false;
            }
          }).length;
        }
      }

      // Process events data
      const processedEvents = events.map(event => {
        const registrations = event.registrations || 0;
        const capacity = event.maxParticipants || 100;
        let status = "Open";
        
        if (registrations >= capacity) {
          status = "Full";
        } else if (registrations / capacity > 0.8) {
          status = "Almost Full";
        }

        return {
          id: event.id,
          name: event.title || event.name || "Untitled Event",
          date: event.date?.toDate ? event.date.toDate().toLocaleDateString() : 
                event.date ? new Date(event.date).toLocaleDateString() : "TBD",
          location: event.location || ranges.find(r => r.id === event.rangeId)?.name || "Unknown Location",
          registrations,
          capacity,
          status
        };
      });

      console.log("Final dashboard data:", {
        totalRanges: ranges.length,
        totalMembers,
        monthlyRevenue,
        upcomingEvents: processedEvents.length,
        recentBookings,
        totalPosts
      });

      setDashboardData({
        totalRanges: ranges.length,
        totalMembers,
        monthlyRevenue,
        upcomingEvents: processedEvents.slice(0, 5),
        recentBookings,
        totalPosts,
        loading: false
      });

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Show loading while checking manager status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show access denied if manager status is not active
  if (managerStatus && managerStatus !== "active") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              {managerStatus === "inactive" 
                ? "Your manager account is currently inactive. Please contact the range owner to activate your account."
                : managerStatus === "not_found"
                ? "You do not have manager access. Please contact the range owner for assistance."
                : "There was an error verifying your manager access. Please try again or contact support."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button onClick={() => navigate("/")} className="mt-4">
              Go to Home
            </Button>
            <Button 
              onClick={() => {
                setLoading(true);
                setManagerStatus(null);
                checkManagerStatus();
              }} 
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      <header className="bg-white/90 shadow-sm backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">👨‍💼</span>
                </div>
                Welcome, {(user?.displayName?.split('|')[0]) || user?.email?.split('@')[0] || "Manager"}!
              </h1>
              <p className="text-slate-600 font-medium">Manager Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="font-semibold px-6 py-2 border-slate-200 hover:bg-slate-50 transition-all duration-200"
              >
                Home
              </Button>
              <Button
                onClick={handleSignOut}
                className="font-semibold px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Ranges */}
          <Card 
            onClick={() => navigate("/dashboard/manager/ranges")}
            className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Managed Ranges</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                <MapPin className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {dashboardData.loading ? "..." : dashboardData.totalRanges}
              </div>
              <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Active facilities
              </p>
            </CardContent>
          </Card>

          {/* Total Members */}
          <Card 
            onClick={() => navigate("/dashboard/manager/bookings")}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-900">Total Members</CardTitle>
              <div className="p-2 bg-emerald-500 rounded-lg group-hover:bg-emerald-600 transition-colors">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900 mb-1">
                {dashboardData.loading ? "..." : dashboardData.totalMembers}
              </div>
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <Star className="w-3 h-3" />
                Unique customers
              </p>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-900">Monthly Revenue</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                <BarChart className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {dashboardData.loading ? "..." : formatCurrency(dashboardData.monthlyRevenue)}
              </div>
              <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Current month
              </p>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card 
            onClick={() => navigate("/dashboard/manager/events")}
            className="bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-amber-900">Upcoming Events</CardTitle>
              <div className="p-2 bg-amber-500 rounded-lg group-hover:bg-amber-600 transition-colors">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900 mb-1">
                {dashboardData.loading ? "..." : dashboardData.upcomingEvents.length}
              </div>
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Next 30 days
              </p>
            </CardContent>
          </Card>

          {/* Posts */}
          <Card 
            onClick={() => navigate("/dashboard/manager/posts")}
            className="bg-gradient-to-br from-rose-50 to-rose-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-rose-900">My Posts</CardTitle>
              <div className="p-2 bg-rose-500 rounded-lg group-hover:bg-rose-600 transition-colors">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-900 mb-1">
                {dashboardData.loading ? "..." : dashboardData.totalPosts}
              </div>
              <p className="text-xs text-rose-700 font-medium flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Published content
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Events Table */}
        {dashboardData.upcomingEvents.length > 0 && (
          <div className="mb-8">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-gray-900">Scheduled Events</CardTitle>
                <CardDescription className="text-slate-600">Upcoming events at managed ranges</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Event Name</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Date</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Location</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Registrations</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.upcomingEvents.map((event) => (
                        <tr key={event.id} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                          <td className="py-4 px-6 font-medium text-gray-900">{event.name}</td>
                          <td className="py-4 px-6 text-slate-600">{event.date}</td>
                          <td className="py-4 px-6 text-slate-600">{event.location}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-700 font-medium">{event.registrations}/{event.capacity}</span>
                              <div className="w-20 bg-slate-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                                  style={{ width: `${Math.min((event.registrations / event.capacity) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${eventStatus[event.status as keyof typeof eventStatus].color}`}>
                              {eventStatus[event.status as keyof typeof eventStatus].icon}
                              {event.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-100 flex items-center gap-2 font-medium">
                              View Details <ArrowRightCircle className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="font-bold text-gray-900">Range Usage</CardTitle>
              <CardDescription className="text-slate-600">Last 7 days activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[200px] flex items-end justify-between gap-2">
                {[
                  { label: "Mon", value: 30 },
                  { label: "Tue", value: 45 },
                  { label: "Wed", value: 60 },
                  { label: "Thu", value: 75 },
                  { label: "Fri", value: 90 },
                  { label: "Sat", value: 80 },
                  { label: "Sun", value: 70 },
                ].map((day) => (
                  <div key={day.label} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-full max-w-8 rounded-t-lg bg-gradient-to-t from-green-400 to-emerald-600 relative group transition-all duration-300 hover:from-green-500 hover:to-emerald-700"
                      style={{ height: `${day.value}%` }}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.value}% usage
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 font-medium">{day.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="font-bold text-gray-900">Member Distribution</CardTitle>
              <CardDescription className="text-slate-600">By membership type</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {[
                  { label: "Standard", value: 65, color: "from-green-400 to-emerald-600" },
                  { label: "Premium", value: 25, color: "from-emerald-400 to-emerald-600" },
                  { label: "VIP", value: 10, color: "from-teal-400 to-teal-600" },
                ].map((type) => (
                  <div key={type.label} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-700">{type.label}</span>
                      <span className="text-sm font-bold text-slate-900">{type.value}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full bg-gradient-to-r ${type.color} transition-all duration-500`}
                        style={{ width: `${type.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Range Listing Manager Component */}
        <div>
          <RangeListingManager />
        </div>
      </main>
      
      {/* Modals */}
      <BlockUserModal 
        isOpen={isBlocked} 
        onClose={() => setIsBlocked(false)} 
      />
    </div>
  );
};

export default ManagerDashboard;