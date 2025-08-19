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
  ExternalLink
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
    
    console.log('Organizing media items:', {
      videoUrl: range.videoUrl,
      youtubeUrl: range.youtubeUrl,
      imagesCount: range.images?.length || 0
    });
    
    // Priority 1: Direct video (available for everyone to view)
    if (range.videoUrl) {
      console.log('Adding direct video:', range.videoUrl);
      items.push({
        type: 'video',
        url: range.videoUrl
      });
    }
    
    // Priority 2: YouTube video (available for everyone to view)
    if (range.youtubeUrl) {
      const videoId = getYouTubeVideoId(range.youtubeUrl);
      console.log('Adding YouTube video:', range.youtubeUrl, 'Video ID:', videoId);
      items.push({
        type: 'youtube',
        url: range.youtubeUrl,
        thumbnail: videoId ? getYouTubeThumbnail(videoId) : undefined
      });
    }
    
    // Priority 3: Images (available for everyone to view)
    if (range.images && range.images.length > 0) {
      console.log('Adding images:', range.images.length);
      range.images.forEach((imageUrl, index) => {
        console.log(`Adding image ${index + 1}:`, imageUrl);
        items.push({
          type: 'image',
          url: imageUrl
        });
      });
    }
    
    console.log('Final media items:', items);
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
          ownerPremium: data.ownerPremium || false
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
              className="text-white hover:bg-blue-500"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </Button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white ml-4">
              Range Information
            </h1>
          </div>
          
          <div className="text-white text-sm">
            {authLoading ? (
              <span>Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                className="text-blue-600 border-white hover:bg-white"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mt-8 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">{range.name}</h1>
        {range.logoUrl && (
          <div className="flex justify-center mb-4">
            <img 
              src={range.logoUrl} 
              alt={`${range.name} logo`}
              className="w-24 h-24 object-contain rounded-full border-2 border-blue-200 shadow"
            />
          </div>
        )}
      </div>

      <div className="relative mb-8">
        {/* Status badge */}
        <div className="absolute top-4 right-4 z-10">
          <Badge 
            variant={range.status === "active" ? "default" : "destructive"}
            className="px-3 py-1 text-sm font-bold shadow-md"
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
                            className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-xl shadow-lg"
                            onTimeUpdate={handleVideoTimeUpdate}
                            onLoadedMetadata={handleVideoLoadedMetadata}
                            onEnded={handleVideoEnded}
                            poster=""
                          />
                          
                          {/* Video Controls Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 rounded-xl flex items-center justify-center group">
                            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              {/* Play/Pause and Skip Controls */}
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20"
                                  onClick={() => skipTime(-10)}
                                >
                                  <SkipBack className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20"
                                  onClick={toggleVideoPlay}
                                >
                                  {isVideoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20"
                                  onClick={() => skipTime(10)}
                                >
                                  <SkipForward className="w-4 h-4" />
                                </Button>
                                
                                <div className="flex items-center gap-2 ml-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white hover:bg-opacity-20"
                                    onClick={toggleVideoMute}
                                  >
                                    {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                  </Button>
                                  
                                  <div className="w-16">
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
                                
                                <span className="text-white text-sm">
                                  {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                                </span>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white hover:bg-white hover:bg-opacity-20"
                                  onClick={toggleFullscreen}
                                >
                                  <Maximize className="w-4 h-4" />
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
                                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-blue-600 rounded-full p-4 shadow-lg"
                                onClick={toggleVideoPlay}
                              >
                                <Play className="w-8 h-8" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : item.type === 'youtube' ? (
                        <div className="relative w-full cursor-pointer" onClick={() => handleYouTubeClick(item.url)}>
                          <img
                            src={item.thumbnail || "/placeholder-range.jpg"}
                            alt={`${range.name} video thumbnail`}
                            className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-xl shadow-lg"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-range.jpg";
                            }}
                          />
                          {/* YouTube Play Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center group hover:bg-opacity-40 transition-all duration-300">
                            <div className="bg-red-600 rounded-full p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Play className="w-12 h-12 text-white ml-1" />
                            </div>
                            <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 px-3 py-1 rounded flex items-center gap-2">
                              <ExternalLink className="w-4 h-4 text-white" />
                              <span className="text-white text-sm">Watch on YouTube</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={`${range.name} gallery ${idx + 1}`}
                          className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-xl shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-range.jpg";
                            e.currentTarget.className = "w-full h-64 sm:h-80 md:h-96 object-contain rounded-xl bg-gray-100 p-4";
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
            <div className="flex justify-center mt-4 gap-2">
              {mediaItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedIndex(index);
                    carouselApi?.scrollTo(index);
                  }}
                  className={cn(
                    "h-3 rounded-full transition-all duration-300 relative",
                    selectedIndex === index 
                      ? "bg-blue-600 w-6 scale-110" 
                      : "bg-gray-300 hover:bg-gray-400 w-3"
                  )}
                >
                  {/* Icon overlay for media type */}
                  {item.type === 'video' && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                  {item.type === 'youtube' && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-64 sm:h-80 md:h-96 flex flex-col items-center justify-center bg-gray-100 rounded-xl border-2 border-dashed border-gray-300">
            <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
            <span className="text-gray-500 text-lg">No media available</span>
          </div>
        )}
      </div>

      {/* Range Info Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 mt-0.5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Address</h3>
                <p className="text-gray-800">{range.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-6 h-6 mt-0.5 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Contact</h3>
                <p className="text-gray-800">{range.contactNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 mt-0.5 text-purple-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Today's Hours</h3>
                {range.openingHours && (() => {
                  const today = new Date();
                  const weekdayName = today.toLocaleDateString("en-US", { weekday: "long" });
                  const todayHours = range.openingHours[weekdayName];

                  if (todayHours?.start && todayHours?.end) {
                    return (
                      <p className="text-gray-800">
                        {weekdayName}: {formatTime(todayHours.start)} - {formatTime(todayHours.end)}
                      </p>
                    );
                  } else {
                    return <p className="text-gray-800">{weekdayName}: Closed</p>;
                  }
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {range.description && (
              <div>
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Description
                </h3>
                <p className="text-gray-700">{range.description}</p>
              </div>
            )}

            {range.facilities && (
              <div>
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Facilities
                </h3>
                <p className="text-gray-700">{range.facilities}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button 
            onClick={handleBookingClick}
            className="bg-blue-600 hover:bg-blue-700 text-white py-6 px-10 text-lg font-semibold shadow-lg transition-all hover:scale-105"
            disabled={range.status !== "active"}
          >
            {range.status === "active" 
              ? (user ? "Book This Range Now" : "Sign In to Book This Range")
              : "Range Currently Closed"
            }
          </Button>
        </div>

        {!user && range.status === "active" && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              <User className="w-4 h-4 inline mr-1" />
              You need to sign in to book this shooting range
            </p>
          </div>
        )}
      </div>

      {/* Full Opening Hours */}
      {range.openingHours && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mt-6">
          <h3 className="font-bold text-xl text-blue-700 mb-4 text-center">Opening Hours</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(range.openingHours).map(([day, hours]) => (
              <div 
                key={day} 
                className={`p-4 rounded-lg ${
                  hours.start && hours.end 
                    ? "bg-blue-50 border border-blue-100" 
                    : "bg-gray-50 border border-gray-100"
                }`}
              >
                <h4 className="font-semibold text-gray-800">{day}</h4>
                <p className="text-gray-600 mt-1">
                  {hours.start && hours.end 
                    ? `${formatTime(hours.start)} - ${formatTime(hours.end)}`
                    : "Closed"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}