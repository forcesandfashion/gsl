import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Trash2, Calendar, Clock, Users, MapPin, IndianRupee, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/firebase/auth";
import { db, storage } from "@/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

interface Event {
  id: string;
  name: string;
  rangeId: string;
  description: string;
  date: string;
  time: string;
  location: string;
  entryfees: string;
  availableseats: string;
  image: string;
  images?: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface FormData {
  name: string;
  description: string;
  entryfees: string;
  availableseats: string;
  location: string;
  date: string;
  time: string;
  existingImages: string[]; // URLs of images already uploaded
  newImages: File[]; // New files to upload
  newImageUrls: string[]; // Preview URLs for new images
  imagesToDelete: string[]; // URLs of images to delete
}

interface UploadProgress {
  [key: string]: number;
}

export default function EditEventModal({ isOpen, onClose, event }: EditEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    entryfees: "",
    availableseats: "",
    location: "",
    date: "",
    time: "",
    existingImages: [],
    newImages: [],
    newImageUrls: [],
    imagesToDelete: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Initialize form data when event changes
  useEffect(() => {
    if (event && isOpen) {
      setFormData({
        name: event.name || "",
        description: event.description || "",
        entryfees: event.entryfees || "",
        availableseats: event.availableseats || "",
        location: event.location || "",
        date: event.date || "",
        time: event.time || "",
        existingImages: event.images || (event.image ? [event.image] : []),
        newImages: [],
        newImageUrls: [],
        imagesToDelete: []
      });
      setErrors({});
      setUploadProgress({});
    }
  }, [event, isOpen]);

  // Clean up preview URLs when modal closes
  useEffect(() => {
    if (!isOpen) {
      formData.newImageUrls.forEach(url => URL.revokeObjectURL(url));
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) newErrors.name = "Event name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.entryfees.trim()) newErrors.entryfees = "Entry fees is required";
    if (!formData.availableseats.trim()) newErrors.availableseats = "Available seats is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.time) newErrors.time = "Time is required";
    
    // Validate numeric fields
    if (formData.entryfees && isNaN(Number(formData.entryfees))) {
      newErrors.entryfees = "Entry fees must be a valid number";
    }
    if (formData.availableseats && isNaN(Number(formData.availableseats))) {
      newErrors.availableseats = "Available seats must be a valid number";
    }
    
    // For editing, allow past dates if the event was already in the past
    const eventDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    if (eventDate < today) {
      // Only show warning if this is a new date change
      const originalDate = new Date(event.date);
      if (eventDate.getTime() !== originalDate.getTime()) {
        newErrors.date = "Event date should not be changed to a past date";
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

  // Delete image from Firebase Storage
  const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting image:", error);
      // Don't throw error for deletion failures as the main update should still proceed
    }
  };

  // Upload all new images to storage
  const uploadAllNewImages = async (files: File[], eventName: string): Promise<string[]> => {
    if (!user) throw new Error("User not authenticated");
    
    const uploadPromises = files.map(async (file, index) => {
      const fileName = generateFileName(file.name, user.uid, eventName);
      setUploadProgress(prev => ({ ...prev, [`new_image_${index}`]: 0 }));
      
      try {
        const url = await uploadImageToStorage(file, fileName);
        setUploadProgress(prev => ({ ...prev, [`new_image_${index}`]: 100 }));
        return url;
      } catch (error) {
        setUploadProgress(prev => ({ ...prev, [`new_image_${index}`]: -1 }));
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
        newImages: [...prev.newImages, ...validFiles],
        newImageUrls: [...prev.newImageUrls, ...newImageUrls]
      }));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeExistingImage = (imageUrl: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index),
      imagesToDelete: [...prev.imagesToDelete, imageUrl]
    }));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(formData.newImageUrls[index]);
    
    setFormData(prev => ({
      ...prev,
      newImages: prev.newImages.filter((_, i) => i !== index),
      newImageUrls: prev.newImageUrls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to edit the event",
        variant: "destructive"
      });
      return;
    }

    // Check if user owns this event
    if (event.userId !== user.uid) {
      toast({
        title: "Permission Denied",
        description: "You can only edit your own events",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let newImageUrls: string[] = [];
      
      // Upload new images if any
      if (formData.newImages.length > 0) {
        toast({
          title: "Uploading Images",
          description: `Uploading ${formData.newImages.length} new image(s)...`,
        });

        newImageUrls = await uploadAllNewImages(formData.newImages, formData.name);
        
        toast({
          title: "Images Uploaded",
          description: "New images uploaded successfully!",
        });
      }

      // Delete removed images from storage
      if (formData.imagesToDelete.length > 0) {
        toast({
          title: "Cleaning Up",
          description: "Removing deleted images...",
        });

        await Promise.all(
          formData.imagesToDelete.map(imageUrl => deleteImageFromStorage(imageUrl))
        );
      }

      // Combine existing images and new image URLs
      const allImageUrls = [...formData.existingImages, ...newImageUrls];

      // Prepare updated event data
      const updatedEventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        date: formData.date,
        time: formData.time,
        location: formData.location.trim(),
        entryfees: formData.entryfees,
        availableseats: formData.availableseats,
        image: allImageUrls[0] || "", // Primary image URL
        images: allImageUrls, // All image URLs
        updatedAt: new Date().toISOString(),
      };

      // Update document in Firestore
      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, updatedEventData);
      
      toast({
        title: "Event Updated!",
        description: `Event "${formData.name}" has been updated successfully`,
        variant: "default"
      });
      
      // Clean up preview URLs
      formData.newImageUrls.forEach(url => URL.revokeObjectURL(url));
      
      onClose();
      
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayDate = () => {
    return format(new Date(), "yyyy-MM-dd");
  };

  const totalImages = formData.existingImages.length + formData.newImages.length;

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
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Event</h2>
            <p className="text-sm text-gray-500 mt-1">Update your event details</p>
          </div>
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

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Event Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Event Time *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.time ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
            </div>
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

          {/* Image Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="inline w-4 h-4 mr-1" />
              Event Images (Up to 50MB each)
            </label>

            {/* Existing Images */}
            {formData.existingImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current Images ({formData.existingImages.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.existingImages.map((imageUrl, index) => (
                    <div key={`existing-${index}`} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Existing event image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(imageUrl, index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {index === 0 && formData.newImages.length === 0 && (
                        <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add New Images */}
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
              <p className="text-gray-600 mb-2">Add more event images</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                disabled={isLoading}
              >
                Choose Images
              </button>
            </div>

            {/* New Images Preview */}
            {formData.newImages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">New Images to Upload ({formData.newImages.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.newImageUrls.map((imageUrl, index) => (
                    <div key={`new-${index}`} className="relative">
                      <img
                        src={imageUrl}
                        alt={`New event image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                        New
                      </span>
                      {index === 0 && formData.existingImages.length === 0 && (
                        <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1 rounded">
                          Primary
                        </span>
                      )}
                      {/* Upload progress indicator */}
                      {uploadProgress[`new_image_${index}`] !== undefined && uploadProgress[`new_image_${index}`] < 100 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-xs">
                            {uploadProgress[`new_image_${index}`] === -1 ? 'Error' : `${uploadProgress[`new_image_${index}`]}%`}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalImages === 0 && (
              <p className="text-sm text-gray-500 mt-2 italic">No images selected</p>
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
                Updating...
              </>
            ) : (
              'Update Event'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}