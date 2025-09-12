import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, addDoc, doc, getDoc, Timestamp, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { QrCode, Calendar, Check, X, Camera, Scan, MapPin, Crown, Clock, Shield, AlertTriangle, UserCheck, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

interface Subscription {
  id: string;
  userId: string;
  rangeId: string;
  rangeName: string;
  startDate: any;
  endDate: any;
  subscriptionStatus: string;
  planDuration: string;
  planMonths: number;
  features: string[];
  amountPaid?: number;
  paymentStatus?: string;
}

interface Range {
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  ownerEmail?: string;
  subscriptionSettings?: {
    isActive: boolean;
    features: string[];
  };
}

interface Attendance {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rangeId: string;
  rangeName: string;
  date: string;
  timestamp: any;
  subscriptionId: string;
  status: 'present' | 'absent';
  checkInTime: string;
}

interface ValidationResult {
  isValid: boolean;
  subscription: Subscription | null;
  range: Range | null;
  message: string;
  remainingDays?: number;
}

export default function ShooterScanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualRangeId, setManualRangeId] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todaysAttendance, setTodaysAttendance] = useState<Attendance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      loadAttendance();
      checkTodaysAttendance();
    }
  }, [user, currentMonth]);

  useEffect(() => {
    if (scanning && cameraReady) {
      startQRDetection();
    } else {
      stopQRDetection();
    }
    return () => {
      stopQRDetection();
    };
  }, [scanning, cameraReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const loadAttendance = async () => {
    if (!user) return;

    try {
      const attendanceRef = collection(db, "attendance");
      
      const q = query(
        attendanceRef,
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const attendanceData: Attendance[] = [];
      
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const startDateString = startOfMonth.toISOString().split('T')[0];
      const endDateString = endOfMonth.toISOString().split('T')[0];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Attendance;
        
        if (data.date >= startDateString && data.date <= endDateString) {
          attendanceData.push({
            ...data,
            id: doc.id
          });
        }
      });
      
      attendanceData.sort((a, b) => {
        const aTimestamp = a.timestamp?.toMillis?.() || new Date(a.timestamp).getTime();
        const bTimestamp = b.timestamp?.toMillis?.() || new Date(b.timestamp).getTime();
        return bTimestamp - aTimestamp;
      });
      
      setAttendance(attendanceData);
    } catch (error) {
      console.error("Error loading attendance:", error);
      toast({
        title: "Error Loading Attendance",
        description: "Could not load attendance data. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  const checkTodaysAttendance = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceRef = collection(db, "attendance");
      
      const q = query(
        attendanceRef,
        where("userId", "==", user.uid),
        where("date", "==", today)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("No attendance found for today");
        setTodaysAttendance(null);
        return;
      }
      
      const todaysRecords: Attendance[] = [];
      querySnapshot.forEach((doc) => {
        todaysRecords.push({
          ...doc.data(),
          id: doc.id
        } as Attendance);
      });
      
      todaysRecords.sort((a, b) => {
        const aTimestamp = a.timestamp?.toMillis?.() || new Date(a.timestamp).getTime();
        const bTimestamp = b.timestamp?.toMillis?.() || new Date(b.timestamp).getTime();
        return bTimestamp - aTimestamp;
      });
      
      setTodaysAttendance(todaysRecords[0]);
    } catch (error) {
      console.error("Error checking today's attendance:", error);
      setTodaysAttendance(null);
    }
  };

  const startQRDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const detectQR = () => {
      if (videoRef.current && 
          videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
          videoRef.current.videoWidth > 0 && 
          videoRef.current.videoHeight > 0) {
        
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          console.log('QR Code detected:', code.data);
          handleScanRange(code.data);
          setScanning(false);
          return;
        }
      }
      
      if (scanning) {
        animationFrameId.current = requestAnimationFrame(detectQR);
      }
    };

    detectQR();
  };

  const stopQRDetection = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const startCamera = async () => {
    try {
      stopCamera(); // Clean up any existing stream
      
      console.log('Requesting camera access...');
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Handle video loaded
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded');
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Video playing successfully');
                setCameraReady(true);
                setScanning(true);
              })
              .catch((error) => {
                console.error('Error playing video:', error);
                toast({
                  title: "Camera Error",
                  description: "Could not start video playback",
                  variant: "destructive"
                });
              });
          }
        };

        const handleCanPlay = () => {
          console.log('Video can play');
          setCameraReady(true);
        };

        const handleError = (error: any) => {
          console.error('Video element error:', error);
          toast({
            title: "Camera Error",
            description: "Error with video element",
            variant: "destructive"
          });
        };

        // Add event listeners
        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoRef.current.addEventListener('canplay', handleCanPlay);
        videoRef.current.addEventListener('error', handleError);
        
        // Store cleanup function
        const cleanup = () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoRef.current.removeEventListener('canplay', handleCanPlay);
            videoRef.current.removeEventListener('error', handleError);
          }
        };

        // Clean up on component unmount or when starting new camera
        return cleanup;
      }
    } catch (error) {
      console.error("Camera access error:", error);
      let errorMessage = "Please allow camera access to scan QR codes";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera access was denied. Please enable camera permissions and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found on this device.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "Camera is not supported in this browser.";
      }
      
      toast({
        title: "Camera Access Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      setScanning(false);
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    
    // Stop QR detection
    stopQRDetection();

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.kind);
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  };

  const validateSubscriptionAndMarkAttendance = async (rangeId: string): Promise<ValidationResult> => {
    if (!user || !rangeId) {
      return {
        isValid: false,
        subscription: null,
        range: null,
        message: "Invalid user or range ID"
      };
    }

    setLoading(true);
    
    try {
      const range = await loadRangeDetails(rangeId);
      if (!range) {
        return {
          isValid: false,
          subscription: null,
          range: null,
          message: "Range not found. Please check the QR code and try again."
        };
      }

      const subscriptionsRef = collection(db, "subscriptions");
      const subscriptionQuery = query(
        subscriptionsRef,
        where("userId", "==", user.uid),
        where("rangeId", "==", rangeId),
        where("subscriptionStatus", "==", "active")
      );
      
      const subscriptionSnapshot = await getDocs(subscriptionQuery);
      
      if (subscriptionSnapshot.empty) {
        return {
          isValid: false,
          subscription: null,
          range,
          message: `No active subscription found for ${range.name}. Please purchase a subscription to access this range.`
        };
      }

      const subscriptionDoc = subscriptionSnapshot.docs[0];
      const subscriptionData = subscriptionDoc.data() as Subscription;
      const subscription = { ...subscriptionData, id: subscriptionDoc.id };
      
      const now = new Date();
      const endDate = subscription.endDate?.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
      const startDate = subscription.startDate?.toDate ? subscription.startDate.toDate() : new Date(subscription.startDate);
      
      if (now < startDate) {
        const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          isValid: false,
          subscription,
          range,
          message: `Subscription not yet active. It will start in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}.`
        };
      }

      if (now > endDate) {
        return {
          isValid: false,
          subscription,
          range,
          message: `Subscription expired on ${endDate.toLocaleDateString()}. Please renew your subscription.`
        };
      }

      if (subscription.paymentStatus === 'pending') {
        return {
          isValid: false,
          subscription,
          range,
          message: `Subscription payment is pending. Please complete payment to access the range.`
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const existingAttendance = attendance.find(
        a => a.rangeId === rangeId && a.date === today
      );
      
      if (existingAttendance) {
        return {
          isValid: false,
          subscription,
          range,
          message: `Attendance already marked for ${range.name} today at ${existingAttendance.checkInTime}.`
        };
      }

      await markAttendance(rangeId, subscription.id, range.name);

      const remainingDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        isValid: true,
        subscription,
        range,
        message: `Welcome to ${range.name}! Attendance marked successfully.`,
        remainingDays
      };

    } catch (error) {
      console.error("Error validating subscription:", error);
      return {
        isValid: false,
        subscription: null,
        range: null,
        message: "Error validating subscription. Please try again."
      };
    } finally {
      setLoading(false);
    }
  };

  const loadRangeDetails = async (rangeId: string): Promise<Range | null> => {
    try {
      const rangeRef = doc(db, "ranges", rangeId);
      const rangeSnap = await getDoc(rangeRef);
      
      if (rangeSnap.exists()) {
        return {
          ...rangeSnap.data(),
          id: rangeSnap.id
        } as Range;
      }
      return null;
    } catch (error) {
      console.error("Error loading range details:", error);
      return null;
    }
  };

  const markAttendance = async (rangeId: string, subscriptionId: string, rangeName: string) => {
    if (!user) return;

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const checkInTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const attendanceData: Omit<Attendance, 'id'> = {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
        userEmail: user.email || '',
        rangeId: rangeId,
        rangeName: rangeName,
        date: today,
        timestamp: Timestamp.now(),
        subscriptionId: subscriptionId,
        status: 'present',
        checkInTime: checkInTime
      };

      const attendanceRef = collection(db, "attendance");
      await addDoc(attendanceRef, attendanceData);

      await loadAttendance();
      await checkTodaysAttendance();

    } catch (error) {
      console.error("Error marking attendance:", error);
      throw error;
    }
  };

  const handleScanRange = async (rangeId: string) => {
    if (!rangeId.trim()) {
      toast({
        title: "Invalid Range ID",
        description: "Please enter a valid range ID",
        variant: "destructive"
      });
      return;
    }

    setCurrentRange(null);
    setCurrentSubscription(null);
    setValidationResult(null);

    const result = await validateSubscriptionAndMarkAttendance(rangeId.trim());
    
    setValidationResult(result);
    setCurrentRange(result.range);
    setCurrentSubscription(result.subscription);

    if (result.isValid) {
      toast({
        title: "Success!",
        description: result.message,
        duration: 5000
      });
    } else {
      toast({
        title: "Access Denied",
        description: result.message,
        variant: "destructive",
        duration: 6000
      });
    }
    
    setManualRangeId('');
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const attendanceRecord = attendance.find(a => a.date === dateString);
      days.push({ 
        day, 
        dateString, 
        hasAttendance: !!attendanceRecord,
        attendanceRecord
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getValidationStatusCard = () => {
    if (!validationResult) return null;

    const { isValid, subscription, range, message, remainingDays } = validationResult;

    return (
      <Card className={`border-l-4 ${isValid ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {isValid ? (
              <UserCheck className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold ${isValid ? 'text-green-800' : 'text-red-800'}`}>
                {isValid ? 'Access Granted' : 'Access Denied'}
              </h4>
              <p className={`text-sm mt-1 ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                {message}
              </p>
              {isValid && subscription && remainingDays && (
                <div className="mt-2 text-xs text-green-600">
                  <p>Subscription expires in {remainingDays} days</p>
                  <p>Plan: {subscription.planDuration}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Today's Status */}
      {todaysAttendance && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-800">Today's Attendance Marked</h4>
                <p className="text-sm text-blue-700">
                  {todaysAttendance.rangeName} at {todaysAttendance.checkInTime}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Range QR Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scanning ? (
            <div className="text-center space-y-4">
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">
                  Scan the range QR code to check-in and mark attendance
                </p>
                <Button onClick={startCamera} className="w-full max-w-xs">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera Scanner
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or enter manually for testing</span>
                </div>
              </div>
              
              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Enter Range ID (e.g., HxnuyVFqquKaSnlyAENE)"
                  value={manualRangeId}
                  onChange={(e) => setManualRangeId(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <Button 
                  onClick={() => handleScanRange(manualRangeId)}
                  disabled={loading || !manualRangeId.trim()}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      Check In
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative max-w-md mx-auto bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto rounded-lg"
                  style={{ 
                    minHeight: '300px',
                    maxHeight: '400px',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Loading indicator */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}
                
                {/* QR Scanner Overlay - only show when camera is ready */}
                {cameraReady && (
                  <>
                    <div className="absolute inset-0 border-4 border-transparent rounded-lg pointer-events-none">
                      {/* Scanner corners */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-white"></div>
                      <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-white"></div>
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-white"></div>
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-white"></div>
                      
                      {/* Center targeting square */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white border-dashed opacity-50 rounded-lg"></div>
                    </div>
                    
                    {/* Instructions overlay */}
                    <div className="absolute bottom-8 left-0 right-0 text-center">
                      <p className="text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full mx-auto inline-block">
                        Position QR code within the frame
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setScanning(false);
                    stopCamera();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rest of the component remains the same... */}
      {getValidationStatusCard()}

      {currentRange && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Range Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {currentRange.logoUrl && (
                <img 
                  src={currentRange.logoUrl} 
                  alt={currentRange.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{currentRange.name}</h3>
                <p className="text-gray-600 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {currentRange.address}
                </p>
                {currentSubscription && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-green-100 text-green-800">
                      <Crown className="w-3 h-3 mr-1" />
                      {currentSubscription.planDuration} Member
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Valid until: {currentSubscription.endDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
              {validationResult?.isValid ? (
                <div className="text-center">
                  <Check className="w-12 h-12 text-green-600 mx-auto" />
                  <p className="text-sm text-green-600 font-medium">Verified</p>
                </div>
              ) : (
                <div className="text-center">
                  <Shield className="w-12 h-12 text-red-600 mx-auto" />
                  <p className="text-sm text-red-600 font-medium">Blocked</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar and other components remain the same... */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              ←
            </Button>
            <span className="font-medium min-w-40 text-center">
              {currentMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {generateCalendarDays().map((day, index) => (
              <div
                key={index}
                className={`
                  p-2 text-center text-sm rounded-lg min-h-12 relative
                  ${!day ? 'invisible' : ''}
                  ${day?.hasAttendance 
                    ? 'bg-green-100 text-green-800 font-semibold' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }
                  ${day?.dateString === new Date().toISOString().split('T')[0]
                    ? 'ring-2 ring-blue-500'
                    : ''
                  }
                `}
                title={day?.attendanceRecord ? 
                  `${day.attendanceRecord.rangeName} at ${day.attendanceRecord.checkInTime}` : 
                  undefined
                }
              >
                {day?.day}
                {day?.hasAttendance && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded border"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 rounded border"></div>
              <span>Not marked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600">{attendance.length}</p>
                <p className="text-xs text-gray-500">days visited</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Days</p>
                <p className="text-2xl font-bold text-gray-600">
                  {new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()}
                </p>
                <p className="text-xs text-gray-500">in month</p>
              </div>
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {attendance.length > 0 && new Date().getDate() > 0
                    ? `${Math.round((attendance.length / Math.min(new Date().getDate(), new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate())) * 100)}%`
                    : '0%'
                  }
                </p>
                <p className="text-xs text-gray-500">this month</p>
              </div>
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Ranges</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(attendance.map(a => a.rangeId)).size}
                </p>
                <p className="text-xs text-gray-500">visited</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      {attendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendance
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-gray-600" />
                          <p className="font-medium text-gray-900">{record.rangeName}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {record.checkInTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="w-3 h-3 mr-1" />
                        Present
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
            
            {attendance.length > 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  View All Attendance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Attendance Message */}
      {attendance.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Attendance Records</h3>
            <p className="text-gray-500 mb-4">
              Start by scanning a range QR code to mark your first attendance.
            </p>
            <p className="text-sm text-gray-400">
              Make sure you have an active subscription before scanning.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Shield className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Scan Range QR Code</p>
                <p className="text-blue-600">Use the camera scanner or enter the range ID manually</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">Subscription Validation</p>
                <p className="text-blue-600">System checks for active subscription and valid payment</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">Attendance Marked</p>
                <p className="text-blue-600">If valid, your attendance is automatically recorded</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}