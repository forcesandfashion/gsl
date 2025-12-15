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

// Assuming these Firebase imports are available in your setup
import { db } from "@/firebase/config";
import { collection, getDocs, query, limit } from "firebase/firestore";

// --- Coach Type Definition ---
interface Coach {
  id: string;
  name: string;
  discipline: string;
  location: string;
  avgRating: number;
  studentsCount: number;
  isElite: boolean;
}

// Mock Data (to use if Firebase fetch fails or during development)
const mockCoaches: Coach[] = [
  {
    id: "C001",
    name: "Dr. Arjun Sharma",
    discipline: "10m Air Rifle Specialist",
    location: "New Delhi",
    avgRating: 4.8,
    studentsCount: 15,
    isElite: true,
  },
  {
    id: "C002",
    name: "Priya Singh Rana",
    discipline: "25m Pistol Expert",
    location: "Mumbai",
    avgRating: 4.5,
    studentsCount: 10,
    isElite: false,
  },
  {
    id: "C003",
    name: "Vikram Reddy",
    discipline: "50m Rifle Prone Focus",
    location: "Bangalore",
    avgRating: 4.9,
    studentsCount: 22,
    isElite: true,
  },
];

const CoachListCard = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true);
        // Firebase Query to fetch top coaches
        const coachesQuery = query(
          collection(db, "coaches"),
          // You might order by avgRating or studentsCount here
          // orderBy("avgRating", "desc"),
          limit(4) // Fetch a few to display on the dashboard
        );
        const snapshot = await getDocs(coachesQuery);

        if (snapshot.empty) {
            // Use mock data if no coaches are found
            setCoaches(mockCoaches); 
        } else {
            const fetchedCoaches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Coach[];
            setCoaches(fetchedCoaches);
        }

      } catch (error) {
        console.error("Error fetching coaches:", error);
        // Fallback to mock data on error
        setCoaches(mockCoaches); 
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);
  
  // Reusable component for star rating
  const renderStars = (rating: number) => (
    <span className="text-yellow-500 flex items-center gap-0.5">
      {Array.from({ length: Math.floor(rating) }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
      ))}
      <span className="text-gray-600 text-sm ml-1">({rating.toFixed(1)})</span>
    </span>
  );

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm lg:col-span-2">
      <CardHeader className="border-b border-slate-100 p-4 md:p-6 flex flex-row items-center justify-between">
        <div>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-red-600" />
                Find Your Coach
            </CardTitle>
            <CardDescription className="text-slate-600">
                Connect with Elite Shooting Coaches worldwide.
            </CardDescription>
        </div>
        <Button 
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50/70"
            // This is a placeholder navigation, update your router accordingly
            onClick={() => console.log("Navigate to /coaches/list")} 
        >
            View All
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading top coaches...</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {coaches.map((coach) => (
              <li 
                key={coach.id} 
                className="p-4 md:p-5 hover:bg-indigo-50/50 transition-colors cursor-pointer flex justify-between items-center"
              >
                <div className="flex items-center gap-4">
                  {/* Coach Avatar Placeholder */}
                  <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {coach.name}
                      {coach.isElite && (
                        <span className="text-xs font-medium text-white bg-red-600 px-2 py-0.5 rounded-full">ELITE</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Target className="w-3 h-3 text-blue-500" /> {coach.discipline}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="hidden sm:block">
                        {renderStars(coach.avgRating)}
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {coach.location}
                        </p>
                    </div>
                  <Button 
                    size="sm" 
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Placeholder action: Navigate to coach details or booking page
                        console.log(`Booking session with ${coach.name}`); 
                    }}
                  >
                    Book <ArrowRightCircle className="w-4 h-4 ml-1" />
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