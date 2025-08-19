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
import { Trophy, Target, Calendar, User, BookOpen, Star, TrendingUp, Clock } from "lucide-react";
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

const leaderboardData = [
  { id: 1, rank: 1, player: "Player One", session: "Finals", stars: 5, score: 2980, date: "2024-06-01" },
  { id: 2, rank: 2, player: "Player Two", session: "Semi-Finals", stars: 4, score: 2721, date: "2024-05-28" },
  { id: 3, rank: 3, player: "Player Three", session: "Quarter Finals", stars: 4, score: 2579, date: "2024-05-20" },
  { id: 4, rank: 4, player: "Player Four", session: "Elimination", stars: 3, score: 1874, date: "2024-05-10" },
  { id: 5, rank: 5, player: "Player Five", session: "Prelims", stars: 3, score: 1756, date: "2024-05-01" },
];

const rankIcon = (rank: number) => {
  if (rank === 1) return <span className="inline-block mr-1">🥇</span>;
  if (rank === 2) return <span className="inline-block mr-1">🥈</span>;
  if (rank === 3) return <span className="inline-block mr-1">🥉</span>;
  return rank;
};

const stars = (count: number) => (
  <span className="text-yellow-400 text-lg">{Array.from({ length: count }).map((_, i) => (<span key={i}>★</span>))}</span>
);

// Function to calculate profile completion percentage
const calculateProfileCompletion = (profileData: any) => {
  if (!profileData) return 0;
  
  // Define required profile fields based on ShooterProfile interface and their weights
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
    if (check(profileData[field])) {
      completedWeight += weight;
    }
  });
  
  return Math.round((completedWeight / totalWeight) * 100);
};

const ShooterDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [latestSession, setLatestSession] = useState<ShootingSession | null>(null);
  const [userRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [userBookings, setUserBookings] = useState(0);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Fetch dashboard data (events, bookings, and sessions)
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) {
        setDashboardLoading(false);
        return;
      }

      try {
        console.log("Fetching dashboard data for user:", user.uid);

        // Fetch upcoming events
        let eventsCount = 0;
        try {
          const eventsQuery = query(collection(db, "events"));
          const eventsSnapshot = await getDocs(eventsQuery);
          
          // Get current date for filtering upcoming events
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          
          const upcomingEventsData = eventsSnapshot.docs.filter(doc => {
            const eventData = doc.data();
            if (!eventData.date) return false;
            
            try {
              const eventDate = eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date);
              return eventDate >= now && eventDate <= thirtyDaysFromNow;
            } catch (error) {
              console.warn("Error parsing event date:", eventData.date);
              return false;
            }
          });
          
          eventsCount = upcomingEventsData.length;
          console.log("Upcoming events found:", eventsCount);
        } catch (eventsError) {
          console.error("Error fetching events:", eventsError);
        }

        // Fetch user bookings
        let bookingsCount = 0;
        let latestUserBooking: Booking | null = null;
        try {
          const bookingsQuery = query(
            collection(db, "bookings"),
            where("userId", "==", user.uid),
            orderBy("date", "desc"),
            limit(10)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          
          const bookings: Booking[] = bookingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Booking, "id">)
          }));

          console.log("All user bookings:", bookings); // Debug: see all bookings
          
          // Get current date for filtering upcoming bookings (start of today)
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Set to start of today
          const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          
          console.log("Date range:", { now, thirtyDaysFromNow }); // Debug: see date range
          
          const upcomingBookings = bookings.filter(booking => {
            if (!booking.date) {
              console.log("Booking has no date:", booking);
              return false;
            }
            
            try {
              let bookingDate;
              if (booking.date?.toDate) {
                bookingDate = booking.date.toDate();
              } else if (typeof booking.date === 'string') {
                bookingDate = new Date(booking.date);
              } else if (booking.date?.seconds) {
                // Handle Firestore timestamp format
                bookingDate = new Date(booking.date.seconds * 1000);
              } else {
                bookingDate = new Date(booking.date);
              }
              
              // Set booking date to start of day for comparison
              bookingDate.setHours(0, 0, 0, 0);
              
              console.log("Comparing dates:", { 
                bookingId: booking.id,
                bookingDate, 
                now, 
                thirtyDaysFromNow,
                isUpcoming: bookingDate >= now && bookingDate <= thirtyDaysFromNow 
              });
              
              return bookingDate >= now && bookingDate <= thirtyDaysFromNow;
            } catch (error) {
              console.warn("Error parsing booking date:", booking.date, error);
              return false;
            }
          });
          
          bookingsCount = upcomingBookings.length;
          
          // Get the latest upcoming booking
          if (upcomingBookings.length > 0) {
            latestUserBooking = upcomingBookings[0];
          }
          
          console.log("Filtered upcoming bookings:", upcomingBookings);
          console.log("Upcoming bookings count:", bookingsCount);
        } catch (bookingsError) {
          console.error("Error fetching bookings:", bookingsError);
        }

        // Fetch latest shooting session
        let latestShootingSession: ShootingSession | null = null;
        try {
          const sessionsQuery = query(
            collection(db, "shooters", user.uid, "shootingSessions"),
            orderBy("uploadDate", "desc"),
            limit(1)
          );
          const sessionsSnapshot = await getDocs(sessionsQuery);
          
          if (!sessionsSnapshot.empty) {
            const sessionDoc = sessionsSnapshot.docs[0];
            latestShootingSession = {
              id: sessionDoc.id,
              ...sessionDoc.data()
            } as ShootingSession;
          }
          
          console.log("Latest session found:", latestShootingSession);
        } catch (sessionError) {
          console.error("Error fetching latest session:", sessionError);
        }

        setUpcomingEvents(eventsCount);
        setUserBookings(bookingsCount);
        setLatestBooking(latestUserBooking);
        setLatestSession(latestShootingSession);
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.uid]);

  // Fetch user profile data from Firebase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // Match the same pattern as ShooterProfile component
        const shootersRef = collection(db, "shooters");
        const shootersQuery = query(shootersRef, where("uid", "==", user.uid));
        const shootersSnapshot = await getDocs(shootersQuery);
        
        if (!shootersSnapshot.empty) {
          const profileDoc = shootersSnapshot.docs[0];
          const profileData = profileDoc.data();
          console.log('Profile data loaded:', profileData); // Debug log
          setUserProfile(profileData);
          
          // Calculate profile completion
          const completion = calculateProfileCompletion(profileData);
          console.log('Profile completion:', completion); // Debug log
          
          setProfileCompletion(completion);
        } else {
          console.log('No profile found for user:', user.uid);
          setProfileCompletion(0);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setProfileCompletion(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.uid]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleProfileUpdate = () => {
    navigate("/profile");
  };

  // Get completion status message
  const getCompletionMessage = (completion: number) => {
    if (completion === 0) return "Get started on your profile";
    if (completion < 30) return "Just getting started";
    if (completion < 60) return "Making good progress";
    if (completion < 80) return "Almost there!";
    if (completion < 100) return "Nearly complete";
    return "Profile complete!";
  };

  // Get completion color based on percentage
  const getCompletionColor = (completion: number) => {
    if (completion < 30) return "from-red-400 to-red-600";
    if (completion < 60) return "from-orange-400 to-orange-600";
    if (completion < 80) return "from-yellow-400 to-yellow-600";
    return "from-green-400 to-green-600";
  };

  // Format date helper
  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <header className="bg-white/90 shadow-lg backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                Welcome, {user?.displayName ? user.displayName.split('|')[0] : user?.email?.split('@')[0] || "Shooter"}!
              </h1>
              <p className="text-slate-600 font-medium">Shooter Dashboard - Track your progress and improve your skills</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user?.displayName ? user.displayName.split('|')[0][0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "S"}
                </div>
                <div className="hidden md:block">
                  <p className="font-semibold text-gray-900">{user?.displayName ? user.displayName.split('|')[0] : user?.email?.split('@')[0] || "Shooter"}</p>
                  <p className="text-sm text-slate-600">Member</p>
                </div>
              </div>
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

      {/* Enhanced Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Ranking Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Your Ranking</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                <Trophy className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {userRank ? `#${userRank}` : "Unranked"}
              </div>
              <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Total Points: {userProfile?.totalPoints || 0}
              </p>
            </CardContent>
          </Card>
          
          {/* Latest Session Card */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-red-900">Latest Session</CardTitle>
              <div className="p-2 bg-red-500 rounded-lg group-hover:bg-red-600 transition-colors">
                <Target className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900 mb-1">
                {dashboardLoading ? "..." : latestSession ? `${latestSession.pointsEarned} pts` : "No Sessions"}
              </div>
              {latestSession && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: latestSession.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-xs text-red-700 ml-1">{latestSession.rating}/4</span>
                  </div>
                  <p className="text-xs text-red-700 font-medium truncate">
                    {latestSession.sessionName}
                  </p>
                </div>
              )}
              {!latestSession && !dashboardLoading && (
                <p className="text-xs text-red-700 font-medium">
                  Upload your first session
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Upcoming Events Card */}
          <Card  onClick={() => navigate("/dashboard/shooter/events")}    className="bg-gradient-to-br hover:cursor-pointer from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Upcoming Events</CardTitle>
              <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 mb-1">
                {dashboardLoading ? "..." : upcomingEvents}
              </div>
              <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Next 30 days
              </p>
            </CardContent>
          </Card>
          
          {/* My Bookings Card - FIXED to show count */}
          <Card 
            onClick={() => navigate("/dashboard/shooter/bookings")} 
            className="bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-amber-900">My Bookings</CardTitle>
              <div className="p-2 bg-amber-500 rounded-lg group-hover:bg-amber-600 transition-colors">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900 mb-1">
                {dashboardLoading ? "..." : userBookings}
              </div>
              {latestBooking && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-700 font-medium truncate">
                    Next: {formatDate(latestBooking.date)}
                  </p>
                  <p className="text-xs text-amber-600 truncate">
                    {latestBooking.eventName || "Event"}
                  </p>
                </div>
              )}
              {!latestBooking && !dashboardLoading && (
                <p className="text-xs text-amber-700 font-medium">
                  Book your first event
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profile Completion Card - Enhanced */}
          <Card 
            className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group" 
            onClick={handleProfileUpdate}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-900">Profile</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                <User className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-2">
                {loading ? "..." : `${profileCompletion}%`}
              </div>
              <div className="w-full h-2 bg-purple-200 rounded-full mb-2">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r transition-all duration-500 ${getCompletionColor(profileCompletion)}`}
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
              <p className="text-xs text-purple-700 font-medium">
                {loading ? "Loading..." : getCompletionMessage(profileCompletion)}
              </p>
              {profileCompletion < 100 && (
                <p className="text-xs text-purple-500 mt-1 group-hover:text-purple-700">
                  Click to update
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center border-b border-slate-100">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              Shooting Session
            </CardTitle>
            <CardDescription>Upload your shooting sessions and manage your profile</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <ShooterProfile />
            <div className="mt-8">
              <ShootingSessionUpload />
            </div>
          </CardContent>
        </Card>

        {/* Global Leaderboard Section */}
        <Card className="mb-8 shadow-lg border-0 bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden">
          <CardHeader className="border-b border-blue-500/30">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              GLOBAL LEADERBOARD
            </CardTitle>
            <CardDescription className="text-blue-100">Top shooting scores from all shooters</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-blue-700/50">
                  <tr className="text-blue-100">
                    <th className="py-4 px-6 font-semibold">#</th>
                    <th className="py-4 px-6 font-semibold">Player</th>
                    <th className="py-4 px-6 font-semibold">Session</th>
                    <th className="py-4 px-6 font-semibold">Stars</th>
                    <th className="py-4 px-6 font-semibold">Score</th>
                    <th className="py-4 px-6 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((row) => (
                    <tr key={row.id} className="border-b border-blue-600/30 hover:bg-blue-700/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-lg">{rankIcon(row.rank)}</td>
                      <td className="py-4 px-6 font-semibold">{row.player}</td>
                      <td className="py-4 px-6">{row.session}</td>
                      <td className="py-4 px-6">{stars(row.stars)}</td>
                      <td className="py-4 px-6 font-bold text-cyan-300">{row.score}</td>
                      <td className="py-4 px-6">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShooterDashboard;