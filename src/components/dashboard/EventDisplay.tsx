import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Users, 
  Edit, 
  Trash2, 
  Image as ImageIcon,
  ArrowLeft,
  Ticket
} from "lucide-react";
import { useAuth } from '@/firebase/auth';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { db } from "@/firebase/config";
import { 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  doc 
} from "firebase/firestore";
import { useParams } from 'react-router-dom';
import EditEventModal from './EditEventModal';

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

export default function EventDisplay() {
  const rangeId = useParams<{ id: string }>().id;
  const { toast } = useToast();
  const [editModal, setEditModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { user } = useAuth();
  const fetchEvents = async () => {
    try {
  const rangesQuery = query(
      collection(db, "ranges"),
      where("ownerId", "==", user.uid)
    );
    const rangesSnapshot = await getDocs(rangesQuery);
    const rangeIds = rangesSnapshot.docs.map(doc => doc.id);

    console.log("Found ranges:", rangeIds);

    if (rangeIds.length === 0) {
      console.log("No ranges found for this owner");
      setEvents([]);
      setLoading(false);
      return;
    }

    // 2️⃣ Get all bookings for these ranges
    const eventsQuery = query(
      collection(db, "events"),
      where("rangeId", "in", rangeIds)
    );

      const querySnapshot = await getDocs(eventsQuery);

      const eventsData: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        eventsData.push({
          id: doc.id,
          name: doc.data().name,
          description: doc.data().description,
          date: doc.data().date,
          time: doc.data().time,
          rangeId: doc.data().rangeId,
          location: doc.data().location,
          entryfees: doc.data().entryfees,
          availableseats: doc.data().availableseats,
          image: doc.data().image,
          images: doc.data().images,
          status: doc.data().status || 'active',
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt,
          userId: doc.data().userId,
        });
      });
      
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    setEditModal(true);
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setEditModal(false);
    setEditingEvent(null);
    // Refresh events after editing
    fetchEvents();
  };

  // Delete event
  const handleDelete = async (eventId: string, eventName: string) => {
    if (!confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(eventId);
    try {
      await deleteDoc(doc(db, "events", eventId));
      setEvents(events.filter(event => event.id !== eventId));
      toast({
        title: "Success",
        description: "Event deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [rangeId]);

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
                <Ticket className="w-8 h-8 text-blue-600" />
                Events
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your shooting range events and competitions
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/dashboard/range-owner">
                <Button 
                  variant="outline" 
                  className="hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      {editModal && editingEvent && (
        <EditEventModal
          event={editingEvent}
          isOpen={editModal}
          onClose={handleEditModalClose}
        />
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-500 mb-6">
                No events found for this range. Events are created from the range management page.
              </p>
              <Link to="/dashboard/range-owner">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Ranges
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Events Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="group hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  {/* Event Image */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                  {(event.image || (event.images && event.images.length > 0)) ? (
                    <img
                      src={event.image || event.images[0]}
                      alt={event.name}
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
                    (event.image || (event.images && event.images.length > 0)) ? 'hidden' : ''
                  }`}>
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No Image</p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <Badge 
                    className={`absolute top-3 right-3 ${
                      event.status === 'active' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : event.status === 'completed'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-gray-500 hover:bg-gray-600'
                    } text-white`}
                  >
                    {event.status?.charAt(0).toUpperCase() + event.status?.slice(1) || 'Active'}
                  </Badge>

                  {/* Date Badge */}
                  <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
                    {formatDate(event.date)}
        
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {event.name}
                  </CardTitle>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {event.location}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Description */}
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {event.description}
                  </p>

                  {/* Event Details */}
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      {formatTime(event.time)}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2 text-green-500" />
                      Entry: ₹{event.entryfees}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2 text-purple-500" />
                      {event.availableseats} seats available
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => handleEditClick(event)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      onClick={() => handleDelete(event.id, event.name)}
                      disabled={deleteLoading === event.id}
                    >
                      {deleteLoading === event.id ? (
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
        {events.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Event Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{events.length}</div>
                <div className="text-sm text-blue-800">Total Events</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">
                  {events.filter(e => e.status === 'active').length}
                </div>
                <div className="text-sm text-green-800">Active Events</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">
                  {events.reduce((total, event) => total + parseInt(event.availableseats || '0'), 0)}
                </div>
                <div className="text-sm text-purple-800">Total Seats</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <div className="text-2xl font-bold text-orange-600">
                  ₹{events.reduce((total, event) => total + parseInt(event.entryfees || '0'), 0)}
                </div>
                <div className="text-sm text-orange-800">Total Entry Fees</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}