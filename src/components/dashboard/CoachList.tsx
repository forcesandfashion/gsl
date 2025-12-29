import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase/config";
import { collection, query, getDocs } from "firebase/firestore";
import { 
  ArrowLeft, 
  Search, 
  User, 
  Target, 
  Star, 
  ChevronRight, 
  Mail, 
  MapPin,
  Award,
  Zap,
  Phone,
  ShieldCheck,
  Globe,
  Info,
  CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Coach {
  id: string;
  fullName: string;
  email: string;
  discipline: string;
  location: string;
  experienceYears: number;
  certification: string;
  photoUrl?: string;
  isElite?: boolean;
  avgRating?: number;
  bio?: string; // Added bio for the strategic profile card
}

const CoachDirectory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [filteredCoaches, setFilteredCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "technical-coaches"));
        const snapshot = await getDocs(q);
        const coachList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Coach[];

        setCoaches(coachList);
        setFilteredCoaches(coachList);
      } catch (error) {
        console.error("Error fetching coaches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  useEffect(() => {
    const filtered = coaches.filter(c => {
      return c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
             c.discipline?.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setFilteredCoaches(filtered);
  }, [searchTerm, coaches]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d4ed8] mx-auto mb-4"></div>
          <p className="font-black uppercase tracking-widest text-gray-400">Scanning Coach Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="text-[#1d4ed8] hover:bg-blue-50 rounded-full p-2"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-2xl font-black text-[#0f172a] uppercase tracking-tighter">
                  COACH <span className="text-[#ff6b6b]">DIRECTORY</span>
                </h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connect with certified shooting experts</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
               <ShieldCheck className="w-4 h-4 text-[#1d4ed8]" />
               <span className="text-[10px] font-black text-[#1d4ed8] uppercase tracking-widest">GSL Verified Staff</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <Card className="lg:col-span-3 border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-4 flex items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search by name or specialization..." 
                  className="pl-10 h-12 rounded-xl border-gray-100 focus:border-[#1d4ed8] focus:ring-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg rounded-2xl bg-[#0f172a] text-white flex items-center justify-center p-4">
             <div className="text-center">
                <p className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-[0.2em] mb-1">Available</p>
                <p className="text-2xl font-black uppercase tracking-tighter text-white">{filteredCoaches.length} Experts</p>
             </div>
          </Card>
        </div>

        {filteredCoaches.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <User className="w-16 h-16 text-gray-100 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Matches Found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredCoaches.map((coach) => (
              <Card key={coach.id} className="border-0 shadow-xl bg-white rounded-[2.5rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500 border-b-8 border-[#1d4ed8]">
                <CardHeader className="p-0 relative h-32 bg-[#0f172a] overflow-hidden">
                   <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                   <div className="absolute -bottom-10 left-8">
                      <div className="relative w-24 h-24 rounded-3xl bg-white p-1 shadow-2xl overflow-hidden border-2 border-white">
                        {coach.photoUrl ? (
                          <img src={coach.photoUrl} className="w-full h-full object-cover rounded-2xl" alt="Coach" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[#1d4ed8]">
                            <User className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                   </div>
                   {coach.isElite && (
                    <div className="absolute top-4 right-6 bg-[#ff6b6b] text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg">
                      Elite Rank
                    </div>
                   )}
                </CardHeader>

                <CardContent className="pt-14 px-8 pb-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-[#0f172a] uppercase tracking-tight">{coach.fullName}</h3>
                    <p className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest flex items-center gap-1 mt-1">
                      <Award className="w-3 h-3" /> {coach.certification || "Certified GSL Coach"}
                    </p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <Target className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Specialization</span>
                        <span className="text-xs font-bold text-gray-700 uppercase">{coach.discipline}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Base</span>
                        <span className="text-xs font-bold text-gray-700 uppercase">{coach.location || "Global Online"}</span>
                      </div>
                    </div>
                  </div>

                  {/* MODAL TRIGGER BUTTON */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest text-[10px] py-7 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group/btn"
                        onClick={() => setSelectedCoach(coach)}
                      >
                        View Strategic Profile 
                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="sm:max-w-[500px] bg-white rounded-[2.5rem] border-none p-0 overflow-hidden shadow-2xl">
                      <div className="h-3 bg-[#ff6b6b] w-full" />
                      <div className="p-8">
                        <DialogHeader className="flex flex-row items-center gap-6 text-left mb-6">
                           <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-md flex-shrink-0">
                              {coach.photoUrl ? (
                                <img src={coach.photoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[#1d4ed8]"><User /></div>
                              )}
                           </div>
                           <div className="flex-1">
                              <DialogTitle className="text-2xl font-black text-[#0f172a] uppercase tracking-tighter">
                                {coach.fullName}
                              </DialogTitle>
                              <DialogDescription className="text-[#ff6b6b] font-black text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <Award className="w-3 h-3" /> {coach.certification || "Certified Expert"}
                              </DialogDescription>
                           </div>
                        </DialogHeader>

                        <div className="space-y-6">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100">
                             <h4 className="text-[10px] font-black text-[#1d4ed8] uppercase tracking-widest mb-2 flex items-center gap-2">
                               <Info className="w-3 h-3" /> Technical Philosophy
                             </h4>
                             <p className="text-sm text-gray-600 leading-relaxed font-medium">
                               {coach.bio || `${coach.fullName} is a highly specialized ${coach.discipline} expert with over ${coach.experienceYears} years of technical experience in Olympic-level training protocols.`}
                             </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Experience</span>
                                <p className="text-sm font-bold text-[#0f172a]">{coach.experienceYears}+ Years</p>
                             </div>
                             <div className="space-y-1 text-right">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Success Rating</span>
                                <div className="flex items-center justify-end gap-1">
                                   <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                   <p className="text-sm font-bold text-[#0f172a]">{coach.avgRating || "5.0"}/5.0</p>
                                </div>
                             </div>
                          </div>
                        </div>

                        <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
                          <Button 
                            variant="outline" 
                            className="flex-1 border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-black uppercase text-[10px] py-6 rounded-2xl"
                            onClick={() => window.location.href = `mailto:${coach.email}`}
                          >
                            <Mail className="w-4 h-4 mr-2" /> Message
                          </Button>
                          <Button 
                            className="flex-1 bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase text-[10px] py-6 rounded-2xl shadow-xl shadow-[#ff6b6b]/20"
                            onClick={() => navigate(``)}
                          >
                            <CalendarCheck className="w-4 h-4 mr-2" /> Book Coach
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CoachDirectory;