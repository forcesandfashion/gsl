import React, { useEffect, useState, useRef } from "react";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  Image as ImageIcon, 
  ArrowLeft, 
  User, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  SkipBack,
  Maximize,
  ExternalLink,
  Crown,
  Menu,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Range {
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
  contactNumber: string;
  logoUrl: string;
  images: string[];
  status: string;
  videoUrl?: string;
  youtubeUrl?: string;
  ownerPremium?: boolean;
  subscriptionSettings?: {
    isActive: boolean;
    plans: Array<{
      duration: string;
      months: number;
      price: number;
      enabled: boolean;
    }>;
    features: string[];
    title: string;
    description: string;
  };
}

interface MediaItem {
  type: 'video' | 'youtube' | 'image';
  url: string;
  thumbnail?: string;
}

export default function RangeInfo() {
  const { user, loading: authLoading } = useAuth();
  const [range, setRange] = useState<Range | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { rangeId } = useParams();
  const navigate = useNavigate();

  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const organizeMediaItems = (range: Range) => {
    const items: MediaItem[] = [];
    if (range.videoUrl) {
      items.push({ type: 'video', url: range.videoUrl });
    }
    if (range.youtubeUrl) {
      const videoId = getYouTubeVideoId(range.youtubeUrl);
      items.push({
        type: 'youtube',
        url: range.youtubeUrl,
        thumbnail: videoId ? getYouTubeThumbnail(videoId) : undefined
      });
    }
    if (range.images && range.images.length > 0) {
      range.images.forEach((imageUrl) => {
        items.push({ type: 'image', url: imageUrl });
      });
    }
    return items;
  };

  useEffect(() => {
    const fetchRange = async () => {
      try {
        if (!rangeId) return;
        const rangeRef = doc(db, "ranges", rangeId);
        const rangeSnap = await getDoc(rangeRef);
        if (!rangeSnap.exists()) return;
        const data = rangeSnap.data();
        const rangeData = {
          id: rangeSnap.id,
          name: data.name,
          address: data.address,
          description: data.description,
          facilities: data.facilities,
          openingHours: data.structuredOpeningHours,
          contactNumber: data.contactNumber,
          logoUrl: data.logoUrl || "",
          images: data.rangeImages || [],
          status: data.status || "closed",
          videoUrl: data.videoUrl,
          youtubeUrl: data.youtubeUrl,
          ownerPremium: data.ownerPremium || false,
          subscriptionSettings: data.subscriptionSettings
        };
        setRange(rangeData);
        setMediaItems(organizeMediaItems(rangeData));
      } catch (error: any) {
        toast({ title: "Error", description: "Failed to load range info", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchRange();
  }, [rangeId, toast]);

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsVideoPlaying(!isVideoPlaying);
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isVideoMuted;
    setIsVideoMuted(!isVideoMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const volume = value[0];
    videoRef.current.volume = volume;
    setVideoVolume(volume);
  };

  const handleTimeChange = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setVideoCurrentTime(value[0]);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!isFullscreen) videoContainerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const formatVideoTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center p-10"><LoadingSpinner /></div>;

  if (!range) return (
    <div className="min-h-screen flex items-center justify-center p-10 text-center">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
        <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Range Not Found</h3>
        <Button onClick={() => navigate("/")} className="bg-blue-700 hover:bg-blue-800">Back to Home</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Header - Gradient Blue */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 w-full p-4 sm:p-6 shadow-lg rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button onClick={() => navigate("/")} variant="ghost" className="text-white hover:bg-blue-600">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline text-white">Go Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white ml-4">Range Information</h1>
          </div>
          <div className="text-white text-sm">
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-white">{user.displayName || user.email}</span>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="text-blue-700 border-white hover:bg-white" onClick={() => navigate('/login')}>Sign In</Button>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700 mb-2">{range.name}</h1>
        {range.logoUrl && (
          <div className="flex justify-center mb-4">
            <img src={range.logoUrl} alt="logo" className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain rounded-full border-2 border-blue-200 shadow" />
          </div>
        )}
      </div>

      <div className="relative mb-6 sm:mb-8">
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <Badge variant={range.status === "active" ? "default" : "destructive"} className={cn("px-2 py-0.5 sm:px-3 sm:py-1 font-bold shadow-md", range.status === "active" ? "bg-green-600" : "bg-red-600")}>
            {range.status === "active" ? "OPEN" : "CLOSED"}
          </Badge>
        </div>

        {mediaItems.length > 0 ? (
          <div className="relative">
            <Carousel className="w-full" setApi={setCarouselApi} opts={{ loop: true }}>
              <CarouselContent>
                {mediaItems.map((item, idx) => (
                  <CarouselItem key={idx}>
                    <div className="flex items-center justify-center">
                      {item.type === 'video' ? (
                        <div ref={videoContainerRef} className="relative w-full">
                          <video
                            ref={videoRef}
                            src={item.url}
                            className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-xl shadow-lg"
                            onTimeUpdate={() => setVideoCurrentTime(videoRef.current?.currentTime || 0)}
                            onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
                            onEnded={() => setIsVideoPlaying(false)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            {!isVideoPlaying && (
                              <Button size="lg" className="bg-white text-blue-700 rounded-full p-4" onClick={toggleVideoPlay}>
                                <Play className="w-7 h-7" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : item.type === 'youtube' ? (
                        <div className="relative w-full cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
                          <img src={item.thumbnail} className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-xl shadow-lg" alt="yt" />
                          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center">
                            <div className="bg-red-600 rounded-full p-4 shadow-lg"><Play className="w-10 h-10 text-white" /></div>
                          </div>
                        </div>
                      ) : (
                        <img src={item.url} className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-xl shadow-lg" alt="img" />
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
            <div className="flex justify-center mt-4 gap-2">
              {mediaItems.map((_, index) => (
                <button key={index} onClick={() => carouselApi?.scrollTo(index)} className={cn("h-2 rounded-full transition-all", selectedIndex === index ? "bg-blue-700 w-6" : "bg-gray-300 w-2")} />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-48 sm:h-64 flex flex-col items-center justify-center bg-gray-100 rounded-xl border-2 border-dashed border-gray-300">
            <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
            <span className="text-gray-500">No media available</span>
          </div>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 text-blue-700" />
              <div>
                <h3 className="font-semibold text-gray-700">Address</h3>
                <p className="text-gray-800">{range.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-gray-700">Contact</h3>
                <p className="text-gray-800">{range.contactNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-700">Today's Hours</h3>
                {range.openingHours && (() => {
                  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
                  const hours = range.openingHours[day];
                  return <p className="text-gray-800">{hours?.start ? `${formatTime(hours.start)} - ${formatTime(hours.end)}` : "Closed"}</p>;
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {range.description && (
              <div>
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2"><Star className="w-5 h-5" /> Description</h3>
                <p className="text-gray-700">{range.description}</p>
              </div>
            )}
            {range.facilities && (
              <div>
                <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Facilities</h3>
                <p className="text-gray-700">{range.facilities}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={() => navigate(`/book-range/${range.id}`)} className="bg-blue-700 hover:bg-[#ff6b6b] text-white px-10 py-6 text-lg font-semibold" disabled={range.status !== "active"}>
            {range.status === "active" ? (user ? "Book Now" : "Sign In to Book") : "Currently Closed"}
          </Button>

          {range.subscriptionSettings?.isActive && (
            <Button onClick={() => navigate(`/subscription/${range.id}`)} variant="outline" className="border-2 border-red-600 text-red-600 hover:bg-red-50 px-6 py-6 text-lg font-semibold" disabled={range.status !== "active"}>
              <Crown className="w-5 h-5 mr-2" /> Premium Plans
            </Button>
          )}
        </div>
      </div>

      {range.openingHours && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 mt-6">
          <h3 className="font-bold text-xl text-blue-700 mb-4 text-center">Opening <span className="text-red-600">Hours</span></h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(range.openingHours).map(([day, hours]) => (
              <div key={day} className={cn("p-4 rounded-lg border", hours.start ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100")}>
                <h4 className="font-semibold text-gray-800">{day}</h4>
                <p className="text-gray-600 text-sm">{hours.start ? `${formatTime(hours.start)} - ${formatTime(hours.end)}` : "Closed"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}