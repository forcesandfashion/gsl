import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, Clock, MapPin, DollarSign, Users, Filter, Search, ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/firebase/config";
import {
  getDocs,
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/firebase/auth";
import { IndianRupee } from "lucide-react";
interface Booking {
  id: string;
  bookingId: string;
  rangeId: string;
  userId: string;
  userName: string;
  rangeName: string;
  price: string;
  shootersCount: number;
  timeSlot: string;
  date: string;
  day: string;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  bookingStatus: string;
  visited: boolean;
  createdAt: any;
  updatedAt: any;
}

export default function ShooterBooking() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const {user} = useAuth();

  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [visitedFilter, setVisitedFilter] = useState("all");

  // Fetch bookings from Firebase
  useEffect(() => {
    const fetchBookings = async () => {
      try {
  setLoading(true);
  const bookingsQuery = query(
    collection(db, "bookings"),
    where("userId", "==", user.uid)
  );

  const querySnapshot = await getDocs(bookingsQuery);
  const bookingsData: Booking[] = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Booking[];

  setBookings(bookingsData);
} catch (error) {
  console.error("Error fetching bookings:", error);
} finally {
  setLoading(false);
}

    };

    fetchBookings();
  }, []);

  useEffect(() => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.rangeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Payment status filter
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(booking => booking.paymentStatus.toLowerCase() === paymentStatusFilter);
    }

    // Booking status filter
    if (bookingStatusFilter !== "all") {
      filtered = filtered.filter(booking => booking.bookingStatus.toLowerCase() === bookingStatusFilter);
    }

    // Visited filter
    if (visitedFilter !== "all") {
      filtered = filtered.filter(booking => 
        visitedFilter === "visited" ? booking.visited : !booking.visited
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, paymentStatusFilter, bookingStatusFilter, visitedFilter]);

  const getStatusBadge = (status: string, type: "payment" | "booking") => {
    const statusLower = status.toLowerCase();
    
    if (type === "payment") {
      switch (statusLower) {
        case "paid":
          return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
        case "pending":
          return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
        case "failed":
          return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (statusLower) {
        case "confirmed":
          return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
        case "pending":
          return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
        case "cancelled":
          return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setPaymentStatusFilter("all");
    setBookingStatusFilter("all");
    setVisitedFilter("all");
  };

  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 text-lg mt-4">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-10">
        <div className="flex justify-between items-center p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Ticket size={32} className="text-white"/>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Shooter Bookings
              </h1>
              <p className="text-gray-600 text-sm">Manage and view all shooting range bookings</p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate("/dashboard/shooter")}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
        </div>
      </header>

      {/* Filters Section */}
      <div className="bg-white/60 backdrop-blur-md shadow-md border-b border-white/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="text-gray-600" size={20} />
              <span className="font-semibold text-gray-700">Filters:</span>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search by name, range, or booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-white/80 backdrop-blur-sm border-white/50 focus:bg-white"
                />
              </div>

              {/* Payment Status Filter */}
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-white/50">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Booking Status Filter */}
              <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-white/50">
                  <SelectValue placeholder="Booking Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Visited Filter */}
              <Select value={visitedFilter} onValueChange={setVisitedFilter}>
                <SelectTrigger className="w-32 bg-white/80 backdrop-blur-sm border-white/50">
                  <SelectValue placeholder="Visited" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="visited">Visited</SelectItem>
                  <SelectItem value="not-visited">Not Visited</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white"
              >
                Clear Filters
              </Button>
            </div>
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
                  <p className="text-blue-100 text-sm font-medium">Total Bookings</p>
                  <p className="text-3xl font-bold">{filteredBookings.length}</p>
                </div>
                <Ticket className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Confirmed</p>
                  <p className="text-3xl font-bold">
                    {filteredBookings.filter(b => b.bookingStatus.toLowerCase() === 'confirmed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold">
                    {filteredBookings.filter(b => b.bookingStatus.toLowerCase() === 'pending').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold">
                    ${filteredBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Grid */}
        {filteredBookings.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-md shadow-xl border-white/50">
            <CardContent className="p-12 text-center">
              <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Bookings Found</h3>
              <p className="text-gray-500">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="bg-white/80 backdrop-blur-md shadow-xl border-white/50 hover:shadow-2xl transition-all duration-200 hover:scale-105 hover:bg-white/90">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-800 mb-1">
                        {booking.rangeName}
                      </CardTitle>
                      <p className="text-sm text-blue-600 font-medium">ID: {booking.bookingId}</p>
                    </div>
                    {booking.visited && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Visited
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{booking.userName}</span>
                  </div>

                  {/* Date and Time */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">
                        {new Date(booking.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-600">{booking.timeSlot}</span>
                    </div>
                  </div>

                  {/* Shooters and Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">{booking.shootersCount} shooter{booking.shootersCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-green-600 flex">
                        <IndianRupee className="h-5 w-5 mt-1"/>
                        {booking.totalPrice}</span>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Payment Method:</span>
                      <span className="text-xs font-medium text-gray-700">{booking.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {getStatusBadge(booking.paymentStatus, "payment")}
                    {getStatusBadge(booking.bookingStatus, "booking")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}