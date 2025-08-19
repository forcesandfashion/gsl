import { useState, useRef, useEffect } from "react";
import { db, storage } from "@/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  X, 
  ArrowLeft, 
  Upload, 
  Plus, 
  Clock, 
  ImageIcon,
  Video,
  Youtube,
  Crown,
  AlertCircle
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type WeeklyHours = {
  Monday: { start: string; end: string };
  Tuesday: { start: string; end: string };
  Wednesday: { start: string; end: string };
  Thursday: { start: string; end: string };
  Friday: { start: string; end: string };
  Saturday: { start: string; end: string };
  Sunday: { start: string; end: string };
};

interface Range {
  id: string;
  name: string;
  address: string;
  description: string;
  facilities: string;
  contactNumber: string;
  logoUrl: string;
  rangeImages: string[];
  videoUrl?: string;
  youtubeUrl?: string;
  status: string;
  pricePerHour?: string;
  latitude?: number;
  longitude?: number;
  maxBookingsPerSlot?: number;
  structuredOpeningHours?: WeeklyHours;
  ownerPremium?: boolean;
}

interface EditRangeProps {
  range: Range | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRange: Partial<Range>) => void;
  isPremium?: boolean; // User's current premium status
}

export default function EditRange({ range, isOpen, onClose, onUpdate, isPremium = false }: EditRangeProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: range?.name || "",
    address: range?.address || "",
    contactNumber: range?.contactNumber || "",
    description: range?.description || "",
    facilities: range?.facilities || "",
    pricePerHour: range?.pricePerHour || "",
    latitude: range?.latitude || null,
    longitude: range?.longitude || null,
    logoUrl: range?.logoUrl || "",
    images: range?.rangeImages || [],
    videoUrl: range?.videoUrl || "",
    youtubeUrl: range?.youtubeUrl || "",
    status: range?.status || "active",
    structuredOpeningHours: range?.structuredOpeningHours || {
      Monday: { start: "", end: "" },
      Tuesday: { start: "", end: "" },
      Wednesday: { start: "", end: "" },
      Thursday: { start: "", end: "" },
      Friday: { start: "", end: "" },
      Saturday: { start: "", end: "" },
      Sunday: { start: "", end: "" },
    },
    maxBookingsPerSlot: range?.maxBookingsPerSlot || 5,
  });

  const [videoOption, setVideoOption] = useState<'youtube' | 'upload' | null>(
    range?.youtubeUrl ? 'youtube' : range?.videoUrl ? 'upload' : null
  );

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

  const MAX_FREE_IMAGES = 9;
  const MAX_FREE_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  // Update form when range prop changes
  useEffect(() => {
    if (range) {
      setForm({
        name: range.name || "",
        address: range.address || "",
        contactNumber: range.contactNumber || "",
        description: range.description || "",
        facilities: range.facilities || "",
        pricePerHour: range.pricePerHour || "",
        latitude: range.latitude || null,
        longitude: range.longitude || null,
        logoUrl: range.logoUrl || "",
        images: range.rangeImages || [],
        videoUrl: range.videoUrl || "",
        youtubeUrl: range.youtubeUrl || "",
        status: range.status || "active",
        structuredOpeningHours: range.structuredOpeningHours || {
          Monday: { start: "", end: "" },
          Tuesday: { start: "", end: "" },
          Wednesday: { start: "", end: "" },
          Thursday: { start: "", end: "" },
          Friday: { start: "", end: "" },
          Saturday: { start: "", end: "" },
          Sunday: { start: "", end: "" },
        },
        maxBookingsPerSlot: range.maxBookingsPerSlot || 5,
      });

      setVideoOption(
        range.youtubeUrl ? 'youtube' : range.videoUrl ? 'upload' : null
      );
    }
  }, [range]);

  // Image upload function
  const uploadImage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, `ranges/${range?.id}/${path}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  // Video upload function
  const uploadVideo = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `ranges/${range?.id}/videos/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImages(true);
    try {
      const url = await uploadImage(file, 'logo');
      setForm(prev => ({ ...prev, logoUrl: url }));
      toast({
        title: "Success",
        description: "Logo uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload logo.",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check image limit for free users
    if (!isPremium && form.images.length + files.length > MAX_FREE_IMAGES) {
      toast({
        title: "Upload Limit Reached",
        description: `Free users can upload maximum ${MAX_FREE_IMAGES} images. Upgrade to Premium for unlimited uploads.`,
        variant: "destructive",
      });
      return;
    }

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => uploadImage(file, 'gallery'));
      const urls = await Promise.all(uploadPromises);
      
      setForm(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
      
      toast({
        title: "Success",
        description: `${files.length} image(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload some images.",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check video size for free users
    if (!isPremium && file.size > MAX_FREE_VIDEO_SIZE) {
      toast({
        title: "File Size Limit",
        description: "Free users can upload videos up to 100MB. Upgrade to Premium for unlimited video sizes.",
        variant: "destructive",
      });
      return;
    }

    setUploadingVideo(true);
    try {
      const url = await uploadVideo(file);
      setForm(prev => ({ ...prev, videoUrl: url, youtubeUrl: "" }));
      toast({
        title: "Success",
        description: "Video uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload video.",
        variant: "destructive",
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'maxBookingsPerSlot' ? parseInt(value) || 5 : 
              name === 'latitude' || name === 'longitude' ? parseFloat(value) || null : value
    }));
  };

  const handleOpeningHoursChange = (day: string, field: 'start' | 'end', value: string) => {
    setForm(prev => ({
      ...prev,
      structuredOpeningHours: {
        ...prev.structuredOpeningHours,
        [day]: {
          ...prev.structuredOpeningHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleVideoOptionChange = (option: 'youtube' | 'upload') => {
    if (!isPremium && videoOption && videoOption !== option) {
      toast({
        title: "Premium Feature",
        description: "Free users can use only one video option at a time. Premium users can use both YouTube and video uploads.",
        variant: "destructive",
      });
      return;
    }

    setVideoOption(option);
    if (option === 'youtube') {
      setForm(prev => ({ ...prev, videoUrl: "" }));
    } else {
      setForm(prev => ({ ...prev, youtubeUrl: "" }));
    }
  };

  const toggleStatus = () => {
    setForm(prev => ({ 
      ...prev, 
      status: prev.status === 'active' ? 'inactive' : 'active' 
    }));
  };

  const removeLogo = () => {
    setForm(prev => ({ ...prev, logoUrl: "" }));
  };

  const removeGalleryImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeVideo = () => {
    setForm(prev => ({ ...prev, videoUrl: "" }));
    setVideoOption(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!range) return;

    setUpdating(true);
    try {
      const rangeRef = doc(db, "ranges", range.id);
      const updateData = {
        name: form.name,
        address: form.address,
        description: form.description,
        facilities: form.facilities,
        structuredOpeningHours: form.structuredOpeningHours,
        maxBookingsPerSlot: form.maxBookingsPerSlot,
        contactNumber: form.contactNumber,
        logoUrl: form.logoUrl,
        rangeImages: form.images,
        videoUrl: form.videoUrl || null,
        youtubeUrl: form.youtubeUrl || null,
        pricePerHour: form.pricePerHour,
        latitude: form.latitude,
        longitude: form.longitude,
        status: form.status,
        updatedAt: new Date()
      };

      await updateDoc(rangeRef, updateData);
      
      onUpdate(updateData);
      onClose();
      
      toast({
        title: "Success",
        description: "Range updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update range.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen || !range) return null;

  return (
    <>
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleGalleryUpload}
        accept="image/*"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoUpload}
        accept="video/*"
        className="hidden"
      />

      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-start p-4 overflow-auto backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mt-8 mb-8">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
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
              {isPremium && (
                <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  <Crown className="w-3 h-3" />
                  Premium
                </div>
              )}
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

          {/* Modal Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Range Name</label>
                <Input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange}
                  placeholder="Enter range name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Contact Number</label>
                <Input 
                  name="contactNumber" 
                  value={form.contactNumber} 
                  onChange={handleChange}
                  placeholder="Enter contact number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Address</label>
              <Input 
                name="address" 
                value={form.address} 
                onChange={handleChange}
                placeholder="Enter full address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Latitude</label>
                <Input 
                  name="latitude" 
                  type="number"
                  step="any"
                  value={form.latitude || ""} 
                  onChange={handleChange}
                  placeholder="Enter latitude"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Longitude</label>
                <Input 
                  name="longitude" 
                  type="number"
                  step="any"
                  value={form.longitude || ""} 
                  onChange={handleChange}
                  placeholder="Enter longitude"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea 
                name="description" 
                value={form.description} 
                onChange={handleChange}
                rows={3}
                placeholder="Describe your shooting range"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Facilities</label>
              <Textarea 
                name="facilities" 
                value={form.facilities} 
                onChange={handleChange}
                rows={3}
                placeholder="List available facilities"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Price Per Hour</label>
                <Input 
                  name="pricePerHour" 
                  value={form.pricePerHour} 
                  onChange={handleChange}
                  placeholder="Enter price per hour"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Bookings Per Slot</label>
                <Input 
                  type="number"
                  name="maxBookingsPerSlot" 
                  min="1"
                  value={form.maxBookingsPerSlot} 
                  onChange={handleChange}
                  placeholder="Max bookings per hour slot"
                />
              </div>
            </div>

            {/* Logo Section */}
            <div className="border border-green-200 p-4 rounded-xl shadow-sm bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Logo</label>
                <Button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingImages}
                  className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1"
                >
                  {uploadingImages ? <LoadingSpinner /> : <><Upload className="w-3 h-3 mr-1" /> Upload</>}
                </Button>
              </div>
              {form.logoUrl && (
                <div className="relative inline-block">
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    className="w-24 h-24 object-cover rounded-full border border-gray-200"
                  />
                  <Button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Gallery Images Section */}
            <div className="border border-purple-200 p-4 rounded-xl shadow-sm bg-purple-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Gallery Images</label>
                  {!isPremium && (
                    <span className="text-xs text-gray-500">
                      ({form.images.length}/{MAX_FREE_IMAGES})
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingImages || (!isPremium && form.images.length >= MAX_FREE_IMAGES)}
                  className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1 disabled:opacity-50"
                >
                  {uploadingImages ? <LoadingSpinner /> : <><Plus className="w-3 h-3 mr-1" /> Add Images</>}
                </Button>
              </div>
              
              {!isPremium && form.images.length >= MAX_FREE_IMAGES && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700">
                    Free users can upload maximum {MAX_FREE_IMAGES} images. Upgrade to Premium for unlimited uploads.
                  </span>
                </div>
              )}

              {form.images.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {form.images.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <Button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Section */}
            <div className="border border-blue-200 p-4 rounded-xl shadow-sm bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-500" />
                  Video Content
                </label>
                {!isPremium && (
                  <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
                    Choose one option
                  </span>
                )}
              </div>

              {/* Video Option Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  onClick={() => handleVideoOptionChange('youtube')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all ${
                    videoOption === 'youtube' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Youtube className="w-3 h-3" />
                  YouTube Link
                </Button>
                <Button
                  type="button"
                  onClick={() => handleVideoOptionChange('upload')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all ${
                    videoOption === 'upload' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  Upload Video {!isPremium && '(max 100MB)'}
                </Button>
              </div>

              {/* YouTube URL Input */}
              {videoOption === 'youtube' && (
                <div className="space-y-2">
                  <Input
                    name="youtubeUrl"
                    value={form.youtubeUrl}
                    onChange={handleChange}
                    placeholder="Enter YouTube video URL"
                    className="bg-white"
                  />
                </div>
              )}

              {/* Video Upload */}
              {videoOption === 'upload' && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-2"
                  >
                    {uploadingVideo ? <LoadingSpinner /> : <><Upload className="w-3 h-3 mr-1" /> Choose Video</>}
                  </Button>
                  
                  {form.videoUrl && (
                    <div className="relative">
                      <video
                        src={form.videoUrl}
                        controls
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <Button
                        type="button"
                        onClick={removeVideo}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Premium Feature Notice */}
              {!isPremium && (
                <div className="mt-3 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700 font-medium">
                      Premium users can use both YouTube links and video uploads simultaneously
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Opening Hours */}
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
                          value={form.structuredOpeningHours[day]?.start || ''}
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
                          value={form.structuredOpeningHours[day]?.end || ''}
                          onChange={(e) => handleOpeningHoursChange(day, 'end', e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          disabled={!form.structuredOpeningHours[day]?.start}
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

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">Range Status</span>
                <p className="text-xs text-gray-500 mt-1">
                  {form.status === 'active' ? 'Range is visible to customers' : 'Range is hidden from customers'}
                </p>
              </div>
              <Button
                type="button"
                onClick={toggleStatus}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
                  form.status === 'active' 
                    ? "bg-green-500 hover:bg-green-600 text-white" 
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {form.status === 'active' ? 'Active' : 'Inactive'}
              </Button>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updating || uploadingImages || uploadingVideo}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 text-white min-w-[120px]"
              >
                {updating ? (
                  <LoadingSpinner />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}