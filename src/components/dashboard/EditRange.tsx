import { useState, useRef, useCallback, useEffect } from "react";
import { db, storage } from "@/firebase/config";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "@/firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Info, 
  List, 
  Clock, 
  Phone, 
  Image as ImageIcon, 
  Type, 
  DollarSign, 
  Navigation, 
  Video, 
  Crown, 
  Map, 
  RefreshCw, 
  Copy, 
  X, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft,
  Upload,
  Plus,
  Youtube,
  AlertCircle,
  Save
} from "lucide-react";
import { IndianRupee } from "lucide-react";

// Add your Google Maps API key here
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API;

interface RangeFormData {
  name: string;
  address: string;
  logoUrl?: string;
  description: string;
  facilities: string;
  contactNumber: string;
  pricePerHour: number;
  latitude?: number;
  longitude?: number;
  structuredOpeningHours?: {
    [day: string]: {
      start: string;
      end: string;
    };
  };
  maxBookingsPerSlot?: number;
}

interface GeocodingResult {
  lat: number;
  lng: number;
  formatted_address: string;
}

interface RangeOwner {
  premium: boolean;
  logoUrl?: string;
}

interface Range {
  id: string;
  name: string;
  address: string;
  description: string;
  facilities: string;
  contactNumber: string;
  logoUrl?: string;
  rangeImages: string[];
  videoUrl?: string;
  youtubeUrl?: string;
  status: string;
  pricePerHour?: number;
  latitude?: number;
  longitude?: number;
  maxBookingsPerSlot?: number;
  structuredOpeningHours?: {
    [day: string]: {
      start: string;
      end: string;
    };
  };
  ownerId: string;
  ownerPremium?: boolean;
}

interface MapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        Geocoder: any;
        [key: string]: any;
      };
    };
  }
}

// Map Component
const InteractiveMap: React.FC<MapProps> = ({ latitude, longitude, onLocationChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Initialize map
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: 15,
      mapTypeId: 'roadmap'
    });

    // Add marker
    markerInstance.current = new window.google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: mapInstance.current,
      draggable: true,
      title: 'Drag to adjust location'
    });

    // Handle marker drag
    markerInstance.current.addListener('dragend', async () => {
      const position = markerInstance.current.getPosition();
      const lat = position.lat();
      const lng = position.lng();

      // Reverse geocode to get address
      const geocoder = new window.google.maps.Geocoder();
      try {
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
          onLocationChange(lat, lng, response.results[0].formatted_address);
        } else {
          onLocationChange(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
        onLocationChange(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    });

  }, [latitude, longitude]);

  return (
    <div 
      ref={mapRef} 
      style={{ width: '100%', height: '300px' }}
      className="rounded-lg border border-gray-300 shadow-sm"
    />
  );
};

interface EditRangeProps {
  range: Range | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRange: Partial<Range>) => void;
  premium: boolean;
}

export default function EditRange({ range, isOpen, onClose, onUpdate }: EditRangeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [ownerLogoUrl, setOwnerLogoUrl] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  
  const [formData, setFormData] = useState<RangeFormData>({
    name: "",
    address: "",
    description: "",
    facilities: "",
    contactNumber: "",
    pricePerHour: 0,
    latitude: undefined,
    longitude: undefined
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [rangeImages, setRangeImages] = useState<string[]>([]);
  const [rangeImageFiles, setRangeImageFiles] = useState<File[]>([]);
  const [existingRangeImages, setExistingRangeImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  
  // Video states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [deleteVideo, setDeleteVideo] = useState(false);
  
  const [structuredOpeningHours, setStructuredOpeningHours] = useState<{ [key: string]: { start: string; end: string } }>({
    Monday: { start: "", end: "" },
    Tuesday: { start: "", end: "" },
    Wednesday: { start: "", end: "" },
    Thursday: { start: "", end: "" },
    Friday: { start: "", end: "" },
    Saturday: { start: "", end: "" },
    Sunday: { start: "", end: "" },
  });
  
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState<number>(5);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  
  // Bulk timing states
  const [bulkStartTime, setBulkStartTime] = useState("");
  const [bulkEndTime, setBulkEndTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showBulkOptions, setShowBulkOptions] = useState(false);
  
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Time options for dropdown (every 30 minutes)
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? "00" : "30";
    const time = `${hours.toString().padStart(2, "0")}:${minutes}`;
    const displayTime = new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return { value: time, display: displayTime };
  });

  // Check if user is premium and fetch owner logo
  useEffect(() => {
    const checkPremiumStatusAndLogo = async () => {
      if (!user) return;
      
      try {
        setPremiumLoading(true);
        const ownerDoc = await getDoc(doc(db, "range-owners", user.uid));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data() as RangeOwner;
          setIsPremium(ownerData.premium || false);
          
          // Set owner logo as default if exists
          if (ownerData.logoUrl) {
            setOwnerLogoUrl(ownerData.logoUrl);
          }
        }
      } catch (error) {
        console.error("Error checking premium status:", error);
        setIsPremium(false);
      } finally {
        setPremiumLoading(false);
      }
    };

    checkPremiumStatusAndLogo();
  }, [user]);

  // Load Google Maps Script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is missing");
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setMapsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Google Maps");
      setMapsLoaded(false);
    };
    
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  // Initialize form with range data
  useEffect(() => {
    if (range) {
      setFormData({
        name: range.name || "",
        address: range.address || "",
        description: range.description || "",
        facilities: range.facilities || "",
        contactNumber: range.contactNumber || "",
        pricePerHour: range.pricePerHour || 0,
        latitude: range.latitude || undefined,
        longitude: range.longitude || undefined
      });

      // Set logo to the range's logo URL, or null if it doesn't exist
      setLogo(range.logoUrl || null);
      setExistingRangeImages(range.rangeImages || []);
      setRangeImages(range.rangeImages || []);
      
      if (range.videoUrl) {
        setExistingVideoUrl(range.videoUrl);
        setVideoPreview(range.videoUrl);
      }
      
      setYoutubeUrl(range.youtubeUrl || "");
      
      setStructuredOpeningHours(range.structuredOpeningHours || {
        Monday: { start: "", end: "" },
        Tuesday: { start: "", end: "" },
        Wednesday: { start: "", end: "" },
        Thursday: { start: "", end: "" },
        Friday: { start: "", end: "" },
        Saturday: { start: "", end: "" },
        Sunday: { start: "", end: "" },
      });
      
      setMaxBookingsPerSlot(range.maxBookingsPerSlot || 5);
      
      // Set premium status from range data if available
      if (range.ownerPremium !== undefined) {
        setIsPremium(range.ownerPremium);
      }
    }
  }, [range]);

  // Debounce function for address input
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Geocoding function
  const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    if (!address.trim() || !GOOGLE_MAPS_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address
        };
      } else if (data.status === "ZERO_RESULTS") {
        throw new Error("No results found for this address");
      } else if (data.status === "OVER_QUERY_LIMIT") {
        throw new Error("API quota exceeded");
      } else {
        throw new Error(data.error_message || "Geocoding failed");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      throw error;
    }
  };

  // Debounced geocoding function
  const debouncedGeocode = useCallback(
    debounce(async (address: string) => {
      if (!address.trim()) {
        setFormData(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
        setGeocodingError(null);
        return;
      }

      setGeocodingLoading(true);
      setGeocodingError(null);

      try {
        const result = await geocodeAddress(address);
        if (result) {
          setFormData(prev => ({
            ...prev,
            latitude: result.lat,
            longitude: result.lng
          }));
        } else {
          setFormData(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
        }
      } catch (error) {
        setGeocodingError(error instanceof Error ? error.message : "Failed to get coordinates");
        setFormData(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
      } finally {
        setGeocodingLoading(false);
      }
    }, 1000),
    []
  );

  // Handle address change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setFormData({ ...formData, address: newAddress });
    debouncedGeocode(newAddress);
  };

  // Fixed price change handler
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing the field
    if (value === '') {
      setFormData({ ...formData, pricePerHour: 0 });
      return;
    }
    
    // Parse the number and ensure it's valid
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData({ ...formData, pricePerHour: numValue });
    }
  };

  // Fixed max bookings per slot handler
  const handleMaxBookingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing the field
    if (value === '') {
      setMaxBookingsPerSlot(1);
      return;
    }
    
    // Parse the number and ensure it's valid and at least 1
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1) {
      setMaxBookingsPerSlot(numValue);
    }
  };

  // Handle location change from map
  const handleMapLocationChange = (lat: number, lng: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address
    }));
    setGeocodingError(null);
  };

  // Handle opening hours change
  const handleOpeningHoursChange = (day: string, field: 'start' | 'end', value: string) => {
    setStructuredOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Bulk timing operations
  const handleDaySelection = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const selectAllDays = () => {
    setSelectedDays([...weekdays]);
  };

  const clearSelectedDays = () => {
    setSelectedDays([]);
  };

  const applyBulkTiming = () => {
    if (selectedDays.length === 0 || !bulkStartTime || !bulkEndTime) {
      toast({
        title: "Invalid Selection",
        description: "Please select days and set both start and end times.",
        variant: "destructive"
      });
      return;
    }

    const updatedHours = { ...structuredOpeningHours };
    selectedDays.forEach(day => {
      updatedHours[day] = {
        start: bulkStartTime,
        end: bulkEndTime
      };
    });

    setStructuredOpeningHours(updatedHours);
    
    toast({
      title: "Timing Applied",
      description: `Bulk timing applied to ${selectedDays.length} day(s).`,
    });

    // Reset bulk settings
    setBulkStartTime("");
    setBulkEndTime("");
    setSelectedDays([]);
  };

  const closeAllDays = () => {
    const closedHours = weekdays.reduce((acc, day) => {
      acc[day] = { start: "", end: "" };
      return acc;
    }, {} as { [key: string]: { start: string; end: string } });

    setStructuredOpeningHours(closedHours);
    
    toast({
      title: "All Days Closed",
      description: "All days have been set to closed.",
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ["image/png", "image/jpeg", "image/svg+xml"].includes(file.type) && file.size <= 2 * 1024 * 1024) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a PNG, JPG, or SVG image up to 2MB.");
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoFile(null);
  };

  const handleResetToOwnerLogo = () => {
    if (ownerLogoUrl) {
      setLogo(ownerLogoUrl);
      setLogoFile(null);
    }
  };

  const handleRangeImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Free users: 9 max, Premium users: unlimited
    if (!isPremium) {
      const currentCount = rangeImageFiles.length + existingRangeImages.length - imagesToDelete.length;
      const availableSlots = 9 - currentCount;
      
      if (validFiles.length > availableSlots) {
        toast({
          title: "Image Limit Exceeded",
          description: `You can only upload ${availableSlots} more image(s). Free plan allows 9 images total. Upgrade to Premium for unlimited images.`,
          variant: "destructive"
        });
        validFiles.splice(availableSlots);
      }
    }
    
    const newFiles = [...rangeImageFiles, ...validFiles];
    setRangeImageFiles(newFiles);
    
    const readers = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(readers).then(images => {
      const allImages = [...rangeImages, ...images];
      setRangeImages(allImages);
    });
  };

  const handleRemoveRangeImage = (idx: number, isExisting: boolean, imageUrl?: string) => {
    if (isExisting && imageUrl) {
      // Mark existing image for deletion
      setImagesToDelete(prev => [...prev, imageUrl]);
      setExistingRangeImages(prev => prev.filter(img => img !== imageUrl));
    } else {
      // Remove newly uploaded image
      const newImages = rangeImages.filter((_, i) => i !== idx);
      const newFiles = rangeImageFiles.filter((_, i) => i !== idx);
      setRangeImages(newImages);
      setRangeImageFiles(newFiles);
    }
  };

  // Video handling functions
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 100MB for free users, 500MB for premium)
      const maxSize = isPremium ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `Video size must be less than ${isPremium ? '500MB' : '100MB'}`,
          variant: "destructive"
        });
        return;
      }

      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setDeleteVideo(false); // Reset delete flag if uploading new video
    }
  };

  const handleRemoveVideo = () => {
    if (existingVideoUrl) {
      setDeleteVideo(true);
      setVideoPreview(null);
    } else {
      setVideoFile(null);
      setVideoPreview(null);
    }
  };

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const handleYouTubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    
    if (url && !validateYouTubeUrl(url)) {
      toast({
        title: "Invalid YouTube URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const deleteFile = async (fileUrl: string): Promise<void> => {
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !range) {
      toast({
        title: "Error",
        description: "You must be logged in to update a range listing",
        variant: "destructive"
      });
      return;
    }

    // Validate premium restrictions
    if (!isPremium) {
      const totalImages = (existingRangeImages.length - imagesToDelete.length) + rangeImageFiles.length;
      if (totalImages > 9) {
        toast({
          title: "Image Limit Exceeded",
          description: "Free users can upload maximum 9 images. Upgrade to premium for unlimited images.",
          variant: "destructive"
        });
        return;
      }
      
      if ((videoFile || existingVideoUrl) && youtubeUrl) {
        toast({
          title: "Video Limitation",
          description: "Free users can either upload a video file OR provide a YouTube link, not both.",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Delete marked images
      for (const imageUrl of imagesToDelete) {
        await deleteFile(imageUrl);
      }

      let logoUrl = range.logoUrl || ""; // Start with the original logo URL
      
      // Only update logo if a new file was selected or logo was explicitly removed
      if (logoFile) {
        // Upload new logo file
        logoUrl = await uploadFile(logoFile, `ranges/${user.uid}/logo/${Date.now()}_${logoFile.name}`);
      } else if (logo === null) {
        // Logo was explicitly removed - set to empty string
        logoUrl = "";
      }
      // If logo wasn't changed, logoUrl remains the original value

      const rangeImageUrls: string[] = [...existingRangeImages.filter(img => !imagesToDelete.includes(img))];
      for (let i = 0; i < rangeImageFiles.length; i++) {
        const file = rangeImageFiles[i];
        const url = await uploadFile(file, `ranges/${user.uid}/gallery/${Date.now()}_${i}_${file.name}`);
        rangeImageUrls.push(url);
      }

      let videoUrl = existingVideoUrl;
      if (deleteVideo && existingVideoUrl) {
        await deleteFile(existingVideoUrl);
        videoUrl = null;
      } else if (videoFile && isPremium) {
        videoUrl = await uploadFile(videoFile, `ranges/${user.uid}/video/${Date.now()}_${videoFile.name}`);
      }

      // Ensure all fields have valid values (not undefined)
      const rangeData = {
        name: formData.name || "",
        address: formData.address || "",
        description: formData.description || "",
        facilities: formData.facilities || "",
        structuredOpeningHours: structuredOpeningHours || {
          Monday: { start: "", end: "" },
          Tuesday: { start: "", end: "" },
          Wednesday: { start: "", end: "" },
          Thursday: { start: "", end: "" },
          Friday: { start: "", end: "" },
          Saturday: { start: "", end: "" },
          Sunday: { start: "", end: "" },
        },
        maxBookingsPerSlot: maxBookingsPerSlot || 5,
        contactNumber: formData.contactNumber || "",
        logoUrl: logoUrl, // Use the processed logo URL
        rangeImages: rangeImageUrls || [],
        videoUrl: videoUrl || null,
        youtubeUrl: youtubeUrl || null,
        pricePerHour: formData.pricePerHour || 0,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        updatedAt: new Date()
      };

      const rangeRef = doc(db, "ranges", range.id);
      await updateDoc(rangeRef, rangeData);

      toast({
        title: "Success",
        description: `Range listing updated successfully.`,
      });

      onUpdate(rangeData);
      onClose();

    } catch (error) {
      console.error("Error updating range listing:", error);
      toast({
        title: "Error",
        description: "Failed to update range listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !range) return null;

  if (premiumLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-start p-4 overflow-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mt-8 mb-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold text-gray-900">Edit Range</h2>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
              isPremium 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                : 'bg-gradient-to-r from-gray-400 to-gray-600 text-white'
            }`}>
              <Crown className="w-3 h-3" />
              {isPremium ? 'Premium' : 'Free'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {!isPremium && (
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl shadow-sm">
              <h4 className="font-semibold text-orange-800 mb-2">Free Account Features:</h4>
              <div className="text-sm text-orange-700 space-y-1">
                <p>• Maximum 9 range images</p>
                <p>• Either YouTube video OR file upload (max 100MB)</p>
                <p>• Interactive map for precise location</p>
                <p>• Default owner logo integration</p>
              </div>
              <p className="text-xs text-orange-600 mt-2 font-medium">
                Upgrade to Premium for unlimited images and 500MB video uploads!
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload Section */}
            <div className="flex flex-col items-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Range Logo</h3>
              {logo ? (
                <img src={logo} alt="Range Logo" className="w-32 h-32 rounded-full object-cover border-4 border-blue-300 shadow-lg mb-3" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 mb-3 shadow-inner">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg, image/svg+xml"
                ref={logoInputRef}
                onChange={handleLogoChange}
                className="hidden"
              />
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-all duration-200"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {logo ? "Change Logo" : "Upload Logo"}
                </Button>
                {ownerLogoUrl && logo !== ownerLogoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-all duration-200"
                    onClick={handleResetToOwnerLogo}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Use Owner Logo
                  </Button>
                )}
                {logo && (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-all duration-200"
                    onClick={handleRemoveLogo}
                  >
                    Remove Logo
                  </Button>
                )}
              </div>
              <span className="text-xs text-gray-500 mt-2 text-center">Max size: 2MB | PNG, JPG, or SVG recommended</span>
            </div>

            {/* Basic Information Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                    <Type className="w-4 h-4 text-blue-400" /> Range Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200 rounded-lg"
                    placeholder="Enter your range name"
                  />
                </div>

                <div>
                  <Label htmlFor="contactNumber" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                    <Phone className="w-4 h-4 text-indigo-400" /> Contact Number
                  </Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    required
                    className="focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 rounded-lg"
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="pricePerHour" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                    <IndianRupee className="w-4 h-4 text-green-500" /> Price Per Hour
                  </Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerHour === 0 ? '' : formData.pricePerHour}
                    onChange={handlePriceChange}
                    required
                    className="focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-200 rounded-lg"
                    placeholder="Enter hourly rate"
                  />
                </div>

                <div>
                  <Label htmlFor="maxSlots" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                    <Clock className="w-4 h-4 text-red-400" /> Max Bookings Per Slot
                  </Label>
                  <Input
                    id="maxSlots"
                    type="number"
                    min={1}
                    value={maxBookingsPerSlot === 0 ? '' : maxBookingsPerSlot}
                    onChange={handleMaxBookingsChange}
                    required
                    className="focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all duration-200 rounded-lg"
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="description" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                    <Info className="w-4 h-4 text-purple-400" /> Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    className="focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 rounded-lg"
                    placeholder="Describe your shooting range..."
                  />
                </div>

                <div>
                  <Label htmlFor="facilities" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                    <List className="w-4 h-4 text-pink-400" /> Facilities
                  </Label>
                  <Textarea
                    id="facilities"
                    value={formData.facilities}
                    onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                    placeholder="• Air-conditioned shooting bays&#10;• Professional targets&#10;• Safety equipment provided&#10;• Parking available"
                    required
                    rows={4}
                    className="focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Address Section with Map */}
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200">
              <div className="mb-4">
                <Label htmlFor="address" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                  <MapPin className="w-5 h-5 text-green-500" /> Address & Location
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleAddressChange}
                  required
                  className="focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-200 rounded-lg"
                  placeholder="Enter the complete address"
                />
              </div>
              
              {/* Coordinates Display */}
              <div className="mb-4 p-4 bg-white rounded-xl border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Location Details</span>
                    {geocodingLoading && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  
                  {formData.latitude && formData.longitude && mapsLoaded && (
                    <Button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      className="flex items-center gap-2 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                    >
                      <Map className="w-3 h-3" />
                      {showMap ? 'Hide Map' : 'Show Map'}
                    </Button>
                  )}
                </div>
                
                {formData.latitude && formData.longitude ? (
                  <div className="text-sm text-green-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Latitude:</span>
                      <span className="font-mono">{formData.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Longitude:</span>
                      <span className="font-mono">{formData.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                ) : geocodingError ? (
                  <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded-lg">
                    <div className="font-medium">⚠️ {geocodingError}</div>
                    <div className="text-xs mt-1">You can still update the range. Location can be updated later.</div>
                  </div>
                ) : formData.address.trim() && !geocodingLoading ? (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                    📍 Coordinates not found for this address
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    📍 Enter an address to get coordinates automatically
                  </div>
                )}
              </div>

              {/* Interactive Map */}
              {showMap && formData.latitude && formData.longitude && mapsLoaded && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                    <Map className="w-4 h-4" />
                    <span>Drag the marker to adjust the exact location</span>
                  </div>
                  <InteractiveMap
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationChange={handleMapLocationChange}
                  />
                </div>
              )}
            </div>

            {/* Range Images Section - Enhanced with Content Guidelines */}
            <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border border-orange-200">
              <Label htmlFor="rangeImages" className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                <ImageIcon className="w-5 h-5 text-orange-500" /> 
                Range Gallery
                <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-full">
                  {existingRangeImages.length - imagesToDelete.length + rangeImageFiles.length}/{isPremium ? '∞' : '9'} images
                </span>
              </Label>

              {/* Content Guidelines for Images */}
              <div className="mb-4 p-4 bg-white rounded-xl border-l-4 border-orange-400">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Image Content Guidelines</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Upload clear photos of your shooting range, facilities, and equipment
                        </p>
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Show safety features, shooting lanes, and amenities
                        </p>
                        <p className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          Do not upload inappropriate, violent, or explicit content
                        </p>
                        <p className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          Avoid copyrighted images or content you don't own
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Input
                  id="rangeImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleRangeImagesChange}
                  className="mb-4 focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200 rounded-lg"
                  disabled={!isPremium && (existingRangeImages.length - imagesToDelete.length + rangeImageFiles.length) >= 9}
                />
                
                {(existingRangeImages.length > 0 || rangeImages.length > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {/* Existing images */}
                    {existingRangeImages.map((img, idx) => (
                      <div key={`existing-${idx}`} className="relative group">
                        <img
                          src={img}
                          alt={`Range ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                        />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemoveRangeImage(idx, true, img)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    {/* Newly uploaded images */}
                    {rangeImages.slice(existingRangeImages.length).map((img, idx) => (
                      <div key={`new-${idx}`} className="relative group">
                        <img
                          src={img}
                          alt={`New Range ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
                        />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemoveRangeImage(existingRangeImages.length + idx, false)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enhanced Video Section with Content Guidelines */}
              <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                <Label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-6">
                  <Video className="w-6 h-6 text-purple-500" /> Video Content
                  {!isPremium && <span className="text-sm font-normal text-gray-500">(Choose one option)</span>}
                </Label>

                {/* Content Guidelines for Videos */}
                <div className="mb-6 p-4 bg-white rounded-xl border-l-4 border-purple-400">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Video Content Guidelines</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Upload professional range tours, facility overviews, or safety demonstrations
                        </p>
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Show range features, equipment, and training programs
                        </p>
                        <p className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          No explicit violence, inappropriate content, or harmful activities
                        </p>
                        <p className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          Avoid copyrighted music or content without proper licensing
                        </p>
                        <p className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          Do not upload content promoting unsafe gun handling
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* YouTube URL Input */}
                  <div className="space-y-3">
                    <Label htmlFor="youtubeUrl" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-6 h-6 bg-red-600 text-white text-xs font-bold rounded flex items-center justify-center">YT</span>
                      YouTube Video URL
                    </Label>
                    <Input
                      id="youtubeUrl"
                      type="url"
                      value={youtubeUrl}
                      onChange={handleYouTubeUrlChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 rounded-lg"
                      disabled={!isPremium && (videoFile !== null || (existingVideoUrl && !deleteVideo))}
                    />
                    {youtubeUrl && !validateYouTubeUrl(youtubeUrl) && (
                      <p className="text-red-500 text-sm">Please enter a valid YouTube URL</p>
                    )}
                  </div>

                  {/* Video Upload */}
                  <div className="space-y-3">
                    <Label htmlFor="videoFile" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-500" />
                      Upload Video File
                      <span className="text-xs text-gray-500">
                        (Max {isPremium ? '500MB' : '100MB'})
                      </span>
                    </Label>
                    <Input
                      id="videoFile"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 rounded-lg"
                      disabled={!isPremium && youtubeUrl !== ''}
                    />
                  </div>
                </div>
                
                {videoPreview && (
                  <div className="mt-6">
                    <video 
                      src={videoPreview} 
                      controls 
                      className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-200 shadow-lg"
                    />
                    <Button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="mt-3 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all duration-200"
                    >
                      Remove Video
                    </Button>
                  </div>
                )}

                {!isPremium && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      <strong>Free users:</strong> Choose either YouTube URL OR video upload, not both. 
                      Upgrade to Premium to use both options and upload larger videos.
                    </p>
                  </div>
                )}
              </div>

              {/* Enhanced Opening Hours Section with Bulk Operations */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                <label className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Weekly Opening Hours
                </label>

                {/* Bulk Operations Section */}
                <div className="mb-6 p-4 bg-white rounded-xl border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Copy className="w-4 h-4 text-blue-500" />
                      Bulk Operations
                    </h4>
                    <Button
                      type="button"
                      onClick={() => setShowBulkOptions(!showBulkOptions)}
                      className="text-sm px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                    >
                      {showBulkOptions ? 'Hide' : 'Show'} Bulk Options
                    </Button>
                  </div>

                  {showBulkOptions && (
                    <div className="space-y-4">
                      {/* Day Selection */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Days:</Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {weekdays.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDaySelection(day)}
                              className={`px-3 py-1 text-xs rounded-full border transition-all duration-200 ${
                                selectedDays.includes(day)
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 mb-4">
                          <Button
                            type="button"
                            onClick={selectAllDays}
                            className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-all duration-200"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            onClick={clearSelectedDays}
                            className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-all duration-200"
                          >
                            Clear Selection
                          </Button>
                        </div>
                      </div>

                      {/* Bulk Timing Input */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Bulk Start Time</Label>
                          <select
                            value={bulkStartTime}
                            onChange={(e) => setBulkStartTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Time</option>
                            {timeOptions.map((time) => (
                              <option key={time.value} value={time.value}>
                                {time.display}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Bulk End Time</Label>
                          <select
                            value={bulkEndTime}
                            onChange={(e) => setBulkEndTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Time</option>
                            {timeOptions.map((time) => (
                              <option key={time.value} value={time.value}>
                                {time.display}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Bulk Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={applyBulkTiming}
                          disabled={selectedDays.length === 0 || !bulkStartTime || !bulkEndTime}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          Apply to Selected Days ({selectedDays.length})
                        </Button>
                        <Button
                          type="button"
                          onClick={closeAllDays}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200"
                        >
                          Close All Days
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Individual Day Schedule */}
                <div className="grid gap-4">
                  {weekdays.map((day) => (
                    <div key={day} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-all duration-200">
                      <span className="w-20 font-medium text-gray-700 text-sm">{day}</span>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col">
                          <label className="text-xs text-gray-500 mb-1">Start Time</label>
                          <select
                            value={structuredOpeningHours[day]?.start || ''}
                            onChange={(e) => handleOpeningHoursChange(day, 'start', e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          >
                            <option value="">Closed</option>
                            {timeOptions.map((time) => (
                              <option key={time.value} value={time.value}>
                                {time.display}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-gray-400 text-sm mt-6">to</span>
                        <div className="flex flex-col">
                          <label className="text-xs text-gray-500 mb-1">End Time</label>
                          <select
                            value={structuredOpeningHours[day]?.end || ''}
                            onChange={(e) => handleOpeningHoursChange(day, 'end', e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            disabled={!structuredOpeningHours[day]?.start}
                          >
                            <option value="">Closed</option>
                            {timeOptions.map((time) => (
                              <option key={time.value} value={time.value}>
                                {time.display}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {structuredOpeningHours[day]?.start && structuredOpeningHours[day]?.end && (
                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          Open
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Submit Button */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="px-6 py-3"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-[1.02] rounded-xl min-w-[150px]"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-5 h-5" />
                      Update Range
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
}