import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  User, 
  ImageIcon,
  Filter,
  Search,
  Loader2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config'; // Adjust path as needed

interface Event {
  id: string;
  availableseats: string;
  createdAt: string;
  date: string;
  description: string;
  entryfees: string;
  image: string;
  images: string[];
  location: string;
  name: string;
  participants: number;
  rangeId: string;
  status: string;
  time: string;
  updatedAt: Timestamp | Date;
  userEmail: string;
  userId: string;
  userName: string;
}

const CmbEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Fetch events from Firebase
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupListener = () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create query to get events ordered by creation date (newest first)
        const eventsQuery = query(
          collection(db, 'events'),
          orderBy('createdAt', 'desc')
        );

        // Set up real-time listener
        unsubscribe = onSnapshot(
          eventsQuery,
          (querySnapshot) => {
            const eventsData: Event[] = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              eventsData.push({
                id: doc.id,
                availableseats: data.availableseats || '0',
                createdAt: data.createdAt || '',
                date: data.date || '',
                description: data.description || '',
                entryfees: data.entryfees || '0',
                image: data.image || '',
                images: data.images || [],
                location: data.location || '',
                name: data.name || '',
                participants: data.participants || 0,
                rangeId: data.rangeId || '',
                status: data.status || '',
                time: data.time || '',
                updatedAt: data.updatedAt,
                userEmail: data.userEmail || '',
                userId: data.userId || '',
                userName: data.userName || ''
              });
            });
            
            setEvents(eventsData);
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching events:', error);
            setError('Failed to fetch events. Please try again.');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up events listener:', error);
        setError('Failed to fetch events. Please try again.');
        setLoading(false);
      }
    };

    setupListener();
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTimestamp = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    
    let dateObj: Date;
    if (timestamp instanceof Timestamp) {
      dateObj = timestamp.toDate();
    } else {
      dateObj = timestamp;
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventUpcoming = (dateString: string) => {
    if (!dateString) return false;
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  // Filter and sort events
  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
      
      const matchesDate = filterDate === 'all' || 
                         (filterDate === 'upcoming' && isEventUpcoming(event.date)) ||
                         (filterDate === 'past' && !isEventUpcoming(event.date));
      
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'participants':
          return b.participants - a.participants;
        case 'price':
          return parseInt(b.entryfees) - parseInt(a.entryfees);
        default:
          return 0;
      }
    });

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CMB Events</h1>
              <p className="mt-2 text-gray-600">Manage and view all shooting range events</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {events.length} total events
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading events...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Content - only show when not loading */}
        {!loading && !error && (
          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Dates</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past Events</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="name">Sort by Name</option>
                    <option value="participants">Sort by Participants</option>
                    <option value="price">Sort by Price</option>
                  </select>
                </div>

                {/* Results Count */}
                <div className="flex items-center justify-center bg-blue-50 rounded-lg px-3 py-3">
                  <span className="text-sm font-medium text-blue-700">
                    {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
                  </span>
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-6">
              {filteredEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                  {/* Event Header */}
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Event Image */}
                      <div className="flex-shrink-0">
                        {event.image ? (
                          <img
                            src={event.image}
                            alt={event.name}
                            className="w-32 h-32 lg:w-40 lg:h-40 object-cover rounded-xl shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-32 h-32 lg:w-40 lg:h-40 bg-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                            <ImageIcon className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{event.name}</h3>
                            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(event.status)}`}>
                              {event.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4 text-lg leading-relaxed">{event.description}</p>
                        
                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="font-semibold text-gray-900">{formatDate(event.date)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Clock className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm text-gray-500">Time</p>
                              <p className="font-semibold text-gray-900">{event.time}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <MapPin className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="text-sm text-gray-500">Location</p>
                              <p className="font-semibold text-gray-900 truncate" title={event.location}>
                                {event.location}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="text-sm text-gray-500">Entry Fee</p>
                              <p className="font-bold text-gray-900">₹{parseInt(event.entryfees).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        {/* Participants Info */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-blue-600" />
                              <span className="text-blue-900 font-medium">
                                {event.participants} Participants
                              </span>
                            </div>
                            <div className="text-blue-700">
                              <span className="font-medium">{event.availableseats}</span> seats available
                            </div>
                          </div>
                          <div className="mt-2 bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min((event.participants / parseInt(event.availableseats)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => toggleEventExpansion(event.id)}
                          className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
                        >
                          <Eye className="w-5 h-5" />
                          <span>
                            {expandedEvent === event.id ? 'Hide Details' : 'View Details'}
                          </span>
                          {expandedEvent === event.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedEvent === event.id && (
                      <div className="mt-8 pt-8 border-t border-gray-200">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Left Column - Event Details */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-xl font-bold text-gray-900 mb-4">Event Details</h4>
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                  <User className="w-5 h-5 text-gray-600" />
                                  <div>
                                    <p className="text-sm text-gray-500">Organizer</p>
                                    <p className="font-semibold text-gray-900">{event.userName}</p>
                                    <p className="text-sm text-gray-600">{event.userEmail}</p>
                                  </div>
                                </div>
                                
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-500 mb-1">Range ID</p>
                                  <p className="font-mono text-gray-900 bg-white px-3 py-2 rounded border">
                                    {event.rangeId}
                                  </p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-500 mb-1">Event ID</p>
                                  <p className="font-mono text-gray-900 bg-white px-3 py-2 rounded border">
                                    {event.id}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div>
                              <h4 className="text-xl font-bold text-gray-900 mb-4">Timeline</h4>
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <div>
                                    <p className="text-sm text-green-600">Created</p>
                                    <p className="font-medium text-gray-900">
                                      {new Date(event.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <p className="text-sm text-blue-600">Last Updated</p>
                                    <p className="font-medium text-gray-900">
                                      {formatTimestamp(event.updatedAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Column - Images Gallery */}
                          <div>
                            <h4 className="text-xl font-bold text-gray-900 mb-4">Event Gallery</h4>
                            {event.images && event.images.length > 0 ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  {event.images.slice(0, 6).map((imageUrl, index) => (
                                    <div key={index} className="relative group">
                                      <img
                                        src={imageUrl}
                                        alt={`${event.name} ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg"></div>
                                    </div>
                                  ))}
                                </div>
                                {event.images.length > 6 && (
                                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <p className="text-gray-600">
                                      <span className="font-semibold text-blue-600">
                                        +{event.images.length - 6}
                                      </span>{' '}
                                      more images available
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No additional images available</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredEvents.length === 0 && events.length > 0 && (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-600 text-lg">Try adjusting your filters or search terms to find more events.</p>
              </div>
            )}

            {/* No data state */}
            {events.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-medium text-gray-900 mb-2">No events available</h3>
                <p className="text-gray-600 text-lg">There are no events in the database yet.</p>
              </div>
            )}

            {/* Summary Stats */}
            {events.length > 0 && (
              <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Event Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-6 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{events.length}</div>
                    <div className="text-sm font-medium text-blue-700">Total Events</div>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {events.filter(e => e.status === 'active').length}
                    </div>
                    <div className="text-sm font-medium text-green-700">Active Events</div>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {events.reduce((sum, e) => sum + e.participants, 0)}
                    </div>
                    <div className="text-sm font-medium text-purple-700">Total Participants</div>
                  </div>
                  <div className="text-center p-6 bg-orange-50 rounded-xl">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {events.filter(e => isEventUpcoming(e.date)).length}
                    </div>
                    <div className="text-sm font-medium text-orange-700">Upcoming Events</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CmbEvents;