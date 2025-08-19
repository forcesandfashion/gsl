import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  ArrowLeft,
  Ticket,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Download,
  Printer
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { db } from "@/firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  visitedAt?: any; // Timestamp when customer visited
  createdAt: any;
  updatedAt: any;
}

export default function BookingDetailsPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId || !user) return;

      try {
        setLoading(true);
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          toast({
            title: "Not Found",
            description: "This booking does not exist.",
            variant: "destructive",
          });
          navigate("/dashboard/bookings");
          return;
        }

        const data = bookingSnap.data();
        setBooking({
          id: bookingSnap.id,
          bookingId: data.bookingId || bookingSnap.id,
          rangeId: data.rangeId,
          userId: data.userId,
          userName: data.userName,
          rangeName: data.rangeName,
          price: data.pricePerHour,
          shootersCount: data.shootersCount,
          timeSlot: data.timeSlot,
          date: data.date,
          day: data.day,
          totalPrice: data.totalPrice,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          bookingStatus: data.bookingStatus,
          visited: data.visited || false,
          visitedAt: data.visitedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } catch (error: any) {
        console.error("Error fetching booking:", error);
        toast({
          title: "Error",
          description: "Failed to fetch booking details",
          variant: "destructive",
        });
        navigate("/dashboard/bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, user, toast, navigate]);

  const updateBookingStatus = async (field: string, value: any, additionalFields?: any) => {
    if (!booking) return;

    try {
      setUpdating(true);
      const bookingRef = doc(db, "bookings", booking.id);
      
      const updateData: any = {
        [field]: value,
        updatedAt: new Date(),
        ...additionalFields
      };
      
      await updateDoc(bookingRef, updateData);

      setBooking(prev => prev ? { ...prev, [field]: value, ...additionalFields } : null);
      
      toast({
        title: "Success",
        description: `Booking ${field} updated successfully`,
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description: `Failed to update ${field}`,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const markAsVisited = () => {
    // Only allow if not already visited
    if (booking?.visited) {
      toast({
        title: "Cannot Update",
        description: "Customer has already been marked as visited. This cannot be changed.",
        variant: "destructive",
      });
      return;
    }
    
    const visitTimestamp = new Date();
    updateBookingStatus('visited', true, { visitedAt: visitTimestamp });
  };

  const markAsNotVisited = () => {
    // Prevent changing back to not visited once marked as visited
    if (booking?.visited) {
      toast({
        title: "Cannot Update",
        description: "Cannot change visit status back to 'Not Visited' once marked as visited.",
        variant: "destructive",
      });
      return;
    }
    updateBookingStatus('visited', false);
  };

  const updatePaymentStatus = (status: string) => {
    if (!booking) return;

    // Prevent changing from paid to unpaid for cash payments
    if (booking.paymentMethod.toLowerCase() === 'cash' && booking.paymentStatus === 'paid' && status !== 'paid') {
      toast({
        title: "Cannot Update Payment",
        description: "Cash payments cannot be changed from 'Paid' to unpaid status.",
        variant: "destructive",
      });
      return;
    }

    // For cash payments, once paid, only allow paid status
    if (booking.paymentMethod.toLowerCase() === 'cash' && booking.paymentStatus === 'paid' && status === 'paid') {
      toast({
        title: "Already Paid",
        description: "This cash payment is already marked as paid.",
        variant: "default",
      });
      return;
    }

    updateBookingStatus('paymentStatus', status);
  };

  const updateBookingStatusAction = (status: string) => {
    if (!booking) return;

    // Prevent changing status if already completed or cancelled
    if ((booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') && 
        booking.bookingStatus !== status) {
      toast({
        title: "Cannot Update Status",
        description: `Booking status cannot be changed from '${booking.bookingStatus}' to '${status}'. Final statuses cannot be modified.`,
        variant: "destructive",
      });
      return;
    }

    updateBookingStatus('bookingStatus', status);
  };

  const deleteBooking = async () => {
    if (!booking) return;
    
    if (!confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
      return;
    }

    try {
      setUpdating(true);
      await deleteDoc(doc(db, "bookings", booking.id));
      
      toast({
        title: "Success",
        description: "Booking deleted successfully",
        variant: "default",
      });
      
      navigate("/dashboard/bookings");
    } catch (error: any) {
      console.error("Error deleting booking:", error);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!booking) return;
    
    const exportData = {
      bookingId: booking.bookingId,
      customer: booking.userName,
      range: booking.rangeName,
      date: booking.date,
      timeSlot: booking.timeSlot,
      shooters: booking.shootersCount,
      totalAmount: booking.totalPrice,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
      visited: booking.visited,
      visitedAt: booking.visitedAt ? formatDate(booking.visitedAt) : null
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `booking-${booking.bookingId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      return new Date(date.toDate ? date.toDate() : date).toLocaleString();
    } catch {
      return "N/A";
    }
  };

  // Check if payment status can be changed
  const canChangePaymentStatus = (targetStatus: string) => {
    if (!booking) return false;
    
    // For cash payments, once paid, cannot change to unpaid
    if (booking.paymentMethod.toLowerCase() === 'cash' && 
        booking.paymentStatus === 'paid' && 
        targetStatus !== 'paid') {
      return false;
    }
    
    return true;
  };

  // Check if booking status can be changed
  const canChangeBookingStatus = (targetStatus: string) => {
    if (!booking) return false;
    
    // Cannot change from completed or cancelled
    if ((booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') && 
        booking.bookingStatus !== targetStatus) {
      return false;
    }
    
    return true;
  };

  // Check if visit status can be changed
  const canChangeVisitStatus = () => {
    if (!booking) return false;
    return !booking.visited; // Can only change if not already visited
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 text-lg mt-4">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Not Found</h3>
            <p className="text-gray-500 text-center mb-4">
              The requested booking could not be found.
            </p>
            <Button onClick={() => navigate("/dashboard/range-owner/bookings")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/dashboard/range-owner/bookings">
                <Button variant="outline" className="hover:bg-gray-50">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Bookings
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Ticket className="w-8 h-8 text-blue-600" />
                  Booking Details
                </h1>
                <p className="text-gray-600 mt-1">
                  Booking ID: {booking.bookingId}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Booking Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Ticket className="w-5 h-5" />
                    Booking Information
                  </span>
                  <div className="flex gap-2">
                    {getPaymentStatusBadge(booking.paymentStatus)}
                    {getBookingStatusBadge(booking.bookingStatus)}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Range</p>
                        <p className="font-semibold">{booking.rangeName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-semibold">{booking.date} ({booking.day})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-500">Time Slot</p>
                        <p className="font-semibold">{booking.timeSlot}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-gray-500">Number of Shooters</p>
                        <p className="font-semibold">{booking.shootersCount}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="font-bold text-xl text-green-600">${booking.totalPrice.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Payment: {booking.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {booking.visited ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Visit Status</p>
                        <p className={`font-semibold ${booking.visited ? 'text-green-600' : 'text-red-600'}`}>
                          {booking.visited ? 'Visited' : 'Not Visited'}
                        </p>
                        {booking.visited && booking.visitedAt && (
                          <p className="text-xs text-gray-400">
                            Visited at: {formatDate(booking.visitedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Customer Name</p>
                      <p className="font-semibold">{booking.userName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="font-mono text-sm">{booking.userId}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Booking Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 pb-3 border-b">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-blue-600">Booking Created</p>
                      <p className="text-sm text-gray-500">{formatDate(booking.createdAt)}</p>
                      <p className="text-xs text-gray-400">Initial booking was made</p>
                    </div>
                  </div>

                  {booking.updatedAt && (
                    <div className="flex items-start gap-3 pb-3 border-b">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-semibold text-yellow-600">Last Updated</p>
                        <p className="text-sm text-gray-500">{formatDate(booking.updatedAt)}</p>
                        <p className="text-xs text-gray-400">Booking information was modified</p>
                      </div>
                    </div>
                  )}

                  {booking.visited && (
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-semibold text-green-600">Customer Visited</p>
                        {booking.visitedAt && (
                          <p className="text-sm text-gray-500">{formatDate(booking.visitedAt)}</p>
                        )}
                        <p className="text-xs text-gray-400">Customer attended their session</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Visit Status */}
                <div>
                  <p className="text-sm font-medium mb-2">Visit Status</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={booking.visited ? "default" : "outline"}
                      onClick={markAsVisited}
                      disabled={updating || booking.visited}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Visited
                    </Button>
                    <Button
                      size="sm"
                      variant={!booking.visited ? "default" : "outline"}
                      onClick={markAsNotVisited}
                      disabled={updating || booking.visited}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Not Visited
                    </Button>
                  </div>
                  {booking.visited && (
                    <p className="text-xs text-gray-500 mt-1">
                      Visit status cannot be changed once marked as visited
                    </p>
                  )}
                </div>

                {/* Payment Status */}
                <div>
                  <p className="text-sm font-medium mb-2">Payment Status</p>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant={booking.paymentStatus === "pending" ? "default" : "outline"}
                      onClick={() => updatePaymentStatus("pending")}
                      disabled={updating || !canChangePaymentStatus("pending")}
                      className="w-full justify-start"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Pending
                    </Button>
                    <Button
                      size="sm"
                      variant={booking.paymentStatus === "paid" ? "default" : "outline"}
                      onClick={() => updatePaymentStatus("paid")}
                      disabled={updating || !canChangePaymentStatus("paid")}
                      className="w-full justify-start"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Paid
                    </Button>
                    <Button
                      size="sm"
                      variant={booking.paymentStatus === "failed" ? "default" : "outline"}
                      onClick={() => updatePaymentStatus("failed")}
                      disabled={updating || !canChangePaymentStatus("failed")}
                      className="w-full justify-start"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Failed
                    </Button>
                  </div>
                  {booking.paymentMethod.toLowerCase() === 'cash' && booking.paymentStatus === 'paid' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cash payments cannot be changed from paid status
                    </p>
                  )}
                </div>

                {/* Booking Status */}
                <div>
                  <p className="text-sm font-medium mb-2">Booking Status</p>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant={booking.bookingStatus === "confirmed" ? "default" : "outline"}
                      onClick={() => updateBookingStatusAction("confirmed")}
                      disabled={updating || !canChangeBookingStatus("confirmed")}
                      className="w-full justify-start"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmed
                    </Button>
                    <Button
                      size="sm"
                      variant={booking.bookingStatus === "completed" ? "default" : "outline"}
                      onClick={() => updateBookingStatusAction("completed")}
                      disabled={updating || !canChangeBookingStatus("completed")}
                      className="w-full justify-start"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </Button>
                    <Button
                      size="sm"
                      variant={booking.bookingStatus === "cancelled" ? "default" : "outline"}
                      onClick={() => updateBookingStatusAction("cancelled")}
                      disabled={updating || !canChangeBookingStatus("cancelled")}
                      className="w-full justify-start"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelled
                    </Button>
                  </div>
                  {(booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') && (
                    <p className="text-xs text-gray-500 mt-1">
                      Final booking status cannot be changed
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate per shooter:</span>
                  <span className="font-medium">${booking.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number of shooters:</span>
                  <span className="font-medium">{booking.shootersCount}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-lg text-green-600">${booking.totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{booking.paymentMethod}</span>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Delete this booking permanently. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteBooking}
                  disabled={updating}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {updating ? "Deleting..." : "Delete Booking"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}