import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot 
} from "firebase/firestore";
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Clock, 
  ChevronRight, 
  ShieldCheck,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useLocation, useNavigate } from "react-router-dom";

interface StudentRelation {
  shooterId: string;
  shooterName: string;
  status: "pending" | "active";
  requestedAt: string;
}

const CoachStudentManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<StudentRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Retrieve the coachId passed via navigate state, or fallback to current user uid
  const coachId = location.state?.coachId || user?.uid;

  useEffect(() => {
    // If no ID is available yet (auth still loading), stay in loading state
    if (!coachId) return;

    console.log("Syncing Management Portal for Coach ID:", coachId);

    // 1. Set up real-time listener for the specific coach document
    const coachRef = doc(db, "technical-coaches", coachId);
    
    const unsubscribe = onSnapshot(coachRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Defensive check: handle if 'shooters' array is missing or accidentally an object
        let shooterList = [];
        if (Array.isArray(data.shooters)) {
          shooterList = data.shooters;
        } else if (data.shooters && typeof data.shooters === 'object') {
          shooterList = Object.values(data.shooters);
        }
        
        setStudents(shooterList);
      } else {
        console.warn("No coach document found for ID:", coachId);
        setStudents([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Subscription Error:", error);
      setLoading(false);
      toast({ title: "Sync Error", description: "Could not load student data.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [coachId, toast]);

  const handleRequest = async (shooterId: string, action: 'accept' | 'reject') => {
    if (!coachId) return;
    setProcessingId(shooterId);

    try {
      const coachRef = doc(db, "technical-coaches", coachId);
      const shooterRef = doc(db, "shooters", shooterId);

      const [coachSnap, shooterSnap] = await Promise.all([
        getDoc(coachRef),
        getDoc(shooterRef)
      ]);

      if (!coachSnap.exists() || !shooterSnap.exists()) {
        throw new Error("One or more user profiles could not be found.");
      }

      const coachData = coachSnap.data();
      const shooterData = shooterSnap.data();

      if (action === 'accept') {
        // Update Coach's roster
        const updatedCoachShooters = (coachData.shooters || []).map((s: any) => 
          s.shooterId === shooterId ? { ...s, status: 'active' } : s
        );

        // Update Shooter's coach list
        const updatedShooterCoaches = (shooterData.coaches || []).map((c: any) => 
          c.coachId === coachId ? { ...c, status: 'active' } : c
        );

        await Promise.all([
          updateDoc(coachRef, { shooters: updatedCoachShooters }),
          updateDoc(shooterRef, { coaches: updatedShooterCoaches })
        ]);

        toast({ title: "Student Accepted", description: "Successfully added to your active roster." });
      } else {
        // Remove from both lists if rejected
        const filteredCoachShooters = (coachData.shooters || []).filter((s: any) => s.shooterId !== shooterId);
        const filteredShooterCoaches = (shooterData.coaches || []).filter((c: any) => c.coachId !== coachId);

        await Promise.all([
          updateDoc(coachRef, { shooters: filteredCoachShooters }),
          updateDoc(shooterRef, { coaches: filteredShooterCoaches })
        ]);

        toast({ title: "Request Declined", description: "The request has been removed." });
      }
    } catch (error: any) {
      console.error("Action error:", error);
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = students.filter(s => s.status === 'pending');
  const activeStudents = students.filter(s => s.status === 'active');

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d4ed8]"></div>
        <p className="font-black uppercase tracking-widest text-gray-400 text-xs">Syncing Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto p-4">
      {/* Debug Info (Can be removed after testing) */}
      <div className="bg-slate-900 text-white p-3 rounded-xl text-[10px] font-mono opacity-50 flex justify-between">
        <span>COACH_ID: {coachId}</span>
        <span>RECORDS: {students.length}</span>
      </div>

      {/* 1. Pending Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#ff6b6b] rounded-xl flex items-center justify-center shadow-lg">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight">
            Incoming <span className="text-[#ff6b6b]">Protégé</span> Requests
          </h2>
          <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-black text-gray-500">
            {pendingRequests.length} NEW
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRequests.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-100 bg-gray-50/50">
              <CardContent className="p-10 text-center text-gray-400 font-bold text-sm">
                NO PENDING APPLICATIONS
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map(req => (
              <Card key={req.shooterId} className="border-0 shadow-xl rounded-[2rem] overflow-hidden bg-white">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1d4ed8]">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#0f172a] uppercase text-sm">{req.shooterName}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Requested: {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleRequest(req.shooterId, 'accept')}
                      disabled={!!processingId}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-10 w-10 p-0 shadow-lg shadow-green-100"
                    >
                      {processingId === req.shooterId ? "..." : <CheckCircle className="w-5 h-5" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleRequest(req.shooterId, 'reject')}
                      disabled={!!processingId}
                      className="text-gray-300 hover:text-red-500 rounded-xl h-10 w-10 p-0"
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* 2. Active Students Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight">
            Active <span className="text-[#1d4ed8]">Athletes</span>
          </h2>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Athlete</th>
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeStudents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-20 text-center text-gray-300 font-bold uppercase tracking-widest text-xs">
                      No active coaching relationships found.
                    </td>
                  </tr>
                ) : (
                  activeStudents.map(student => (
                    <tr key={student.shooterId} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#1d4ed8]">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-[#0f172a] uppercase tracking-tight text-sm">{student.shooterName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GSL Athlete Profile</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1d4ed8] text-[9px] font-black uppercase tracking-widest border border-blue-100">
                          <ShieldCheck className="w-3 h-3" /> Active
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-[#1d4ed8] text-[#1d4ed8] font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#1d4ed8] hover:text-white transition-all group-hover:scale-105"
                          onClick={() => navigate(`/dashboard/technical-coach/student/${student.shooterId}`, { 
                            state:   { studentName: student.shooterName } 
                          })} 
                        >
                          Analyze Intel <ChevronRight className="w-3 h-3 ml-2" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoachStudentManager;