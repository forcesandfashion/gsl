import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { db, storage } from "@/firebase/config";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Info, List, Clock, Phone, Image as ImageIcon, Type, DollarSign, Navigation, Video, Crown } from "lucide-react";

// Add your Google Maps API key here
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API;// Replace with your actual API key

interface RangeFormData {
  name: string;
  address: string;
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
  // other fields...
}

export default function RangeListingForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);
  
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
  
  // Video states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  
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
  
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Time options for dropdown (every 30 minutes) - same as modal
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

  // Check if user is premium
  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!user) return;
      
      try {
        setPremiumLoading(true);
        const ownerDoc = await getDoc(doc(db, "range-owners", user.uid));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data() as RangeOwner;
          setIsPremium(ownerData.premium || false);
        }
      } catch (error) {
        console.error("Error checking premium status:", error);
        setIsPremium(false);
      } finally {
        setPremiumLoading(false);
      }
    };

    checkPremiumStatus();
  }, [user]);

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

  // Handle opening hours change - same as modal
  const handleOpeningHoursChange = (day: string, field: 'start' | 'end', value: string) => {
    setStructuredOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
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

  const handleRangeImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Free users: 9 max, Premium users: unlimited
    if (!isPremium) {
      const currentCount = rangeImageFiles.length;
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

  const handleRemoveRangeImage = (idx: number) => {
    const newImages = rangeImages.filter((_, i) => i !== idx);
    const newFiles = rangeImageFiles.filter((_, i) => i !== idx);
    setRangeImages(newImages);
    setRangeImageFiles(newFiles);
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
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a range listing",
        variant: "destructive"
      });
      return;
    }

    // Validate premium restrictions
    if (!isPremium) {
      if (rangeImageFiles.length > 9) {
        toast({
          title: "Image Limit Exceeded",
          description: "Free users can upload maximum 9 images. Upgrade to premium for unlimited images.",
          variant: "destructive"
        });
        return;
      }
      
      if (videoFile && youtubeUrl) {
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
      let logoUrl = "";
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, `ranges/${user.uid}/logo/${Date.now()}_${logoFile.name}`);
      }

      let mainImageUrl = "";
      if (imageFile) {
        mainImageUrl = await uploadFile(imageFile, `ranges/${user.uid}/main/${Date.now()}_${imageFile.name}`);
      }

      const rangeImageUrls: string[] = [];
      for (let i = 0; i < rangeImageFiles.length; i++) {
        const file = rangeImageFiles[i];
        const url = await uploadFile(file, `ranges/${user.uid}/gallery/${Date.now()}_${i}_${file.name}`);
        rangeImageUrls.push(url);
      }

      let videoUrl = "";
      if (videoFile && isPremium) {
        videoUrl = await uploadFile(videoFile, `ranges/${user.uid}/video/${Date.now()}_${videoFile.name}`);
      }

      const rangeData = {
        name: formData.name,
        address: formData.address,
        description: formData.description,
        facilities: formData.facilities,
        structuredOpeningHours: structuredOpeningHours,
        maxBookingsPerSlot: maxBookingsPerSlot,
        contactNumber: formData.contactNumber,
        logoUrl: logoUrl,
        rangeImages: rangeImageUrls,
        videoUrl: videoUrl || null,
        youtubeUrl: youtubeUrl || null,
        pricePerHour: formData.pricePerHour,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        ownerId: user.uid,
        ownerEmail: user.email,
        ownerPremium: isPremium,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "active"
      };

      const docRef = await addDoc(collection(db, "ranges"), rangeData);

      toast({
        title: "Success",
        description: `Range listing created successfully with ID: ${docRef.id}`,
      });

      // Reset form
      setFormData({
        name: "",
        address: "",
        description: "",
        facilities: "",
        contactNumber: "",
        pricePerHour: 0,
        latitude: undefined,
        longitude: undefined
      });
      setImageFile(null);
      setImagePreview(null);
      setLogo(null);
      setLogoFile(null);
      setRangeImages([]);
      setRangeImageFiles([]);
      setVideoFile(null);
      setVideoPreview(null);
      setYoutubeUrl("");
      setGeocodingError(null);

    } catch (error) {
      console.error("Error creating range listing:", error);
      toast({
        title: "Error",
        description: "Failed to create range listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (premiumLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your account details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="rounded-2xl shadow-2xl bg-gradient-to-br from-white via-blue-50 to-purple-50 p-8 border border-blue-100">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold mb-4 flex items-center justify-center gap-2">
            <List className="w-7 h-7 text-blue-500" /> Create Range Listing
          </h2>
          
          {/* Premium Status Display */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
            isPremium 
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}>
            <Crown className="w-4 h-4" />
            {isPremium ? 'Premium Account' : 'Free Account'}
          </div>
          
          {!isPremium && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Free Account Limits:</strong> 9 images max, 1 YouTube link OR 1 video upload (max 100MB)
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Upgrade to Premium for unlimited images and direct video uploads up to 500MB
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload Section */}
          <div className="flex flex-col items-center mb-6">
            {logo ? (
              <img src={logo} alt="Range Logo" className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 shadow mb-2" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-2">
                No Logo
              </div>
            )}
            <input
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              ref={logoInputRef}
              onChange={handleLogoChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                onClick={() => logoInputRef.current?.click()}
              >
                {logo ? "Change Logo" : "Upload Logo"}
              </button>
              {logo && (
                <button
                  type="button"
                  className="px-3 py-2 bg-red-400 text-white rounded-lg shadow hover:bg-red-500 transition"
                  onClick={handleRemoveLogo}
                >
                  Remove
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 mt-1">Max size: 2MB | PNG, JPG, or SVG recommended</span>
          </div>
          
          {/* Basic Fields */}
          <div>
            <Label htmlFor="name" className="flex items-center gap-2 font-semibold">
              <Type className="w-4 h-4 text-blue-400" /> Range Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
            />
          </div>

          <div>
            <Label htmlFor="address" className="flex items-center gap-2 font-semibold">
              <MapPin className="w-4 h-4 text-green-400" /> Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={handleAddressChange}
              required
              className="mt-1 focus:ring-2 focus:ring-green-300 focus:border-green-400 transition"
              placeholder="Enter the complete address"
            />
            
            {/* Coordinates Display */}
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Coordinates</span>
                {geocodingLoading && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              
              {formData.latitude && formData.longitude ? (
                <div className="text-sm text-green-600">
                  <div>Latitude: {formData.latitude.toFixed(6)}</div>
                  <div>Longitude: {formData.longitude.toFixed(6)}</div>
                </div>
              ) : geocodingError ? (
                <div className="text-sm text-red-500">
                  {geocodingError} (You can still create the range without coordinates)
                </div>
              ) : formData.address.trim() && !geocodingLoading ? (
                <div className="text-sm text-yellow-600">
                  Coordinates not found (You can still create the range)
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Enter an address to get coordinates automatically
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 text-purple-400" /> Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="mt-1 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
            />
          </div>

          <div>
            <Label htmlFor="facilities" className="flex items-center gap-2 font-semibold">
              <List className="w-4 h-4 text-pink-400" /> Facilities
            </Label>
            <Textarea
              id="facilities"
              value={formData.facilities}
              onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
              placeholder="List available facilities..."
              required
              className="mt-1 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition"
            />
          </div>

          <div>
            <Label htmlFor="pricePerHour" className="flex items-center gap-2 font-semibold">
              <DollarSign className="w-4 h-4 text-green-500" /> Price Per Hour
            </Label>
            <Input
              id="pricePerHour"
              type="number"
              min={0}
              step="0.01"
              value={formData.pricePerHour}
              onChange={(e) => setFormData({ ...formData, pricePerHour: parseFloat(e.target.value) || 0 })}
              required
              className="mt-1 focus:ring-2 focus:ring-green-300 focus:border-green-400 transition"
              placeholder="Enter hourly rate"
            />
          </div>

          <div>
            <Label htmlFor="contactNumber" className="flex items-center gap-2 font-semibold">
              <Phone className="w-4 h-4 text-indigo-400" /> Contact Number
            </Label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              required
              className="mt-1 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
            />
          </div>

          {/* Range Images Section */}
          <div>
            <Label htmlFor="rangeImages" className="flex items-center gap-2 font-semibold">
              <ImageIcon className="w-4 h-4 text-orange-400" /> 
              Range Images 
              <span className="text-sm font-normal text-gray-500">
                ({rangeImageFiles.length}/{isPremium ? '∞' : '9'} images)
              </span>
            </Label>
            <Input
              id="rangeImages"
              type="file"
              accept="image/*"
              multiple
              onChange={handleRangeImagesChange}
              className="mt-1 focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
              disabled={!isPremium && rangeImageFiles.length >= 9}
            />
            
            {rangeImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {rangeImages.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img}
                      alt={`Range ${idx + 1}`}
                      className="w-24 h-20 object-cover rounded-lg border border-gray-200 shadow"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      onClick={() => handleRemoveRangeImage(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Section */}
          <div className="border border-purple-200 p-4 rounded-xl shadow-sm bg-gradient-to-r from-purple-50 to-pink-50">
            <Label className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Video className="w-5 h-5 text-purple-500" /> Video Content
              {!isPremium && <span className="text-sm font-normal text-gray-500">(Choose one option)</span>}
            </Label>
            
            {/* YouTube URL Input */}
            <div className="mb-4">
              <Label htmlFor="youtubeUrl" className="text-sm font-medium text-gray-700 mb-2 block">
                YouTube Video URL
              </Label>
              <Input
                id="youtubeUrl"
                type="url"
                value={youtubeUrl}
                onChange={handleYouTubeUrlChange}
                placeholder="https://www.youtube.com/watch?v=..."
                className="focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
                disabled={!isPremium && videoFile !== null}
              />
              {youtubeUrl && !validateYouTubeUrl(youtubeUrl) && (
                <p className="text-red-500 text-sm mt-1">Please enter a valid YouTube URL</p>
              )}
            </div>

            {/* Video Upload (Premium users or if no YouTube URL for free users) */}
            {(isPremium || (!isPremium && !youtubeUrl)) && (
              <div>
                <Label htmlFor="videoFile" className="text-sm font-medium text-gray-700 mb-2 block">
                  Upload Video File
                  {!isPremium && <span className="text-xs text-gray-500 ml-2">(Max 100MB for free users)</span>}
                  {isPremium && <span className="text-xs text-green-600 ml-2">(Max 500MB for premium users)</span>}
                </Label>
                <Input
                  id="videoFile"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
                />
                
                {videoPreview && (
                  <div className="mt-3">
                    <video 
                      src={videoPreview} 
                      controls 
                      className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 shadow"
                    />
                    <button
                      type="button"
                      className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                      onClick={handleRemoveVideo}
                    >
                      Remove Video
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isPremium && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                  <strong>Free users:</strong> Choose either YouTube URL OR video upload, not both. 
                  Upgrade to Premium to use both options and upload larger videos.
                </p>
              </div>
            )}
          </div>

          {/* Opening Hours - Modal Style */}
          <div className="border border-orange-200 p-4 rounded-xl shadow-sm bg-orange-50">
            <label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Weekly Opening Hours
            </label>
            <div className="space-y-3">
              {weekdays.map((day) => (
                <div key={day} className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
                  <span className="w-24 font-medium text-gray-700 text-sm">{day}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">Start Time</label>
                      <select
                        value={structuredOpeningHours[day]?.start || ''}
                        onChange={(e) => handleOpeningHoursChange(day, 'start', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label htmlFor="maxSlots" className="flex items-center gap-2 font-semibold">
              <Clock className="w-4 h-4 text-red-400" /> Max Bookings Per Slot (per hour)
            </Label>
            <Input
              id="maxSlots"
              type="number"
              min={1}
              value={maxBookingsPerSlot}
              onChange={(e) => setMaxBookingsPerSlot(Number(e.target.value))}
              required
              className="mt-1 focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:from-purple-500 hover:to-blue-500 transition"
          >
            {loading ? "Creating..." : "Create Range Listing"}
          </Button>
        </form>
      </div>
    </div>
  );
}