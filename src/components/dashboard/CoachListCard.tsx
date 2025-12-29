import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Zap,
  Star,
  MapPin,
  ArrowRightCircle,
  Phone,
  Target,
} from "lucide-react";
import { db } from "@/firebase/config";
import { collection, getDocs, query, limit } from "firebase/firestore";

// --- Coach Type Definition matching your database structure ---
interface Coach {
  id: string;
  fullName: string; // Changed from 'name' to 'fullName' to match standard coach profiles
  discipline: string;
  location: string;
  avgRating?: number;
  isElite?: boolean;
  photoUrl?: string;
}

const CoachListCard = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true);
        // Query the actual technical-coaches collection
        const coachesQuery = query(
          collection(db, "technical-coaches"),
          limit(4) 
        );
        const snapshot = await getDocs(coachesQuery);

        if (snapshot.empty) {
            setCoaches([]); 
        } else {
            const fetchedCoaches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Coach[];
            setCoaches(fetchedCoaches);
        }

      } catch (error) {
        console.error("Error fetching coaches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);
  
  const renderStars = (rating: number = 5.0) => (
    <span className="text-[#ff6b6b] flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? "fill-current" : "text-gray-200"}`} />
      ))}
      <span className="text-gray-400 text-xs font-black ml-1">({rating.toFixed(1)})</span>
    </span>
  );

  return (
    <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden lg:col-span-2">
      <CardHeader className="bg-white border-b border-gray-50 p-6 flex flex-row items-center justify-between">
        <div>
            <CardTitle className="text-xl font-black text-[#1d4ed8] uppercase tracking-tighter flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#ff6b6b] fill-current" />
                Expert <span className="text-[#ff6b6b]">Coaches</span>
            </CardTitle>
            <CardDescription className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                Verified professional training staff
            </CardDescription>
        </div>
        <Button 
            variant="outline"
            className="border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-black uppercase tracking-widest text-[10px]"
            onClick={() => window.location.href = "/dashboard/shooter/coach-students"} 
        >
            View Directory
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d4ed8] mx-auto mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Staff Records...</p>
          </div>
        ) : coaches.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic">No coaches found in the system.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {coaches.map((coach) => (
              <li 
                key={coach.id} 
                className="p-6 hover:bg-blue-50/30 transition-all cursor-pointer flex justify-between items-center group"
              >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#ff6b6b] rounded-2xl blur-md opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    {coach.photoUrl ? (
                      <img src={coach.photoUrl} alt="Coach" className="relative w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                    ) : (
                      <div className="relative w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-[#1d4ed8] shadow-md border-2 border-white">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-[#0f172a] uppercase tracking-tight flex items-center gap-2">
                      {coach.fullName}
                      {coach.isElite !== false && (
                        <span className="text-[8px] font-black text-white bg-[#ff6b6b] px-2 py-0.5 rounded-md tracking-[0.2em]">ELITE</span>
                      )}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1 mt-1 uppercase">
                      <Target className="w-3 h-3 text-[#1d4ed8]" /> {coach.discipline || "General Technical Coach"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 flex-shrink-0">
                    <div className="hidden md:block text-right">
                        {renderStars(coach.avgRating || 5.0)}
                        <p className="text-[10px] font-black text-gray-400 flex items-center justify-end gap-1 mt-1 uppercase tracking-tighter">
                            <MapPin className="w-3 h-3 text-[#1d4ed8]" /> {coach.location || "Online"}
                        </p>
                    </div>
                  <Button 
                    size="sm" 
                    className="bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase tracking-widest text-[10px] px-6 py-5 rounded-xl shadow-lg transition-transform hover:scale-105"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Placeholder for profile viewing or booking
                    }}
                  >
                    Consult <ArrowRightCircle className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default CoachListCard;