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
  User
} from 'lucide-react';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';

// TypeScript interfaces matching your Firebase structure
interface Event {
  id: string;
  name: string; // Firebase field
  description: string;
  date: string; // Firebase field (string format)
  time: string; // Firebase field
  location: string;
  rangeId: string;
  userId: string; // Firebase field
  userName: string; // Firebase field
  userEmail: string; // Firebase field
  status: 'active' | 'blocked' | 'pending';
  availableseats: string; // Firebase field (string)
  entryfees: string; // Firebase field (string)
  image?: string; // Firebase field
  images?: string[]; // Firebase field (array)
  createdAt: Date | string; // Firebase field
  updatedAt: Date; // Firebase field (timestamp)
}

type EventStatus = 'active' | 'blocked' | 'pending';
type FilterType = 'all' | 'location' | 'userName' | 'userEmail';

const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EventStatus>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

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
        
        // Helper function to convert various date formats to Date
        const convertToDate = (dateField: any): Date => {
          if (!dateField) return new Date();
          
          // If it's a Firestore Timestamp
          if (dateField && typeof dateField.toDate === 'function') {
            return dateField.toDate();
          }
          
          // If it's already a Date object
          if (dateField instanceof Date) {
            return dateField;
          }
          
          // If it's a string, try to parse it
          if (typeof dateField === 'string') {
            const parsed = new Date(dateField);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
          }
          
          // If it's a number (timestamp)
          if (typeof dateField === 'number') {
            return new Date(dateField);
          }
          
          // Default fallback
          return new Date();
        };

        return {
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          date: data.date || '',
          time: data.time || '',
          location: data.location || '',
          rangeId: data.rangeId || '',
          userId: data.userId || '',
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          status: data.status || 'pending',
          availableseats: data.availableseats || '0',
          entryfees: data.entryfees || '0',
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
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: newStatus,
        updatedAt: new Date()
      });

      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, status: newStatus, updatedAt: new Date() }
          : event
      ));

      // Show success message
      alert(`Event ${newStatus === 'active' ? 'approved' : newStatus === 'blocked' ? 'blocked' : 'rejected'} successfully!`);
    } catch (err) {
      console.error('Error updating event status:', err);
      alert('Failed to update event status. Please try again.');
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'events', eventId));
      
      // Update local state
      setEvents(prev => prev.filter(event => event.id !== eventId));
      
      alert('Event deleted successfully!');
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event. Please try again.');
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events by status and search
  const filteredEvents = events.filter(event => {
    // Filter by status
    if (event.status !== activeTab) return false;

    // Filter by search term
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
      case 'active': return 'text-green-600 bg-green-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTabCount = (status: EventStatus): number => {
    return events.filter(event => event.status === status).length;
  };

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return date; // Return as is if can't parse
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

  const formatEventDateTime = (date: string, time: string): string => {
    if (!date && !time) return 'Not specified';
    if (!time) return date;
    return `${date} at ${time}`;
  };

  const getEventImage = (event: Event): string => {
    // Check for main image first
    if (event.image) return event.image;
    // Check for images array
    if (event.images && event.images.length > 0) return event.images[0];
    return '';
  };

  const parseUserInfo = (userName: string) => {
    const parts = userName.split('|');
    const name = parts[0] || userName;
    const role = parts[1] || '';
    return { name, role };
  };

  const EventModal: React.FC<{ event: Event; onClose: () => void }> = ({ event, onClose }) => {
    const userInfo = parseUserInfo(event.userName);
    const eventImage = getEventImage(event);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{event.name}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
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
                <h4 className="font-medium text-gray-800 mb-2">Additional Images</h4>
                <div className="grid grid-cols-3 gap-2">
                  {event.images.slice(1).map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`${event.name} ${index + 2}`}
                      className="w-full h-24 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Status</label>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium inline-block mt-1 ${getStatusColor(event.status)}`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Available Seats</label>
                    <p className="font-medium mt-1 text-blue-600">{event.availableseats} seats</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600 font-medium">Description</label>
                  <p className="text-gray-800 mt-1">{event.description || 'No description provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600 font-medium">Location</label>
                  <p className="font-medium mt-1">{event.location}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Date</label>
                    <p className="font-medium mt-1">{event.date}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Time</label>
                    <p className="font-medium mt-1">{event.time}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 font-medium">Entry Fee</label>
                  <p className="font-medium text-green-600 mt-1 text-xl">₹{event.entryfees}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
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
                
                <div className="bg-gray-50 p-4 rounded-lg">
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
              <p className="text-gray-600 mt-2">Manage and review all shooting events from Firebase</p>
            </div>
            
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Total Events</p>
                <p className="text-2xl font-bold text-gray-800">{events.length}</p>
              </div>
              <Calendar className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Active Events</p>
                <p className="text-2xl font-bold text-gray-800">{getTabCount('active')}</p>
              </div>
              <CheckCircle className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Pending Events</p>
                <p className="text-2xl font-bold text-gray-800">{getTabCount('pending')}</p>
              </div>
              <Clock className="text-yellow-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Blocked Events</p>
                <p className="text-2xl font-bold text-gray-800">{getTabCount('blocked')}</p>
              </div>
              <Ban className="text-red-500" size={24} />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Search All Fields</option>
              <option value="location">Location</option>
              <option value="userName">Organizer Name</option>
              <option value="userEmail">Organizer Email</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
          <div className="flex border-b">
            {(['active', 'pending', 'blocked'] as EventStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} Events ({getTabCount(status)})
              </button>
            ))}
          </div>

          {/* Events List */}
          <div className="p-6">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-lg text-gray-500">No {activeTab} events found</p>
                <p className="text-sm text-gray-400">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Events will appear here when available'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  const eventImage = getEventImage(event);
                  const userInfo = parseUserInfo(event.userName);
                  
                  return (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="flex">
                        {/* Event Image */}
                        <div className="w-32 h-32 flex-shrink-0">
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
                                    <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Event Content */}
                        <div className="flex-1 p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-gray-800">{event.name}</h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                </div>
                              </div>
                              <p className="text-gray-600 mb-3 line-clamp-2">{event.description || 'No description provided'}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <MapPin size={16} className="text-gray-400" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users size={16} className="text-gray-400" />
                                  <span>{event.availableseats} seats</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock size={16} className="text-gray-400" />
                                  <span>{formatEventDateTime(event.date, event.time)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail size={16} className="text-gray-400" />
                                  <span className="truncate">₹{event.entryfees} • {userInfo.name}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowModal(true);
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                            >
                              <Eye size={14} />
                              View Details
                            </button>

                            {activeTab === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'active')}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <CheckCircle size={14} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'blocked')}
                                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </>
                            )}

                            {activeTab === 'blocked' && (
                              <button
                                onClick={() => updateEventStatus(event.id, 'active')}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                              >
                                <CheckCircle size={14} />
                                Activate
                              </button>
                            )}

                            {activeTab === 'active' && (
                              <>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'blocked')}
                                  className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <Ban size={14} />
                                  Block
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <Trash2 size={14} />
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

      {/* Event Details Modal */}
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