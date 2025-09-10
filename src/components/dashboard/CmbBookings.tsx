import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, DollarSign, MapPin, Users, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { collection, getDocs, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config'; 

interface Booking {
  id: string;
  bookingId: string;
  bookingStatus: string;
  createdAt: Timestamp | Date;
  date: string;
  day: string;
  paymentMethod: string;
  paymentStatus: string;
  price: number;
  rangeId: string;
  rangeName: string;
  shootersCount: number;
  timeSlot: string;
  totalPrice: number;
  updatedAt: Timestamp | Date;
  userId: string;
  userName: string;
  visited: boolean;
  visitedAt?: Timestamp | Date;
}

const CmbBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');

  // Fetch bookings from Firebase
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create query to get bookings ordered by creation date (newest first)
        const bookingsQuery = query(
          collection(db, 'bookings'),
          orderBy('createdAt', 'desc')
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(
          bookingsQuery,
          (querySnapshot) => {
            const bookingsData: Booking[] = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              bookingsData.push({
                id: doc.id,
                bookingId: data.bookingId || '',
                bookingStatus: data.bookingStatus || '',
                createdAt: data.createdAt,
                date: data.date || '',
                day: data.day || '',
                paymentMethod: data.paymentMethod || '',
                paymentStatus: data.paymentStatus || '',
                price: data.price || 0,
                rangeId: data.rangeId || '',
                rangeName: data.rangeName || '',
                shootersCount: data.shootersCount || 0,
                timeSlot: data.timeSlot || '',
                totalPrice: data.totalPrice || 0,
                updatedAt: data.updatedAt,
                userId: data.userId || '',
                userName: data.userName || '',
                visited: data.visited || false,
                visitedAt: data.visitedAt
              });
            });
            
            setBookings(bookingsData);
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching bookings:', error);
            setError('Failed to fetch bookings. Please try again.');
            setLoading(false);
          }
        );

        // Return cleanup function
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up bookings listener:', error);
        setError('Failed to fetch bookings. Please try again.');
        setLoading(false);
      }
    };

    const unsubscribe = fetchBookings();
    
    // Cleanup subscription on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Timestamp | Date | undefined) => {
    if (!date) return 'N/A';
    
    let dateObj: Date;
    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else {
      dateObj = date;
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredBookings = bookings.filter(booking => {
    const statusMatch = filterStatus === 'all' || booking.bookingStatus === filterStatus;
    const paymentMatch = filterPaymentStatus === 'all' || booking.paymentStatus === filterPaymentStatus;
    return statusMatch && paymentMatch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CMB Bookings</h1>
        <p className="text-gray-600">Manage and view all shooting range bookings</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading bookings...</span>
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
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Booking Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bookings Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBookings.map((booking) => (
              <div key={booking.id || booking.bookingId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {booking.bookingId || 'N/A'}
                    </h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(booking.bookingStatus)}`}>
                        {booking.bookingStatus || 'Unknown'}
                      </span>
                      {booking.visited && (
                        <Eye className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Range Info */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{booking.rangeName || 'N/A'}</span>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{booking.userName || 'N/A'}</span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="text-gray-700">
                      <div className="font-medium">{booking.date || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{booking.day || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Time Slot */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700">{booking.timeSlot || 'N/A'}</span>
                  </div>

                  {/* Shooters Count */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700">{booking.shootersCount || 0} shooter{(booking.shootersCount || 0) > 1 ? 's' : ''}</span>
                  </div>

                  {/* Payment Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="font-bold text-gray-900">₹{(booking.totalPrice || 0).toLocaleString()}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      {booking.paymentStatus || 'Unknown'}
                    </span>
                  </div>

                  {/* Payment Method */}
                  <div className="text-sm text-gray-600">
                    Payment: {booking.paymentMethod || 'N/A'}
                  </div>

                  {/* Timestamps */}
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(booking.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Updated: {formatDate(booking.updatedAt)}
                    </div>
                    {booking.visitedAt && (
                      <div className="text-xs text-green-600">
                        Visited: {formatDate(booking.visitedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredBookings.length === 0 && bookings.length > 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </div>
          )}

          {/* No data state */}
          {bookings.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings available</h3>
              <p className="text-gray-600">There are no bookings in the database yet.</p>
            </div>
          )}

          {/* Summary Stats - only show if we have bookings */}
          {bookings.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{bookings.length}</div>
                  <div className="text-sm text-gray-600">Total Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {bookings.filter(b => b.bookingStatus === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {bookings.filter(b => b.visited).length}
                  </div>
                  <div className="text-sm text-gray-600">Visited</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CmbBookings;