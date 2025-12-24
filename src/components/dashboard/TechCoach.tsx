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
import { Users, Calendar, MapPin, BarChart, ArrowRightCircle, CheckCircle, AlertTriangle, XCircle, TrendingUp, Clock, Star, Crown, Zap, Shield, Camera, Video, HeartHandshake, X, FileText, Bot, MessageSquare, UserCheck, CreditCard, Receipt, Target, MonitorDot, Microscope, Zap as CoachZap, ChevronRight } from "lucide-react";

import { db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";

interface StudentMetrics {
    id: string;
    name: string;
    discipline: string;
    latestScore: number;
    avgTriggerTime: number; 
    groupSize: number; 
    lastSession: string;
    trend: 'up' | 'down' | 'stable';
}

interface DisciplineData {
    discipline: string;
    avgScore: number;
    highScore: number;
    lowScore: number;
    studentCount: number;
    color: string;
}

const mockDisciplinePerformance: DisciplineData[] = [
    {
        discipline: "10m Air Rifle",
        avgScore: 625.1,
        highScore: 632.4,
        lowScore: 618.9,
        studentCount: 8,
        color: 'bg-[#1d4ed8]', 
    },
    {
        discipline: "25m Pistol",
        avgScore: 578.5,
        highScore: 585.9,
        lowScore: 569.0,
        studentCount: 4,
        color: 'bg-[#ff6b6b]', 
    },
    {
        discipline: "50m Rifle Prone",
        avgScore: 620.3,
        highScore: 624.1,
        lowScore: 615.5,
        studentCount: 6,
        color: 'bg-[#0f172a]', 
    },
];

const trendStyles = {
  up: { color: "text-green-600", bg: "bg-green-100", icon: <TrendingUp className="w-4 h-4 mr-1" /> },
  down: { color: "text-[#ff6b6b]", bg: "bg-red-100", icon: <XCircle className="w-4 h-4 mr-1" /> },
  stable: { color: "text-[#1d4ed8]", bg: "bg-blue-100", icon: <Target className="w-4 h-4 mr-1" /> },
};

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
    highPriorityStudents: [] as StudentMetrics[],
    recentPerformanceUploads: 0,
    loading: true
  });
  const [allStudents, setAllStudents] = useState<StudentMetrics[]>([]); 
  const [isPremium, setIsPremium] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
    }
  }, [user]);
  
  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      const fetchedStudents = mockStudents;
      setAllStudents(fetchedStudents);
      
      const totalStudents = fetchedStudents.length;
      const totalScores = fetchedStudents.reduce((sum, s) => sum + s.latestScore, 0);
      const avgStudentScore = totalStudents > 0 ? totalScores / totalStudents : 0;
      
      const highPriorityStudents = fetchedStudents
          .filter(s => s.trend === 'down' || (s.discipline.includes('Rifle') && s.latestScore < 620) || (s.discipline.includes('Pistol') && s.latestScore < 570));

      setDashboardData({
        totalStudents,
        totalSessions: 120,
        avgStudentScore,
        highPriorityStudents: highPriorityStudents.slice(0, 3),
        recentPerformanceUploads: 15,
        loading: false
      });
    } catch (error: any) {
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const formatScore = (score: number) => score.toFixed(1);
  const formatTime = (time: number) => time.toFixed(2) + 's';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Updated Header - Matching Shooter Dashboard Logic */}
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center"> 
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"> 
          <div className="flex justify-between items-center"> 
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Coach <span className="text-[#ff6b6b]">Command</span>:
                <span className="ml-2 text-[#1d4ed8]">
                  {(user?.displayName?.split('|')[0]) || user?.email?.split('@')[0] || "Coach"}
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/dashboard/technical-coach/profile")}
                variant="outline"
                className="border-white bg-[#1d4ed8] text-white hover:bg-[#ff6b6b] hover:text-white font-bold uppercase tracking-widest text-[10px]"
              >
                Profile
              </Button>
              <Button
                onClick={() => signOut()}
                className="bg-[#ff6b6b] hover:bg-[#1d4ed8] text-white font-black uppercase tracking-widest text-[10px]"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* STATS CARDS - Shooter Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <Card onClick={() => navigate("/coach/students")} className="border-0 shadow-lg bg-white border-t-4 border-[#1d4ed8] cursor-pointer hover:scale-105 transition-transform">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-[#1d4ed8]" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-[#0f172a]">
                        {dashboardData.loading ? "..." : dashboardData.totalStudents}
                    </div>
                    <p className="text-[10px] text-[#1d4ed8] font-bold uppercase mt-1 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Roster Management
                    </p>
                </CardContent>
            </Card>

            <Card onClick={() => navigate("/coach/performance")} className="border-0 shadow-lg bg-white border-t-4 border-[#ff6b6b] cursor-pointer hover:scale-105 transition-transform">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Average</CardTitle>
                    <Target className="h-4 w-4 text-[#ff6b6b]" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-[#0f172a]">
                        {dashboardData.loading ? "..." : formatScore(dashboardData.avgStudentScore)}
                    </div>
                    <p className="text-[10px] text-[#ff6b6b] font-bold uppercase mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Performance Level
                    </p>
                </CardContent>
            </Card>

            <Card onClick={() => navigate("/coach/uploads")} className="border-0 shadow-lg bg-white border-t-4 border-[#1d4ed8] cursor-pointer hover:scale-105 transition-transform">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Activity</CardTitle>
                    <Camera className="h-4 w-4 text-[#1d4ed8]" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-[#0f172a]">
                        {dashboardData.loading ? "..." : dashboardData.recentPerformanceUploads}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last 7 Days
                    </p>
                </CardContent>
            </Card>

            <Card onClick={() => navigate("/coach/sessions")} className="border-0 shadow-lg bg-white border-t-4 border-[#ff6b6b] cursor-pointer hover:scale-105 transition-transform">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Analysis Logs</CardTitle>
                    <MonitorDot className="h-4 w-4 text-[#ff6b6b]" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-[#0f172a]">
                        {dashboardData.loading ? "..." : dashboardData.totalSessions}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Total Mentorship Hours</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* High Priority Students (Left Column) */}
            <div className="lg:col-span-1">
                <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-gray-50 border-b border-gray-100 p-6">
                        <CardTitle className="text-sm font-black text-[#0f172a] uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#ff6b6b]" />
                            Critical Reviews
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.highPriorityStudents.length > 0 ? (
                            <ul className="divide-y divide-gray-50">
                                {dashboardData.highPriorityStudents.map((student) => {
                                    const trend = trendStyles[student.trend as keyof typeof trendStyles];
                                    return (
                                        <li key={student.id} className="p-5 hover:bg-blue-50/30 transition-colors cursor-pointer flex justify-between items-center group">
                                            <div>
                                                <h3 className="font-bold text-[#0f172a] uppercase text-sm tracking-tight group-hover:text-[#1d4ed8]">{student.name}</h3>
                                                <p className={cn("text-[10px] font-black uppercase flex items-center gap-1 mt-1", trend.color)}>
                                                    {trend.icon} {formatScore(student.latestScore)} — {student.discipline}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1d4ed8]" />
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="p-10 text-gray-400 font-medium text-center italic text-sm">No critical performance alerts.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Performance Distribution */}
            <div className="lg:col-span-2 space-y-8">
                <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-[#1d4ed8] p-6">
                        <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Technical Distribution</CardTitle>
                        <CardDescription className="text-white/50 font-bold uppercase text-[10px]">Benchmarking across disciplines</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="space-y-6">
                            {mockDisciplinePerformance.map((discipline) => (
                                <div key={discipline.discipline} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-[#0f172a] uppercase text-[10px] tracking-widest">{discipline.discipline}</span>
                                        <span className="text-[#1d4ed8] font-black text-sm tracking-tighter">{discipline.avgScore} AVG</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div 
                                            className={`${discipline.color} h-2 rounded-full shadow-lg`}
                                            style={{ width: `${(discipline.avgScore / 650) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                        <span>Min: {discipline.lowScore}</span>
                                        <span>Max: {discipline.highScore}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Key Technical Metrics */}
                <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden border-b-8 border-[#1d4ed8]">
                    <CardHeader className="p-8 border-b border-gray-100">
                        <CardTitle className="font-black text-[#0f172a] uppercase tracking-tighter text-xl flex items-center gap-3">
                            <Microscope className="w-6 h-6 text-[#1d4ed8]" />
                            Team <span className="text-[#ff6b6b]">Biometrics</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <TechnicalMetric title="Avg. Trigger" value={formatTime(0.81)} icon={<Clock className="w-4 h-4" />} trend="+0.02s" trendColor="text-[#ff6b6b]" />
                            <TechnicalMetric title="Median Group" value="9.4mm" icon={<Target className="w-4 h-4" />} trend="-0.5mm" trendColor="text-green-600" />
                            <TechnicalMetric title="Stability" value="92%" icon={<Zap className="w-4 h-4" />} trend="+1%" trendColor="text-green-600" />
                            <TechnicalMetric title="Recoil" value="88%" icon={<MonitorDot className="w-4 h-4" />} trend="Stable" trendColor="text-[#1d4ed8]" />
                        </div>
                    </CardContent>
                </Card>

                <ShootingSessionUpload />

                <div className="flex justify-end pt-4">
                    <Button
                        onClick={() => navigate("/dashboard/technical-coach/students")}
                        className="bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest text-[10px] px-8 py-6 rounded-2xl shadow-xl transition-all"
                    >
                        Directory <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

// Technical Metric Helper Component
const TechnicalMetric = ({ title, value, icon, trend, trendColor }: { title: string, value: string, icon: React.ReactNode, trend: string, trendColor: string }) => (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white transition-colors">
        <div className="flex items-center gap-2 text-[#1d4ed8] mb-3">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</span>
        </div>
        <div className="text-xl font-black text-[#0f172a]">{value}</div>
        <div className={cn("text-[9px] font-black uppercase mt-1", trendColor)}>
            {trend}
        </div>
    </div>
);

export default TechnicalCoachDashboard;