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
import { Users, Calendar, MapPin, BarChart, ArrowRightCircle, CheckCircle, AlertTriangle, XCircle, TrendingUp, Clock, Star, Crown, Zap, Shield, Camera, Video, HeartHandshake, X } from "lucide-react";
import RangeListingForm from "./RangeListingForm";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import BlockUserModal from "./BlockedUserModal";
import BuyPremiumModal from "./BuyPremiumModal";
const eventStatus = {
  Open: { color: "bg-emerald-100 text-emerald-800 border border-emerald-200", icon: <CheckCircle className="inline w-4 h-4 mr-1" /> },
  "Almost Full": { color: "bg-amber-100 text-amber-800 border border-amber-200", icon: <AlertTriangle className="inline w-4 h-4 mr-1" /> },
  Full: { color: "bg-rose-100 text-rose-800 border border-rose-200", icon: <XCircle className="inline w-4 h-4 mr-1" /> },
};

// BuyPremium Modal Component

const RangeOwnerDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalRanges: 0,
    totalMembers: 0,
    monthlyRevenue: 0,
    upcomingEvents: [],
    recentBookings: 0,
    loading: true
  });
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
      checkPremiumStatus();
    }
    if (user) {
      checkBlocked(user.uid).then((blocked) => {
        setIsBlocked(blocked);
        setLoading(false);
      });
    }
  }, [user]);

  const checkPremiumStatus = async () => {
    try {
      const userDoc = doc(db, "range-owners", user.uid);
      const userSnapshot = await getDoc(userDoc);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setIsPremium(userData.premium === true || userData.ownerPremium === true);
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
    }
  };

  const handlePayment = () => {
    // Close modal first
    setShowPremiumModal(false);
    // Navigate to payment page with premium plan details
    navigate("/payment", { 
      state: { 
        plan: "premium", 
        amount: 1000, 
        planName: "GSL Premium",
        returnUrl: "/dashboard/range-owner"
      } 
    });
  };

  const checkBlocked = async (id: string) => {
    try {
      const rangeDoc = doc(db, "range-owners", id);
      const rangeSnapshot = await getDoc(rangeDoc);
      return rangeSnapshot.exists() && rangeSnapshot.data().status === "blocked";
    } catch (error) {
      console.error("Error checking block status:", error);
      return false;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      console.log("Fetching dashboard data for user:", user.uid);

      // Fetch ranges owned by this user
      const rangesQuery = query(
        collection(db, "ranges"),
        where("ownerId", "==", user.uid)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      const ranges = rangesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Array<any>;
      
      console.log("Found ranges:", ranges.length, ranges);
      const rangeIds = ranges.map(range => range.id);

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
      
      // If no events found, try fetching all events and filter manually
      if (events.length === 0 && rangeIds.length > 0) {
        console.log("No events found with rangeId filter, trying all events");
        try {
          const allEventsQuery = query(collection(db, "events"));
          const allEventsSnapshot = await getDocs(allEventsQuery);
          const allEvents = allEventsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          console.log("All events:", allEvents.length);
          
          // Filter events that belong to user's ranges
          events = allEvents.filter(event => rangeIds.includes(event.id));
          console.log("Filtered events:", events.length);
        } catch (allEventsError) {
          console.error("Error fetching all events:", allEventsError);
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
            }));
            console.log("All bookings:", allBookings.length);
            
            // Filter bookings that belong to user's ranges
            bookings = allBookings.filter(booking => rangeIds.includes(booking.id));
            console.log("Filtered bookings:", bookings.length);
          } catch (allBookingsError) {
            console.error("Error fetching all bookings:", allBookingsError);
          }
        }

        // If still no bookings found, try checking if rangeId is actually user.uid
        if (bookings.length === 0) {
          console.log("No bookings found with range filter, trying user.uid as rangeId");
          try {
            const userBookingsQuery = query(
              collection(db, "bookings"),
              where("rangeId", "==", user.uid)
            );
            const userBookingsSnapshot = await getDocs(userBookingsQuery);
            bookings = userBookingsSnapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            }));
            console.log("Bookings with user.uid as rangeId:", bookings.length);
          } catch (userBookingsError) {
            console.error("Error fetching user bookings:", userBookingsError);
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

      // If no ranges found, try alternative approach
      if (ranges.length === 0) {
        console.log("No ranges found with ownerId, checking if ranges exist with different structure");
        try {
          const allRangesQuery = query(collection(db, "ranges"));
          const allRangesSnapshot = await getDocs(allRangesQuery);
          const allRanges = allRangesSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          console.log("All ranges in database:", allRanges.length);
          if (allRanges.length > 0) {
            console.log("Sample range structure:", allRanges[0]);
          }
        } catch (error) {
          console.error("Error fetching all ranges:", error);
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
        recentBookings
      });

      setDashboardData({
        totalRanges: ranges.length,
        totalMembers,
        monthlyRevenue,
        upcomingEvents: processedEvents.slice(0, 5),
        recentBookings,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      <header className="bg-white/90 shadow-sm backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🎯</span>
                </div>
                Welcome, {(user?.displayName?.split('|')[0]) || user?.email?.split('@')[0] || "Range Owner"}!
                {isPremium && (
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 py-1 rounded-full flex items-center gap-1">
                    <Crown className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-semibold">Premium</span>
                  </div>
                )}
              </h1>
              <p className="text-slate-600 font-medium">Range Owner Dashboard</p>
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
                className="font-semibold px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Banner - Only show if user is not premium and banner not dismissed */}
        {!isPremium && !premiumBannerDismissed && (
          <div className="mb-8">
            <div className="relative bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-6 shadow-2xl border border-yellow-300">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-2xl"></div>
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-yellow-300/30 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-yellow-200/40 rounded-full blur-xl"></div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                      Unlock GSL Premium Features
                      <Zap className="w-6 h-6 text-yellow-200" />
                    </h3>
                    <p className="text-yellow-100 text-lg font-medium mb-1">
                      Get premium support, video uploads, enhanced visibility, and more!
                    </p>
                    <div className="flex items-center gap-4 text-sm text-yellow-100">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>24/7 Support</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        <span>Video Hosting</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Featured Listings</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right text-white mr-4">
                    <div className="text-3xl font-bold">₹1,000</div>
                    <div className="text-sm text-yellow-100">per month</div>
                  </div>
                  <Button
                    onClick={() => setShowPremiumModal(true)}
                    className="bg-white text-yellow-600 hover:bg-yellow-50 font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPremiumBannerDismissed(true)}
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Ranges */}
          <Card 
            onClick={() => navigate("/dashboard/range-owner/my-ranges")}
            className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">My Ranges</CardTitle>
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
            onClick={() => navigate("/dashboard/range-owner/bookings")}
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
            onClick={() => navigate("/dashboard/range-owner/events")}
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
        </div>

        {/* Scheduled Events Table */}
        {dashboardData.upcomingEvents.length > 0 && (
          <div className="mb-8">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-gray-900">Scheduled Events</CardTitle>
                <CardDescription className="text-slate-600">Upcoming events at your ranges</CardDescription>
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
                                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
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
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-100 flex items-center gap-2 font-medium">
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

        {/* Charts Section - Keeping original UI as requested */}
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
                      className="w-full max-w-8 rounded-t-lg bg-gradient-to-t from-blue-400 to-blue-600 relative group transition-all duration-300 hover:from-blue-500 hover:to-blue-700"
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
                  { label: "Standard", value: 65, color: "from-blue-400 to-blue-600" },
                  { label: "Premium", value: 25, color: "from-emerald-400 to-emerald-600" },
                  { label: "VIP", value: 10, color: "from-purple-400 to-purple-600" },
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

        {/* Range Listing Form */}
        <div>
          <RangeListingForm />
        </div>
      </main>
      
      {/* Modals */}
      <BlockUserModal 
        isOpen={isBlocked} 
        onClose={() => setIsBlocked(false)} 
      />
      
      <BuyPremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
        
      />
    </div>
  );
};

export default RangeOwnerDashboard;