import { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Landmark,
  Wallet,
  Smartphone,
  XCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/firebase/auth';
import { db } from '@/firebase/config';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

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
  status: string;
  userId: string;
  userEmail: string;
  userName: string;
  participants?: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    userId: string;
    joinedAt: string;
  }>;
}

interface EventParticipationProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string;
  userId: string;
  joinedAt: string;
}

type PaymentMethod = 'card' | 'upi' | 'cash' | 'wallet';

export default function EventParticipation({ event, isOpen, onClose, onSuccess }: EventParticipationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>(event.participants || []);
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [upiId, setUpiId] = useState('');

  // Check if participant acceptance should be allowed
  const availableSeats = parseInt(event.availableseats);
  const participantAcceptance = availableSeats > 0;

  const fetchParticipants = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', event.id));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        setParticipants(data.participants || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const generateBillId = () => {
    return `BILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const createBill = async (paymentMethod: PaymentMethod, paymentStatus: string) => {
    const billId = generateBillId();
    const billData = {
      amountPaid: parseInt(event.entryfees),
      billDate: serverTimestamp(),
      billId: billId,
      billStatus: "active",
      billType: "event_registration",
      createdAt: serverTimestamp(),
      currency: "INR",
      description: `Registration for event: ${event.name}`,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      eventId: event.id,
      eventName: event.name,
      rangeId: event.rangeId,
      rangeName: event.rangeName,
      rangeOwnerEmail: event.userEmail,
      rangeOwnerId: event.userId,
      userEmail: user?.email,
      userId: user?.uid,
      userName: user?.displayName || formData.name,
      updatedAt: serverTimestamp(),
      participantAcceptance: participantAcceptance
    };

    await addDoc(collection(db, 'bills'), billData);
    return billId;
  };

  const handlePaymentSubmit = async () => {
    // Final check for available seats before processing
    if (!participantAcceptance) {
      toast({
        title: "Event Full",
        description: "Sorry, this event is already full. No more registrations are being accepted.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      let paymentStatus = 'pending';
      
      // For cash payments, mark as paid immediately
      if (paymentMethod === 'cash') {
        paymentStatus = 'paid';
      }
      
      // Create bill first
      const billId = await createBill(paymentMethod, paymentStatus);
      
      // Check if user is already registered
      const isAlreadyRegistered = participants.some(p => p.userId === user?.uid);
      if (isAlreadyRegistered) {
        toast({
          title: "Already Registered",
          description: "You are already registered for this event.",
          variant: "destructive"
        });
        return;
      }

      // Double check available seats from database
      const eventDoc = await getDoc(doc(db, 'events', event.id));
      if (eventDoc.exists()) {
        const currentAvailableSeats = parseInt(eventDoc.data().availableseats);
        if (currentAvailableSeats <= 0) {
          toast({
            title: "Event Full",
            description: "Sorry, this event is already full.",
            variant: "destructive"
          });
          return;
        }
      }

      const participantData = {
        id: user?.uid || '',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        userId: user?.uid || '',
        joinedAt: new Date().toISOString(),
        billId: billId,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus
      };

      // Calculate new available seats count
      const newAvailableSeats = availableSeats - 1;

      // Update event participants and decrement available seats by 1
      await updateDoc(doc(db, 'events', event.id), {
        participants: arrayUnion(participantData),
        availableseats: newAvailableSeats.toString()
      });

      // Create participation record
      await addDoc(collection(db, 'participations'), {
        eventId: event.id,
        eventName: event.name,
        userId: user?.uid,
        userName: formData.name,
        userEmail: formData.email,
        userPhone: formData.phone,
        rangeId: event.rangeId,
        rangeName: event.rangeName,
        status: 'registered',
        registeredAt: serverTimestamp(),
        entryFee: event.entryfees,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        billId: billId,
        participantAcceptance: newAvailableSeats > 0 // Set to false if this was the last seat
      });

      toast({
        title: "Success!",
        description: `You have successfully registered for the event. ${paymentMethod === 'cash' ? 'Payment will be collected at the event.' : 'Payment processed successfully.'}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error registering for event:', error);
      toast({
        title: "Error",
        description: "Failed to register for the event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if registration is allowed
    if (!participantAcceptance) {
      toast({
        title: "Registration Closed",
        description: "This event is full and no longer accepting new participants.",
        variant: "destructive"
      });
      return;
    }
    
    // If event is free, proceed directly without payment
    if (parseInt(event.entryfees) === 0) {
      await handlePaymentSubmit();
      return;
    }
    
    setShowPaymentForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardDetails(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleBackToForm = () => {
    setShowPaymentForm(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {!participantAcceptance ? (
              <XCircle className="w-6 h-6 text-red-500" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
            {showPaymentForm ? 'Payment Details' : (participantAcceptance ? 'Register for Event' : 'Event Full')}
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Event Full Message */}
        {!participantAcceptance && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Event Full</h3>
                <p className="text-sm text-red-700">
                  This event has reached its maximum capacity of participants. Registration is no longer available.
                </p>
              </div>
            </div>
          </div>
        )}

        {!showPaymentForm ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Event Details</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">{event.name}</h4>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>
                    {new Date(event.startDate).toLocaleDateString()}
                    {event.endDate && event.endDate !== event.startDate && (
                      <> - {new Date(event.endDate).toLocaleDateString()}</>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span>{event.startTime} {event.endTime && `- ${event.endTime}`}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>{event.location}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Users className={`w-4 h-4 ${availableSeats === 0 ? 'text-red-500' : 'text-purple-500'}`} />
                  <span className={availableSeats === 0 ? 'text-red-600 font-semibold' : ''}>
                    {availableSeats} seats available
                    {availableSeats === 0 && ' (FULL)'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="font-semibold">₹{event.entryfees}</span>
                  {parseInt(event.entryfees) === 0 && (
                    <span className="text-xs text-green-600">(Free Event)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <div>
              {participantAcceptance ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-700">
                        By registering, you agree to the event terms and conditions. 
                        {parseInt(event.entryfees) > 0 && ' Your registration will be confirmed after payment verification.'}
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    disabled={loading}
                  >
                    {parseInt(event.entryfees) === 0 ? 'Register Now (Free)' : `Proceed to Payment - ₹${event.entryfees}`}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration Closed</h3>
                  <p className="text-gray-600">
                    This event has reached its maximum capacity. Please check back for future events.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Payment Form - Only shown if participantAcceptance is true */
          participantAcceptance && (
            <div className="space-y-6">
              {/* Payment Method Selection */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Select Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} className="grid grid-cols-2 gap-4">
                  <div>
                    <RadioGroupItem value="card" id="card" className="sr-only" />
                    <Label htmlFor="card" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                      <CreditCard className="w-6 h-6 mb-2" />
                      <span>Credit Card</span>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="upi" id="upi" className="sr-only" />
                    <Label htmlFor="upi" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                      <Landmark className="w-6 h-6 mb-2" />
                      <span>UPI</span>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="cash" id="cash" className="sr-only" />
                    <Label htmlFor="cash" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                      <Wallet className="w-6 h-6 mb-2" />
                      <span>Cash</span>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="wallet" id="wallet" className="sr-only" />
                    <Label htmlFor="wallet" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                      <Smartphone className="w-6 h-6 mb-2" />
                      <span>Mobile Wallet</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Details Form */}
              {paymentMethod === 'card' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold">Card Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        name="number"
                        value={cardDetails.number}
                        onChange={handleCardInputChange}
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        name="expiry"
                        value={cardDetails.expiry}
                        onChange={handleCardInputChange}
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        name="cvv"
                        value={cardDetails.cvv}
                        onChange={handleCardInputChange}
                        placeholder="123"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="cardName">Name on Card</Label>
                      <Input
                        id="cardName"
                        name="name"
                        value={cardDetails.name}
                        onChange={handleCardInputChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-3">UPI Payment</h4>
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    required
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-2">You will be redirected to your UPI app for payment confirmation.</p>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Cash Payment</h4>
                  <p className="text-sm text-yellow-700">
                    Payment of ₹{event.entryfees} will be collected at the event venue. Your registration will be confirmed immediately.
                  </p>
                </div>
              )}

              {paymentMethod === 'wallet' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Mobile Wallet Payment</h4>
                  <p className="text-sm text-blue-700">
                    You will be redirected to your mobile wallet app to complete your payment of ₹{event.entryfees}.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToForm}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={loading || !participantAcceptance}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {loading ? 'Processing...' : `Pay ₹${event.entryfees}`}
                </Button>
              </div>
            </div>
          )
        )}

        {/* Participants List */}
        {!showPaymentForm && participants.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-lg mb-3">Current Participants ({participants.length})</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
              {participants.map((participant, index) => (
                <div key={participant.id} className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-b-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{participant.name}</p>
                    <p className="text-xs text-gray-500">{participant.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}