import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Edit, 
  Trash2, 
  Plus, 
  Eye,
  Star,
  Building,
  Image as ImageIcon,
  Calendar
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import EditRange from "../dashboard/EditRange";
import CreateEventModal from "./CreateEventModal";

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
  openingHours: string;
  structuredOpeningHours?: WeeklyHours;
  contactNumber: string;
  logoUrl: string;
  rangeImages: string[];
  ownerId: string;
  ownerEmail: string;
  createdAt: any;
  updatedAt: any;
  status: string;
  price?: string;
  rating?: number;
  maxBookingsPerSlot?: number;
}

export default function RangeListOwners() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ranges, setRanges] = useState<Range[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editingRange, setEditingRange] = useState<Range | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null); // Add this state
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Get display time for range card
  const getDisplayTime = (range: Range) => {
    if (range.structuredOpeningHours) {
      // Find the first day that has operating hours
      for (const day of weekdays) {
        const hours = range.structuredOpeningHours[day];
        if (hours && hours.start && hours.end) {
          const startTime = new Date(`2000-01-01T${hours.start}:00`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          const endTime = new Date(`2000-01-01T${hours.end}:00`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          return `${startTime} - ${endTime}`;
        }
      }
      return "Hours not set";
    }
    return range.openingHours || "Hours not available";
  };

  // Fetch ranges owned by current user
  const fetchRanges = async () => {
    if (!user) return;
    
    try {
      console.log("Fetching ranges for user:", user.uid);
      const rangesRef = collection(db, "ranges");
      const q = query(
        rangesRef, 
        where("ownerId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const rangesData: Range[] = [];
      querySnapshot.forEach((doc) => {
        console.log("Found range:", doc.id, doc.data());
        rangesData.push({
          id: doc.id,
          ...doc.data()
        } as Range);
      });
      
      console.log("Total ranges found:", rangesData.length);
      setRanges(rangesData);
    } catch (error) {
      console.error("Error fetching ranges:", error);
      toast({
        title: "Error",
        description: `Failed to load ranges: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle create event button click
  const handleCreateEventClick = (rangeId: string) => {
    setSelectedRangeId(rangeId);
    setCreateModal(true);
  };

  // Handle create event modal close
  const handleCreateEventModalClose = () => {
    setCreateModal(false);
    setSelectedRangeId(null);
  };

  // Handle edit button click
  const handleEditClick = (range: Range) => {
    setEditingRange(range);
    setShowEditModal(true);
  };

  // Handle range update from modal
  const handleRangeUpdate = (updatedData: Partial<Range>) => {
    if (!editingRange) return;
    
    setRanges(prev => prev.map(range => 
      range.id === editingRange.id 
        ? { ...range, ...updatedData }
        : range
    ));
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowEditModal(false);
    setEditingRange(null);
  };

  // Delete range
  const handleDelete = async (rangeId: string, rangeName: string) => {
    if (!confirm(`Are you sure you want to delete "${rangeName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(rangeId);
    try {
      await deleteDoc(doc(db, "ranges", rangeId));
      setRanges(ranges.filter(range => range.id !== rangeId));
      toast({
        title: "Success",
        description: "Range deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting range:", error);
      toast({
        title: "Error",
        description: "Failed to delete range. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    fetchRanges();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building className="w-8 h-8 text-blue-600" />
                My Shooting Ranges
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your shooting range listings and facilities
              </p>
            </div>
            <Link to="/dashboard/range-owner">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg transition-all duration-200 hover:scale-105">
                <Plus className="w-4 h-4 mr-2" />
                Add New Range
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {createModal && selectedRangeId && (
        <CreateEventModal
          isOpen={createModal}
          onClose={handleCreateEventModalClose}
          title="Create Event"
          rangeId={selectedRangeId} // Pass the selected range ID
        />
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ranges.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
              <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Ranges Yet</h3>
              <p className="text-gray-500 mb-6">
                Start by adding your first shooting range to begin managing your facilities.
              </p>
              <Link to="/dashboard/range-owner">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Range
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Ranges Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ranges.map((range) => (
              <Card key={range.id} className="group hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Range Image */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                  { (range.rangeImages && range.rangeImages.length > 0) ? (
                    <img
                      src={range.rangeImages[0]}
                      alt={range.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback when no image */}
                  <div className={`w-full h-full flex items-center justify-center ${
                    ( (range.rangeImages && range.rangeImages.length > 0)) ? 'hidden' : ''
                  }`}>
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No Image</p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <Badge 
                    className={`absolute top-3 right-3 ${
                      range.status === 'active' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gray-500 hover:bg-gray-600'
                    } text-white`}
                  >
                    {range.status?.charAt(0).toUpperCase() + range.status?.slice(1) || 'Active'}
                  </Badge>

                  {/* Logo Overlay */}
                  {range.logoUrl && (
                    <div className="absolute bottom-3 left-3">
                      <img
                        src={range.logoUrl}
                        alt={`${range.name} logo`}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Image count indicator */}
                  {((range.rangeImages && range.rangeImages.length > 1)) && (
                    <div className="absolute top-3 left-3 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
                      +{(range.rangeImages?.length || 1) - 1} more
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {range.name}
                  </CardTitle>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {range.address}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Description */}
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {range.description}
                  </p>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      {getDisplayTime(range)}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2 text-green-500" />
                      {range.contactNumber}
                    </div>
                  </div>

                  {/* Facilities Preview */}
                  {range.facilities && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 font-medium mb-1">Facilities:</p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {range.facilities}
                      </p>
                    </div>
                  )}

                  {/* Image Count */}
                  {( (range.rangeImages && range.rangeImages.length > 0)) && (
                    <div className="flex items-center text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      <ImageIcon className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="font-medium">{range.rangeImages?.length || 0}</span>
                      <span className="ml-1">gallery image{( range.rangeImages?.length || 0) > 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-purple-50 hover:border-purple-300"
                      onClick={() => handleCreateEventClick(range.id)} // Pass range.id here
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Create Event
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-blue-50 hover:border-blue-300"
                      asChild
                    >
                      <Link to={`/ranges/${range.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                  
                  {/* Secondary Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-green-50 hover:border-green-300"
                      onClick={() => handleEditClick(range)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      onClick={() => handleDelete(range.id, range.name)}
                      disabled={deleteLoading === range.id}
                    >
                      {deleteLoading === range.id ? (
                        <LoadingSpinner />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {ranges.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{ranges.length}</div>
                <div className="text-sm text-blue-800">Total Ranges</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">
                  {ranges.filter(r => r.status === 'active').length}
                </div>
                <div className="text-sm text-green-800">Active Ranges</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">
                  {ranges.reduce((total, range) => total + ( range.rangeImages?.length || 0), 0)}
                </div>
                <div className="text-sm text-purple-800">Total Images</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EditRange Modal */}
      <EditRange 
        range={editingRange}
        isOpen={showEditModal}
        onClose={handleModalClose}
        onUpdate={handleRangeUpdate}
      />
    </div>
  );
}
