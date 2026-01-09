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
import { Users, Calendar, MapPin, BarChart, ArrowRightCircle, CheckCircle, AlertTriangle, XCircle, TrendingUp, Clock, Star, Crown, Zap, Shield, Camera, Video, HeartHandshake, X, FileText, Bot, MessageSquare, UserCheck, CreditCard, Receipt, Target, ChevronRight } from "lucide-react";
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

const RangeOwnerDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalRanges: 0,
    totalMembers: 0,
    monthlyRevenue: 0,
    upcomingEvents: [],
    recentBookings: 0,
    totalProducts: 0,
    activeAssistants: 0,
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
      const rangesQuery = query(collection(db, "ranges"), where("ownerId", "==", user.uid));
      const rangesSnapshot = await getDocs(rangesQuery);
      const ranges = rangesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const rangeIds = ranges.map(range => range.id);

      let totalProducts = 0;
      const postsQuery = query(collection(db, "products"), where("ownerId", "==", user.uid));
      const postsSnapshot = await getDocs(postsQuery);
      totalProducts = postsSnapshot.docs.length;

      let activeAssistants = 0;
      if (isPremium) {
        const assistantsQuery = query(collection(db, "managers"), where("ownerId", "==", user.uid));
        const assistantsSnapshot = await getDocs(assistantsQuery);
        activeAssistants = assistantsSnapshot.docs.length;
      }

      setDashboardData({
        totalRanges: ranges.length,
        totalMembers: 45, // Mocked for UI logic
        monthlyRevenue: 1200,
        upcomingEvents: [],
        recentBookings: 8,
        totalProducts,
        activeAssistants,
        loading: false
      });

    } catch (error: any) {
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Matching Professional Dashboard Style */}
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Range <span className="text-[#ff6b6b]">Command</span>:
                <span className="ml-2 text-[#0f172a]">
                  {(user?.displayName?.split('|')[0]) || "Range Owner"}
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-bold uppercase tracking-widest text-[10px]"
              >
                Home
              </Button>
              <Button
                onClick={handleSignOut}
                className="bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase tracking-widest text-[10px]"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Banner */}
        {!isPremium && !premiumBannerDismissed && (
          <div className="mb-10">
            <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl border-2 border-[#ff6b6b] overflow-hidden group">
              <div className="absolute top-0 right-0 p-4">
                 <Crown className="w-24 h-24 text-[#ff6b6b] -rotate-12" />
              </div>
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#ff6b6b] rounded-2xl flex items-center justify-center shadow-xl">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">Upgrade to GSL Premium</h3>
                    <p className="text-gray-500 font-medium">Unlock assistant accounts, video hosting, and featured placements.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setShowPremiumModal(true)}
                    className="bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl transition-all"
                  >
                    Get Access
                  </Button>
                  <Button variant="ghost" onClick={() => setPremiumBannerDismissed(true)} className="text-gray-400 hover:text-[#ff6b6b]">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Shooter/Coach Dashboard Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card onClick={() => navigate("/dashboard/range-owner/my-ranges")} className="border-0 shadow-lg bg-white border-t-4 border-[#1d4ed8] cursor-pointer hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Facilities</CardTitle>
              <MapPin className="h-4 w-4 text-[#1d4ed8]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{dashboardData.loading ? "..." : dashboardData.totalRanges}</div>
              <p className="text-[10px] text-[#1d4ed8] font-bold uppercase mt-1">Live Listings</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/dashboard/range-owner/bookings")} className="border-0 shadow-lg bg-white border-t-4 border-[#ff6b6b] cursor-pointer hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Members</CardTitle>
              <Users className="h-4 w-4 text-[#ff6b6b]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{dashboardData.loading ? "..." : dashboardData.totalMembers}</div>
              <p className="text-[10px] text-[#ff6b6b] font-bold uppercase mt-1">Unique Shooters</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/dashboard/range-owner/billsAndsubscriptions")} className="border-0 shadow-lg bg-white border-t-4 border-[#1d4ed8] cursor-pointer hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Finance Node</CardTitle>
              <CreditCard className="h-4 w-4 text-[#1d4ed8]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{isPremium ? "ACTIVE" : "UPGRADE"}</div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Billing & Subscriptions</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/dashboard/range-owner/events")} className="border-0 shadow-lg bg-white border-t-4 border-[#ff6b6b] cursor-pointer hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Events</CardTitle>
              <Calendar className="h-4 w-4 text-[#ff6b6b]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{dashboardData.upcomingEvents.length}</div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Scheduled next 30 days</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/dashboard/range-owner/shop")} className="border-0 shadow-lg bg-white border-t-4 border-[#1d4ed8] cursor-pointer hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory</CardTitle>
              <FileText className="h-4 w-4 text-[#1d4ed8]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">{dashboardData.totalProducts}</div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Shop Items</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => isPremium ? navigate("/dashboard/range-owner/assistant-accounts") : setShowPremiumModal(true)} 
            className={cn(
              "border-0 shadow-lg bg-white border-t-4 cursor-pointer hover:scale-105 transition-transform",
              isPremium ? "border-[#ff6b6b]" : "border-slate-200 border-dashed border-2"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel</CardTitle>
              <Bot className={cn("h-4 w-4", isPremium ? "text-[#ff6b6b]" : "text-slate-300")} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#0f172a]">
                {isPremium ? dashboardData.activeAssistants : "LOCK"}
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Assistant Access</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage & Distribution Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-[#0f172a] p-6 border-b border-white/10">
              <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Range Analytics</CardTitle>
              <CardDescription className="text-white/50 font-bold uppercase text-[10px]">7-Day Utilization cycle</CardDescription>
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
              <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Demographics</CardTitle>
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
                    <div className={cn(type.color, "h-full rounded-full")} style={{ width: `${type.value}%` }}></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <RangeListingForm />
      </main>

      <BlockUserModal isOpen={isBlocked} onClose={() => setIsBlocked(false)} />
      <BuyPremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
};

export default RangeOwnerDashboard;