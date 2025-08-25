// just a prototype for the new range dashboard

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Users, 
  Calendar, 
  MapPin, 
  BarChart, 
  ArrowRightCircle, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  Star, 
  Crown, 
  Zap, 
  Shield, 
  Camera, 
  Video, 
  HeartHandshake, 
  X,
  Menu,
  Home,
  User,
  Settings,
  LogOut,
  BookOpen,
  Calendar as CalendarIcon,
  DollarSign,
  Target,
  Edit3,
  Save,
  Upload,
  Phone,
  Mail,
  Building,
  Globe,
  ChevronLeft,
  ChevronRight,
  LucideIcon
} from "lucide-react";
import RangeListingForm from "./RangeListingForm";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import BlockUserModal from "./BlockedUserModal";
import BuyPremiumModal from "./BuyPremiumModal";
import RangeListOwners from "./RangeListOwners";

// Type definitions
interface EventStatus {
  color: string;
  icon: JSX.Element;
}

interface ProcessedEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  registrations: number;
  capacity: number;
  status: string;
}

interface WeeklyUsageData {
  label: string;
  value: number;
}

interface MembershipType {
  label: string;
  value: number;
  color: string;
}

interface DashboardData {
  totalRanges: number;
  totalMembers: number;
  monthlyRevenue: number;
  upcomingEvents: ProcessedEvent[];
  recentBookings: number;
  weeklyUsage: WeeklyUsageData[];
  membershipTypes: MembershipType[];
  loading: boolean;
}

interface OwnerData {
  name: string;
  phone: string;
  email: string;
  description: string;
  logo: string | null;
  website?: string;
}

interface RangeData {
  id: string;
  name?: string;
  location?: string;
  lanes?: number;
  phone?: string;
  description?: string;
  image?: string;
  [key: string]: any;
}

interface BookingData {
  id: string;
  totalPrice?: number | string;
  price?: number | string;
  userId?: string;
  rangeId?: string;
  createdAt?: Timestamp | any;
  [key: string]: any;
}

interface EventData {
  id: string;
  title?: string;
  name?: string;
  date?: Timestamp | any;
  location?: string;
  rangeId?: string;
  registrations?: number;
  maxParticipants?: number;
  [key: string]: any;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface UserData {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

const eventStatus: Record<string, EventStatus> = {
  Open: { color: "bg-emerald-100 text-emerald-800 border border-emerald-200", icon: <CheckCircle className="inline w-4 h-4 mr-1" /> },
  "Almost Full": { color: "bg-amber-100 text-amber-800 border border-amber-200", icon: <AlertTriangle className="inline w-4 h-4 mr-1" /> },
  Full: { color: "bg-rose-100 text-rose-800 border border-rose-200", icon: <XCircle className="inline w-4 h-4 mr-1" /> },
};

const RangeOwnerDashboard: React.FC = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalRanges: 0,
    totalMembers: 0,
    monthlyRevenue: 0,
    upcomingEvents: [],
    recentBookings: 0,
    weeklyUsage: [],
    membershipTypes: [],
    loading: true
  });
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [premiumBannerDismissed, setPremiumBannerDismissed] = useState<boolean>(false);
  
  // Profile related states
  const [ownerData, setOwnerData] = useState<OwnerData>({
    name: '',
    phone: '',
    email: '',
    description: '',
    logo: null,
  });
  const [ranges, setRanges] = useState<RangeData[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'ranges', label: 'My Ranges', icon: Target },
    { id: 'bookings', label: 'Bookings', icon: BookOpen },
    { id: 'events', label: 'Events', icon: CalendarIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
      fetchOwnerData();
      checkPremiumStatus();
    }
    if (user) {
      checkBlocked(user.uid).then((blocked: boolean) => {
        setIsBlocked(blocked);
        setLoading(false);
      });
    }
  }, [user]);

  const checkPremiumStatus = async (): Promise<void> => {
    try {
      if (!user?.uid) return;
      const userDoc = doc(db, "range-owners", user.uid);
      const userSnapshot = await getDoc(userDoc);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setIsPremium(userData.premium === true || userData.ownerPremium === true);
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
    }
  };

  const fetchOwnerData = async (): Promise<void> => {
    try {
      if (user?.uid) {
        const ownerDocRef = doc(db, "range-owners", user.uid);
        const ownerDocSnap = await getDoc(ownerDocRef);
        
        if (ownerDocSnap.exists()) {
          const data = ownerDocSnap.data();
          setOwnerData({
            name: data.name || data.username || '',
            phone: data.phone || '',
            email: data.email || user.email || '',
            description: data.description || '',
            logo: data.logoUrl || null,
            website: data.website || ''
          });
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl);
          }
        }
        
        // Fetch ranges
        const rangesQuery = query(
          collection(db, "ranges"), 
          where("ownerId", "==", user.uid)
        );
        const rangesResponse = await getDocs(rangesQuery);
        const rangesData: RangeData[] = rangesResponse.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRanges(rangesData);
      }
    } catch (error) {
      console.error('Error fetching owner data:', error);
    }
  };

  const checkBlocked = async (id: string): Promise<boolean> => {
    try {
      const rangeDoc = doc(db, "range-owners", id);
      const rangeSnapshot = await getDoc(rangeDoc);
      return rangeSnapshot.exists() && rangeSnapshot.data()?.status === "blocked";
    } catch (error) {
      console.error("Error checking block status:", error);
      return false;
    }
  };

  const fetchDashboardData = async (): Promise<void> => {
    try {
      if (!user?.uid) return;
      
      setDashboardData(prev => ({ ...prev, loading: true }));

      const rangesQuery = query(
        collection(db, "ranges"),
        where("ownerId", "==", user.uid)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      const ranges: RangeData[] = rangesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      const rangeIds = ranges.map(range => range.id);
      let events: EventData[] = [];
      let bookings: BookingData[] = [];
      
      if (rangeIds.length > 0) {
        // Fetch events
        try {
          const eventsQuery = query(
            collection(db, "events"),
            where("rangeId", "in", rangeIds)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          events = eventsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
        } catch (error) {
          console.error("Error fetching events:", error);
        }

        // Fetch bookings
        try {
          const bookingsQuery = query(
            collection(db, "bookings"),
            where("rangeId", "in", rangeIds)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          bookings = bookingsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
        } catch (error) {
          console.error("Error fetching bookings:", error);
        }
      }

      // Calculate metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

      const monthlyRevenue = bookings
        .filter(booking => {
          if (!booking.createdAt) return false;
          try {
            const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            return bookingDate >= startOfMonth && bookingDate <= endOfMonth;
          } catch {
            return false;
          }
        })
        .reduce((sum, booking) => {
          const price = booking.totalPrice || booking.price || 0;
          return sum + (typeof price === 'string' ? parseFloat(price) : price);
        }, 0);

      const uniqueUserIds = [...new Set(bookings
        .map(booking => booking.userId)
        .filter((userId): userId is string => Boolean(userId))
      )];

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentBookings = bookings.filter(booking => {
        if (!booking.createdAt) return false;
        try {
          const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          return bookingDate >= weekAgo;
        } catch {
          return false;
        }
      }).length;

      // Generate weekly usage data (last 7 days)
      const weeklyUsage: WeeklyUsageData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayBookings = bookings.filter(booking => {
          if (!booking.createdAt) return false;
          try {
            const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            return bookingDate.toDateString() === date.toDateString();
          } catch {
            return false;
          }
        });
        
        weeklyUsage.push({
          label: date.toLocaleDateString('en', { weekday: 'short' }),
          value: Math.min((dayBookings.length / Math.max(ranges.length, 1)) * 100, 100) || 0
        });
      }

      // Generate membership distribution
      const membershipTypes: MembershipType[] = [
        { label: "Standard", value: Math.floor(uniqueUserIds.length * 0.65), color: "from-blue-400 to-blue-600" },
        { label: "Premium", value: Math.floor(uniqueUserIds.length * 0.25), color: "from-emerald-400 to-emerald-600" },
        { label: "VIP", value: Math.floor(uniqueUserIds.length * 0.10), color: "from-purple-400 to-purple-600" },
      ];

      const processedEvents: ProcessedEvent[] = events.map(event => {
        const registrations = event.registrations || 0;
        const capacity = event.maxParticipants || 100;
        let status = "Open";
        
        if (registrations >= capacity) {
          status = "Full";
        } else if (registrations / capacity > 0.8) {
          status = "Almost Full";
        }

        return {
          id: event.id,
          name: event.title || event.name || "Untitled Event",
          date: event.date?.toDate ? event.date.toDate().toLocaleDateString() : 
                event.date ? new Date(event.date).toLocaleDateString() : "TBD",
          location: event.location || ranges.find(r => r.id === event.rangeId)?.name || "Unknown Location",
          registrations,
          capacity,
          status
        };
      });

      setDashboardData({
        totalRanges: ranges.length,
        totalMembers: uniqueUserIds.length,
        monthlyRevenue,
        upcomingEvents: processedEvents.slice(0, 5),
        recentBookings,
        weeklyUsage,
        membershipTypes,
        loading: false
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate("/");
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Logo upload functions
  const uploadLogoToStorage = async (file: File): Promise<string> => {
    try {
      if (!user?.uid) throw new Error("User not authenticated");
      
      const storage = getStorage();
      const timestamp = Date.now();
      const fileName = `logos/range-owner-${user.uid}-${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  const deleteOldLogo = async (logoUrl: string): Promise<void> => {
    try {
      if (logoUrl && logoUrl.includes('firebase')) {
        const storage = getStorage();
        const logoRef = ref(storage, logoUrl);
        await deleteObject(logoRef);
      }
    } catch (error) {
      console.error('Error deleting old logo:', error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        if (ownerData.logo) {
          await deleteOldLogo(ownerData.logo);
        }
        
        const logoUrl = await uploadLogoToStorage(file);
        setLogoUrl(logoUrl);
        setOwnerData(prev => ({
          ...prev,
          logo: logoUrl
        }));
      } catch (error) {
        console.error('Error uploading logo:', error);
        alert('Error uploading logo. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    try {
      const profileData = {
        name: ownerData.name,
        phone: ownerData.phone,
        email: ownerData.email,
        description: ownerData.description,
        website: ownerData.website,
        logoUrl: logoUrl,
        updatedAt: new Date()
      };
      
      const docRef = doc(db, "range-owners", user.uid);
      await updateDoc(docRef, profileData);
      
      setIsEditing(false);
      alert("Profile saved successfully!");
    } catch (error) {
      console.error('Error saving profile:', error);
      alert("Error saving profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof OwnerData, value: string): void => {
    setOwnerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Carousel functions
  const nextSlide = (): void => {
    setCurrentSlide((prev) => (prev + 1) % ranges.length);
  };

  const prevSlide = (): void => {
    setCurrentSlide((prev) => (prev - 1 + ranges.length) % ranges.length);
  };

  const renderDashboardView = (): JSX.Element => (
    <div className="space-y-6">
      {/* Premium Banner */}
      {!isPremium && !premiumBannerDismissed && (
        <div className="relative bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-6 shadow-2xl border border-yellow-300">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-2xl"></div>
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div className="text-white">
                <h3 className="text-xl lg:text-2xl font-bold mb-2 flex items-center gap-2">
                  Unlock GSL Premium Features
                  <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-200" />
                </h3>
                <p className="text-yellow-100 text-sm lg:text-lg font-medium mb-1">
                  Get premium support, video uploads, enhanced visibility, and more!
                </p>
                <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-sm text-yellow-100">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>24/7 Support</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    <span>Video Hosting</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Featured Listings</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center text-white">
                <div className="text-2xl lg:text-3xl font-bold">₹1,000</div>
                <div className="text-xs lg:text-sm text-yellow-100">per month</div>
              </div>
              <Button
                onClick={() => setShowPremiumModal(true)}
                className="bg-white text-yellow-600 hover:bg-yellow-50 font-bold py-2 lg:py-3 px-4 lg:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <Crown className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Upgrade Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPremiumBannerDismissed(true)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">My Ranges</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
              <MapPin className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-blue-900 mb-1">
              {dashboardData.loading ? "..." : dashboardData.totalRanges}
            </div>
            <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Active facilities
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900">Total Members</CardTitle>
            <div className="p-2 bg-emerald-500 rounded-lg group-hover:bg-emerald-600 transition-colors">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-emerald-900 mb-1">
              {dashboardData.loading ? "..." : dashboardData.totalMembers}
            </div>
            <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              Unique customers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-900">Monthly Revenue</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-purple-900 mb-1">
              {dashboardData.loading ? "..." : formatCurrency(dashboardData.monthlyRevenue)}
            </div>
            <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Current month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">Upcoming Events</CardTitle>
            <div className="p-2 bg-amber-500 rounded-lg group-hover:bg-amber-600 transition-colors">
              <Calendar className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-amber-900 mb-1">
              {dashboardData.loading ? "..." : dashboardData.upcomingEvents.length}
            </div>
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="font-bold text-gray-900">Range Usage</CardTitle>
            <CardDescription className="text-slate-600">Last 7 days activity</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[200px] flex items-end justify-between gap-2">
              {dashboardData.weeklyUsage.map((day, index) => (
                <div key={index} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className="w-full max-w-8 rounded-t-lg bg-gradient-to-t from-blue-400 to-blue-600 relative group transition-all duration-300 hover:from-blue-500 hover:to-blue-700"
                    style={{ height: `${Math.max(day.value, 5)}%` }}
                  >
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {Math.round(day.value)}% usage
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 font-medium">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="font-bold text-gray-900">Member Distribution</CardTitle>
            <CardDescription className="text-slate-600">By membership type</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {dashboardData.membershipTypes.map((type) => (
                <div key={type.label} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">{type.label}</span>
                    <span className="text-sm font-bold text-slate-900">{type.value} members</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${type.color} transition-all duration-500`}
                      style={{ width: `${dashboardData.totalMembers > 0 ? (type.value / dashboardData.totalMembers) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      {dashboardData.upcomingEvents.length > 0 && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-xl font-bold text-gray-900">Scheduled Events</CardTitle>
            <CardDescription className="text-slate-600">Upcoming events at your ranges</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Event Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Date</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Location</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Registrations</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.upcomingEvents.map((event) => (
                    <tr key={event.id} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-gray-900">{event.name}</td>
                      <td className="py-4 px-6 text-slate-600">{event.date}</td>
                      <td className="py-4 px-6 text-slate-600">{event.location}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-700 font-medium">{event.registrations}/{event.capacity}</span>
                          <div className="w-20 bg-slate-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                              style={{ width: `${Math.min((event.registrations / event.capacity) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${eventStatus[event.status as keyof typeof eventStatus].color}`}>
                          {eventStatus[event.status as keyof typeof eventStatus].icon}
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderProfileView = (): JSX.Element => (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Profile Information</CardTitle>
              <CardDescription className="text-slate-600">Manage your business profile and contact details</CardDescription>
            </div>
            <Button
              onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
              disabled={isSaving}
              className={`font-semibold px-6 py-2 rounded-xl transition-all duration-200 ${
                isEditing 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Logo Upload Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div
                className={`relative w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-gradient-to-r from-blue-400 to-indigo-500 shadow-2xl ${
                  isEditing ? 'cursor-pointer hover:scale-105' : ''
                } transition-all duration-300 ${
                  isUploading ? 'animate-pulse' : ''
                }`}
                onClick={isEditing ? () => fileInputRef.current?.click() : undefined}
                style={{
                  background: logoUrl ? 'transparent' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Business Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm lg:text-lg font-semibold">
                    Upload Logo
                  </div>
                )}
                
                {isEditing && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Camera className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                )}
              </div>
              
              {isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                >
                  <Upload className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </button>
              )}
            </div>
            
            <p className="text-gray-500 text-sm text-center max-w-xs">
              {isEditing ? 'Click to upload your business logo' : 'Business logo'}
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Owner Name */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Owner Name *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={ownerData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800"
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-800 font-medium">
                  {ownerData.name || 'Not provided'}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Phone Number *
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={ownerData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800"
                  placeholder="Enter your phone number"
                />
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-800 font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  {ownerData.phone || 'Not provided'}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800"
                  placeholder="Enter your email"
                />
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-800 font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {ownerData.email || 'Not provided'}
                </div>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Website (Optional)
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={ownerData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800"
                  placeholder="https://yourwebsite.com"
                />
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-800 font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  {ownerData.website || 'Not provided'}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Business Description
            </label>
            {isEditing ? (
              <textarea
                rows={4}
                value={ownerData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800 resize-none"
                placeholder="Describe your shooting range business..."
              />
            ) : (
              <div className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-800 min-h-[100px]">
                {ownerData.description || 'No description provided'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ranges Carousel */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl font-bold text-gray-900">Your Shooting Ranges</CardTitle>
          <CardDescription className="text-slate-600">Manage and view all your registered shooting ranges</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {ranges.length > 0 ? (
            <div className="relative max-w-5xl mx-auto">
              <div className="overflow-hidden rounded-2xl">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {ranges.map((range) => (
                    <div key={range.id} className="w-full flex-shrink-0 px-4">
                      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                        {range.image && (
                          <div className="relative overflow-hidden rounded-xl mb-6">
                            <img
                              src={range.image}
                              alt={range.name}
                              className="w-full h-64 lg:h-72 object-cover transform hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          </div>
                        )}
                        <div className="space-y-4">
                          <h3 className="text-xl lg:text-2xl font-bold text-gray-800">{range.name || 'Unnamed Range'}</h3>
                          
                          <div className="space-y-2">
                            {range.location && (
                              <div className="flex items-center text-gray-600">
                                <MapPin className="w-4 h-4 text-blue-500 mr-2" />
                                <span>{range.location}</span>
                              </div>
                            )}
                            {range.lanes && (
                              <div className="flex items-center text-gray-600">
                                <Target className="w-4 h-4 text-blue-500 mr-2" />
                                <span>{range.lanes} Lanes Available</span>
                              </div>
                            )}
                            {range.phone && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="w-4 h-4 text-blue-500 mr-2" />
                                <span>{range.phone}</span>
                              </div>
                            )}
                          </div>
                          
                          {range.description && (
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                              {range.description}
                            </p>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {ranges.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                  </button>
                  
                  <button
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                  </button>

                  <div className="flex justify-center space-x-3 mt-8">
                    {ranges.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          index === currentSlide 
                            ? 'bg-blue-600 scale-125' 
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-300 mb-6">
                <Building className="w-24 h-24 lg:w-32 lg:h-32 mx-auto" />
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold text-gray-600 mb-3">No Ranges Found</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
                You haven't added any shooting ranges yet. Contact our support team to add your first range to the platform.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200">
                Contact Support
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = (): JSX.Element => {
    switch (activeView) {
      case 'dashboard':
        return renderDashboardView();
      case 'profile':
        return renderProfileView();
      case 'ranges':
        return (
          <div>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl font-bold text-gray-900">My Ranges</CardTitle>
                <CardDescription className="text-slate-600">Manage your shooting ranges</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">Range management interface will be implemented here.</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'bookings':
        return (
          <div>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl font-bold text-gray-900">Bookings</CardTitle>
                <CardDescription className="text-slate-600">View and manage customer bookings</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">Bookings management interface will be implemented here.</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'events':
        return (
          <div>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl font-bold text-gray-900">Events</CardTitle>
                <CardDescription className="text-slate-600">Manage your shooting events and tournaments</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">Events management interface will be implemented here.</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'analytics':
        return (
          <div>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl font-bold text-gray-900">Analytics</CardTitle>
                <CardDescription className="text-slate-600">Detailed insights and analytics</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">Analytics dashboard will be implemented here.</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'settings':
        return (
          <div>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl font-bold text-gray-900">Settings</CardTitle>
                <CardDescription className="text-slate-600">Application settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">Settings interface will be implemented here.</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return renderDashboardView();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="text-gray-600 font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 bg-white/95 backdrop-blur-md border-r border-slate-200/50 shadow-xl`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          {/* Logo/Header */}
          <div className="flex items-center gap-3 mb-8 px-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">GSL Dashboard</h2>
              <p className="text-sm text-gray-600">Range Owner</p>
            </div>
          </div>

          {/* User Info */}
          <div className="mb-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {ownerData.name || user?.displayName?.split('|')[0] || user?.email?.split('@')[0] || "Range Owner"}
                </p>
                {isPremium && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600 font-medium">Premium</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ul className="space-y-2 font-medium">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex items-center w-full p-3 text-gray-900 rounded-lg hover:bg-gray-100 group transition-all duration-200 ${
                      isActive ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-600' : ''
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition duration-75 ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-900'}`} />
                    <span className="ml-3">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Sign Out Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full p-3 text-red-600 rounded-lg hover:bg-red-50 group transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="bg-white/90 shadow-sm backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/50">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 capitalize">
                    {activeView === 'dashboard' ? 'Dashboard Overview' : activeView}
                  </h1>
                  <p className="text-sm text-gray-600 hidden sm:block">
                    Welcome back, {ownerData.name || user?.displayName?.split('|')[0] || user?.email?.split('@')[0] || "Range Owner"}!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  size="sm"
                  className="font-medium border-slate-200 hover:bg-slate-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          {renderContent()}
        </main>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-gray-900/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Modals */}
      <BlockUserModal 
        isOpen={isBlocked} 
        onClose={() => setIsBlocked(false)} 
      />
      
      <BuyPremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
      />
    </div>
  );
};

export default RangeOwnerDashboard;