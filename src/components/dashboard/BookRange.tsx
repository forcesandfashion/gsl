import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { format, isToday, addDays } from "date-fns";
import { ArrowLeft, Clock, User } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import PaymentModal from "./PaymentModal";
import { IndianRupee } from "lucide-react";
interface Range {
  id: string;
  name: string;
  pricePerHour?: string;
  maxBookingsPerSlot?: number;
  structuredOpeningHours?: {
    [day: string]: {
      start: string;
      end: string;
    };
  };
}

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  display: string;
}

interface BookingData {
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
  createdAt: Date;
}

export default function BookRange() {
  const { rangeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [range, setRange] = useState<Range | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [shootersCount, setShootersCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  
  // Time slots for the selected date
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Authentication check - redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book a range.",
        variant: "destructive",
      });
      // Redirect to login or back to range info
      navigate(`/range/${rangeId}`);
    }
  }, [user, authLoading, navigate, toast, rangeId]);

  useEffect(() => {
    const fetchRange = async () => {
      // Don't fetch if user is not authenticated
      if (!user) return;

      try {
        if (!rangeId) {
          toast({
            title: "Error",
            description: "No range ID provided.",
            variant: "destructive",
          });
          navigate("/ranges");
          return;
        }

        const rangeRef = doc(db, "ranges", rangeId);
        const rangeSnap = await getDoc(rangeRef);

        if (!rangeSnap.exists()) {
          toast({
            title: "Not Found",
            description: "This shooting range does not exist.",
            variant: "destructive",
          });
          navigate("/ranges");
          return;
        }

        const data = rangeSnap.data() as Range;
        setRange({
          id: rangeSnap.id,
          name: data.name,
          pricePerHour: data.pricePerHour,
          maxBookingsPerSlot: data.maxBookingsPerSlot || 5,
          structuredOpeningHours: data.structuredOpeningHours,
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load range info",
          variant: "destructive",
        });
        navigate("/ranges");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRange();
    }
  }, [rangeId, navigate, toast, user]);

  // Generate dynamic time slots based on selected date and opening hours
  useEffect(() => {
    if (!date || !range?.structuredOpeningHours) return;
    
    const dayOfWeek = format(date, "EEEE");
    const hours = range.structuredOpeningHours[dayOfWeek];
    
    // Handle days when the range is closed
    if (!hours?.start || !hours?.end) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }
    
    // Parse opening/closing times
    const [startHour, startMinute] = hours.start.split(":").map(Number);
    const [endHour, endMinute] = hours.end.split(":").map(Number);
    
    // Convert to minutes for easier calculation
    const openingTime = startHour * 60 + startMinute;
    const closingTime = endHour * 60 + endMinute;
    
    // Slot generation parameters (60-min slots)
    const slotDuration = 60; // 1 hour intervals
    const slots: TimeSlot[] = [];
    
    // Helper function to format time with AM/PM
    const formatTimeWithAmPm = (hour: number, minute: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      return `${displayHour}:${displayMinute} ${period}`;
    };

    // Generate time slots every 60 minutes
    for (let time = openingTime; time < closingTime; time += slotDuration) {
      const startSlotHour = Math.floor(time / 60);
      const startSlotMinute = time % 60;
      
      const endTime = time + slotDuration;
      const endSlotHour = Math.floor(endTime / 60);
      const endSlotMinute = endTime % 60;
      
      // Format start and end times with AM/PM
      const startFormatted = formatTimeWithAmPm(startSlotHour, startSlotMinute);
      const endFormatted = formatTimeWithAmPm(endSlotHour, endSlotMinute);
      
      // For internal use (24-hour format)
      const startTime24 = `${startSlotHour.toString().padStart(2, '0')}:${startSlotMinute.toString().padStart(2, '0')}`;
      const endTime24 = `${endSlotHour.toString().padStart(2, '0')}:${endSlotMinute.toString().padStart(2, '0')}`;
      
      // Create slot object
      const slot: TimeSlot = {
        id: `${startTime24}-${endTime24}`,
        start: startTime24,
        end: endTime24,
        display: `${startFormatted} - ${endFormatted}`
      };
      
      slots.push(slot);
    }
    
    // Filter out past slots if today
    const currentTime = new Date();
    const filteredSlots = isToday(date) 
      ? slots.filter(slot => {
          const [slotHour, slotMinute] = slot.start.split(":").map(Number);
          return (
            slotHour > currentTime.getHours() || 
            (slotHour === currentTime.getHours() && slotMinute > currentTime.getMinutes())
          );
        })
      : slots;
    
    setAvailableSlots(filteredSlots);
    
    // Reset selected slot if it's no longer available
    if (selectedSlot && !filteredSlots.find(slot => slot.id === selectedSlot.id)) {
      setSelectedSlot(filteredSlots[0] || null);
    } else if (!selectedSlot && filteredSlots.length > 0) {
      setSelectedSlot(filteredSlots[0]);
    }
  }, [date, range, selectedSlot]);

  const handleBooking = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book a range",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Date Required",
        description: "Please select a booking date",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSlot) {
      toast({
        title: "Time Slot Required",
        description: "Please select an available time slot",
        variant: "destructive",
      });
      return;
    }

    if (shootersCount < 1 || shootersCount > (range?.maxBookingsPerSlot || 5)) {
      toast({
        title: "Invalid Shooter Count",
        description: `Please select between 1 and ${range?.maxBookingsPerSlot || 5} shooters`,
        variant: "destructive",
      });
      return;
    }

    if (!range || !rangeId) {
      toast({
        title: "Error",
        description: "Range information is not available",
        variant: "destructive",
      });
      return;
    }

    // Prepare booking data
    const totalPrice = parseFloat(range.pricePerHour || "0") * shootersCount;
    const createdAt = new Date();
    
    const bookingInfo: BookingData = {
      rangeId: rangeId,
      userId: user.uid,
      userName: user.displayName || user.email || "Unknown User",
      rangeName: range.name,
      price: range.pricePerHour || "0",
      shootersCount: shootersCount,
      timeSlot: selectedSlot.display,
      date: format(date, "PPP"), // Long date format
      day: format(date, "EEEE"), // Day of week
      totalPrice: totalPrice,
      createdAt: createdAt,
    };

    setBookingData(bookingInfo);
    setShowModal(true);
  };

  const handleConfirmBooking = async (paymentMethod: string) => {
    if (!bookingData || !user) {
      toast({
        title: "Error",
        description: "Booking data is missing",
        variant: "destructive",
      });
      return;
    }

    // Only allow Cash payment
    if (paymentMethod !== "Cash") {
      toast({
        title: "Payment Method Not Available",
        description: "Currently, only cash payment is available",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingBooking(true);

    try {
      // Prepare booking document for Firebase
      const bookingDoc = {
        rangeId: bookingData.rangeId,
        userId: bookingData.userId,
        userName: bookingData.userName,
        rangeName: bookingData.rangeName,
        price: bookingData.price,
        shootersCount: bookingData.shootersCount,
        timeSlot: bookingData.timeSlot,
        date: bookingData.date,
        day: bookingData.day,
        totalPrice: bookingData.totalPrice,
        paymentMethod: paymentMethod,
        paymentStatus: "pending", // Since it's cash payment
        bookingStatus: "confirmed",
        createdAt: bookingData.createdAt,
        updatedAt: new Date(),
      };

      // Add booking to Firebase
      const docRef = await addDoc(collection(db, "bookings"), bookingDoc);

      toast({
        title: "Booking Confirmed!",
        description: `Your booking has been confirmed. Booking ID: ${docRef.id}`,
        variant: "default",
      });

      // Navigate to bookings page or success page
      navigate("/bookings");
      
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBooking(false);
      setShowModal(false);
    }
  };

  const getTotalHours = () => {
    if (!date || !range?.structuredOpeningHours) return 0;
    
    const dayOfWeek = format(date, "EEEE");
    const hours = range.structuredOpeningHours[dayOfWeek];
    
    if (!hours?.start || !hours?.end) return 0;
    
    const [startHour, startMinute] = hours.start.split(":").map(Number);
    const [endHour, endMinute] = hours.end.split(":").map(Number);
    
    const startTime = startHour + startMinute / 60;
    const endTime = endHour + endMinute / 60;
    
    return Math.floor(endTime - startTime);
  };

  // Show loading while checking auth or fetching data
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 text-lg mt-4">
            {authLoading ? "Checking authentication..." : "Loading range information..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated (will be redirected)
  if (!user) {
    return null;
  }

  if (!range) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Range not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(`/ranges/${rangeId}`)}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Range
      </Button>

      {/* Payment Modal */}
      {bookingData && (
        <PaymentModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Complete Your Booking"
          bookingData={bookingData}
          onConfirmBooking={handleConfirmBooking}
          isLoading={isCreatingBooking}
        />
      )}

      <h1 className="text-3xl font-bold text-center mb-2">Book {range.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        {/* Left Column - Booking Details */}
        <div className="bg-white p-6 rounded-xl shadow border">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" /> 
            Select Date & Time
          </h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="date" className="block mb-2 font-medium">
                Select Date
              </Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border mx-auto"
                disabled={(date) => date < addDays(new Date(), -1)}
                fromDate={new Date()}
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                {date ? format(date, "EEEE, MMMM do") : "Select a date"}
              </p>
              {date && range?.structuredOpeningHours && (
                <div className="text-center mt-2">
                  <p className="text-sm font-medium text-blue-600">
                    {getTotalHours() > 0 
                      ? `${getTotalHours()} hours available (${availableSlots.length} slots)`
                      : "Closed on this day"
                    }
                  </p>
                </div>
              )}
            </div>
            
            {availableSlots.length > 0 ? (
              <div>
                <Label htmlFor="time" className="block mb-2 font-medium">
                  Available Time Slots ({availableSlots.length} available)
                </Label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                      onClick={() => setSelectedSlot(slot)}
                      className="py-3 px-3 text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors text-left justify-start"
                    >
                      {slot.display}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Each slot is 1 hour long
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">
                  {date && range.structuredOpeningHours?.[format(date, "EEEE")]
                    ? "No available time slots for selected date"
                    : "Range is closed on this day"}
                </p>
                <p className="text-sm mt-1">
                  {date && range.structuredOpeningHours?.[format(date, "EEEE")] && isToday(date)
                    ? "All slots for today have passed"
                    : "Please select a different date"}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="shooters" className="block mb-2 font-medium">
                Number of Shooters
              </Label>
              <Input
                id="shooters"
                type="number"
                min="1"
                max={range.maxBookingsPerSlot || 5}
                value={shootersCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setShootersCount(Math.max(1, Math.min(value, range.maxBookingsPerSlot || 5)));
                  }
                }}
                className="w-32"
              />
              <p className="text-sm text-gray-500 mt-1">
                Max {range.maxBookingsPerSlot || 5} shooters per slot
              </p>
            </div>
          </div>
        </div>
        
        {/* Right Column - Summary */}
        <div className="bg-white p-6 rounded-xl shadow border">
          <h2 className="text-xl font-semibold mb-6">Booking Summary</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Range:</span>
              <span className="font-medium">{range.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {date ? format(date, "PPP") : "Not selected"}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Time Slot:</span>
              <span className="font-medium">
                {selectedSlot ? selectedSlot.display : "Not selected"}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">1 hour</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Shooters:</span>
              <span className="font-medium">{shootersCount}</span>
            </div>
            
            {range.pricePerHour && (
              <div className="flex justify-between border-t pt-3 mt-3">
                <span className="text-gray-600 font-semibold">Total:</span>
                <span className="font-bold text-lg text-green-600 flex ">
                  <IndianRupee className="w-5 h-5  mt-1"/>
                  {(parseFloat(range.pricePerHour) * shootersCount).toFixed(2)}
                </span>
              </div>
            )}
            
            <Button 
              onClick={handleBooking}
              className="w-full mt-6 py-6 text-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              disabled={!date || !selectedSlot || availableSlots.length === 0 || isCreatingBooking}
            >
              {isCreatingBooking ? "Creating Booking..." :
               !date ? "Select Date" : 
               !selectedSlot ? "Select Time Slot" : 
               "Confirm Booking"}
            </Button>
            
            {user && (
              <div className="flex items-center mt-4 text-sm text-gray-500">
                <User className="w-4 h-4 mr-2" />
                Booking as: {user.email}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}