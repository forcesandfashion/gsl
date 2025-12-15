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
import ShootingSessionUpload from "./ShootingSessionUpload";
import SessionUploadManager from "./SessionUploadManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Imported Icons from existing dashboard, plus coach-specific ones
import { Users, Calendar, MapPin, BarChart, ArrowRightCircle, CheckCircle, AlertTriangle, XCircle, TrendingUp, Clock, Star, Crown, Zap, Shield, Camera, Video, HeartHandshake, X, FileText, Bot, MessageSquare, UserCheck, CreditCard, Receipt, Target, MonitorDot, Microscope, Zap as CoachZap } from "lucide-react";


// Existing Firebase imports
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";

// --- COACH-SPECIFIC CONSTANTS & TYPES ---
interface StudentMetrics {
    id: string;
    name: string;
    discipline: string;
    latestScore: number;
    avgTriggerTime: number; // seconds
    groupSize: number; // mm
    lastSession: string;
    trend: 'up' | 'down' | 'stable';
}

// --- NEW DATA STRUCTURE FOR CHART ---
interface DisciplineData {
    discipline: string;
    avgScore: number;
    highScore: number;
    lowScore: number;
    studentCount: number;
    color: string;
}

// --- NEW MOCK DATA FOR PERFORMANCE DISTRIBUTION ---
const mockDisciplinePerformance: DisciplineData[] = [
    {
        discipline: "10m Air Rifle",
        avgScore: 625.1,
        highScore: 632.4,
        lowScore: 618.9,
        studentCount: 8,
        color: 'bg-blue-500', 
    },
    {
        discipline: "25m Pistol",
        avgScore: 578.5,
        highScore: 585.9,
        lowScore: 569.0,
        studentCount: 4,
        color: 'bg-red-500', 
    },
    {
        discipline: "50m Rifle Prone",
        avgScore: 620.3,
        highScore: 624.1,
        lowScore: 615.5,
        studentCount: 6,
        color: 'bg-green-500', 
    },
];

const trendStyles = {
  up: { color: "text-emerald-500", bg: "bg-emerald-100", icon: <TrendingUp className="w-4 h-4 mr-1" /> },
  down: { color: "text-rose-500", bg: "bg-rose-100", icon: <XCircle className="w-4 h-4 mr-1" /> },
  stable: { color: "text-blue-500", bg: "bg-blue-100", icon: <Target className="w-4 h-4 mr-1" /> },
};

// Placeholder Data for demonstration (will be replaced by fetch data)
const mockStudents: StudentMetrics[] = [
    { id: "S101", name: "Aarav Gupta", discipline: "10m Air Rifle", latestScore: 628.5, avgTriggerTime: 0.75, groupSize: 8.9, lastSession: "2 days ago", trend: 'up' },
    { id: "S102", name: "Priya Singh", discipline: "25m Pistol", latestScore: 582.0, avgTriggerTime: 0.42, groupSize: 12.1, lastSession: "Today", trend: 'down' },
    { id: "S103", name: "Vikram Reddy", discipline: "50m Rifle Prone", latestScore: 619.1, avgTriggerTime: 1.10, groupSize: 7.2, lastSession: "4 days ago", trend: 'stable' },
];

const TechnicalCoachDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    totalSessions: 0,
    avgStudentScore: 0,
    highPriorityStudents: [] as StudentMetrics[], // Students with low score/bad trend
    recentPerformanceUploads: 0,
    loading: true
  });
  // State to hold the fetched students
  const [allStudents, setAllStudents] = useState<StudentMetrics[]>([]); 
  const [isPremium, setIsPremium] = useState(false); // Mimic premium check

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
      // checkPremiumStatus(); // Assume this is handled elsewhere or is mock
      setIsPremium(true); // For demo, assume coach is premium to show all features
    }
  }, [user]);
  
  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      // In a real app, this query would fetch students assigned to the coach (user.uid)
      // Since we don't have the 'students' collection structure, we'll use mock data
      
      const fetchedStudents = mockStudents; // Replace with Firebase fetch:
      /* const studentsQuery = query(
        collection(db, "students"),
        where("coachId", "==", user.uid)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentMetrics[];
      */

      setAllStudents(fetchedStudents);
      
      const totalStudents = fetchedStudents.length;
      const totalScores = fetchedStudents.reduce((sum, s) => sum + s.latestScore, 0);
      const avgStudentScore = totalStudents > 0 ? totalScores / totalStudents : 0;
      
      // Filter for students needing attention (e.g., trend 'down' or score below 600)
      const highPriorityStudents = fetchedStudents
          .filter(s => s.trend === 'down' || (s.discipline.includes('Rifle') && s.latestScore < 620) || (s.discipline.includes('Pistol') && s.latestScore < 570));


      setDashboardData({
        totalStudents,
        totalSessions: 120, // Mocked total sessions
        avgStudentScore,
        highPriorityStudents: highPriorityStudents.slice(0, 3),
        recentPerformanceUploads: 15, // Mocked new uploads
        loading: false
      });

    } catch (error: any) {
      console.error("Error fetching coach dashboard data:", error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatScore = (score: number) => {
    return score.toFixed(1);
  };
  
  const formatTime = (time: number) => {
    return time.toFixed(2) + 's';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      {/* REMOVED MIN-H-[10VH] and added minimal vertical padding on the inner content */}
      <header className="bg-white/90 shadow-sm backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50 flex items-center h-24"> 
        
        {/* ADDED MINIMAL VERTICAL PADDING HERE: py-2 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2"> 
          <div className="flex justify-between items-center gap-2"> 
            <div className="flex items-center gap-2">
              
              {/* Icon size reduced to w-6 h-6 */}
{/*               <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🎯</span>
              </div> */}
              
              <div>
                {/* TITLE SIZE REDUCED to text-base/text-lg */}
                <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                  Coach Dashboard:
                  <span className="text-red-600">
                    {(user?.displayName?.split('|')[0]) || user?.email?.split('@')[0] || "Shooter"}!
                  </span>
                  
                  {/* ELITE BADGE - Minimal padding/text size */}
{/*                   {isPremium && (
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-1 py-0 rounded-full flex items-center gap-1 text-xs font-semibold text-white shadow-md">
                      <Crown className="w-2.5 h-2.5 text-white" />
                      <span>Elite</span>
                    </div>
                  )} */}
                </h1>
              </div>
            </div>
            
            {/* Action Buttons - Minimal padding/size */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                onClick={() => navigate("/dashboard/technical-coach/profile")}
                variant="outline"
                className="font-semibold px-3 py-1 border-slate-200 hover:bg-slate-50 transition-all duration-200 text-xs"
                size="sm"
              >
                <BarChart className="w-3 h-3 mr-1" /> Profile
              </Button>
              <Button
                onClick={handleSignOut}
                className="font-semibold px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-xs"
                size="sm"
              >
                Sign Out
              </Button>
              
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

        {/* ------------------ STATS CARDS ------------------ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            
            {/* Total Students */}
            <Card onClick={() => navigate("/coach/students")} className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                    <CardTitle className="text-sm font-semibold text-indigo-900">Total Students</CardTitle>
                    <div className="p-2 bg-indigo-500 rounded-lg group-hover:bg-indigo-600 transition-colors">
                        <Users className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                    <div className="text-2xl md:text-3xl font-bold text-indigo-900 mb-1">
                        {dashboardData.loading ? "..." : dashboardData.totalStudents}
                    </div>
                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Under your guidance
                    </p>
                </CardContent>
            </Card>

            {/* Average Student Score */}
            <Card onClick={() => navigate("/coach/performance")} className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                    <CardTitle className="text-sm font-semibold text-green-900">Average Score (Latest)</CardTitle>
                    <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                        <Target className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                    <div className="text-2xl md:text-3xl font-bold text-green-900 mb-1">
                        {dashboardData.loading ? "..." : formatScore(dashboardData.avgStudentScore)}
                    </div>
                    <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Target: {dashboardData.avgStudentScore > 610 ? 'Elite' : 'High Performance'}
                    </p>
                </CardContent>
            </Card>

            {/* Recent Performance Uploads */}
            <Card onClick={() => navigate("/coach/uploads")} className="bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                    <CardTitle className="text-sm font-semibold text-amber-900">Recent Uploads</CardTitle>
                    <div className="p-2 bg-amber-500 rounded-lg group-hover:bg-amber-600 transition-colors">
                        <Camera className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                    <div className="text-2xl md:text-3xl font-bold text-amber-900 mb-1">
                        {dashboardData.loading ? "..." : dashboardData.recentPerformanceUploads}
                    </div>
                    <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last 7 days
                    </p>
                </CardContent>
            </Card>

            {/* Total Coaching Sessions */}
            <Card onClick={() => navigate("/coach/sessions")} className="bg-gradient-to-br from-rose-50 to-rose-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                    <CardTitle className="text-sm font-semibold text-rose-900">Total Sessions</CardTitle>
                    <div className="p-2 bg-rose-500 rounded-lg group-hover:bg-rose-600 transition-colors">
                        <Clock className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                    <div className="text-2xl md:text-3xl font-bold text-rose-900 mb-1">
                        {dashboardData.loading ? "..." : dashboardData.totalSessions}
                    </div>
                    <p className="text-xs text-rose-700 font-medium flex items-center gap-1">
                        <MonitorDot className="w-3 h-3" />
                        Analysis logged
                    </p>
                </CardContent>
            </Card>
        </div>

        {/* ------------------ MAIN CONTENT AREA (List & Charts) ------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            
            {/* High Priority Students (Left Column) */}
            <div className="lg:col-span-1">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                        <CardTitle className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            High Priority Students
                        </CardTitle>
                        <CardDescription className="text-slate-600">Students needing immediate technical review</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.highPriorityStudents.length > 0 ? (
                            <ul className="divide-y divide-red-50/70">
                                {dashboardData.highPriorityStudents.map((student) => {
                                    const trend = trendStyles[student.trend as keyof typeof trendStyles];
                                    return (
                                        <li key={student.id} className="p-4 md:p-5 hover:bg-red-50/50 transition-colors cursor-pointer flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{student.name}</h3>
                                                <p className="text-sm text-red-600 flex items-center gap-1">
                                                    {trend.icon} Score: {formatScore(student.latestScore)} ({student.discipline})
                                                </p>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100/70">
                                                Review <ArrowRightCircle className="w-4 h-4 ml-1" />
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="p-6 text-slate-500 italic">No students currently flagged for immediate review. Great work!</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Performance Charts (Right 2 Columns) */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
                
                {/* Score vs. Discipline Distribution Chart */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                        <CardTitle className="font-bold text-gray-900">Performance Distribution</CardTitle>
                        <CardDescription className="text-slate-600">Latest scores by shooting discipline</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 p-4 md:p-6">
                        {/* <div className="h-[200px] flex items-center justify-center bg-gray-50 border border-dashed rounded-lg text-slate-400"> */}
                            <div className="space-y-4">
                                {mockDisciplinePerformance.map((discipline) => (
                                    <div key={discipline.discipline} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-gray-700">{discipline.discipline}</span>
                                            <span className="text-gray-900 font-bold">{discipline.avgScore}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                                className={`${discipline.color} h-2.5 rounded-full`}
                                                style={{ width: `${(discipline.avgScore / 650) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Low: {discipline.lowScore}</span>
                                            <span>{discipline.studentCount} students</span>
                                            <span>High: {discipline.highScore}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        {/* </div> */}
                    </CardContent>
                </Card>

                {/* Technical Focus Metrics (Drilldown) */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                        <CardTitle className="font-bold text-gray-900 flex items-center gap-2">
                            <Microscope className="w-5 h-5 text-blue-500" />
                            Key Technical Metrics
                        </CardTitle>
                        <CardDescription className="text-slate-600">Average metrics across all active students</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 p-4 md:p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                            <TechnicalMetric title="Avg. Trigger Time" value={formatTime(0.81)} icon={<Clock className="w-5 h-5" />} trend="+0.02s" trendColor="text-rose-500" />
                            <TechnicalMetric title="Median Group Size" value="9.4mm" icon={<Target className="w-5 h-5" />} trend="-0.5mm" trendColor="text-green-500" />
                            <TechnicalMetric title="Stability Index" value="92%" icon={<Zap className="w-5 h-5" />} trend="+1%" trendColor="text-green-500" />
                            <TechnicalMetric title="Recoil Consistency" value="88%" icon={<MonitorDot className="w-5 h-5" />} trend="Stable" trendColor="text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <div>
                    <ShootingSessionUpload />
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={() => navigate("/dashboard/technical-coach/students")}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                        View All Students <ArrowRightCircle className="w-4 h-4 ml-2" />
                    </Button>
                </div>

            </div>
        </div>
        
      </main>

  </div>
  );
};

// Helper component for technical metrics
const TechnicalMetric = ({ title, value, icon, trend, trendColor }: { title: string, value: string, icon: React.ReactNode, trend: string, trendColor: string }) => (
    <div className="p-4 bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
            {icon}
            <span className="text-xs font-semibold uppercase text-slate-600">{title}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className={`text-xs font-medium ${trendColor} mt-1`}>
            {trend} (vs. last month)
        </div>
    </div>
);


export default TechnicalCoachDashboard;