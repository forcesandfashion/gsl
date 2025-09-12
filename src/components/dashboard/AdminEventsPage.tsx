import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Filter, 
  Search, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Trash2, 
  Eye,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Mail,
  User,
  UserCheck,
  CalendarDays,
  Timer
} from 'lucide-react';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';

// TypeScript interfaces matching your Firebase structure
interface Event {
  id: string;
  name: string;
  description: string;
  // Support both old and new date formats
  date?: string; // Legacy field
  time?: string; // Legacy field
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location: string;
  rangeId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'active' | 'blocked' | 'pending';
  availableseats: string;
  entryfees: string;
  participants?: number; // Current participants count
  image?: string;
  images?: string[];
  createdAt: Date | string;
  updatedAt: Date;
}

type EventStatus = 'active' | 'blocked' | 'pending';
type FilterType = 'all' | 'location' | 'userName' | 'userEmail';

interface AdminEventsPageProps {
  onNavigateToParticipants?: (eventId: string, eventName: string) => void;
}

const AdminEventsPage: React.FC<AdminEventsPageProps> = ({ onNavigateToParticipants }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EventStatus>('pending');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string>(''); // Track which action is loading

  // Initialize Firestore
  const db = getFirestore();

  // Fetch events from Firebase
  const fetchEvents = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');

      const eventsQuery = query(
        collection(db, 'events'),
        orderBy('createdAt', 'desc')
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData: Event[] = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        const convertToDate = (dateField: any): Date => {
          if (!dateField) return new Date();
          
          if (dateField && typeof dateField.toDate === 'function') {
            return dateField.toDate();
          }
          
          if (dateField instanceof Date) {
            return dateField;
          }
          
          if (typeof dateField === 'string') {
            const parsed = new Date(dateField);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
          }
          
          if (typeof dateField === 'number') {
            return new Date(dateField);
          }
          
          return new Date();
        };

        return {
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          // Handle both old and new date formats
          date: data.date || data.startDate || '',
          time: data.time || data.startTime || '',
          startDate: data.startDate || data.date || '',
          endDate: data.endDate || data.date || '',
          startTime: data.startTime || data.time || '',
          endTime: data.endTime || '',
          location: data.location || '',
          rangeId: data.rangeId || '',
          userId: data.userId || '',
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          status: data.status || 'pending',
          availableseats: data.availableseats || '0',
          entryfees: data.entryfees || '0',
          participants: data.participants || 0,
          image: data.image || '',
          images: data.images || [],
          createdAt: convertToDate(data.createdAt),
          updatedAt: convertToDate(data.updatedAt),
        } as Event;
      });

      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to fetch events from Firebase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update event status
  const updateEventStatus = async (eventId: string, newStatus: EventStatus): Promise<void> => {
    setActionLoading(eventId);
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: newStatus,
        updatedAt: new Date()
      });

      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, status: newStatus, updatedAt: new Date() }
          : event
      ));

      const statusText = newStatus === 'active' ? 'approved' : newStatus === 'blocked' ? 'blocked' : 'updated';
      alert(`Event ${statusText} successfully!`);
    } catch (err) {
      console.error('Error updating event status:', err);
      alert('Failed to update event status. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  // Delete event (for rejected pending events or admin deletion)
  const deleteEvent = async (eventId: string, isRejection: boolean = false): Promise<void> => {
    const confirmMessage = isRejection 
      ? 'Are you sure you want to reject and delete this event? This action cannot be undone.'
      : 'Are you sure you want to delete this event? This action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionLoading(eventId);
    try {
      await deleteDoc(doc(db, 'events', eventId));
      
      setEvents(prev => prev.filter(event => event.id !== eventId));
      
      alert(isRejection ? 'Event rejected and deleted successfully!' : 'Event deleted successfully!');
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events by status and search
  const filteredEvents = events.filter(event => {
    if (event.status !== activeTab) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      switch (filterType) {
        case 'location':
          return event.location.toLowerCase().includes(searchLower);
        case 'userName':
          return event.userName.toLowerCase().includes(searchLower);
        case 'userEmail':
          return event.userEmail.toLowerCase().includes(searchLower);
        case 'all':
        default:
          return (
            event.name.toLowerCase().includes(searchLower) ||
            event.location.toLowerCase().includes(searchLower) ||
            event.userName.toLowerCase().includes(searchLower) ||
            event.userEmail.toLowerCase().includes(searchLower) ||
            event.description.toLowerCase().includes(searchLower)
          );
      }
    }

    return true;
  });

  const getStatusColor = (status: EventStatus): string => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 border-green-200';
      case 'blocked': return 'text-red-600 bg-red-100 border-red-200';
      case 'pending': return 'text-amber-600 bg-amber-100 border-amber-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTabCount = (status: EventStatus): number => {
    return events.filter(event => event.status === status).length;
  };

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return date;
      }
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(parsed);
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatEventDateTime = (event: Event): string => {
    const startDate = event.startDate || event.date;
    const endDate = event.endDate || event.date;
    const startTime = event.startTime || event.time;
    const endTime = event.endTime;

    if (!startDate) return 'Not specified';

    // Format date range
    let dateStr = startDate;
    if (endDate && endDate !== startDate) {
      dateStr = `${startDate} - ${endDate}`;
    }

    // Add time if available
    if (startTime) {
      if (endTime && endTime !== startTime) {
        dateStr += ` (${startTime} - ${endTime})`;
      } else {
        dateStr += ` at ${startTime}`;
      }
    }

    return dateStr;
  };

  const getEventDuration = (event: Event): string => {
    const startDate = event.startDate || event.date;
    const endDate = event.endDate || event.date;
    
    if (!startDate || !endDate) return '';
    
    if (startDate === endDate) return 'Single day';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return `${diffDays} days`;
  };

  const getEventImage = (event: Event): string => {
    if (event.image) return event.image;
    if (event.images && event.images.length > 0) return event.images[0];
    return '';
  };

  const parseUserInfo = (userName: string) => {
    const parts = userName.split('|');
    const name = parts[0] || userName;
    const role = parts[1] || '';
    return { name, role };
  };

  const getParticipantsInfo = (event: Event) => {
    const available = parseInt(event.availableseats) || 0;
    const current = event.participants || 0;
    const percentage = available > 0 ? (current / available) * 100 : 0;
    
    return {
      current,
      available,
      percentage,
      remaining: Math.max(0, available - current)
    };
  };

  const EventModal: React.FC<{ event: Event; onClose: () => void }> = ({ event, onClose }) => {
    const userInfo = parseUserInfo(event.userName);
    const eventImage = getEventImage(event);
    const participantsInfo = getParticipantsInfo(event);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-800">{event.name}</h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(event.status)}`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            {/* Event Image */}
            {eventImage && (
              <div className="mb-6">
                <img
                  src={eventImage}
                  alt={event.name}
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Additional Images */}
            {event.images && event.images.length > 1 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <ImageIcon size={16} />
                  Additional Images
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {event.images.slice(1).map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`${event.name} ${index + 2}`}
                      className="w-full h-20 object-cover rounded border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 font-medium">Description</label>
                  <p className="text-gray-800 mt-1">{event.description || 'No description provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600 font-medium flex items-center gap-1">
                    <MapPin size={14} />
                    Location
                  </label>
                  <p className="font-medium mt-1">{event.location}</p>
                </div>

                {/* Enhanced Date/Time Display */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="text-sm text-blue-800 font-medium flex items-center gap-2 mb-2">
                    <CalendarDays size={16} />
                    Event Schedule
                  </label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start:</span>
                      <span className="font-medium">{event.startDate || event.date} {event.startTime && `at ${event.startTime}`}</span>
                    </div>
                    {(event.endDate && event.endDate !== (event.startDate || event.date)) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">End:</span>
                        <span className="font-medium">{event.endDate} {event.endTime && `at ${event.endTime}`}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-blue-600">{getEventDuration(event)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <label className="text-sm text-green-800 font-medium">Entry Fee</label>
                    <p className="font-bold text-green-600 text-xl">₹{event.entryfees}</p>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <label className="text-sm text-purple-800 font-medium">Available Seats</label>
                    <p className="font-bold text-purple-600 text-xl">{event.availableseats}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Participants Info */}
                {event.status === 'active' && (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h4 className="font-medium text-indigo-800 mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Participants ({participantsInfo.current}/{participantsInfo.available})
                    </h4>
                    <div className="space-y-2">
                      <div className="w-full bg-indigo-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                          style={{width: `${Math.min(participantsInfo.percentage, 100)}%`}}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-indigo-700">
                        <span>{participantsInfo.percentage.toFixed(1)}% filled</span>
                        <span>{participantsInfo.remaining} remaining</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Organizer Information */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <User size={16} />
                    Organizer Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{userInfo.name}</span>
                    </div>
                    {userInfo.role && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium text-blue-600">{userInfo.role}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{event.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="font-mono text-xs text-gray-500">{event.userId}</span>
                    </div>
                  </div>
                </div>
                
                {/* Event Details */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-800 mb-2">Event Details</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Range ID:</span>
                      <span className="font-mono text-xs">{event.rangeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{formatDate(event.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium">{formatDate(event.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-16 bg-gray-300 rounded"></div>
            <div className="h-96 bg-gray-300 rounded"></div>
          </div>
          <div className="flex justify-center items-center mt-8">
            <RefreshCw className="animate-spin text-blue-600 mr-2" size={20} />
            <div className="text-gray-600">Loading events from Firebase...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-red-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={24} />
              <h2 className="text-xl font-semibold">Error Loading Events</h2>
            </div>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Calendar className="text-blue-600" size={32} />
                Admin Events Management
              </h1>
              <p className="text-gray-600 mt-2">Manage and review all shooting events with enhanced date range support</p>
            </div>
            
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide font-medium">Total Events</p>
                <p className="text-3xl font-bold text-gray-800">{events.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide font-medium">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600">{getTabCount('pending')}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <Clock className="text-amber-600" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide font-medium">Active Events</p>
                <p className="text-3xl font-bold text-green-600">{getTabCount('active')}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide font-medium">Blocked Events</p>
                <p className="text-3xl font-bold text-red-600">{getTabCount('blocked')}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <Ban className="text-red-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            >
              <option value="all">Search All Fields</option>
              <option value="location">Location</option>
              <option value="userName">Organizer Name</option>
              <option value="userEmail">Organizer Email</option>
            </select>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
          <div className="flex border-b bg-gray-50">
            {(['pending', 'active', 'blocked'] as EventStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 ${
                  activeTab === status
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {status === 'pending' && <Clock size={18} />}
                  {status === 'active' && <CheckCircle size={18} />}
                  {status === 'blocked' && <Ban size={18} />}
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({getTabCount(status)})
                </div>
              </button>
            ))}
          </div>

          {/* Enhanced Events List */}
          <div className="p-6">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={32} className="text-gray-400" />
                </div>
                <p className="text-xl text-gray-500 font-medium">No {activeTab} events found</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Events will appear here when available'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  const eventImage = getEventImage(event);
                  const userInfo = parseUserInfo(event.userName);
                  const participantsInfo = getParticipantsInfo(event);
                  const isActionLoading = actionLoading === event.id;
                  
                  return (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden bg-white"
                    >
                      <div className="flex">
                        {/* Event Image */}
                        <div className="w-40 h-40 flex-shrink-0">
                          {eventImage ? (
                            <img
                              src={eventImage}
                              alt={event.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                      <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Event Content */}
                        <div className="flex-1 p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-gray-800">{event.name}</h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                </div>
                                {getEventDuration(event) !== 'Single day' && (
                                  <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
                                    <Timer size={12} />
                                    {getEventDuration(event)}
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-gray-600 mb-3 line-clamp-2">{event.description || 'No description provided'}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Users size={14} className="text-gray-400 flex-shrink-0" />
                                  {activeTab === 'active' && participantsInfo.current > 0 ? (
                                    <span className="text-indigo-600 font-medium">
                                      {participantsInfo.current}/{participantsInfo.available} joined
                                    </span>
                                  ) : (
                                    <span>{event.availableseats} seats</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{formatEventDateTime(event)}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">₹{event.entryfees} • {userInfo.name}</span>
                                </div>
                              </div>

                              {/* Participants progress bar for active events */}
                              {activeTab === 'active' && participantsInfo.current > 0 && (
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Participants</span>
                                    <span>{participantsInfo.percentage.toFixed(1)}% filled</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
                                      style={{width: `${Math.min(participantsInfo.percentage, 100)}%`}}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {/* View Details Button */}
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowModal(true);
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                            >
                              <Eye size={14} />
                              View Details
                            </button>

                            {/* Participants Button for Active Events */}
                            {activeTab === 'active' && onNavigateToParticipants && (
                              <button
                                onClick={() => onNavigateToParticipants(event.id, event.name)}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                              >
                                <UserCheck size={14} />
                                View Participants ({participantsInfo.current})
                              </button>
                            )}

                            {/* Pending Events Actions */}
                            {activeTab === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'active')}
                                  disabled={isActionLoading}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isActionLoading ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={14} />
                                  )}
                                  Approve
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id, true)}
                                  disabled={isActionLoading}
                                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isActionLoading ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <XCircle size={14} />
                                  )}
                                  Reject & Delete
                                </button>
                              </>
                            )}

                            {/* Blocked Events Actions */}
                            {activeTab === 'blocked' && (
                              <>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'active')}
                                  disabled={isActionLoading}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isActionLoading ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={14} />
                                  )}
                                  Activate
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  disabled={isActionLoading}
                                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isActionLoading ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                  Delete
                                </button>
                              </>
                            )}

                            {/* Active Events Actions */}
                            {activeTab === 'active' && (
                              <>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'blocked')}
                                  disabled={isActionLoading}
                                  className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isActionLoading ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <Ban size={14} />
                                  )}
                                  Block
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  disabled={isActionLoading}
                                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isActionLoading ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Event Details Modal */}
      {showModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminEventsPage;