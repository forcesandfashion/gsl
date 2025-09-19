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

  // Function to extract YouTube video ID and get thumbnail
  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Organize media items with proper priority
  const organizeMediaItems = (range: Range) => {
    const items: MediaItem[] = [];
    
    // Priority 1: Direct video (available for everyone to view)
    if (range.videoUrl) {
      items.push({
        type: 'video',
        url: range.videoUrl
      });
    }
    
    // Priority 2: YouTube video (available for everyone to view)
    if (range.youtubeUrl) {
      const videoId = getYouTubeVideoId(range.youtubeUrl);
      items.push({
        type: 'youtube',
        url: range.youtubeUrl,
        thumbnail: videoId ? getYouTubeThumbnail(videoId) : undefined
      });
    }
    
    // Priority 3: Images (available for everyone to view)
    if (range.images && range.images.length > 0) {
      range.images.forEach((imageUrl) => {
        items.push({
          type: 'image',
          url: imageUrl
        });
      });
    }
    
    return items;
  };

  useEffect(() => {
    const fetchRange = async () => {
      try {
        if (!rangeId) {
          toast({
            title: "Error",
            description: "No range ID provided.",
            variant: "destructive",
          });
          return;
        }

        const rangeRef = doc(db, "ranges", rangeId);
        const rangeSnap = await getDoc(rangeRef);

        if (!rangeSnap.exists()) {
          toast({
            title: "Not Found",
            description: "This shooting range does not exist.",
            variant: "destructive",
          });
          return;
        }

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
        toast({
          title: "Error",
          description: error.message || "Failed to load range info",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRange();
  }, [rangeId, toast]);

  // Video control functions
  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    
    if (isVideoPlaying) {
      videoRef.current.pause();
      // Resume carousel
      carouselApi?.scrollTo(selectedIndex);
    } else {
      videoRef.current.play();
      // Stop carousel when video plays
    }
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
    if (volume === 0) {
      setIsVideoMuted(true);
      videoRef.current.muted = true;
    } else if (isVideoMuted) {
      setIsVideoMuted(false);
      videoRef.current.muted = false;
    }
  };

  const handleTimeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const time = value[0];
    videoRef.current.currentTime = time;
    setVideoCurrentTime(time);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!isFullscreen) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Video event handlers
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
    // Resume carousel when video ends
    if (carouselApi) {
      // Move to next slide after video ends
      const nextIndex = (selectedIndex + 1) % mediaItems.length;
      carouselApi.scrollTo(nextIndex);
      setSelectedIndex(nextIndex);
    }
  };

  // Auto-advance carousel
  useEffect(() => {
    if (!carouselApi || mediaItems.length <= 1 || isVideoPlaying || isCarouselPaused) return;

    const startAutoPlay = () => {
      autoPlayRef.current = setInterval(() => {
        if (carouselApi && !isVideoPlaying && !isCarouselPaused) {
          carouselApi.scrollNext();
        }
      }, 4000); // Change slide every 4 seconds
    };

    const stopAutoPlay = () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };

    startAutoPlay();

    return stopAutoPlay;
  }, [carouselApi, mediaItems.length, isVideoPlaying, isCarouselPaused]);

  // Pause auto-play on hover
  const handleCarouselMouseEnter = () => {
    setIsCarouselPaused(true);
  };

  const handleCarouselMouseLeave = () => {
    setIsCarouselPaused(false);
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

  // Handle YouTube click
  const handleYouTubeClick = (url: string) => {
    window.open(url, '_blank');
  };

  // Carousel change handler
  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      const currentIndex = carouselApi.selectedScrollSnap();
      setSelectedIndex(currentIndex);
      
      // Pause video when switching away from video slide
      if (videoRef.current && isVideoPlaying && mediaItems[currentIndex]?.type !== 'video') {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    };

    carouselApi.on('select', onSelect);
    
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi, isVideoPlaying, mediaItems]);

  // Fullscreen event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleBookingClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book this range.",
        variant: "destructive",
      });
      navigate(`/login?returnTo=/book-range/${range?.id}`);
      return;
    }
    navigate(`/book-range/${range?.id}`);
  };

  const handleSubscriptionClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe to this range.",
        variant: "destructive",
      });
      navigate(`/login?returnTo=/subscription/${range?.id}`);
      return;
    }
    navigate(`/subscription/${range?.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 text-lg mt-4">
            Loading range information...
          </p>
        </div>
      </div>
    );
  }

  if (!range) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
          <div className="text-gray-400 mb-4">
            <MapPin className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Range Not Found</h3>
          <p className="text-gray-500 mb-6">
            The requested shooting range could not be found or may no longer exist.
          </p>
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Header with back button */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 w-full p-4 sm:p-6 shadow-lg rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              onClick={() => navigate("/")}
              variant="ghost"
              className="text-white hover:bg-blue-500 p-2 sm:p-2"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Go Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white ml-2 sm:ml-4">
              Range Information
            </h1>
          </div>
          
          <div className="text-white text-sm">
            {authLoading ? (
              <span>Loading...</span>
            ) : user ? (
              <div className="hidden sm:flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{user.displayName || user.email}</span>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                className="text-blue-600 border-white hover:bg-white hidden sm:flex"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            )}
            
            {/* Mobile menu button */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-blue-500">
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {user ? (
                    <>
                      <DropdownMenuItem className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{user.displayName || user.email}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/profile')}>
                        Profile
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate('/login')}>
                      Sign In
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700 mb-2">{range.name}</h1>
        {range.logoUrl && (
          <div className="flex justify-center mb-4">
            <img 
              src={range.logoUrl} 
              alt={`${range.name} logo`}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain rounded-full border-2 border-blue-200 shadow"
            />
          </div>
        )}
      </div>

      <div className="relative mb-6 sm:mb-8">
        {/* Status badge */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <Badge 
            variant={range.status === "active" ? "default" : "destructive"}
            className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-bold shadow-md"
          >
            {range.status === "active" ? "OPEN" : "CLOSED"}
          </Badge>
        </div>

        {/* Enhanced Carousel */}
        {mediaItems.length > 0 ? (
          <div 
            className="relative"
            onMouseEnter={handleCarouselMouseEnter}
            onMouseLeave={handleCarouselMouseLeave}
          >
            <Carousel
              className="w-full"
              opts={{ 
                startIndex: selectedIndex,
                loop: true,
                // Stop auto-play when video is playing
                ...(isVideoPlaying ? { watchDrag: false } : {})
              }}
              setApi={setCarouselApi}
            >
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
                            onTimeUpdate={handleVideoTimeUpdate}
                            onLoadedMetadata={handleVideoLoadedMetadata}
                            onEnded={handleVideoEnded}
                            poster=""
                          />
                          
                          {/* Video Controls Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 rounded-xl flex items-center justify-center group">
                            <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-black bg-opacity-70 rounded-lg p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              {/* Play/Pause and Skip Controls */}
                              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20 h-6 w-6 p-0 sm:h-8 sm:w-8"
                                  onClick={() => skipTime(-10)}
                                >
                                  <SkipBack className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20 h-7 w-7 p-0 sm:h-9 sm:w-9"
                                  onClick={toggleVideoPlay}
                                >
                                  {isVideoPlaying ? (
                                    <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
                                  ) : (
                                    <Play className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" />
                                  )}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20 h-6 w-6 p-0 sm:h-8 sm:w-8"
                                  onClick={() => skipTime(10)}
                                >
                                  <SkipForward className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                                
                                <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white hover:bg-opacity-20 h-6 w-6 p-0 sm:h-8 sm:w-8"
                                    onClick={toggleVideoMute}
                                  >
                                    {isVideoMuted ? (
                                      <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" />
                                    ) : (
                                      <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                    )}
                                  </Button>
                                  
                                  <div className="w-10 sm:w-16">
                                    <Slider
                                      value={[isVideoMuted ? 0 : videoVolume]}
                                      onValueChange={handleVolumeChange}
                                      max={1}
                                      step={0.1}
                                      className="cursor-pointer"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex-1" />
                                
                                <span className="text-white text-xs sm:text-sm">
                                  {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                                </span>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20 h-6 w-6 p-0 sm:h-8 sm:w-8"
                                  onClick={toggleFullscreen}
                                >
                                  <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full">
                                <Slider
                                  value={[videoCurrentTime]}
                                  onValueChange={handleTimeChange}
                                  max={videoDuration}
                                  step={1}
                                  className="cursor-pointer"
                                />
                              </div>
                            </div>
                            
                            {/* Central Play Button */}
                            {!isVideoPlaying && (
                              <Button
                                size="lg"
                                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-blue-600 rounded-full p-2 sm:p-4 shadow-lg"
                                onClick={toggleVideoPlay}
                              >
                                <Play className="w-5 h-5 sm:w-7 sm:h-7 ml-0.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : item.type === 'youtube' ? (
                        <div className="relative w-full cursor-pointer" onClick={() => handleYouTubeClick(item.url)}>
                          <img
                            src={item.thumbnail || "/placeholder-range.jpg"}
                            alt={`${range.name} video thumbnail`}
                            className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-xl shadow-lg"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-range.jpg";
                            }}
                          />
                          {/* YouTube Play Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center group hover:bg-opacity-40 transition-all duration-300">
                            <div className="bg-red-600 rounded-full p-2 sm:p-3 md:p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Play className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white ml-0.5 sm:ml-1" />
                            </div>
                            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-black bg-opacity-70 px-2 py-1 rounded flex items-center gap-1 sm:gap-2">
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                              <span className="text-white text-xs sm:text-sm">YouTube</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={`${range.name} gallery ${idx + 1}`}
                          className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-xl shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-range.jpg";
                            e.currentTarget.className = "w-full h-48 sm:h-64 md:h-80 lg:h-96 object-contain rounded-xl bg-gray-100 p-4";
                          }}
                        />
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {/* Hide carousel controls when video is playing */}
              {!isVideoPlaying && (
                <>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </>
              )}
            </Carousel>

            {/* Pagination dots */}
            <div className="flex justify-center mt-3 sm:mt-4 gap-1 sm:gap-2">
              {mediaItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedIndex(index);
                    carouselApi?.scrollTo(index);
                  }}
                  className={cn(
                    "h-2 sm:h-3 rounded-full transition-all duration-300 relative",
                    selectedIndex === index 
                      ? "bg-blue-600 w-4 sm:w-6 scale-110" 
                      : "bg-gray-300 hover:bg-gray-400 w-2 sm:w-3"
                  )}
                >
                  {/* Icon overlay for media type */}
                  {item.type === 'video' && (
                    <div className="absolute -top-0.5 -right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full"></div>
                  )}
                  {item.type === 'youtube' && (
                    <div className="absolute -top-0.5 -right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 flex flex-col items-center justify-center bg-gray-100 rounded-xl border-2 border-dashed border-gray-300">
            <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 mb-2 sm:mb-3" />
            <span className="text-gray-500 text-sm sm:text-base md:text-lg">No media available</span>
          </div>
        )}
      </div>

      {/* Range Info Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-700 text-sm sm:text-base mb-1">Address</h3>
                <p className="text-gray-800 text-sm sm:text-base">{range.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3">
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-700 text-sm sm:text-base mb-1">Contact</h3>
                <p className="text-gray-800 text-sm sm:text-base">{range.contactNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 text-purple-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-700 text-sm sm:text-base mb-1">Today's Hours</h3>
                {range.openingHours && (() => {
                  const today = new Date();
                  const weekdayName = today.toLocaleDateString("en-US", { weekday: "long" });
                  const todayHours = range.openingHours[weekdayName];

                  if (todayHours?.start && todayHours?.end) {
                    return (
                      <p className="text-gray-800 text-sm sm:text-base">
                        {weekdayName}: {formatTime(todayHours.start)} - {formatTime(todayHours.end)}
                      </p>
                    );
                  } else {
                    return <p className="text-gray-800 text-sm sm:text-base">{weekdayName}: Closed</p>;
                  }
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {range.description && (
              <div>
                <h3 className="font-semibold text-blue-600 text-sm sm:text-base mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                  Description
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">{range.description}</p>
              </div>
            )}

            {range.facilities && (
              <div>
                <h3 className="font-semibold text-blue-600 text-sm sm:text-base mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                  Facilities
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">{range.facilities}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <Button 
            onClick={handleBookingClick}
            className="bg-blue-600 hover:bg-blue-700 text-white py-4 sm:py-6 px-6 sm:px-10 text-base sm:text-lg font-semibold shadow-lg transition-all hover:scale-105"
            disabled={range.status !== "active"}
          >
            {range.status === "active" 
              ? (user ? "Book Now" : "Sign In to Book")
              : "Currently Closed"
            }
          </Button>

          {range.subscriptionSettings?.isActive && (
            <Button 
              onClick={handleSubscriptionClick}
              variant="outline"
              className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50 py-4 sm:py-6 px-4 sm:px-6 text-base sm:text-lg font-semibold shadow-lg transition-all hover:scale-105"
              disabled={range.status !== "active"}
            >
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              {range.status === "active" 
                ? (user ? "Premium" : "Premium")
                : "Unavailable"
              }
            </Button>
          )}
        </div>

        {!user && range.status === "active" && (
          <div className="mt-3 sm:mt-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              Sign in to book this shooting range
            </p>
          </div>
        )}
      </div>

      {/* Full Opening Hours */}
      {range.openingHours && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 mt-4 sm:mt-6">
          <h3 className="font-bold text-lg sm:text-xl text-blue-700 mb-3 sm:mb-4 text-center">Opening Hours</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Object.entries(range.openingHours).map(([day, hours]) => (
              <div 
                key={day} 
                className={`p-3 sm:p-4 rounded-lg ${
                  hours.start && hours.end 
                    ? "bg-blue-50 border border-blue-100" 
                    : "bg-gray-50 border border-gray-100"
                }`}
              >
                <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{day}</h4>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                  {hours.start && hours.end 
                    ? `${formatTime(hours.start)} - ${formatTime(hours.end)}`
                    : "Closed"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Features Preview (if subscription available) */}
      {range.subscriptionSettings?.isActive && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 sm:p-6 rounded-xl shadow-lg border-2 border-yellow-200 mt-4 sm:mt-6">
          <div className="text-center mb-3 sm:mb-4">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto text-yellow-500 mb-2" />
            <h3 className="text-lg sm:text-xl font-bold text-yellow-700">Premium Subscription</h3>
            <p className="text-yellow-600 text-sm sm:text-base">{range.subscriptionSettings.description}</p>
          </div>
          
          {range.subscriptionSettings.features && range.subscriptionSettings.features.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              {range.subscriptionSettings.features.slice(0, 6).map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-yellow-700">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{feature}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-3 sm:mt-4">
            <Button 
              onClick={handleSubscriptionClick}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white text-sm sm:text-base"
              disabled={range.status !== "active"}
            >
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              View Plans
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}