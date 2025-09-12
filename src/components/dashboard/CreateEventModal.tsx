import React, { useState, useRef } from "react";
import { X, Upload, Trash2, Calendar, Clock, Users, MapPin, IndianRupee, Image as ImageIcon, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { db, storage } from "@/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  rangeId: string;
}

interface Event {
  id: string;
  name: string;
  rangeId: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  entryfees: string;
  availableseats: string;
  currentParticipants: number;
  image: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  description: string;
  entryfees: string;
  availableseats: string;
  currentParticipants: number;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  images: File[];
  imageUrls: string[]; // Preview URLs for display
}

interface UploadProgress {
  [key: string]: number;
}

export default function CreateEventModal({ isOpen, onClose, title, rangeId }: CreateEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    entryfees: "",
    availableseats: "",
    currentParticipants: 0,
    location: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    images: [],
    imageUrls: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) newErrors.name = "Event name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.entryfees.trim()) newErrors.entryfees = "Entry fees is required";
    if (!formData.availableseats.trim()) newErrors.availableseats = "Available seats is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (!formData.startTime) newErrors.startTime = "Start time is required";
    
    // Validate numeric fields
    if (formData.entryfees && isNaN(Number(formData.entryfees))) {
      newErrors.entryfees = "Entry fees must be a valid number";
    }
    if (formData.availableseats && isNaN(Number(formData.availableseats))) {
      newErrors.availableseats = "Available seats must be a valid number";
    }
    
    // Validate dates
    if (formData.startDate && new Date(formData.startDate) < new Date()) {
      newErrors.startDate = "Start date should be in the future";
    }
    
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate < startDate) {
        newErrors.endDate = "End date cannot be before start date";
      }
    }
    
    // Validate times for same day events
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      const isSameDay = formData.startDate === formData.endDate;
      if (isSameDay && formData.endTime <= formData.startTime) {
        newErrors.endTime = "End time must be after start time for same-day events";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }

    // Auto-set end date if start date is selected and end date is empty
    if (field === 'startDate' && value && !formData.endDate) {
      setFormData(prev => ({
        ...prev,
        endDate: value
      }));
    }
  };

  // Generate unique filename
  const generateFileName = (originalName: string, userId: string, eventName: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const cleanEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    return `events/${userId}/${cleanEventName}_${timestamp}_${random}.${extension}`;
  };

  // Upload single image to Firebase Storage
  const uploadImageToStorage = async (file: File, fileName: string): Promise<string> => {
    const storageRef = ref(storage, fileName);
    
    try {
      const uploadTask = uploadBytes(storageRef, file);
      const snapshot = await uploadTask;
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error(`Failed to upload ${file.name}`);
    }
  };

  // Upload all images to storage
  const uploadAllImages = async (files: File[], eventName: string): Promise<string[]> => {
    if (!user) throw new Error("User not authenticated");
    
    const uploadPromises = files.map(async (file, index) => {
      const fileName = generateFileName(file.name, user.uid, eventName);
      setUploadProgress(prev => ({ ...prev, [`image_${index}`]: 0 }));
      
      try {
        const url = await uploadImageToStorage(file, fileName);
        setUploadProgress(prev => ({ ...prev, [`image_${index}`]: 100 }));
        return url;
      } catch (error) {
        setUploadProgress(prev => ({ ...prev, [`image_${index}`]: -1 })); // -1 indicates error
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const newImageUrls: string[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 50MB. Please choose a smaller file for better performance.`,
            variant: "destructive"
          });
          return;
        }

        validFiles.push(file);
        const previewUrl = URL.createObjectURL(file);
        newImageUrls.push(previewUrl);
      } else {
        toast({
          title: "Invalid File",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        });
      }
    });

    if (validFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles],
        imageUrls: [...prev.imageUrls, ...newImageUrls]
      }));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(formData.imageUrls[index]);
    
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create an event",
        variant: "destructive"
      });
      return;
    }
    
    if (!rangeId) {
      toast({
        title: "Error",
        description: "Range ID is missing",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let imageUrls: string[] = [];
      
      if (formData.images.length > 0) {
        toast({
          title: "Uploading Images",
          description: `Uploading ${formData.images.length} image(s)...`,
        });

        imageUrls = await uploadAllImages(formData.images, formData.name);
        
        toast({
          title: "Images Uploaded",
          description: "All images uploaded successfully!",
        });
      }

      // Prepare event data for Firestore
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        rangeId: rangeId,
        userId: user.uid,
        userEmail: user.email || "",
        userName: user.displayName || user.email?.split('@')[0] || "Unknown",
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime || formData.startTime, // Default to start time if not provided
        location: formData.location.trim(),
        entryfees: formData.entryfees,
        availableseats: formData.availableseats,
        participants: 0,
        image: imageUrls[0] || "", // Primary image URL
        images: imageUrls, // All image URLs
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Legacy fields for backward compatibility
        date: formData.startDate,
        time: formData.startTime,
      };

      const docRef = await addDoc(collection(db, "events"), eventData);
      
      toast({
        title: "Event Created!",
        description: `Event "${formData.name}" has been created successfully`,
        variant: "default"
      });
      
      // Clean up preview URLs
      formData.imageUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        entryfees: "",
        availableseats: "",
        currentParticipants: 0,
        location: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        images: [],
        imageUrls: []
      });
      setUploadProgress({});
      
      onClose();
      
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayDate = () => {
    return format(new Date(), "yyyy-MM-dd");
  };

  const calculateEventDuration = () => {
    if (!formData.startDate || !formData.endDate) return "";
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    
    if (diffDays === 1) return "Single day event";
    return `${diffDays} days event`;
  };

  // Clean up preview URLs on unmount
  React.useEffect(() => {
    return () => {
      formData.imageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Box */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-10 m-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              placeholder="Enter event name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Description *
            </label>
            <textarea
              placeholder="Describe your event..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Date Range Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Event Schedule
            </h3>
            
            {/* Start and End Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange("startDate", e.target.value)}
                  min={getTodayDate()}
                  className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startDate ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                  min={formData.startDate || getTodayDate()}
                  className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endDate ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
              </div>
            </div>

            {/* Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange("startTime", e.target.value)}
                  className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startTime ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  End Time (Optional)
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                  className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endTime ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>}
                <p className="text-xs text-gray-500 mt-1">Leave empty if event runs all day or time is flexible</p>
              </div>
            </div>

            {/* Event Duration Display */}
            {formData.startDate && formData.endDate && (
              <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-700">
                <strong>Duration:</strong> {calculateEventDuration()}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Location *
            </label>
            <input
              type="text"
              placeholder="Event location/venue"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.location ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>

          {/* Entry Fees and Available Seats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <IndianRupee className="inline w-4 h-4 mr-1" />
                Entry Fees (₹) *
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.entryfees}
                onChange={(e) => handleInputChange("entryfees", e.target.value)}
                min="0"
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.entryfees ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {errors.entryfees && <p className="text-red-500 text-sm mt-1">{errors.entryfees}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Available Seats *
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.availableseats}
                onChange={(e) => handleInputChange("availableseats", e.target.value)}
                min="1"
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.availableseats ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {errors.availableseats && <p className="text-red-500 text-sm mt-1">{errors.availableseats}</p>}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="inline w-4 h-4 mr-1" />
              Event Images (Optional - Up to 50MB each)
            </label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
                disabled={isLoading}
              />
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 mb-2">Click to upload event images</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                disabled={isLoading}
              >
                Choose Images
              </button>
            </div>

            {/* Image Preview */}
            {formData.imageUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Selected Images ({formData.imageUrls.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.imageUrls.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Event image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                          Primary
                        </span>
                      )}
                      {/* Upload progress indicator */}
                      {uploadProgress[`image_${index}`] !== undefined && uploadProgress[`image_${index}`] < 100 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-xs">
                            {uploadProgress[`image_${index}`] === -1 ? 'Error' : `${uploadProgress[`image_${index}`]}%`}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-8 space-x-3 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 min-w-[120px] justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}