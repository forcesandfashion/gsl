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
import { Trophy, Target, Calendar, User, BookOpen, Star, TrendingUp, Clock, Zap, Phone, X , Crown} from "lucide-react";
import CoachListCard from "./CoachListCard";
import ShooterProfile from "./ShooterProfile";
import ShootingSessionUpload from "./ShootingSessionUpload";
import ShootingLeaderboard from "./ShootingLeaderboard";
import { db, storage} from "@/firebase/config";
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit } from "firebase/firestore";

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
  sessionStats?: {
    totalScore: number;
    innerTens: number;
    discipline: string;
    date: string;
  };
}

// Updated Shooter interface for Leaderboard
interface LeaderboardShooter {
  id: string;
  fullName: string;
  totalPoints: number;
  preferredDisciplines?: string[];
  lastActive?: any;
}

const rankIcon = (rank: number) => {
  if (rank === 1) return <span className="inline-block mr-1">🥇</span>;
  if (rank === 2) return <span className="inline-block mr-1">🥈</span>;
  if (rank === 3) return <span className="inline-block mr-1">🥉</span>;
  return rank;
};

const stars = (count: number) => (
  <span className="text-red-500 text-lg">{Array.from({ length: count }).map((_, i) => (<span key={i}>★</span>))}</span>
);

const calculateProfileCompletion = (profileData: any) => {
  if (!profileData) return 0;
  const profileFields = [
    { field: 'fullName', weight: 10, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'age', weight: 5, check: (val: any) => val && (typeof val === 'number' ? val > 0 : parseInt(val) > 0) },
    { field: 'experience', weight: 10, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'achievements', weight: 8, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'preferredDisciplines', weight: 8, check: (val: any) => val && Array.isArray(val) && val.length > 0 },
    { field: 'favoriteGun', weight: 7, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'favoriteAmmunition', weight: 7, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'favoriteStance', weight: 7, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'additionalEquipment', weight: 5, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'height', weight: 6, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'weight', weight: 6, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'leftEyeSight', weight: 5, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'rightEyeSight', weight: 5, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'dominantHand', weight: 6, check: (val: any) => val && val.toString().trim().length > 0 },
    { field: 'profileImage', weight: 5, check: (val: any) => val && val.toString().trim().length > 0 }
  ];
  let completedWeight = 0;
  let totalWeight = profileFields.reduce((sum, field) => sum + field.weight, 0);
  profileFields.forEach(({ field, weight, check }) => {
    if (check(profileData[field])) completedWeight += weight;
  });
  return Math.round((completedWeight / totalWeight) * 100);
};

const ShooterDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [latestSession, setLatestSession] = useState<ShootingSession | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [userBookings, setUserBookings] = useState(0);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // Real Leaderboard State
  const [topShooters, setTopShooters] = useState<LeaderboardShooter[]>([]);

  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) { setDashboardLoading(false); return; }
      try {
        // Fetch Upcoming Events
        const eventsQuery = query(collection(db, "events"));
        const eventsSnapshot = await getDocs(eventsQuery);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        const upcomingEventsData = eventsSnapshot.docs.filter(doc => {
          const eventData = doc.data();
          if (!eventData.date) return false;
          try {
            const eventDate = eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date);
            return eventDate >= now && eventDate <= thirtyDaysFromNow;
          } catch (e) { return false; }
        });
        setUpcomingEvents(upcomingEventsData.length);

        // Fetch User Bookings
        const bookingsQuery = query(collection(db, "bookings"), where("userId", "==", user.uid));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings: Booking[] = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Booking, "id">)
        }));
        setUserBookings(bookings.length);
        if (bookings.length > 0) setLatestBooking(bookings[0]);

        // Fetch Latest Session
        const sessionsQuery = query(
          collection(db, "shooters", user.uid, "shootingSessions"),
          orderBy("uploadDate", "desc"),
          limit(1)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        if (!sessionsSnapshot.empty) {
          setLatestSession({ id: sessionsSnapshot.docs[0].id, ...sessionsSnapshot.docs[0].data() } as ShootingSession);
        }

        // FETCH REAL SHOOTERS FOR LEADERBOARD
        const leaderboardQuery = query(
          collection(db, "shooters"),
          orderBy("totalPoints", "desc"),
          limit(5)
        );
        const leaderboardSnapshot = await getDocs(leaderboardQuery);
        const leaders = leaderboardSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LeaderboardShooter[];
        console.log("Top Shooters:", leaders);
        setTopShooters(leaders);

      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setDashboardLoading(false);
      }
    };
    fetchDashboardData();
  }, [user?.uid]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) { setLoading(false); return; }
      try {
        const shootersRef = collection(db, "shooters");
        const shootersQuery = query(shootersRef, where("uid", "==", user.uid));
        const shootersSnapshot = await getDocs(shootersQuery);
        if (!shootersSnapshot.empty) {
          const profileData = shootersSnapshot.docs[0].data();
          setUserProfile(profileData);
          setProfileCompletion(calculateProfileCompletion(profileData));
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [user?.uid]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const handleProfileUpdate = () => { navigate("/profile"); };
  const handleBooking = () => { navigate("/ranges");};
  
  const getCompletionMessage = (completion: number) => {
    if (completion === 0) return "Get started on your profile";
    if (completion < 30) return "Just getting started";
    if (completion < 60) return "Making good progress";
    if (completion < 80) return "Almost there!";
    if (completion < 100) return "Nearly complete";
    return "Profile complete!";
  };

  const getCompletionColor = (completion: number) => {
    if (completion < 30) return "from-red-400 to-red-600";
    if (completion < 60) return "from-blue-400 to-blue-600";
    if (completion < 80) return "from-blue-600 to-blue-800";
    return "from-green-400 to-green-600";
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (e) { return "Invalid Date"; }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-lg sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                Welcome, <span className="text-[#ff5252]">{user?.displayName ? user.displayName.split('|')[0] : user?.email?.split('@')[0] || "Shooter"}</span>!
              </h1>
              <p className="text-gray-600 font-medium">Shooter Dashboard - Track your progress and improve your skills</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user?.displayName ? user.displayName.split('|')[0][0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "S"}
                </div>
                <div className="hidden md:block">
                  <p className="font-semibold text-gray-900">{user?.displayName ? user.displayName.split('|')[0] : user?.email?.split('@')[0] || "Shooter"}</p>
                  <p className="text-sm text-gray-600">Member</p>
                </div>
              </div>
              <Button onClick={() => navigate("/")} variant="outline" className="font-semibold px-6 py-2 border-gray-200 hover:bg-gray-50">Home</Button>
              <Button onClick={handleSignOut} className="font-semibold px-6 py-2 bg-blue-700 hover:bg-[#ff5252] text-white shadow-lg transition-all duration-200">Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner and Premium Logic Restored */}
        {!isPremium && !premiumBannerDismissed && (
          <div className="mb-10">
            <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl border-2 border-[#ff6b6b] overflow-hidden group">
              <div className="absolute top-0 right-0 p-4">
                 <Crown className="w-24 h-24 text-gray-50 -rotate-12" />
              </div>
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#ff6b6b] rounded-2xl flex items-center justify-center shadow-xl">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">Upgrade to GSL Premium</h3>
                    <p className="text-gray-500 font-medium">Unlock exclusive competitions, video analysis, and featured placements.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setShowPremiumModal(true)}
                    className="bg-blue-700 hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl transition-all"
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-blue-50 border-0 shadow-lg group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Your Ranking</CardTitle>
              <div className="p-2 bg-blue-700 rounded-lg"><Trophy className="h-5 w-5 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-1">{userRank ? `#${userRank}` : "Unranked"}</div>
              <p className="text-xs text-blue-700 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total Points: {userProfile?.totalPoints || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-0 shadow-lg group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-red-900">Latest Session</CardTitle>
              <div className="p-2 bg-[#ff5252] rounded-lg"><Target className="h-5 w-5 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900 mb-1">{dashboardLoading ? "..." : latestSession ? `${latestSession.pointsEarned} pts` : "No Sessions"}</div>
              {latestSession && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (<Star key={i} className={cn("w-3 h-3", i < latestSession.rating ? "fill-red-500 text-red-500" : "text-gray-300")} />))}
                  </div>
                  <p className="text-xs text-red-700 font-medium truncate">{latestSession.sessionName}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-0 shadow-lg group" onClick={() => navigate("/dashboard/shooter/events")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Upcoming Events</CardTitle>
              <div className="p-2 bg-blue-700 rounded-lg"><Calendar className="h-5 w-5 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-1">{dashboardLoading ? "..." : upcomingEvents}</div>
              <p className="text-xs text-blue-700 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Next 30 days</p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-0 shadow-lg group" onClick={handleBooking}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-red-900">My Bookings</CardTitle>
              <div className="p-2 bg-[#ff5252] rounded-lg"><BookOpen className="h-5 w-5 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900 mb-1">{dashboardLoading ? "..." : userBookings}</div>
              {latestBooking && <p className="text-xs text-red-700 font-medium truncate">Next: {formatDate(latestBooking.date)}</p>}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-0 shadow-lg cursor-pointer group" onClick={handleProfileUpdate}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Profile</CardTitle>
              <div className="p-2 bg-blue-700 rounded-lg"><User className="h-5 w-5 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-2">{loading ? "..." : `${profileCompletion}%`}</div>
              <div className="w-full h-2 bg-blue-200 rounded-full mb-2">
                <div className={`h-2 rounded-full bg-gradient-to-r ${getCompletionColor(profileCompletion)}`} style={{ width: `${profileCompletion}%` }}></div>
              </div>
              <p className="text-xs text-blue-700 font-medium">{loading ? "Loading..." : getCompletionMessage(profileCompletion)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
          <div className="lg:col-span-2"><CoachListCard /></div>
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="border-b border-gray-100 p-4 md:p-6">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-700" /> Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">Manage your profile and session uploads.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <Button className="w-full bg-blue-700 hover:bg-[#ff5252] text-white font-semibold flex justify-start items-center" onClick={handleProfileUpdate}>
                <User className="w-4 h-4 mr-3" /> Edit My Profile ({profileCompletion}%)
              </Button>
              <Button className="w-full bg-blue-700 hover:bg-[#ff5252] text-white font-semibold flex justify-start items-center" onClick={() => navigate("/dashboard/history")}>
                <Clock className="w-4 h-4 mr-3" /> View Session History
              </Button>
              <Button variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-red-50 hover:text-[#ff5252] font-semibold flex justify-start items-center">
                <Phone className="w-4 h-4 mr-3" /> Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>

        <ShootingSessionUpload />
        <br />

        {/* REAL GLOBAL LEADERBOARD */}
        <Card className="mb-8 shadow-lg border-0 bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-blue-700 text-white">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" /> GLOBAL LEADERBOARD
            </CardTitle>
            <CardDescription className="text-blue-100 uppercase text-xs tracking-widest font-bold">
              Current Standings: Top Ranked GSL Athletes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr className="text-gray-700">
                    <th className="py-4 px-6 font-bold uppercase text-xs border-b"># Rank</th>
                    <th className="py-4 px-6 font-bold uppercase text-xs border-b">Athlete</th>
                    <th className="py-4 px-6 font-bold uppercase text-xs border-b">Primary Discipline</th>
                    <th className="py-4 px-6 font-bold uppercase text-xs border-b text-center">Elite Badge</th>
                    <th className="py-4 px-6 font-bold uppercase text-xs border-b text-right">Career Score</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardLoading ? (
                    <tr><td colSpan={5} className="py-10 text-center text-gray-400">Loading standings...</td></tr>
                  ) : topShooters.length > 0 ? (
                    topShooters.map((shooter, index) => (
                      <tr key={shooter.id} className="border-b hover:bg-blue-50/30 transition-colors">
                        <td className="py-4 px-6 font-black text-lg text-blue-700">{rankIcon(index + 1)}</td>
                        <td className="py-4 px-6 font-bold text-gray-900 uppercase tracking-tight">{shooter.fullName}</td>
                        <td className="py-4 px-6 text-gray-600 text-sm">
                          {shooter.preferredDisciplines?.[0] || "General Shooting"}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {shooter.totalPoints > 5000 ? <StarsIcon className="text-yellow-500 mx-auto" /> : <Target className="w-4 h-4 text-gray-300 mx-auto" />}
                        </td>
                        <td className="py-4 px-6 font-black text-right text-[#ff5252] text-xl">
                          {shooter.totalPoints.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="py-10 text-center text-gray-400">No athlete data available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <BuyPremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
};

// Simple star icon helper for the table
const StarsIcon = ({ className }: { className?: string }) => (
  <div className={cn("flex justify-center", className)}>
    <Star className="w-4 h-4 fill-current" />
    <Star className="w-4 h-4 fill-current" />
    <Star className="w-4 h-4 fill-current" />
  </div>
);

export default ShooterDashboard;