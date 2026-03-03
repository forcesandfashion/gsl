import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "@/firebase/config";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { 
  ArrowLeft, 
  Target, 
  Trophy, 
  Calendar, 
  TrendingUp, 
  FileText, 
  Download, 
  Eye,
  Star,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ShootingSession {
  id: string;
  sessionName: string;
  pointsEarned: number;
  rating: number;
  uploadDate: any;
  fileUrl: string;
  sessionStats: {
    totalScore: number;
    innerTens: number;
    discipline: string;
    date: string;
  };
}

const StudentIntelPage = () => {
  const { shooterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState<ShootingSession[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Student name might be passed via state to avoid a fetch delay
  const studentName = location.state?.studentName || "Athlete";

  useEffect(() => {
    const fetchIntel = async () => {
      if (!shooterId) return;
      try {
        setLoading(true);

        // 1. Fetch Student Profile for Context
        const shooterDoc = await getDoc(doc(db, "shooters", shooterId));
        if (shooterDoc.exists()) setStudentInfo(shooterDoc.data());

        // 2. Fetch all Shooting Sessions for this student
        const sessionsRef = collection(db, "shooters", shooterId, "shootingSessions");
        const q = query(sessionsRef, orderBy("uploadDate", "desc"));
        const snapshot = await getDocs(q);

        const sessionList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ShootingSession[];

        setSessions(sessionList);
      } catch (error) {
        console.error("Error fetching student intel:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntel();
  }, [shooterId]);

  if (loading) {
    return <div className="p-20 text-center font-black text-gray-400 animate-pulse">DECRYPTING ATHLETE INTEL...</div>;
  }

  const totalCareerPoints = sessions.reduce((sum, s) => sum + (s.pointsEarned || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-[#1d4ed8] hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Roster
          </Button>
          <div className="text-right">
             <h1 className="text-2xl font-black text-[#0f172a] uppercase tracking-tighter">
               Athlete <span className="text-[#ff6b6b]">Intel</span>: {studentInfo?.fullName || studentName}
             </h1>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance Analysis Mode</p>
          </div>
        </div>

        {/* Top Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <MetricCard title="Total Career Score" val={totalCareerPoints} icon={<Trophy />} color="border-[#1d4ed8]" />
          <MetricCard title="Active Sessions" val={sessions.length} icon={<Target />} color="border-[#ff6b6b]" />
          <MetricCard title="Current Rank" val={studentInfo?.rank || "Verified Athlete"} icon={<Zap />} color="border-[#1d4ed8]" />
        </div>

        {/* Sessions Intel Table */}
        <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-[#0f172a] p-8 border-b border-white/10">
            <CardTitle className="text-white font-black uppercase text-xl flex items-center gap-3">
              <TrendingUp className="text-[#ff6b6b] w-6 h-6" /> Data Repository
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-gray-400 font-black text-[10px] uppercase tracking-widest">
                    <th className="p-6">Date</th>
                    <th className="p-6">Session Name</th>
                    <th className="p-6 text-center">Score</th>
                    <th className="p-6 text-center">Inner 10s</th>
                    <th className="p-6 text-center">Rating</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0f172a] text-sm">{session.sessionStats?.date || "N/A"}</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase">{session.sessionStats?.discipline}</span>
                        </div>
                      </td>
                      <td className="p-6 font-black text-[#0f172a] uppercase text-sm tracking-tight">
                        {session.sessionName}
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-lg font-black text-[#1d4ed8]">{session.sessionStats?.totalScore || session.pointsEarned}</span>
                      </td>
                      <td className="p-6 text-center">
                        <span className="bg-red-50 text-[#ff6b6b] px-3 py-1 rounded-lg font-black text-xs">
                          {session.sessionStats?.innerTens || 0}
                        </span>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex justify-center gap-0.5">
                          {Array.from({ length: session.rating || 0 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          {session.fileUrl && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.open(session.fileUrl, "_blank")}
                              className="h-8 rounded-xl border-gray-100 text-[#1d4ed8] hover:bg-blue-50 font-black uppercase text-[9px]"
                            >
                              <Eye className="w-3 h-3 mr-1.5" /> View File
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">
                        No session data uploaded by athlete yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Internal Metric Card Component
const MetricCard = ({ title, val, icon, color }: any) => (
  <Card className={`border-0 shadow-lg bg-white border-t-4 ${color} transition-transform hover:scale-105`}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</CardTitle>
      <div className="text-[#1d4ed8]">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black text-[#0f172a] uppercase">{val}</div>
    </CardContent>
  </Card>
);

export default StudentIntelPage;