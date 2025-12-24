import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
import { Users, Calendar, MapPin, BarChart, ArrowRightCircle, CheckCircle, AlertTriangle, XCircle, TrendingUp, Clock, Star, FileText, MessageSquare, Target, ChevronRight } from "lucide-react";
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
      const managersQuery = query(collection(db, "managers"), where("uid", "==", user.uid));
      const dieticiansQuery = query(collection(db, "dieticians"), where("uid", "==", user.uid));
      const mentalTrainerQuery = query(collection(db, "mental-trainers"), where("uid", "==", user.uid));

      let managersSnapshot = await getDocs(managersQuery);
      if (managersSnapshot.empty) managersSnapshot = await getDocs(dieticiansQuery);
      if (managersSnapshot.empty) managersSnapshot = await getDocs(mentalTrainerQuery);
      
      if (!managersSnapshot.empty) {
        const managerData = managersSnapshot.docs[0].data();
        setManagerStatus(managerData.status);
        setRangeOwnerId(managerData.rangeOwnerId);
        if (managerData.status === "active") await fetchDashboardData(managerData.rangeOwnerId);
      } else {
        setManagerStatus("not_found");
      }
      setLoading(false);
    } catch (error) {
      setManagerStatus("error");
      setLoading(false);
    }
  };

  const fetchDashboardData = async (ownerId) => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      const rangesQuery = query(collection(db, "ranges"), where("ownerId", "==", ownerId));
      const rangesSnapshot = await getDocs(rangesQuery);
      const ranges = rangesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const rangeIds = ranges.map(range => range.id);

      setDashboardData({
        totalRanges: ranges.length,
        totalMembers: 28,
        monthlyRevenue: 850,
        upcomingEvents: [],
        recentBookings: 12,
        totalPosts: 5,
        loading: false
      });
    } catch (error) {
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d4ed8] mx-auto mb-4"></div>
          <p className="font-black uppercase tracking-widest text-gray-400">Authenticating Access...</p>
        </div>
      </div>
    );
  }

  if (managerStatus && managerStatus !== "active") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md border-t-8 border-[#ff6b6b] rounded-[2rem] shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">Access Restrained</CardTitle>
            <CardDescription className="font-medium text-gray-500 mt-2">
              Your management credentials are currently under review or inactive.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button onClick={() => navigate("/")} className="w-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest py-6 rounded-2xl">Return to Base</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Matching Standard Dashboard Style */}
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Ops <span className="text-[#ff6b6b]">Manager</span>:
                <span className="ml-2 text-[#0f172a]">
                  {(user?.displayName?.split('|')[0]) || "Staff"}
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/")} variant="outline" className="border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-bold uppercase tracking-widest text-[10px]">Home</Button>
              <Button onClick={() => signOut()} className="bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase tracking-widest text-[10px]">Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card className="border-0 shadow-lg bg-white border-t-4 border-[#1d4ed8] transition-transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Facility Nodes</CardTitle>
              <MapPin className="h-4 w-4 text-[#1d4ed8]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{dashboardData.totalRanges}</div>
              <p className="text-[10px] text-[#1d4ed8] font-bold uppercase mt-1">Active Management</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white border-t-4 border-[#ff6b6b] transition-transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Members</CardTitle>
              <Users className="h-4 w-4 text-[#ff6b6b]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{dashboardData.totalMembers}</div>
              <p className="text-[10px] text-[#ff6b6b] font-bold uppercase mt-1">Personnel Tracking</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white border-t-4 border-[#1d4ed8] transition-transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Revenue</CardTitle>
              <BarChart className="h-4 w-4 text-[#1d4ed8]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{formatCurrency(dashboardData.monthlyRevenue)}</div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Financial Cycle</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Distribution Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-[#0f172a] p-6 border-b border-white/10">
              <CardTitle className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <Clock className="text-[#ff6b6b] w-4 h-4" /> Usage Analytics
              </CardTitle>
              <CardDescription className="text-white/50 font-bold uppercase text-[10px]">7-Day Utilization Metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[200px] flex items-end justify-between gap-2">
                {[30, 45, 60, 75, 90, 80, 70].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-[#1d4ed8] rounded-t-xl hover:bg-[#ff6b6b] transition-all cursor-crosshair relative group"
                      style={{ height: `${val}%` }}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-black">{val}%</div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase">{['M','T','W','T','F','S','S'][i]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-[#1d4ed8] p-6">
              <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Membership Tiers</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {[
                { label: "Standard Tier", value: 65, color: "bg-[#1d4ed8]" },
                { label: "Premium Tier", value: 25, color: "bg-[#ff6b6b]" },
                { label: "VIP Founders", value: 10, color: "bg-[#0f172a]" },
              ].map((type) => (
                <div key={type.label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-[#0f172a] uppercase text-[10px] tracking-widest">{type.label}</span>
                    <span className="text-[#1d4ed8] font-black text-xs">{type.value}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={cn(type.color, "h-full rounded-full shadow-md")} style={{ width: `${type.value}%` }}></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Range Listing Manager */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          <RangeListingManager />
        </div>
      </main>
      
      <BlockUserModal isOpen={isBlocked} onClose={() => setIsBlocked(false)} />
    </div>
  );
};

export default ManagerDashboard;