"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import Map from "../dashboard/Map";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { LoadingSpinner } from "../ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Clock, Phone, Star, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { IndianRupee } from "lucide-react";

interface FirebaseRange {
  id: string;
  name: string;
  address: string;
  description: string;
  facilities: string;
  openingHours?: {
    [day: string]: {
      start: string;
      end: string;
    };
  };
  structuredOpeningHours?: {
    [day: string]: {
      start: string;
      end: string;
    };
  };
  pricePerHour?: string;
  contactNumber: string;
  imageUrl: string;
  logoUrl: string;
  rangeImages: string[];
  ownerId: string;
  ownerEmail: string;
  status: string;
  // Add coordinates if you have them, otherwise we'll handle this
  latitude?: number;
  longitude?: number;
}

// Function to format opening hours
const formatOpeningHours = (openingHours: any) => {
  if (!openingHours) return "Hours not specified";
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todayName = days[today === 0 ? 6 : today - 1]; // Convert to our format
  
  // Check if today's hours exist
  const todaysHours = openingHours[todayName];
  if (todaysHours && todaysHours.start && todaysHours.end) {
    return `Today: ${formatTime(todaysHours.start)} - ${formatTime(todaysHours.end)}`;
  }
  
  // Find the first day with hours set
  for (const day of days) {
    const dayHours = openingHours[day];
    if (dayHours && dayHours.start && dayHours.end) {
      return `${day}: ${formatTime(dayHours.start)} - ${formatTime(dayHours.end)}`;
    }
  }
  
  return "Hours not specified";
};

// Function to format time from 24h to 12h format
const formatTime = (timeString: string) => {
  if (!timeString) return "";
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${displayHour}:${minutes} ${ampm}`;
};

// Transform Firebase data to match your Map component's expected format
const transformRangeForMap = (range: FirebaseRange) => ({
  id: range.id,
  name: range.name,
  address: range.address,
  image: range.imageUrl || range.rangeImages?.[0] || '/placeholder-range.jpg',
  status: range.status === 'active' ? 'Open' : 'Closed',
  openingHours: formatOpeningHours(range.structuredOpeningHours || range.openingHours),
  price: range.pricePerHour||'Contact for pricing', 
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
  const rangesPerPage = 6; // Changed to 6 to work better with 3 columns
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  // Fetch ranges from Firebase
  const fetchRanges = async () => {
    try {
      console.log("Fetching ranges from Firebase...");
      const rangesRef = collection(db, "ranges");
      
      // Only fetch active ranges for public viewing
      const q = query(rangesRef, where("status", "==", "active"));
      const querySnapshot = await getDocs(q);
      
      const rangesData: any[] = [];
      querySnapshot.forEach((doc) => {
        const rangeData = {
          id: doc.id,
          ...doc.data()
        } as FirebaseRange;
        
        // Transform the data to match your Map component's expected format
        rangesData.push(transformRangeForMap(rangeData));
      });
      
      console.log("Fetched ranges:", rangesData.length);
      setRanges(rangesData);
    } catch (error) {
      console.error("Error fetching ranges:", error);
      toast({
        title: "Error",
        description: "Failed to load shooting ranges. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanges();
  }, []);

  const filteredRanges = ranges.filter(
    (range) =>
      range.name.toLowerCase().includes(search.toLowerCase()) ||
      range.address.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredRanges.length / rangesPerPage);
  const startIndex = (currentPage - 1) * rangesPerPage;
  const endIndex = startIndex + rangesPerPage;
  const currentRanges = filteredRanges.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of ranges section
    document.querySelector('.ranges-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle location found from Map component
  const handleLocationFound = (location) => {
    setUserLocation(location);
    console.log("User location found:", location);
    toast({
      title: "Location Found",
      description: "Your current location has been marked on the map",
    });
  };

  // Function to trigger location request
  const requestUserLocation = () => {
    if (navigator.geolocation) {
      toast({
        title: "Requesting Location",
        description: "Please allow location access to find shooting ranges near you",
      });
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handleLocationFound({ latitude, longitude });
        },
        (error) => {
          console.error("Error getting location:", error);
          let errorMessage = "Could not get your current location.";
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied. Please enable location services and refresh the page.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out. Please try again.";
              break;
          }
          
          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-4 max-w-7xl">
          <div className="flex justify-center items-center min-h-96">
            <LoadingSpinner />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Shooting Ranges Finder
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Discover and explore shooting ranges near you
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or location..."
              className="border-2 border-blue-300 p-3 w-full rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10 pr-32 text-base"
              onChange={(e) => setSearch(e.target.value)}
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            
            {/* Location button in search bar */}
            <button
              onClick={requestUserLocation}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              Find Near Me
            </button>
          </div>
          
          {userLocation && (
            <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Location found! Showing ranges near you.
            </div>
          )}
        </div>

        {ranges.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-12 max-w-md mx-auto">
              <MapPin className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No Ranges Available</h3>
              <p className="text-gray-500 text-sm md:text-base">
                No shooting ranges are currently listed. Check back later!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Map section - larger and more prominent */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
              <h2 className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-lg md:text-xl font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Map
                {userLocation && (
                  <span className="bg-white bg-opacity-20 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ml-auto">
                    Location Found
                  </span>
                )}
              </h2>
              <div className="h-64 md:h-96 w-full">
                <Map 
                  ranges={filteredRanges} 
                  selectedRange={selectedRange} 
                  onLocationFound={handleLocationFound}
                />
              </div>
            </div>

            {/* Ranges section - now below the map */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden ranges-section">
              <h2 className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-lg md:text-xl font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Available Ranges
                </span>
                <span className="bg-white bg-opacity-20 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm">
                  {filteredRanges.length} found
                </span>
              </h2>

              <div className="p-4 md:p-6">
                {/* Updated grid layout: 1 column on mobile, 2 on tablet, 3 on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {currentRanges.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setSelectedRange(range)}
                      className={`flex flex-col items-start gap-3 p-4 rounded-xl w-full text-left transition-all duration-200 hover:shadow-lg group h-full ${
                        selectedRange?.id === range.id
                          ? "bg-blue-50 border-2 border-blue-500 shadow-lg"
                          : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {/* Range Image - Made more compact */}
                      <div className="relative w-full h-32 md:h-40 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {range.image && range.image !== '/placeholder-range.jpg' ? (
                          <img
                            src={range.image}
                            alt={range.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-range.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Logo overlay */}
                        {range.logoUrl && (
                          <div className="absolute bottom-2 left-2">
                            <img
                              src={range.logoUrl}
                              alt={`${range.name} logo`}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-lg object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Status indicator */}
                        <div className="absolute top-2 right-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              range.status === "Open"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full mr-1 ${
                                range.status === "Open" ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            {range.status}
                          </span>
                        </div>
                      </div>

                      {/* Range Details - Made more compact and flexible */}
                      <div className="w-full space-y-2 flex-grow">
                        <h3 className="text-base md:text-lg font-bold text-blue-800 group-hover:text-blue-900 line-clamp-1">
                          {range.name}
                        </h3>
                        
                        <div className="flex items-start gap-1 text-gray-600">
                          <MapPin className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs line-clamp-2">{range.address}</span>
                        </div>

                        {range.description && (
                          <p className="text-gray-600 text-xs line-clamp-2">
                            {range.description}
                          </p>
                        )}

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span className="line-clamp-1">{range.openingHours}</span>
                          </div>
                          
                          {range.contactNumber && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span>{range.contactNumber}</span>
                            </div>
                          )}
                        </div>

                        {range.facilities && (
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-xs text-blue-800 font-medium">Facilities:</p>
                            <p className="text-xs text-blue-600 line-clamp-1">
                              {range.facilities}
                            </p>
                          </div>
                        )}

                        {range.rangeImages && range.rangeImages.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <ImageIcon className="w-3 h-3" />
                            <span>{range.rangeImages.length} photos</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom section with price and button */}
                      <div className="w-full flex items-center justify-between pt-2 border-t border-gray-200 mt-auto">
                        <span className="text-green-600 font-semibold text-xs flex items-center">
                          <IndianRupee className="w-3 h-3 flex-shrink-0" />
                          <span className="line-clamp-1">{range.price}</span>
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ranges/${range.id}`);
                          }} 
                          className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-purple-600 font-semibold text-xs transition-colors"
                        >
                          Info
                        </button>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                        currentPage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="flex items-center gap-1 md:gap-2">
                      {Array.from({ length: totalPages }, (_, index) => {
                        // Show limited page numbers on mobile
                        if (isMobile && totalPages > 5) {
                          // Always show first page
                          if (index === 0) {
                            return (
                              <button
                                key={index + 1}
                                onClick={() => handlePageChange(index + 1)}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-medium transition-all duration-200 text-xs md:text-base ${
                                  currentPage === index + 1
                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                                }`}
                              >
                                {index + 1}
                              </button>
                            );
                          }
                          
                          // Show current page and neighbors
                          if (index >= currentPage - 2 && index <= currentPage) {
                            return (
                              <button
                                key={index + 1}
                                onClick={() => handlePageChange(index + 1)}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-medium transition-all duration-200 text-xs md:text-base ${
                                  currentPage === index + 1
                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                                }`}
                              >
                                {index + 1}
                              </button>
                            );
                          }
                          
                          // Show last page
                          if (index === totalPages - 1) {
                            return (
                              <>
                                <span className="px-1">...</span>
                                <button
                                  key={index + 1}
                                  onClick={() => handlePageChange(index + 1)}
                                  className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-medium transition-all duration-200 text-xs md:text-base ${
                                    currentPage === index + 1
                                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                                  }`}
                                >
                                  {index + 1}
                                </button>
                              </>
                            );
                          }
                          
                          return null;
                        }
                        
                        // Show all pages on desktop or when there are few pages
                        return (
                          <button
                            key={index + 1}
                            onClick={() => handlePageChange(index + 1)}
                            className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-medium transition-all duration-200 text-xs md:text-base ${
                              currentPage === index + 1
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                            }`}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                        currentPage === totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Results summary */}
                <div className="mt-4 md:mt-6 text-center text-gray-600 text-xs md:text-sm">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRanges.length)} of {filteredRanges.length} ranges
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}