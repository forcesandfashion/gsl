import React, { useState } from "react";
import { X, CreditCard, DollarSign, Smartphone, Wallet, Loader2, CheckCircle } from "lucide-react";
import { db } from "@/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { IndianRupee } from "lucide-react";
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

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  bookingData: BookingData;
  onConfirmBooking?: (paymentMethod: string) => void;
  isLoading?: boolean;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  bookingData, 
  onConfirmBooking,
  isLoading = false
}: ModalProps) {
  const [selectedPayment, setSelectedPayment] = useState<string>("Cash");
  const [processing, setProcessing] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!isOpen) return null;

  const generateBookingId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `BK${timestamp}${random}`;
  };

  const handlePaymentSelection = (method: string) => {
    if (method !== "Cash") {
      toast({
        title: "Payment Method Not Available",
        description: "Currently, only cash payment is available. Other methods coming soon!",
        variant: "destructive",
      });
      return;
    }
    setSelectedPayment(method);
  };

  const handleConfirmBooking = async () => {
    if (selectedPayment !== "Cash") {
      toast({
        title: "Invalid Payment Method",
        description: "Please select cash payment method",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const bookingId = generateBookingId();
      
      // Prepare booking document for Firebase
      const bookingDoc = {
        bookingId: bookingId,
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
        paymentMethod: selectedPayment,
        paymentStatus: "pending", // Cash payment is pending until confirmed at venue
        bookingStatus: "confirmed",
        visited: false,
        createdAt: bookingData.createdAt,
        updatedAt: new Date(),
      };

      // Add booking to Firebase
      const docRef = await addDoc(collection(db, "bookings"), bookingDoc);

      setBookingCreated(true);
      
      toast({
        title: "Booking Created Successfully!",
        description: `Your booking ID: ${bookingId}`,
        variant: "default",
      });

      // Wait a moment to show success state
      setTimeout(() => {
        onClose();
        // Navigate to the range info page
        navigate(`/ranges/${bookingData.rangeId}`);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const isPaymentDisabled = (method: string) => {
    return method !== "Cash";
  };

  // Success state
  if (bookingCreated) {
    return (
      <div className="z-50 fixed top-0 left-0 backdrop-blur-sm bg-black/40 w-full h-full flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 relative transform transition-all duration-300 scale-100">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-4">Your shooting range has been booked successfully.</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-medium">
                Range: {bookingData.rangeName}
              </p>
              <p className="text-green-700">
                Date: {bookingData.date}
              </p>
              <p className="text-green-700">
                Time: {bookingData.timeSlot}
              </p>
            </div>
            <p className="text-sm text-gray-500">Redirecting to range info...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="z-50 fixed top-0 left-0 backdrop-blur-sm bg-black/40 w-full h-full flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 relative transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
        {/* Cross Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 group"
          disabled={processing}
        >
          <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
        </button>

        <h1 className="text-2xl font-semibold mb-6 pr-8">{title}</h1>

        {/* Booking Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Booking Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Range:</span>
              <span className="font-medium">{bookingData.rangeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{bookingData.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">{bookingData.timeSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shooters:</span>
              <span className="font-medium">{bookingData.shootersCount}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-600 font-semibold">Total Amount:</span>
              <span className="font-bold text-lg text-green-600">
                <IndianRupee className="w-5 h-5 inline-block" />
                {bookingData.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Select Payment Method</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handlePaymentSelection("Cash")}
              disabled={processing}
              className={`p-4 rounded-lg font-medium transform transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 flex flex-col items-center gap-2 ${
                selectedPayment === "Cash" 
                  ? "bg-green-500 text-white shadow-lg" 
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <DollarSign className="w-6 h-6" />
              Cash
              <span className="text-xs">Available</span>
            </button>
            
            <button 
              onClick={() => handlePaymentSelection("Card")}
              disabled={processing || isPaymentDisabled("Card")}
              className={`p-4 rounded-lg font-medium transform transition-all duration-200 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed bg-gray-100 text-gray-400`}
            >
              <CreditCard className="w-6 h-6" />
              Card
              <span className="text-xs">Coming Soon</span>
            </button>
            
            <button 
              onClick={() => handlePaymentSelection("UPI")}
              disabled={processing || isPaymentDisabled("UPI")}
              className={`p-4 rounded-lg font-medium transform transition-all duration-200 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed bg-gray-100 text-gray-400`}
            >
              <Smartphone className="w-6 h-6" />
              UPI
              <span className="text-xs">Coming Soon</span>
            </button>
            
            <button 
              onClick={() => handlePaymentSelection("PayPal")}
              disabled={processing || isPaymentDisabled("PayPal")}
              className={`p-4 rounded-lg font-medium transform transition-all duration-200 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed bg-gray-100 text-gray-400`}
            >
              <Wallet className="w-6 h-6" />
              PayPal
              <span className="text-xs">Coming Soon</span>
            </button>
          </div>
        </div>

        {/* Payment Notice */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-center font-medium">
            Cash Payment Selected
          </p>
          <p className="text-amber-600 text-sm text-center mt-1">
            Payment will be collected at the venue before your session
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className={`flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors duration-200 ${
              processing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmBooking}
            disabled={processing || selectedPayment !== "Cash"}
            className={`flex-2 px-6 py-3 font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${
              processing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : selectedPayment === "Cash"
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-400 cursor-not-allowed text-white'
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>

        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}