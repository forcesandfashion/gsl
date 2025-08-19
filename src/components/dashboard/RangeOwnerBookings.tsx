import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Eye,
  Filter,
  Search,
  ArrowLeft,
  Ticket,
  TicketPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/firebase/auth";

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

export default function RangeOwnerBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [filterVisited, setFilterVisited] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch bookings
  useEffect(() => {
    // Replace the fetchBookings function with this corrected version:

const fetchBookings = async () => {
  if (!user) {
    console.log("No user found, skipping fetch");
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    console.log("Fetching bookings for user:", user.uid);
    
    // 1️⃣ First get all ranges owned by this user
    const rangesQuery = query(
      collection(db, "ranges"),
      where("ownerId", "==", user.uid)
    );
    const rangesSnapshot = await getDocs(rangesQuery);
    const rangeIds = rangesSnapshot.docs.map(doc => doc.id);

    console.log("Found ranges:", rangeIds);

    if (rangeIds.length === 0) {
      console.log("No ranges found for this owner");
      setBookings([]);
      setFilteredBookings([]);
      setLoading(false);
      return;
    }

    // 2️⃣ Get all bookings for these ranges
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("rangeId", "in", rangeIds)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);

    console.log("Found bookings:", bookingsSnapshot.size);

    const bookingsData: Booking[] = [];

    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      bookingsData.push({
        id: doc.id,
        bookingId: data.bookingId || doc.id,
        rangeId: data.rangeId || "",
        userId: data.userId || "",
        userName: data.userName || "Unknown User",
        rangeName: data.rangeName || "Unknown Range",
        price: data.price || "0",
        shootersCount: data.shootersCount || 1,
        timeSlot: data.timeSlot || "",
        date: data.date || "",
        day: data.day || "",
        totalPrice: data.totalPrice || 0,
        paymentMethod: data.paymentMethod || "",
        paymentStatus: data.paymentStatus || "pending",
        bookingStatus: data.bookingStatus || "confirmed",
        visited: data.visited || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    // Sort by creation date (newest first)
    bookingsData.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });

    console.log("Final bookings data:", bookingsData);
    setBookings(bookingsData);
    setFilteredBookings(bookingsData);

    if (bookingsData.length === 0) {
      console.log("No bookings found for this range owner");
    }

  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    setError(error.message || "Failed to fetch bookings");
    toast({
      title: "Error",
      description: `Failed to fetch bookings: ${error.message}`,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
    fetchBookings();
  }, [user, toast]);

  // Apply filters
// Replace the entire filtering logic in your useEffect with this improved version:

// Apply filters
useEffect(() => {
  let filtered = [...bookings];

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(
      (booking) =>
        booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.rangeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Helper function to parse date from "Month Day, Year" format
  const parseBookingDate = (dateStr: string): Date | null => {
    try {
      const trimmedDate = dateStr.trim();
      
      // Try parsing directly first
      const directParse = new Date(trimmedDate);
      if (!isNaN(directParse.getTime())) {
        return directParse;
      }

      // Manual parsing for "Month Day, Year" format
      const monthMap: { [key: string]: number } = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1, 
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
      };

      // Parse "Month Day, Year"
      const parts = trimmedDate.split(' ');
      if (parts.length >= 3) {
        const monthName = parts[0].toLowerCase();
        const day = parseInt(parts[1].replace(',', ''));
        const year = parseInt(parts[2]);
        
        const monthIndex = monthMap[monthName];
        if (monthIndex !== undefined && !isNaN(day) && !isNaN(year)) {
          return new Date(year, monthIndex, day);
        }
      }

      return null;
    } catch (error) {
      console.warn("Error parsing date:", dateStr, error);
      return null;
    }
  };

  // Date filter (for specific date)
  if (filterDate) {
    filtered = filtered.filter((booking) => {
      const bookingDate = parseBookingDate(booking.date);
      if (!bookingDate) return false;
      
      // Parse the filter date (YYYY-MM-DD format from HTML input)
      const filterDateObj = new Date(filterDate);
      
      // Compare year, month, and day
      return (
        bookingDate.getFullYear() === filterDateObj.getFullYear() &&
        bookingDate.getMonth() === filterDateObj.getMonth() &&
        bookingDate.getDate() === filterDateObj.getDate()
      );
    });
  }

  // Month filter
  if (filterMonth) {
    filtered = filtered.filter((booking) => {
      const bookingDate = parseBookingDate(booking.date);
      if (!bookingDate) return false;
      
      const month = (bookingDate.getMonth() + 1).toString().padStart(2, "0");
      return month === filterMonth;
    });
  }

  // Payment status filter
  if (filterPaymentStatus) {
    filtered = filtered.filter((booking) => booking.paymentStatus === filterPaymentStatus);
  }

  // Visited filter
  if (filterVisited) {
    const isVisited = filterVisited === "true";
    filtered = filtered.filter((booking) => booking.visited === isVisited);
  }

  setFilteredBookings(filtered);
}, [bookings, searchTerm, filterDate, filterMonth, filterPaymentStatus, filterVisited]);
  // Update visited status
  

  // Delete booking
  const deleteBooking = async (bookingId: string) => {
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      
      // Update local state
      setBookings(prev => prev.filter(booking => booking.id !== bookingId));
      
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Confirmed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterDate("");
    setFilterMonth("");
    setFilterPaymentStatus("");
    setFilterVisited("");
  };

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

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Bookings</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
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
                <TicketPlus className="w-8 h-8 text-blue-600" />
                Bookings
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your bookings here ({filteredBookings.length} total)
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/dashboard/range-owner">
                <Button variant="outline" className="hover:bg-gray-50">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Date Filter */}
              <Input
                type="date"
                placeholder="Filter by date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />

              {/* Month Filter */}
              <Select value={filterMonth} onValueChange={(value) => setFilterMonth(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  <SelectItem value="01">January</SelectItem>
                  <SelectItem value="02">February</SelectItem>
                  <SelectItem value="03">March</SelectItem>
                  <SelectItem value="04">April</SelectItem>
                  <SelectItem value="05">May</SelectItem>
                  <SelectItem value="06">June</SelectItem>
                  <SelectItem value="07">July</SelectItem>
                  <SelectItem value="08">August</SelectItem>
                  <SelectItem value="09">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Status Filter */}
              <Select value={filterPaymentStatus} onValueChange={(value) => setFilterPaymentStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Visited Filter */}
              <Select value={filterVisited} onValueChange={(value) => setFilterVisited(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Visit status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All visits</SelectItem>
                  <SelectItem value="true">Visited</SelectItem>
                  <SelectItem value="false">Not visited</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button variant="outline" onClick={clearAllFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ticket className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500 text-center">
                {bookings.length === 0
                  ? "No bookings have been made yet."
                  : "No bookings match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <Card
                key={booking.id}
                className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => navigate(`/dashboard/range-owner/bookings/${booking.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg">{booking.bookingId}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Icon */}
                      {booking.visited ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                      
                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/range-owner/bookings/${booking.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/bookings/${booking.id}/edit`);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Booking
                          </DropdownMenuItem>


                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{booking.userName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{booking.rangeName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{booking.date}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{booking.timeSlot}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{booking.shootersCount} shooter(s)</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">${booking.totalPrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-500">({booking.paymentMethod})</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {getPaymentStatusBadge(booking.paymentStatus)}
                    {getBookingStatusBadge(booking.bookingStatus)}
                  </div>

                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/range-owner/bookings/${booking.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
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