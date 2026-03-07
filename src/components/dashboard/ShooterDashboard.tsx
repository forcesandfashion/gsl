import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import BuyPremiumModal from "./BuyPremiumModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Trophy, 
  Target, 
  Calendar, 
  User, 
  BookOpen, 
  Star, 
  TrendingUp, 
  Clock, 
  Zap, 
  Phone, 
  X , 
  Crown,
  Award,
  ChevronRight
} from "lucide-react";
import CoachListCard from "./CoachListCard";
import ShootingSessionUpload from "./ShootingSessionUpload";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

// --- Interfaces ---

interface Booking {
  id: string;
  userId: string;
  date?: any;
  status?: string;
  eventName?: string;
  venue?: string;
  time?: string;
}

interface ShootingSession {
  id: string;
  sessionName: string;
  rating: number;
  pointsEarned: number;
  uploadDate: any;
}

interface LeaderboardShooter {
  id: string;
  fullName: string;
  totalPoints: number;
  preferredDisciplines?: string[];
}

// --- Helper Functions ---

const rankIcon = (rank: number) => {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="font-black text-gray-400">#{rank}</span>;
};

const getRankBadge = (points: number) => {
  if (points >= 10000) {
    return { 
      label: "Platinum", 
      color: "text-slate-500", 
      bg: "bg-slate-100", 
      icon: <Crown className="w-4 h-4 fill-current" /> 
    };
  }
  if (points >= 5000) {
    return { 
      label: "Gold", 
      color: "text-yellow-600", 
      bg: "bg-yellow-100", 
      icon: <Star className="w-4 h-4 fill-current" /> 
    };
  }
  if (points >= 2000) {
    return { 
      label: "Silver", 
      color: "text-gray-500", 
      bg: "bg-gray-100", 
      icon: <Trophy className="w-4 h-4" /> 
    };
  }
  if (points >= 1000) {
    return { 
      label: "Bronze", 
      color: "text-amber-700", 
      bg: "bg-amber-100", 
      icon: <Award className="w-4 h-4" /> 
    };
  }
  return { 
    label: "Rookie", 
    color: "text-blue-500", 
    bg: "bg-blue-50", 
    icon: <Zap className="w-4 h-4" /> 
  };
};

const calculateProfileCompletion = (profileData: any) => {
  if (!profileData) return 0;
  const profileFields = [
    { field: 'fullName', weight: 10, check: (val: any) => val?.trim().length > 0 },
    { field: 'age', weight: 5, check: (val: any) => parseInt(val) > 0 },
    { field: 'experience', weight: 10, check: (val: any) => val?.trim().length > 0 },
    { field: 'preferredDisciplines', weight: 10, check: (val: any) => Array.isArray(val) && val.length > 0 },
    { field: 'profileImage', weight: 10, check: (val: any) => val?.trim().length > 0 }
  ];
  let completedWeight = 0;
  let totalWeight = profileFields.reduce((sum, field) => sum + field.weight, 0);
  profileFields.forEach(({ field, weight, check }) => {
    if (check(profileData[field])) completedWeight += weight;
  });
  return Math.round((completedWeight / totalWeight) * 100);
};

// --- Main Component ---

const ShooterDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [latestSession, setLatestSession] = useState<ShootingSession | null>(null);
  const [userRankLabel, setUserRankLabel] = useState<string>("Unranked");
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [userBookings, setUserBookings] = useState(0);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [topShooters, setTopShooters] = useState<LeaderboardShooter[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) return;
      try {
        setLoading(true);

        // 1. Fetch Events
        const eventsSnap = await getDocs(collection(db, "events"));
        setUpcomingEvents(eventsSnap.size);

        // 2. Fetch Bookings
        const bookingsQuery = query(collection(db, "bookings"), where("userId", "==", user.uid));
        const bookingsSnap = await getDocs(bookingsQuery);
        setUserBookings(bookingsSnap.size);
        if (!bookingsSnap.empty) setLatestBooking({ id: bookingsSnap.docs[0].id, ...bookingsSnap.docs[0].data() } as Booking);

        // 3. Fetch Profile & Rank
        const shootersQuery = query(collection(db, "shooters"), where("uid", "==", user.uid));
        const shootersSnap = await getDocs(shootersQuery);
        if (!shootersSnap.empty) {
          const profileData = shootersSnap.docs[0].data();
          setUserProfile(profileData);
          setProfileCompletion(calculateProfileCompletion(profileData));
          setUserRankLabel(getRankBadge(profileData.totalPoints || 0).label);
        }

        // 4. Fetch Global Leaderboard
        const lbQuery = query(collection(db, "shooters"), orderBy("totalPoints", "desc"), limit(5));
        const lbSnap = await getDocs(lbQuery);
        setTopShooters(lbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaderboardShooter)));

      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user?.uid]);

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Shooter <span className="text-[#ff6b6b]">Command</span>:
                <span className="ml-2 text-[#0f172a]">
                  {user?.displayName?.split('|')[0] || "Athlete"}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/")} variant="outline" className="border-[#1d4ed8] text-[#1d4ed8] font-bold uppercase text-[10px]">Home</Button>
              <Button onClick={() => signOut()} className="bg-[#ff6b6b] hover:bg-[#1d4ed8] text-white font-black uppercase text-[10px]">Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Premium Banner */}
        {!isPremium && !premiumBannerDismissed && (
          <Card className="mb-10 relative bg-white rounded-[2rem] p-8 shadow-2xl border-2 border-[#ff6b6b] overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#ff6b6b] rounded-2xl flex items-center justify-center shadow-xl text-white">
                  <Crown className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#0f172a] uppercase">Unlock GSL Premium</h3>
                  <p className="text-gray-500 font-medium">Access advanced analytics, expert coaches, and priority range booking.</p>
                </div>
              </div>
              <Button onClick={() => setShowPremiumModal(true)} className="bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase px-8 py-6 rounded-2xl">Upgrade Now</Button>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <StatCard title="Current Rank" val={userRankLabel} icon={<Trophy />} color="border-[#1d4ed8]" />
          <StatCard title="Points" val={userProfile?.totalPoints || 0} icon={<TrendingUp />} color="border-[#ff6b6b]" />
          <StatCard title="Events" val={upcomingEvents} icon={<Calendar />} color="border-[#1d4ed8]" onClick={() => navigate("/dashboard/shooter/events")} />
          <StatCard title="Bookings" val={userBookings} icon={<BookOpen />} color="border-[#ff6b6b]" onClick={() => navigate("/dashboard/shooter/bookings")} />
          <StatCard title="Profile" val={`${profileCompletion}%`} icon={<User />} color="border-[#1d4ed8]" onClick={() => navigate("/profile")} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2"><CoachListCard /></div>
          <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-[#0f172a] p-6 border-b border-white/10">
              <CardTitle className="text-white font-black uppercase text-xs">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <ActionButton label="Edit Profile" icon={<User />} onClick={() => navigate("/profile")} />
              
              {/* --- Added Hall of Fame Button --- */}
              <ActionButton 
                label="Hall of Fame" 
                icon={<Trophy className="text-[#000]" />} 
                onClick={() => navigate("/dashboard/shooter/hall-of-fame")} 
              />

              <ActionButton label="Session History" icon={<Clock />} onClick={() => navigate("/dashboard/documents")} />
              <ActionButton label="Book a Range" icon={<Target />} onClick={() => navigate("/ranges")} />
            </CardContent>
          </Card>
        </div>

        <ShootingSessionUpload />

        {/* GLOBAL LEADERBOARD */}
        <Card className="mt-10 shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-[#1d4ed8] p-8">
            <CardTitle className="text-white font-black uppercase text-xl flex items-center gap-3">
              <Trophy className="text-[#ff6b6b] w-6 h-6" /> Global Standings
            </CardTitle>
            <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest mt-1">
              Real-time rankings across all disciplines
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-6 px-8 font-black text-[10px] uppercase text-gray-400 tracking-widest">Rank</th>
                    <th className="py-6 px-8 font-black text-[10px] uppercase text-gray-400 tracking-widest">Athlete</th>
                    <th className="py-6 px-8 font-black text-[10px] uppercase text-gray-400 tracking-widest">Discipline</th>
                    <th className="py-6 px-8 font-black text-[10px] uppercase text-gray-400 tracking-widest text-center">Badge</th>
                    <th className="py-6 px-8 font-black text-[10px] uppercase text-gray-400 tracking-widest text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={5} className="py-10 text-center text-gray-400 uppercase font-black">Syncing...</td></tr>
                  ) : topShooters.map((shooter, index) => {
                    const badge = getRankBadge(shooter.totalPoints);
                    return (
                      <tr key={shooter.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="py-6 px-8">{rankIcon(index + 1)}</td>
                        <td className="py-6 px-8 font-black text-[#0f172a] uppercase tracking-tight">{shooter.fullName}</td>
                        <td className="py-6 px-8 text-[10px] font-bold text-gray-500 uppercase">{shooter.preferredDisciplines?.[0] || "General"}</td>
                        <td className="py-6 px-8 text-center">
                          <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm", badge.bg, badge.color, "border-current/20")}>
                            {badge.icon}
                            <span className="text-[10px] font-black uppercase tracking-widest">{badge.label}</span>
                          </div>
                        </td>
                        <td className="py-6 px-8 text-right font-black text-xl text-[#ff6b6b]">{shooter.totalPoints.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
      <BuyPremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
};

// --- Local UI Components ---

const StatCard = ({ title, val, icon, color, onClick }: any) => (
  <Card className={cn("border-0 shadow-lg bg-white border-t-4 transition-transform hover:scale-105 cursor-pointer", color)} onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</CardTitle>
      <div className="text-[#1d4ed8]">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black text-[#0f172a] uppercase">{val}</div>
    </CardContent>
  </Card>
);

const ActionButton = ({ label, icon, onClick }: any) => (
  <Button onClick={onClick} variant="outline" className="w-full h-14 justify-between border-gray-100 rounded-2xl hover:bg-blue-50 hover:text-[#1d4ed8] font-black uppercase text-[10px] tracking-widest px-6 group transition-all">
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
  </Button>
);

export default ShooterDashboard;