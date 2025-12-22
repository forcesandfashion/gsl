"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import Map from "../dashboard/Map";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { LoadingSpinner } from "../ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Clock, Phone, Star, Image as ImageIcon, ChevronLeft, ChevronRight, IndianRupee } from "lucide-react";

interface FirebaseRange {
  id: string;
  name: string;
  address: string;
  description: string;
  facilities: string;
  openingHours?: { [day: string]: { start: string; end: string; } };
  structuredOpeningHours?: { [day: string]: { start: string; end: string; } };
  pricePerHour?: string;
  contactNumber: string;
  imageUrl: string;
  logoUrl: string;
  rangeImages: string[];
  ownerId: string;
  ownerEmail: string;
  status: string;
  latitude?: number;
  longitude?: number;
}

const formatOpeningHours = (openingHours: any) => {
  if (!openingHours) return "Hours not specified";
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date().getDay();
  const todayName = days[today === 0 ? 6 : today - 1];
  const todaysHours = openingHours[todayName];
  if (todaysHours && todaysHours.start && todaysHours.end) {
    return `Today: ${formatTime(todaysHours.start)} - ${formatTime(todaysHours.end)}`;
  }
  for (const day of days) {
    const dayHours = openingHours[day];
    if (dayHours && dayHours.start && dayHours.end) {
      return `${day}: ${formatTime(dayHours.start)} - ${formatTime(dayHours.end)}`;
    }
  }
  return "Hours not specified";
};

const formatTime = (timeString: string) => {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

const transformRangeForMap = (range: FirebaseRange) => ({
  id: range.id,
  name: range.name,
  address: range.address,
  image: range.imageUrl || range.rangeImages?.[0] || '/placeholder-range.jpg',
  status: range.status === 'active' ? 'Open' : 'Closed',
  openingHours: formatOpeningHours(range.structuredOpeningHours || range.openingHours),
  price: range.pricePerHour || 'Contact for pricing',
  latitude: range.latitude || null,
  longitude: range.longitude || null,
  description: range.description,
  facilities: range.facilities,
  contactNumber: range.contactNumber,
  logoUrl: range.logoUrl,
  rangeImages: range.rangeImages
});

export default function ShootingRanges() {
  const [search, setSearch] = useState("");
  const [ranges, setRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const rangesPerPage = 6;
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const fetchRanges = async () => {
    try {
      const rangesRef = collection(db, "ranges");
      const q = query(rangesRef, where("status", "==", "active"));
      const querySnapshot = await getDocs(q);
      const rangesData: any[] = [];
      querySnapshot.forEach((doc) => {
        rangesData.push(transformRangeForMap({ id: doc.id, ...doc.data() } as FirebaseRange));
      });
      setRanges(rangesData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load ranges.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRanges(); }, []);

  const filteredRanges = ranges.filter(
    (range) => range.name.toLowerCase().includes(search.toLowerCase()) || range.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRanges.length / rangesPerPage);
  const startIndex = (currentPage - 1) * rangesPerPage;
  const currentRanges = filteredRanges.slice(startIndex, startIndex + rangesPerPage);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    document.querySelector('.ranges-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          toast({ title: "Location Found", description: "Your location is marked on the map" });
        },
        () => toast({ title: "Location Error", description: "Could not access location.", variant: "destructive" })
      );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh] bg-white">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-7xl bg-white min-h-screen">
        <div className="text-center mt-12 mb-12">
          {/* Main Title in Blue with Red underline */}
          <h1 className="text-4xl md:text-6xl font-black mb-4 text-[#1d4ed8] uppercase tracking-tighter">
            RANGE <span className="text-[#ff6b6b]">FINDER</span>
          </h1>
          <div className="w-20 h-1.5 bg-[#ff6b6b] mx-auto"></div>
          <p className="text-gray-500 mt-4 font-medium uppercase tracking-widest text-sm">
            Locate professional shooting facilities worldwide
          </p>
        </div>

        <div className="mb-12 max-w-3xl mx-auto">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search by city, name or zip..."
              className="border-2 border-gray-100 p-4 w-full rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:border-transparent pl-12 pr-40 text-base transition-all"
              onChange={(e) => setSearch(e.target.value)}
            />
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#1d4ed8] w-5 h-5" />
            
            <button
              onClick={requestUserLocation}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#ff6b6b] hover:bg-[#fa5252] text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md"
            >
              Near Me
            </button>
          </div>
        </div>

        {ranges.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Ranges Listed</h3>
          </div>
        ) : (
          <>
            {/* Map Section - Deep Blue Header */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-12 border border-gray-100">
              <h2 className="bg-[#1d4ed8] text-white p-5 text-lg font-black uppercase tracking-widest flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#ff6b6b]" />
                Interactive Map
                {userLocation && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] ml-auto">GPS ACTIVE</span>
                )}
              </h2>
              <div className="h-64 md:h-[500px] w-full bg-gray-50">
                <Map ranges={filteredRanges} selectedRange={selectedRange} />
              </div>
            </div>

            {/* Ranges Grid Section */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden ranges-section border border-gray-100 mb-20">
              <h2 className="bg-gray-50 text-[#1d4ed8] p-6 text-xl font-black uppercase tracking-tighter border-b border-gray-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#ff6b6b]" />
                  Verified Ranges
                </span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {filteredRanges.length} Results
                </span>
              </h2>

              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentRanges.map((range) => (
                    <div
                      key={range.id}
                      onClick={() => setSelectedRange(range)}
                      className={`flex flex-col rounded-3xl overflow-hidden transition-all duration-300 group cursor-pointer border ${
                        selectedRange?.id === range.id
                          ? "border-[#1d4ed8] ring-2 ring-[#1d4ed8]/10 shadow-2xl scale-[1.02]"
                          : "border-gray-100 hover:border-[#ff6b6b]/30 shadow-sm hover:shadow-xl"
                      }`}
                    >
                      {/* Image container */}
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img
                          src={range.image}
                          alt={range.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                            range.status === "Open" ? "bg-green-500 text-white" : "bg-[#ff6b6b] text-white"
                          }`}>
                            {range.status}
                          </span>
                        </div>
                        {range.logoUrl && (
                          <img src={range.logoUrl} className="absolute bottom-4 left-4 w-10 h-10 rounded-full border-2 border-white shadow-lg" alt="logo" />
                        )}
                      </div>

                      <div className="p-6 flex flex-col flex-grow bg-white">
                        <h3 className="text-lg font-black text-[#0f172a] uppercase tracking-tight mb-2 group-hover:text-[#1d4ed8] transition-colors">
                          {range.name}
                        </h3>
                        
                        <div className="space-y-3 flex-grow mb-6">
                          <div className="flex items-start gap-2 text-gray-500">
                            <MapPin className="w-4 h-4 text-[#ff6b6b] shrink-0 mt-0.5" />
                            <span className="text-xs font-medium leading-relaxed">{range.address}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-tight">{range.openingHours}</span>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Top Facility</span>
                            <p className="text-xs text-gray-600 line-clamp-1 italic">"{range.facilities || 'Standard shooting bays'}"</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate Starts At</span>
                            <span className="text-lg font-black text-[#1d4ed8] flex items-center">
                              <IndianRupee className="w-4 h-4" /> {range.price}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/ranges/${range.id}`); }} 
                            className="bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                          >
                            Explore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination - Consistent with Shop/About */}
                {totalPages > 1 && (
                  <div className="mt-16 flex justify-center items-center gap-3">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:border-[#1d4ed8] hover:text-[#1d4ed8] transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => handlePageChange(i + 1)}
                          className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                            currentPage === i + 1 ? "bg-[#ff6b6b] text-white shadow-lg" : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:border-[#1d4ed8] hover:text-[#1d4ed8] transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}