import React, { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  CreditCard, 
  Smartphone,
  Wallet,
  Banknote,
  Star,
  Shield,
  Clock,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface Range {
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  ownerEmail?: string;
  ownerId?: string;
}

interface PricingPlan {
  duration: string;
  months: number;
  price: number;
  enabled: boolean;
}

interface SubscriptionData {
  plans: PricingPlan[];
  features: string[];
  title: string;
  description: string;
  isActive: boolean;
}

interface ExistingSubscription {
  id: string;
  userId: string;
  rangeId: string;
  endDate: Timestamp;
  subscriptionStatus: string;
}

type PaymentMethod = 'upi' | 'card' | 'paypal' | 'cash';

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const [range, setRange] = useState<Range | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [existingSubscription, setExistingSubscription] = useState<ExistingSubscription | null>(null);
  const { toast } = useToast();
  const { rangeId } = useParams();
  const navigate = useNavigate();

  const paymentMethods = [
    {
      id: 'upi' as PaymentMethod,
      name: 'UPI',
      icon: Smartphone,
      description: 'Pay using UPI apps like GPay, PhonePe, Paytm',
      color: 'bg-green-50 border-green-200 text-green-800',
      available: true
    },
    {
      id: 'card' as PaymentMethod,
      name: 'Card',
      icon: CreditCard,
      description: 'Credit/Debit cards (Visa, MasterCard, RuPay)',
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      available: false
    },
    {
      id: 'paypal' as PaymentMethod,
      name: 'PayPal',
      icon: Wallet,
      description: 'Secure PayPal payments',
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      available: false
    },
    {
      id: 'cash' as PaymentMethod,
      name: 'Cash',
      icon: Banknote,
      description: 'Pay at the range counter',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      available: true
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!rangeId) {
          toast({
            title: "Error",
            description: "No range ID provided.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        if (!user) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to access subscriptions.",
            variant: "destructive",
          });
          navigate(`/login?returnTo=/subscription/${rangeId}`);
          return;
        }

        // Fetch range data
        const rangeRef = doc(db, "ranges", rangeId);
        const rangeSnap = await getDoc(rangeRef);

        if (!rangeSnap.exists()) {
          toast({
            title: "Not Found",
            description: "This shooting range does not exist.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        const rangeData = rangeSnap.data();
        setRange({
          id: rangeSnap.id,
          name: rangeData.name,
          logoUrl: rangeData.logoUrl,
          address: rangeData.address,
          ownerEmail: rangeData.ownerEmail,
          ownerId: rangeData.ownerId
        });

        // Fetch subscription settings
        const subscriptionSettings = rangeData.subscriptionSettings as SubscriptionData;
        
        if (!subscriptionSettings || !subscriptionSettings.isActive) {
          toast({
            title: "Subscription Not Available",
            description: "This range doesn't offer premium subscriptions yet.",
            variant: "destructive",
          });
          navigate(`/ranges/${rangeId}`);
          return;
        }

        setSubscriptionData(subscriptionSettings);
        
        // Set default selected plan (first enabled plan)
        const firstEnabledPlan = subscriptionSettings.plans.find(plan => plan.enabled && plan.price > 0);
        if (firstEnabledPlan) {
          setSelectedPlan(firstEnabledPlan);
        }

        // Check for existing active subscription
        await checkExistingSubscription();

      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load subscription data",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rangeId, user, toast, navigate]);

  const checkExistingSubscription = async () => {
    if (!user || !rangeId) return;

    try {
      const subscriptionsRef = collection(db, "subscriptions");
      const q = query(
        subscriptionsRef,
        where("userId", "==", user.uid),
        where("rangeId", "==", rangeId),
        where("subscriptionStatus", "==", "active")
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const subscriptionDoc = querySnapshot.docs[0];
        const subscriptionData = subscriptionDoc.data();
        
        setExistingSubscription({
          id: subscriptionDoc.id,
          userId: subscriptionData.userId,
          rangeId: subscriptionData.rangeId,
          endDate: subscriptionData.endDate,
          subscriptionStatus: subscriptionData.subscriptionStatus
        });
      }
    } catch (error) {
      console.error("Error checking existing subscription:", error);
    }
  };

  const calculateSavings = (plan: PricingPlan) => {
    if (!subscriptionData || plan.months <= 1) return 0;
    const monthlyPrice = subscriptionData.plans.find(p => p.months === 1)?.price || 0;
    return (plan.months * monthlyPrice) - plan.price;
  };

  const createBill = async (subscriptionId: string, isExtension: boolean = false) => {
    if (!selectedPlan || !range || !user) return null;

    const billData = {
      // Bill identification
      billId: `BILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId,
      
      // User details
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
      
      // Range details
      rangeId: range.id,
      rangeName: range.name,
      rangeOwnerEmail: range.ownerEmail,
      rangeOwnerId: range.ownerId,
      
      // Transaction details
      planDuration: selectedPlan.duration,
      planMonths: selectedPlan.months,
      amountPaid: selectedPlan.price,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: selectedPaymentMethod === 'cash' ? 'pending' : 'completed',
      
      // Bill type and status
      billType: isExtension ? 'subscription_extension' : 'new_subscription',
      billStatus: 'active',
      
      // Timestamps
      billDate: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      
      // Additional metadata
      currency: 'INR',
      description: `${isExtension ? 'Extension' : 'New'} subscription for ${selectedPlan.duration} at ${range.name}`,
    };

    try {
      const billsRef = collection(db, "bills");
      const billDocRef = await addDoc(billsRef, billData);
      return billDocRef.id;
    } catch (error) {
      console.error("Error creating bill:", error);
      throw error;
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !range || !user || !subscriptionData) return;

    setProcessing(true);
    try {
      const now = Timestamp.now();
      let subscriptionId: string;
      let isExtension = false;

      if (existingSubscription) {
        // Extend existing subscription
        isExtension = true;
        subscriptionId = existingSubscription.id;
        
        // Calculate new end date (extend from current end date)
        const currentEndDate = existingSubscription.endDate.toDate();
        const extensionMs = selectedPlan.months * 30 * 24 * 60 * 60 * 1000;
        const newEndDate = new Date(currentEndDate.getTime() + extensionMs);

        // Update existing subscription
        const subscriptionRef = doc(db, "subscriptions", existingSubscription.id);
        await updateDoc(subscriptionRef, {
          endDate: Timestamp.fromDate(newEndDate),
          updatedAt: now,
          // Add extension history
          extensions: [
            ...(existingSubscription as any).extensions || [],
            {
              planDuration: selectedPlan.duration,
              planMonths: selectedPlan.months,
              price: selectedPlan.price,
              paymentMethod: selectedPaymentMethod,
              extendedAt: now,
              previousEndDate: existingSubscription.endDate,
              newEndDate: Timestamp.fromDate(newEndDate)
            }
          ]
        });

        toast({
          title: "Subscription Extended!",
          description: `Your subscription has been extended by ${selectedPlan.months} month${selectedPlan.months > 1 ? 's' : ''} until ${newEndDate.toLocaleDateString()}`,
        });
      } else {
        // Create new subscription
        const startDate = now;
        const endDate = Timestamp.fromDate(new Date(Date.now() + (selectedPlan.months * 30 * 24 * 60 * 60 * 1000)));
        
        const newSubscriptionData = {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
          rangeId: range.id,
          rangeName: range.name,
          planDuration: selectedPlan.duration,
          planMonths: selectedPlan.months,
          price: selectedPlan.price,
          paymentMethod: selectedPaymentMethod,
          paymentStatus: selectedPaymentMethod === 'cash' ? 'pending' : 'completed',
          subscriptionStatus: 'active',
          startDate,
          endDate,
          features: subscriptionData.features,
          extensions: [],
          createdAt: now,
          updatedAt: now
        };

        // Save new subscription
        const subscriptionsRef = collection(db, "subscriptions");
        const docRef = await addDoc(subscriptionsRef, newSubscriptionData);
        subscriptionId = docRef.id;

        toast({
          title: "Subscription Successful!",
          description: `Your ${selectedPlan.duration} subscription is ${selectedPaymentMethod === 'cash' ? 'reserved. Please pay at the counter.' : 'active!'}`,
        });
      }

      // Create bill for this transaction (always create a new bill)
      await createBill(subscriptionId, isExtension);

      // Navigate back to range page
      navigate(`/ranges/${rangeId}`);

    } catch (error: any) {
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to process subscription",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 text-lg mt-4">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (!range || !subscriptionData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
          <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Subscription Not Available</h3>
          <p className="text-gray-500 mb-6">Premium subscriptions are not available for this range.</p>
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate(`/ranges/${rangeId}`)}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Range
              </Button>
              <div className="flex items-center gap-3">
                {range.logoUrl && (
                  <img 
                    src={range.logoUrl} 
                    alt={range.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-200"
                  />
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{range.name}</h1>
                  <p className="text-sm text-gray-600">Premium Subscription</p>
                </div>
              </div>
            </div>
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Side - Payment Methods & Plan Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Selection */}
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Star className="w-6 h-6 text-yellow-500" />
                  Choose Your Plan
                </CardTitle>
                <p className="text-gray-600">{subscriptionData.description}</p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="grid md:grid-cols-2 gap-4">
                  {subscriptionData.plans
                    .filter(plan => plan.enabled && plan.price > 0)
                    .map((plan, index) => (
                    <div
                      key={plan.duration}
                      onClick={() => setSelectedPlan(plan)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                        selectedPlan?.duration === plan.duration
                          ? "border-blue-500 bg-blue-50 shadow-md transform scale-105"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      )}
                    >
                      {calculateSavings(plan) > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                          Save ₹{Math.round(calculateSavings(plan))}
                        </Badge>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{plan.duration}</h3>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">₹{plan.price}</p>
                          <p className="text-sm text-gray-500">₹{Math.round(plan.price / plan.months)}/month</p>
                        </div>
                      </div>
                      {selectedPlan?.duration === plan.duration && (
                        <div className="absolute top-2 left-2">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                  Payment Method
                </CardTitle>
                <p className="text-gray-600">Select how you'd like to pay</p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      onClick={() => method.available && setSelectedPaymentMethod(method.id)}
                      className={cn(
                        "relative p-4 rounded-lg border-2 transition-all duration-200",
                        !method.available 
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                          : selectedPaymentMethod === method.id
                          ? "border-blue-500 bg-blue-50 cursor-pointer shadow-md"
                          : "border-gray-200 hover:border-gray-300 cursor-pointer hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          method.available ? method.color : "bg-gray-100"
                        )}>
                          <method.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{method.name}</h3>
                            {!method.available && (
                              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{method.description}</p>
                        </div>
                        {method.available && selectedPaymentMethod === method.id && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Summary */}
          <div className="space-y-6">
            {/* Subscription Summary */}
            <Card className="p-6 sticky top-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Shield className="w-6 h-6 text-green-500" />
                  Subscription Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-4">
                {selectedPlan ? (
                  <>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {selectedPlan.duration} Plan
                            {existingSubscription && (
                              <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">
                                Extension
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {existingSubscription 
                              ? `Extend by ${selectedPlan.months} month${selectedPlan.months > 1 ? 's' : ''}`
                              : `${selectedPlan.months} month${selectedPlan.months > 1 ? 's' : ''} access`
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">₹{selectedPlan.price}</p>
                          <p className="text-sm text-gray-500">
                            ₹{Math.round(selectedPlan.price / selectedPlan.months)}/month
                          </p>
                        </div>
                      </div>
                      {calculateSavings(selectedPlan) > 0 && (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <Star className="w-4 h-4" />
                          You save ₹{Math.round(calculateSavings(selectedPlan))} vs monthly!
                        </div>
                      )}
                    </div>

                    {/* Show current subscription info if exists */}
                    {existingSubscription && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Crown className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-blue-800">Current Subscription</span>
                        </div>
                        <p className="text-blue-700">
                          Active until: {existingSubscription.endDate.toDate().toLocaleDateString()}
                        </p>
                        {selectedPlan && (
                          <p className="text-blue-700">
                            After extension: {new Date(
                              existingSubscription.endDate.toDate().getTime() + 
                              (selectedPlan.months * 30 * 24 * 60 * 60 * 1000)
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Premium Features
                      </h4>
                      <ul className="space-y-2">
                        {subscriptionData.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {existingSubscription ? 'Extension Period' : 'Subscription Period'}
                        </span>
                      </div>
                      {existingSubscription && selectedPlan ? (
                        <p className="text-sm text-gray-700">
                          Extension: {new Date().toLocaleDateString()} - {' '}
                          {new Date(
                            existingSubscription.endDate.toDate().getTime() + 
                            (selectedPlan.months * 30 * 24 * 60 * 60 * 1000)
                          ).toLocaleDateString()}
                        </p>
                      ) : selectedPlan ? (
                        <p className="text-sm text-gray-700">
                          {new Date().toLocaleDateString()} - {' '}
                          {new Date(Date.now() + (selectedPlan.months * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Amount</span>
                        <span className="text-blue-600">₹{selectedPlan.price}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Payment via {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
                      </p>
                    </div>

                    <Button 
                      onClick={handleSubscribe}
                      disabled={processing}
                      className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                    >
                      {processing ? (
                        <>
                          <LoadingSpinner />
                          <span className="ml-2">Processing...</span>
                        </>
                      ) : (
                        <>
                          <Crown className="w-5 h-5 mr-2" />
                          {existingSubscription ? 'Extend Subscription' : 'Subscribe Now'}
                        </>
                      )}
                    </Button>

                    {selectedPaymentMethod === 'cash' && (
                      <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded">
                        You'll need to pay ₹{selectedPlan.price} at the range counter to {existingSubscription ? 'extend your subscription' : 'activate your subscription'}.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Crown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a plan to see summary</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Note */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 text-sm">Secure & Safe</h4>
                  <p className="text-xs text-green-700 mt-1">
                    Your payment information is encrypted and secure. Cancel anytime from your dashboard.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}