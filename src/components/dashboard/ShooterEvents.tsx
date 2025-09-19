import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Target,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { db } from '@/firebase/config';
import { collection, query as firestoreQuery, orderBy, getDocs, DocumentData, where } from 'firebase/firestore';
import EventParticipation from './EventParticipation';

interface Event {
  id: string;
  name: string;
  rangeId: string;
  rangeName: string;
  description: string;
  date: string;
  startDate: string;
  endDate: string;
  time: string;
  startTime: string;
  endTime: string;
  location: string;
  entryfees: string;
  availableseats: string;
  currentParticipants?: number;
  image: string;
  images?: string[];
  status: string;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export default function ShooterEvents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showParticipationModal, setShowParticipationModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch events from Firebase
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventsQuery = firestoreQuery(
          collection(db, "events"),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(eventsQuery);
        const eventsData: Event[] = [];
        
        for (const doc of querySnapshot.docs) {
          const data = doc.data() as DocumentData;
          
          // Get range name
          let rangeName = "Unknown Range";
          if (data.rangeId) {
            const rangeDoc = await getDocs(
              firestoreQuery(
                collection(db, "ranges"),
                where("__name__", "==", data.rangeId)
              )
            );
            if (!rangeDoc.empty) {
              rangeName = rangeDoc.docs[0].data().name || "Unknown Range";
            }
          }
          
          eventsData.push({
            id: doc.id,
            name: data.name || '',
            rangeId: data.rangeId || '',
            rangeName: rangeName,
            description: data.description || '',
            date: data.date || '',
            startDate: data.startDate || data.date || '',
            endDate: data.endDate || data.date || '',
            time: data.time || '',
            startTime: data.startTime || data.time || '',
            endTime: data.endTime || data.time || '',
            location: data.location || '',
            entryfees: data.entryfees || '0',
            availableseats: data.availableseats || '0',
            currentParticipants: data.participants || 0,
            image: data.image || '',
            images: data.images || [],
            status: data.status || 'active',
            userId: data.userId || '',
            userEmail: data.userEmail || '',
            userName: data.userName || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || ''
          } as Event);
        }

        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = events;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.rangeName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => getEventStatus(event) === statusFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(event => event.location.toLowerCase().includes(locationFilter.toLowerCase()));
    }

    // Range filter
    if (rangeFilter !== 'all') {
      filtered = filtered.filter(event => event.rangeName.toLowerCase().includes(rangeFilter.toLowerCase()));
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery, statusFilter, locationFilter, rangeFilter]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Clock className="w-3 h-3 mr-1" />Upcoming</Badge>;
      case 'ongoing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><AlertCircle className="w-3 h-3 mr-1" />Ongoing</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isEventPast = (eventDate: string) => {
    return new Date(eventDate) < new Date();
  };

  const getEventStatus = (event: Event) => {
    if (event.status === 'cancelled') return 'cancelled';
    if (event.status === 'blocked') return 'cancelled';
    if (isEventPast(event.endDate || event.date)) return 'completed';
    if (event.status === 'active') return 'active';
    return 'upcoming';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setLocationFilter('all');
    setRangeFilter('all');
  };

  const getUniqueLocations = () => {
    const locations = events.map(event => event.location);
    return [...new Set(locations)].filter(location => location);
  };

  const getUniqueRanges = () => {
    const ranges = events.map(event => event.rangeName);
    return [...new Set(ranges)].filter(range => range);
  };

  const handleParticipateClick = (event: Event) => {
    setSelectedEvent(event);
    setShowParticipationModal(true);
  };

  const handleParticipationClose = () => {
    setShowParticipationModal(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 text-lg mt-4">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-xl border-b border-white/20 sticky top-0 z-10">
        <div className="flex justify-between items-center p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Target size={32} className="text-white"/>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Events
              </h1>
              <p className="text-gray-600 text-sm">Discover and join shooting competitions & training sessions</p>
            </div>
          </div>
          
          <div className='flex items-center gap-2 hover:bg-gray-100 p-3 rounded-lg cursor-pointer transition-colors'>
            <ChevronLeft className="text-gray-600" />
            <h1 className="text-xl font-bold text-gray-700">Go Back</h1>
          </div>
        </div>
      </header>

      {/* Filters Section */}
      <div className="bg-white/60 backdrop-blur-md shadow-md border-b border-white/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="text-gray-600" size={20} />
              <span className="font-semibold text-gray-700">Filters:</span>
            </div>
            
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white"
            >
              Clear All Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                placeholder="Search events, locations, ranges, organizers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-white/50 focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/50">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {getUniqueLocations().map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Range Filter */}
            <Select value={rangeFilter} onValueChange={setRangeFilter}>
              <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/50">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranges</SelectItem>
                {getUniqueRanges().map(range => (
                  <SelectItem key={range} value={range}>{range}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Events</p>
                  <p className="text-3xl font-bold">{filteredEvents.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Active Events</p>
                  <p className="text-3xl font-bold">
                    {filteredEvents.filter(e => getEventStatus(e) === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Available Seats</p>
                  <p className="text-3xl font-bold">
                    {filteredEvents.reduce((sum, event) => sum + (parseInt(event.availableseats) || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Participants</p>
                  <p className="text-3xl font-bold">
                    {filteredEvents.reduce((sum, event) => sum + (event.currentParticipants || 0), 0)}
                  </p>
                </div>
                <User className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-md shadow-xl border-white/50">
            <CardContent className="p-12 text-center">
              <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Found</h3>
              <p className="text-gray-500">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="bg-white/80 backdrop-blur-md shadow-xl border-white/50 hover:shadow-2xl transition-all duration-200 hover:scale-105 hover:bg-white/90">
                <CardHeader className="pb-3">
                  {/* Event Image */}
                  {event.image && (
                    <div className="w-full h-48 mb-3 rounded-lg overflow-hidden">
                      <img
                        src={event.image}
                        alt={event.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg font-bold text-gray-800 leading-tight">
                      {event.name}
                    </CardTitle>
                    {getStatusBadge(getEventStatus(event))}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Location and Date */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-600">{event.rangeName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-600">
                        {new Date(event.startDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {event.endDate && event.endDate !== event.startDate && (
                          <> - {new Date(event.endDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">
                        {event.startTime} {event.endTime && `- ${event.endTime}`}
                      </span>
                    </div>
                  </div>

                  {/* Available Seats and Entry Fee */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">
                        {event.availableseats} seats available
                        {event.currentParticipants > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({event.currentParticipants} registered)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ₹{event.entryfees}
                    </div>
                  </div>

                  {/* Organizer */}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{event.userName.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-gray-600">by {event.userName}</span>
                  </div>

                  {/* Register Button */}
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    disabled={
                      getEventStatus(event) === 'completed' || 
                      getEventStatus(event) === 'cancelled' ||
                      parseInt(event.availableseats) <= 0
                    }
                    onClick={() => handleParticipateClick(event)}
                  >
                    {getEventStatus(event) === 'completed' ? 'Event Completed' : 
                     getEventStatus(event) === 'cancelled' ? 'Event Cancelled' :
                     parseInt(event.availableseats) <= 0 ? 'Event Full' : 
                     'Register Now'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Participation Modal */}
      {showParticipationModal && selectedEvent && (
        <EventParticipation
          event={selectedEvent}
          isOpen={showParticipationModal}
          onClose={handleParticipationClose}
          onSuccess={() => {
            // Refresh events after successful participation
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}