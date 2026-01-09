import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn} from "@/lib/utils";
import { User, Calendar, Award, Star, Briefcase, Target, Crosshair, Package, BarChart3, TrendingUp, Filter, Clock, FileText, ScanLine, Receipt, Menu, X, Wallet, AlertCircle, CheckCircle, Phone, Clock as ClockIcon, Zap, Shield, Trophy, Crown, LayoutGrid, Sun, Moon, Activity, Layers, UserCheck } from "lucide-react";
import { db, storage } from "@/firebase/config";
import { collection, doc, getDocs, query, setDoc, where, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

// Import the new components
import ShooterScanner from "@/components/dashboard/ShooterScanner";
import ShooterBills from "@/components/dashboard/ShootersBills";
import ShooterWallet from "@/components/dashboard/ShooterWallet";

interface ShooterProfile {
  fullName: string;
  age: number;
  experience: string;
  achievements: string;
  preferredDisciplines: string[];
  favoriteGun: string;
  favoriteAmmunition: string;
  favoriteStance: string;
  additionalEquipment: string;
  height: string;
  weight: string;
  leftEyeSight: string;
  rightEyeSight: string;
  dominantHand: string;
  profileImage?: string;
  totalPoints?: number;
  phoneNumber?: string;
  kyc?: boolean;
  wallet?: boolean;
}

interface ShootingSession {
  id: string | number;
  date: string;
  month: number;
  year: number;
  discipline: string;
  totalScore: number;
  maxScore: number;
  accuracy: string;
  innerTens: number;
  totalShots: number;
  avgGroupSize: string;
  series: any[];
  weather: string;
  timeOfDay: string;
  rating?: number;
}

interface BookingData {
  id: string;
  date: string;
  month: number;
  year: number;
  duration: number;
  attended: boolean;
  discipline: string;
}

interface KYCApplication {
  id: string;
  status: string;
  applicationDate: Date;
}

// Chart data interfaces
interface MonthlyData {
  month: string;
  sessions: number;
  totalScore: number;
  totalAccuracy: number;
  totalGroupSize: number;
  avgScore: number;
  avgAccuracy: number;
  avgGroupSize: number;
}

interface FrequencyData {
  month: string;
  shootingSessions: number;
  totalVisits: number;
}

interface AccuracyTrendData {
  sessionNumber: number;
  date: string;
  accuracy: number;
  score: number;
  groupSize: number;
  innerTens: number;
}

interface DisciplineData {
  name: string;
  sessions: number;
  totalScore: number;
  totalAccuracy: number;
  avgScore: number;
  avgAccuracy: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  isUnlocked: boolean;
  progress?: number; // percentage toward unlocking
}

export default function ShooterProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ShooterProfile>({
    fullName: "",
    age: 0,
    experience: "",
    achievements: "",
    preferredDisciplines: [],
    favoriteGun: "",
    favoriteAmmunition: "",
    favoriteStance: "",
    additionalEquipment: "",
    height: "",
    weight: "",
    leftEyeSight: "",
    rightEyeSight: "",
    dominantHand: "Right",
    profileImage: "",
    phoneNumber: "",
    kyc: false,
    wallet: false,
  });
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Analytics state with proper typing
  const [shootingData, setShootingData] = useState<ShootingSession[]>([]);
  const [bookingData, setBookingData] = useState<BookingData[]>([]);
  const [filteredData, setFilteredData] = useState<ShootingSession[]>([]);
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [dateFilter, setDateFilter] = useState<{startDate: string, endDate: string}>({ startDate: '', endDate: '' });
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  
  // KYC Modal state
  const [showKycModal, setShowKycModal] = useState(false);
  const [showKycPendingModal, setShowKycPendingModal] = useState(false);
  const [kycPhoneNumber, setKycPhoneNumber] = useState('');
  const [kycLoading, setKycLoading] = useState(false);
  const [kycApplication, setKycApplication] = useState<KYCApplication | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData();
      loadAnalyticsData();
      checkKYCStatus();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [dateFilter, disciplineFilter, yearFilter, shootingData]);

  // Check KYC status when wallet tab is accessed
  useEffect(() => {
    if (activeTab === 'wallet') {
      if (profile.kyc && profile.wallet) {
        setShowKycModal(false);
        setShowKycPendingModal(false);
      } else if (kycApplication) {
        setShowKycPendingModal(true);
        setShowKycModal(false);
      } else {
        setShowKycModal(true);
        setShowKycPendingModal(false);
      }
    }
  }, [activeTab, profile, kycApplication]);

  const setProfileData = async () => {
    if (user) {
      setLoading(true);
      try {
        const shootersRef = collection(db, "shooters");
        const shootersQuery = query(shootersRef, where("uid", "==", user.uid));
        const shootersSnapshot = await getDocs(shootersQuery);
        
        if (shootersSnapshot.empty) {
          setIsNewProfile(true);
        } else {
          setIsNewProfile(false);
          shootersSnapshot.forEach((doc) => {
            const data = doc.data() as ShooterProfile;
            const safeData = {
              ...data,
              preferredDisciplines: Array.isArray(data.preferredDisciplines) 
                ? data.preferredDisciplines 
                : [],
              kyc: data.kyc || false,
              wallet: data.wallet || false,
              phoneNumber: data.phoneNumber || ""
            };
            setProfile(safeData);
            setImage(data.profileImage || null);
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast({ title: "Error", description: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    }
  };

  // Check KYC application status
  const checkKYCStatus = async () => {
    if (!user) return;
    
    try {
      const kycRef = collection(db, "kyc-applications");
      const kycQuery = query(kycRef, where("userId", "==", user.uid));
      const kycSnapshot = await getDocs(kycQuery);
      
      if (!kycSnapshot.empty) {
        kycSnapshot.forEach((doc) => {
          const data = doc.data();
          setKycApplication({
            id: doc.id,
            status: data.status,
            applicationDate: data.applicationDate.toDate()
          });
        });
      }
    } catch (error) {
      console.error("Error checking KYC status:", error);
    }
  };

  // Load analytics data from Firebase
  const loadAnalyticsData = async () => {
    if (!user) return;
    
    try {
      const shootingSessionsRef = collection(db, "shootingSessions");
      const shootingQuery = query(shootingSessionsRef, where("shooterId", "==", user.uid));
      const shootingSnapshot = await getDocs(shootingQuery);
      
      const shootingSessions: ShootingSession[] = [];
      shootingSnapshot.forEach((doc) => {
        const data = doc.data();
        const parsedData = parseShootingSessionData({ ...data, id: doc.id });
        if (parsedData) {
          shootingSessions.push(parsedData);
        }
      });
      
      const bookingsRef = collection(db, "bookings");
      const bookingsQuery = query(bookingsRef, where("userId", "==", user.uid));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const bookings: BookingData[] = [];
      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = new Date(data.date);
        bookings.push({
          id: doc.id,
          date: data.date,
          month: dateObj.getMonth() + 1,
          year: dateObj.getFullYear(),
          duration: data.duration || 60,
          attended: data.status === 'completed' || data.status === 'attended',
          discipline: data.discipline || 'General'
        });
      });
      
      setShootingData(shootingSessions);
      setBookingData(bookings);
      setFilteredData(shootingSessions);
      
    } catch (error) {
      console.error("Error loading analytics data:", error);
      toast({ title: "Error", description: "Failed to load analytics data" });
    }
  };

  const parseShootingSessionData = (sessionData: any): ShootingSession | null => {
    try {
      if (!sessionData.sessionStats && !sessionData.totalScore) return null;
      
      let totalScore = 0;
      let innerTens = 0;
      let series: any[] = [];
      let discipline = 'Air Pistol 60';
      let totalShots = 60;
      let overallGroupSize = 35;
      
      if (sessionData.sessionStats) {
        totalScore = sessionData.sessionStats.totalScore || 0;
        innerTens = sessionData.sessionStats.innerTens || 0;
        discipline = sessionData.sessionStats.discipline || 'Air Pistol 60';
        
        if (discipline.includes('60')) totalShots = 60;
        else if (discipline.includes('40')) totalShots = 40;
      } else {
        totalScore = sessionData.totalScore || 0;
        innerTens = sessionData.innerTens || 0;
        discipline = sessionData.discipline || 'Air Pistol 60';
      }
      
      const maxScore = discipline.includes('60') ? 600 : 
                      discipline.includes('40') ? 400 : 600;
      const accuracy = totalScore > 0 ? (totalScore / maxScore * 100) : 0;
      
      let sessionDate = '';
      if (sessionData.sessionStats && sessionData.sessionStats.date) {
        const [day, month, year] = sessionData.sessionStats.date.split('-');
        sessionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (sessionData.uploadDate) {
        if (typeof sessionData.uploadDate.toDate === 'function') {
          sessionDate = sessionData.uploadDate.toDate().toISOString().split('T')[0];
        } else if (sessionData.uploadDate instanceof Date) {
          sessionDate = sessionData.uploadDate.toISOString().split('T')[0];
        } else {
          sessionDate = new Date(sessionData.uploadDate).toISOString().split('T')[0];
        }
      } else if (sessionData.date) {
        sessionDate = sessionData.date;
      } else {
        sessionDate = new Date().toISOString().split('T')[0];
      }
      
      const dateObj = new Date(sessionDate);
      
      return {
        id: sessionData.id || Date.now(),
        date: sessionDate,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        discipline,
        totalScore,
        maxScore,
        accuracy: accuracy.toFixed(1),
        innerTens,
        totalShots,
        avgGroupSize: overallGroupSize.toFixed(1),
        series,
        weather: sessionData.weather || 'Indoor',
        timeOfDay: sessionData.timeOfDay || 'Unknown'
      };
    } catch (error) {
      console.error("Error parsing shooting session data:", error);
      return null;
    }
  };

  const applyFilters = () => {
    let filtered = [...shootingData];

    if (dateFilter.startDate) {
      filtered = filtered.filter(session => session.date >= dateFilter.startDate);
    }
    if (dateFilter.endDate) {
      filtered = filtered.filter(session => session.date <= dateFilter.endDate);
    }
    if (disciplineFilter !== 'all') {
      filtered = filtered.filter(session => 
        typeof session.discipline === 'string' && session.discipline.includes(disciplineFilter)
      );
    }
    if (yearFilter !== 'all') {
      const targetYear = parseInt(yearFilter);
      filtered = filtered.filter(session => session.year === targetYear);
    }

    setFilteredData(filtered);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      const numericValue = value === '' ? 0 : Number(value);
      setProfile({ ...profile, [name]: numericValue });
    } else {
      setProfile({ ...profile, [name]: value });
    }
  };

  const handleDisciplineChange = (discipline: string) => {
    setProfile(prev => {
      const currentDisciplines = Array.isArray(prev.preferredDisciplines) 
        ? prev.preferredDisciplines 
        : [];
      
      return {
        ...prev,
        preferredDisciplines: currentDisciplines.includes(discipline)
          ? currentDisciplines.filter(d => d !== discipline)
          : [...currentDisciplines, discipline]
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      try {
        const storageRef = ref(storage, `profileImages/${user?.uid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        setImage(url);
        setProfile((prev) => ({ ...prev, profileImage: url }));
        toast({ title: "Image Uploaded", description: "Profile image updated." });
      } catch (err) {
        console.error("Image upload failed:", err);
        toast({ title: "Upload Error", description: "Could not upload image." });
      }
    } else {
      alert("Please select an image up to 10MB.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const docRef = doc(db, "shooters", user.uid);
      
      let dataToSave = { 
        ...profile, 
        uid: user.uid,
        preferredDisciplines: Array.isArray(profile.preferredDisciplines) 
          ? profile.preferredDisciplines 
          : []
      };
      
      if (isNewProfile) {
        dataToSave.totalPoints = 0;
        toast({ title: "Profile Created", description: "Your profile has been created with 0 points." });
      } else {
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
          const existingData = existingDoc.data();
          if (existingData.totalPoints !== undefined) {
            dataToSave.totalPoints = existingData.totalPoints;
          }
          if (existingData.kyc !== undefined) {
            dataToSave.kyc = existingData.kyc;
          }
          if (existingData.wallet !== undefined) {
            dataToSave.wallet = existingData.wallet;
          }
        }
        toast({ title: "Profile Updated", description: "Your profile has been updated." });
      }
      
      await setDoc(docRef, dataToSave);
      setIsNewProfile(false);
      
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Error", description: "Could not save profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleKycApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile.fullName || !kycPhoneNumber) {
      toast({ title: "Error", description: "Please fill in all required fields" });
      return;
    }

    setKycLoading(true);
    try {
      const kycApplicationRef = doc(collection(db, "kyc-applications"));
      await setDoc(kycApplicationRef, {
        name: profile.fullName,
        phoneNumber: kycPhoneNumber,
        email: user.email || '',
        userId: user.uid,
        description: "Apply for KYC",
        applicationDate: new Date(),
        status: "pending"
      });

      const shooterRef = doc(db, "shooters", user.uid);
      await setDoc(shooterRef, {
        ...profile,
        phoneNumber: kycPhoneNumber,
        uid: user.uid
      }, { merge: true });

      setProfile(prev => ({ ...prev, phoneNumber: kycPhoneNumber }));
      setKycApplication({
        id: kycApplicationRef.id,
        status: "pending",
        applicationDate: new Date()
      });
      
      toast({ 
        title: "KYC Application Submitted", 
        description: "Your KYC application has been submitted successfully. You will be notified once approved." 
      });
      
      setShowKycModal(false);
      setKycPhoneNumber('');
      
    } catch (error) {
      console.error("Error submitting KYC application:", error);
      toast({ title: "Error", description: "Failed to submit KYC application. Please try again." });
    } finally {
      setKycLoading(false);
    }
  };

  const calculateStats = () => {
    if (filteredData.length === 0) return {};

    const totalSessions = filteredData.length;
    const avgScore = filteredData.reduce((sum, session) => sum + session.totalScore, 0) / totalSessions;
    const avgAccuracy = filteredData.reduce((sum, session) => sum + parseFloat(session.accuracy), 0) / totalSessions;
    const bestScore = Math.max(...filteredData.map(session => session.totalScore));
    const avgGroupSize = filteredData.reduce((sum, session) => sum + parseFloat(session.avgGroupSize), 0) / totalSessions;

    return { totalSessions, avgScore, avgAccuracy, bestScore, avgGroupSize };
  };

  const stats = calculateStats();

  const prepareMonthlyData = (): MonthlyData[] => {
    const monthlyDataMap: { [key: string]: MonthlyData } = {};
    
    filteredData.forEach(session => {
      const key = `${session.year}-${session.month.toString().padStart(2, '0')}`;
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { 
          month: key, 
          sessions: 0, 
          totalScore: 0, 
          totalAccuracy: 0,
          totalGroupSize: 0,
          avgScore: 0,
          avgAccuracy: 0,
          avgGroupSize: 0
        };
      }
      monthlyDataMap[key].sessions++;
      monthlyDataMap[key].totalScore += session.totalScore;
      monthlyDataMap[key].totalAccuracy += parseFloat(session.accuracy);
      monthlyDataMap[key].totalGroupSize += parseFloat(session.avgGroupSize);
    });

    return Object.values(monthlyDataMap).map((data) => ({
      ...data,
      avgScore: Number((data.totalScore / data.sessions).toFixed(1)),
      avgAccuracy: Number((data.totalAccuracy / data.sessions).toFixed(1)),
      avgGroupSize: Number((data.totalGroupSize / data.sessions).toFixed(1))
    }));
  };

  const prepareFrequencyData = (): FrequencyData[] => {
    const frequencyDataMap: { [key: string]: FrequencyData } = {};
    
    [...filteredData, ...bookingData.filter(b => b.attended)].forEach(session => {
      const monthKey = `${session.year}-${session.month.toString().padStart(2, '0')}`;
      if (!frequencyDataMap[monthKey]) {
        frequencyDataMap[monthKey] = { month: monthKey, shootingSessions: 0, totalVisits: 0 };
      }
      if ('totalScore' in session) {
        frequencyDataMap[monthKey].shootingSessions++;
      }
      frequencyDataMap[monthKey].totalVisits++;
    });

    return Object.values(frequencyDataMap);
  };

  const prepareAccuracyTrendData = (): AccuracyTrendData[] => {
    return filteredData.map((session, index) => ({
      sessionNumber: index + 1,
      date: session.date,
      accuracy: parseFloat(session.accuracy),
      score: session.totalScore,
      groupSize: parseFloat(session.avgGroupSize),
      innerTens: session.innerTens
    }));
  };

  const prepareDisciplineData = (): DisciplineData[] => {
    const disciplineDataMap: { [key: string]: DisciplineData } = {};
    
    filteredData.forEach(session => {
      if (!disciplineDataMap[session.discipline]) {
        disciplineDataMap[session.discipline] = { 
          name: session.discipline, 
          sessions: 0, 
          totalScore: 0, 
          totalAccuracy: 0,
          avgScore: 0,
          avgAccuracy: 0
        };
      }
      disciplineDataMap[session.discipline].sessions++;
      disciplineDataMap[session.discipline].totalScore += session.totalScore;
      disciplineDataMap[session.discipline].totalAccuracy += parseFloat(session.accuracy);
    });

    return Object.values(disciplineDataMap).map((data) => ({
      ...data,
      avgScore: Number((data.totalScore / data.sessions).toFixed(1)),
      avgAccuracy: Number((data.totalAccuracy / data.sessions).toFixed(1))
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const years = [...new Set(shootingData.map(s => s.year))].sort();
  const disciplines = [...new Set(shootingData.map(s => s.discipline))];

  if (loading) return <div className="text-center text-lg mt-6">Loading profile...</div>;

  const getBadges = (): Badge[] => {
    const totalPoints = profile.totalPoints || 0;
    const sessionsCount = shootingData.length;
    
    // REAL DATA LOGIC MAPPING
    // pointsEarned and rating are direct from your DB structure
    const totalInnerTens = shootingData.reduce((sum, s) => sum + (s.innerTens || 0), 0);
    const totalShots = shootingData.reduce((sum, s) => sum + (s.totalShots || 0), 0);
    const uniqueDisciplines = new Set(shootingData.map(s => s.discipline)).size;
    
    // Check for high rating (your DB has rating 1-5 or 1-4)
    const highRatingSessions = shootingData.filter(s => (s.rating ?? 0) >= 4).length;
    
    // Check for accuracy sessions (based on your calculated accuracy string)
    const eliteAccuracy = shootingData.some(s => parseFloat(s.accuracy) >= 98);

    // Time of day logic (based on your sessionData.timeOfDay field)
    const hasEarlySession = shootingData.some(s => s.timeOfDay?.toLowerCase().includes('morning'));

    return [
      { 
        id: "rookie", 
        name: "First Trigger", 
        description: "Log your first verified session", 
        icon: <Zap className="w-6 h-6" />, 
        isUnlocked: sessionsCount > 0 
      },
      { 
        id: "accuracy_elite", 
        name: "Deadshot", 
        description: "Hit 98% accuracy in a session", 
        icon: <Crosshair className="w-6 h-6" />, 
        isUnlocked: eliteAccuracy 
      },
      { 
        id: "inner_ten_collector", 
        name: "X-Ring King", 
        description: "Hit 50 total Inner Tens", 
        icon: <Target className="w-6 h-6" />, 
        isUnlocked: totalInnerTens >= 50, 
        progress: Math.min(100, (totalInnerTens / 50) * 100) 
      },
      { 
        id: "discipline_pro", 
        name: "Versatile Shooter", 
        description: "Train in 3 different disciplines", 
        icon: <Layers className="w-6 h-6" />, 
        isUnlocked: uniqueDisciplines >= 3, 
        progress: Math.min(100, (uniqueDisciplines / 3) * 100) 
      },
      { 
        id: "high_rater", 
        name: "Consistent 4-Star", 
        description: "Get a 4+ rating in 5 sessions", 
        icon: <Star className="w-6 h-6" />, 
        isUnlocked: highRatingSessions >= 5,
        progress: Math.min(100, (highRatingSessions / 5) * 100)
      },
      { 
        id: "morning_warrior", 
        name: "Dawn Patrol", 
        description: "Complete a morning session", 
        icon: <Sun className="w-6 h-6" />, 
        isUnlocked: hasEarlySession 
      },
      { 
        id: "volume_shooter", 
        name: "Lead Rain", 
        description: "Fire 500 total shots", 
        icon: <Activity className="w-6 h-6" />, 
        isUnlocked: totalShots >= 500, 
        progress: Math.min(100, (totalShots / 500) * 100) 
      },
      { 
        id: "points_titan", 
        name: "GSL Elite", 
        description: "Cross 5,000 career points", 
        icon: <Crown className="w-6 h-6" />, 
        isUnlocked: totalPoints >= 5000, 
        progress: Math.min(100, (totalPoints / 5000) * 100) 
      },
      { 
        id: "veteran", 
        name: "Range Veteran", 
        description: "Complete 20 sessions", 
        icon: <Shield className="w-6 h-6" />, 
        isUnlocked: sessionsCount >= 20, 
        progress: Math.min(100, (sessionsCount / 20) * 100) 
      },
      { 
        id: "verified", 
        name: "Trusted Athlete", 
        description: "KYC and Wallet verified", 
        icon: <UserCheck className="w-6 h-6" />, 
        isUnlocked: profile.kyc && profile.wallet 
      }
    ];
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-blue-50  rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 md:p-6">
      
      {/* Mobile Menu Toggle */}
      <div className="md:hidden flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-blue-700">Shooter Profile</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md bg-blue-100 text-blue-700"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 md:mb-6">
        <div className="border-b border-gray-200">
          <nav className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:space-x-8 space-y-2 md:space-y-0`}>
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'wallet', label: 'Wallet', icon: Wallet },
              { id: 'bills', label: 'Bills', icon: Receipt },
              { id: 'scanner', label: 'Scanner', icon: ScanLine }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-3 md:px-4 border-b-2 md:border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-[#ff6b6b] text-[#ff6b6b] hover:text-blue-700 hover:border-blue-700'
                    : 'border-transparent text-blue-700 hover:text-[#ff6b6b] hover:border-[#ff6b6b]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'profile' && (
        <>
          <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2 justify-center">
            <User className="w-5 h-5 md:w-7 md:h-7 text-blue-400" /> Shooter Profile
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 w-full">
            {/* Image Upload Section */}
            <div className="flex flex-col items-center mb-4 md:mb-6">
              {image ? (
                <img src={image} alt="Shooter" className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-blue-200 shadow-md mb-2" />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-2">
                  No Image
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                className="px-3 py-1.5 md:px-4 md:py-2 bg-[#ff6b6b] text-white rounded-lg shadow hover:bg-blue-600 transition text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {image ? "Change Image" : "Upload Image"}
              </button>
              <span className="text-xs text-gray-500 mt-1">Max size: 10MB</span>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <InputBlock label="Full Name" id="fullName" icon={<User />} value={profile.fullName} onChange={handleChange} />
              <InputBlock label="Age" id="age" type="number" icon={<Calendar />} value={profile.age} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <InputBlock label="Experience" id="experience" icon={<Briefcase />} value={profile.experience} onChange={handleChange} />
              <InputBlock label="Achievements" id="achievements" icon={<Award />} value={profile.achievements} onChange={handleChange} />
            </div>

            {/* Preferred Disciplines */}
            <div className="mb-4 md:mb-6 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md bg-blue-50 border border-blue-100">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-blue-700 flex items-center gap-2">
                <Target className="w-5 h-5 md:w-6 md:h-6 text-[#ff6b6b]" /> Preferred Disciplines
              </h3>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                {[
                  "10m Air Pistol", "25m Pistol", "50m Pistol", 
                  "10m Air Rifle", "50m Rifle", "300m Rifle",
                  "Trap", "Skeet", "Double Trap",
                  "Running Target", "Sport Pistol", "Free Pistol"
                ].map((discipline) => (
                  <label key={discipline} className="flex items-center space-x-2 cursor-pointer text-sm md:text-base">
                    <input
                      type="checkbox"
                      checked={(profile.preferredDisciplines || []).includes(discipline)}
                      onChange={() => handleDisciplineChange(discipline)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{discipline}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Equipment Section */}
            <div className="mb-4 md:mb-6 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md bg-blue-50 border border-blue-100">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-blue-700 flex items-center gap-2">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-[#ff6b6b]" /> Equipment & Preferences
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
                <SelectBlock
                  label="Favorite Gun"
                  id="favoriteGun"
                  value={profile.favoriteGun}
                  onChange={handleChange}
                  options={[
                    "Glock 17", "Beretta M9 (92FS)", "SIG Sauer P320",
                    "Colt M1911", "Smith & Wesson Model 686", "Walther P88",
                    "Hammerli AP40", "Steyr LP10", "FWB P8X", "Other"
                  ]}
                />

                <SelectBlock
                  label="Favorite Ammunition"
                  id="favoriteAmmunition"
                  value={profile.favoriteAmmunition}
                  onChange={handleChange}
                  options={[
                    "9mm Luger", ".22 LR", ".45 ACP", ".38 Special",
                    ".357 Magnum", "4.5mm Pellets", "5.6mm", "Other"
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <SelectBlock
                  label="Favorite Stance"
                  id="favoriteStance"
                  value={profile.favoriteStance}
                  onChange={handleChange}
                  options={[
                    "Isosceles", "Weaver", "Modified Weaver", 
                    "Chapman", "Modern Isosceles", "One-handed"
                  ]}
                />

                <InputBlock 
                  label="Additional Equipment" 
                  id="additionalEquipment" 
                  icon={<Star />} 
                  value={profile.additionalEquipment} 
                  onChange={handleChange}
                  placeholder="e.g., Shooting glasses, ear protection, grip aids"
                />
              </div>

              {profile.favoriteGun === "Other" && (
                <div className="mt-3 md:mt-4">
                  <InputBlock
                    label="Specify Your Favorite Gun"
                    id="customGun"
                    value=""
                    onChange={(e) => setProfile({ ...profile, favoriteGun: e.target.value })}
                    placeholder="Enter your favorite gun"
                  />
                </div>
              )}

              {profile.favoriteAmmunition === "Other" && (
                <div className="mt-3 md:mt-4">
                  <InputBlock
                    label="Specify Your Favorite Ammunition"
                    id="customAmmunition"
                    value=""
                    onChange={(e) => setProfile({ ...profile, favoriteAmmunition: e.target.value })}
                    placeholder="Enter your favorite ammunition"
                  />
                </div>
              )}
            </div>

            {/* Physical Details Section */}
            <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border border-blue-100">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-blue-700 flex items-center gap-2">
                <User className="w-5 h-5 md:w-6 md:h-6 text-[#ff6b6b]" /> Physical Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <InputBlock 
                  label="Height (cm)" 
                  id="height" 
                  type="number"
                  value={profile.height} 
                  onChange={handleChange}
                  placeholder="e.g., 175"
                />
                <InputBlock 
                  label="Weight (kg)" 
                  id="weight" 
                  type="number"
                  value={profile.weight} 
                  onChange={handleChange}
                  placeholder="e.g., 70"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                <InputBlock 
                  label="Left Eye Sight" 
                  id="leftEyeSight" 
                  value={profile.leftEyeSight} 
                  onChange={handleChange}
                  placeholder="e.g., 20/20, -1.5D"
                />
                <InputBlock 
                  label="Right Eye Sight" 
                  id="rightEyeSight" 
                  value={profile.rightEyeSight} 
                  onChange={handleChange}
                  placeholder="e.g., 20/20, -2.0D"
                />
                <SelectBlock
                  label="Dominant Hand"
                  id="dominantHand"
                  value={profile.dominantHand}
                  onChange={handleChange}
                  options={["Right", "Left", "Ambidextrous"]}
                />
              </div>
            </div>

            <Button type="submit" className="w-full py-2 md:py-3 text-base md:text-lg font-bold bg-blue-700 text-white shadow-md hover:bg-[#ff6b6b] transition rounded-lg mt-4">
              {isNewProfile ? "Create Profile" : "Update Profile"}
            </Button>
          </form>
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2 justify-center">
            <BarChart3 className="w-5 h-5 md:w-7 md:h-7 text-[#ff6b6b]" /> Shooting Analytics
          </h2>

          {/* Filters */}
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-white rounded-lg md:rounded-xl shadow-md border border-gray-200">
            <h3 className="text-base text-blue-700 md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-[#ff6b6b]" />
              Filters
            </h3>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div>
                <label className="block text-xs text-blue-700 md:text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 md:text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 md:text-sm font-medium mb-1">Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                >
                  <option value="all">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-700 md:text-sm font-medium mb-1">Discipline</label>
                <select
                  value={disciplineFilter}
                  onChange={(e) => setDisciplineFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                >
                  <option value="all">All Disciplines</option>
                  {disciplines.map(discipline => (
                    <option key={discipline} value={discipline}>{discipline}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-blue-700">Total Sessions</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-700">{stats.totalSessions || 0}</p>
                </div>
                <Target className="w-5 h-5 md:w-8 md:h-8 text-blue-700" />
              </div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-[#ff6b6b]">Avg Score</p>
                  <p className="text-lg md:text-2xl font-bold text-[#ff6b6b]">{stats.avgScore?.toFixed(1) || 0}</p>
                </div>
                <Award className="w-5 h-5 md:w-8 md:h-8 text-[#ff6b6b]" />
              </div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-blue-700">Avg Accuracy</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-700">{stats.avgAccuracy?.toFixed(1) || 0}%</p>
                </div>
                <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-blue-700" />
              </div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-[#ff6b6b]">Best Score</p>
                  <p className="text-lg md:text-2xl font-bold text-[#ff6b6b]">{stats.bestScore || 0}</p>
                </div>
                <Award className="w-5 h-5 md:w-8 md:h-8 text-[#ff6b6b]" />
              </div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg md:rounded-xl shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-blue-700">Avg Group Size</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-700">{stats.avgGroupSize?.toFixed(1) || 0}mm</p>
                </div>
                <Target className="w-5 h-5 md:w-8 md:h-8 text-blue-700" />
              </div>
            </div>
          </div>

          {shootingData.length === 0 ? (
            <div className="bg-white p-6 md:p-8 rounded-lg md:rounded-xl shadow-md text-center">
              <BarChart3 className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-600 mb-2">No Shooting Data Available</h3>
              <p className="text-gray-500 text-sm md:text-base">Upload your shooting session CSV files to see detailed analytics and performance trends.</p>
            </div>
          ) : (
            <>
              {/* Analytics Charts */}
              <div className="space-y-4 md:space-y-6">
                {/* Performance Overview Chart */}
                <div className="bg-white rounded-lg md:rounded-xl shadow-md p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    Performance Overview
                  </h3>
                  <div className="h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prepareAccuracyTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="sessionNumber" />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => `Session ${value}`}
                          formatter={(value: number, name: string) => [
                            name === 'accuracy' ? `${value}%` : 
                            name === 'groupSize' ? `${value}mm` : value,
                            name === 'accuracy' ? 'Accuracy' :
                            name === 'score' ? 'Score' :
                            name === 'groupSize' ? 'Group Size' : 
                            name === 'innerTens' ? 'Inner Tens' : name
                          ]}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="Accuracy %" strokeWidth={2} />
                        <Line type="monotone" dataKey="score" stroke="#82ca9d" name="Score" strokeWidth={2} />
                        <Line type="monotone" dataKey="innerTens" stroke="#ffc658" name="Inner Tens" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* --- Hall of Fame / Badges Section --- */}
                <div className="mb-8 p-6 md:p-10 rounded-[2.5rem] shadow-2xl bg-white border-t-8 border-[#1d4ed8]">
                  <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-[#0f172a] uppercase tracking-tighter flex items-center gap-3">
                        <Award className="w-10 h-10 text-[#ff6b6b] fill-current" /> 
                        Shooter <span className="text-[#1d4ed8]">Milestones</span>
                      </h3>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">
                        Real-time Performance Achievements
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-3xl border border-blue-100 shadow-inner">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mastery</p>
                        <p className="text-lg font-black text-[#1d4ed8]">
                          {getBadges().filter(b => b.isUnlocked).length} / {getBadges().length}
                        </p>
                      </div>
                      <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-md" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {getBadges().map((badge) => (
                      <div 
                        key={badge.id}
                        className={cn(
                          "relative group p-6 rounded-[2.2rem] flex flex-col items-center text-center transition-all duration-500 border-2",
                          badge.isUnlocked 
                            ? "bg-white border-blue-100 shadow-xl hover:border-[#ff6b6b] hover:scale-105" 
                            : "bg-gray-50 border-transparent opacity-40 grayscale"
                        )}
                      >
                        {/* Badge Icon Holder */}
                        <div className={cn(
                          "w-16 h-16 rounded-[1.2rem] flex items-center justify-center mb-4 transition-transform group-hover:rotate-12",
                          badge.isUnlocked 
                            ? "bg-[#1d4ed8] text-white shadow-[0_10px_20px_rgba(29,78,216,0.3)]" 
                            : "bg-gray-200 text-gray-400"
                        )}>
                          {badge.icon}
                        </div>

                        <h4 className="text-[11px] font-black uppercase text-[#0f172a] tracking-tight mb-1">
                          {badge.name}
                        </h4>
                        
                        {/* Unlocked Progress Bar Logic */}
                        {!badge.isUnlocked && badge.progress !== undefined ? (
                          <div className="w-full px-2">
                            <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <div 
                                  className="h-full bg-[#1d4ed8]" 
                                  style={{ width: `${badge.progress}%` }} 
                                />
                            </div>
                            <span className="text-[8px] font-black text-gray-400 uppercase mt-1 block">
                              {Math.round(badge.progress)}% Target
                            </span>
                          </div>
                        ) : (
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter line-clamp-2">
                            {badge.description}
                          </p>
                        )}

                        {/* Status Checkmark */}
                        {badge.isUnlocked && (
                          <div className="absolute -top-2 -right-2 bg-[#ff6b6b] rounded-full p-1.5 border-4 border-white shadow-lg animate-in zoom-in duration-300">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Performance Analysis */}
                <div className="bg-white rounded-lg md:rounded-xl shadow-md p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                    Monthly Performance Analysis
                  </h3>
                  <div className="h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prepareMonthlyData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name.includes('Score') ? Math.round(value) : 
                            name.includes('Accuracy') ? `${value}%` :
                            name.includes('Group') ? `${value}mm` : value,
                            name
                          ]}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="avgScore" stackId="1" stroke="#8884d8" fill="#8884d8" name="Avg Score" />
                        <Area type="monotone" dataKey="avgAccuracy" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Avg Accuracy %" />
                        <Area type="monotone" dataKey="sessions" stackId="3" stroke="#ffc658" fill="#ffc658" name="Sessions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Training Frequency Chart */}
                <div className="bg-white rounded-lg md:rounded-xl shadow-md p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    Training Frequency
                  </h3>
                  <div className="h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareFrequencyData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalVisits" fill="#8884d8" name="Total Visits" />
                        <Bar dataKey="shootingSessions" fill="#82ca9d" name="With CSV Data" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Discipline Comparison */}
                {prepareDisciplineData().length > 1 && (
                  <div className="bg-white rounded-lg md:rounded-xl shadow-md p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                      Performance by Discipline
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={prepareDisciplineData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value: number, name: string) => [
                              name.includes('Accuracy') ? `${value}%` : Math.round(value),
                              name
                            ]} />
                            <Legend />
                            <Bar dataKey="avgScore" fill="#8884d8" name="Avg Score" />
                            <Bar dataKey="avgAccuracy" fill="#82ca9d" name="Avg Accuracy %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={prepareDisciplineData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry: any) => `${entry.name}: ${entry.sessions}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="sessions"
                            >
                              {prepareDisciplineData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
                <div className="bg-white p-4 md:p-6 rounded-lg md:rounded-xl shadow-md">
                  <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    Performance Insights
                  </h4>
                  <div className="space-y-2 text-xs md:text-sm">
                    {filteredData.length > 5 && (
                      <>
                        <p>• Recent trend: {
                          filteredData.slice(-5).reduce((sum, s) => sum + parseFloat(s.accuracy), 0) / 5 >
                          filteredData.slice(-10, -5).reduce((sum, s) => sum + parseFloat(s.accuracy), 0) / 5
                          ? 'Improving accuracy ↗' : 'Needs attention ↘'
                        }</p>
                        <p>• Best performing discipline: {
                          prepareDisciplineData().length > 0 ? 
                          prepareDisciplineData().reduce((best, curr) => 
                            curr.avgAccuracy > best.avgAccuracy ? curr : best
                          ).name : 'N/A'
                        }</p>
                        <p>• Average sessions per month: {
                          filteredData.length > 0 ? 
                          (filteredData.length / Math.max(1, new Set(filteredData.map(s => `${s.year}-${s.month}`)).size)).toFixed(1) : 0
                        }</p>
                        <p>• Consistency rating: {
                          (() => {
                            const scores = filteredData.slice(-10).map(s => s.totalScore);
                            if (scores.length === 0) return 'N/A';
                            const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                            const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
                            const stdDev = Math.sqrt(variance);
                            const coefficient = (stdDev / avg) * 100;
                            return coefficient < 5 ? 'Excellent' : coefficient < 10 ? 'Good' : coefficient < 15 ? 'Fair' : 'Needs work';
                          })()
                        }</p>
                      </>
                    )}
                    {filteredData.length <= 5 && (
                      <p>• Upload more sessions to see detailed insights</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-white p-4 md:p-6 rounded-lg md:rounded-xl shadow-md">
                  <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    Technical Analysis
                  </h4>
                  <div className="space-y-2 text-xs md:text-sm">
                    <p>• Total shots fired: {filteredData.reduce((sum, s) => sum + s.totalShots, 0)}</p>
                    <p>• Total inner tens: {filteredData.reduce((sum, s) => sum + s.innerTens, 0)}</p>
                    <p>• Inner ten rate: {
                      filteredData.reduce((sum, s) => sum + s.totalShots, 0) > 0 ? 
                      ((filteredData.reduce((sum, s) => sum + s.innerTens, 0) / filteredData.reduce((sum, s) => sum + s.totalShots, 0)) * 100).toFixed(1) : 0
                    }%</p>
                    <p>• Average group size: {
                      filteredData.length > 0 ? 
                      (filteredData.reduce((sum, s) => sum + parseFloat(s.avgGroupSize), 0) / filteredData.length).toFixed(1) : 0
                    }mm</p>
                    <p>• Best group size: {
                      filteredData.length > 0 ? 
                      Math.min(...filteredData.map(s => parseFloat(s.avgGroupSize))).toFixed(1) : 0
                    }mm</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'wallet' && (
        <>
          <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2 justify-center">
            <Wallet className="w-5 h-5 md:w-7 md:h-7 text-[#ff6b6b]" /> Wallet Management
          </h2>
          
          {profile.kyc && profile.wallet ? (
            <ShooterWallet />
          ) : (
            <div className="bg-white rounded-lg md:rounded-xl shadow-md p-4 md:p-6 text-center">
              <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-orange-700 mb-2">KYC Required</h3>
              <p className="text-gray-600 mb-4">Complete your KYC verification to activate wallet services.</p>
              <Button 
                onClick={() => setShowKycModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2"
              >
                Apply for KYC
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === 'bills' && (
        <>
          <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2 justify-center">
            <Receipt className="w-5 h-5 md:w-7 md:h-7 text-[#ff6b6b]" /> Bills Management
          </h2>
          <ShooterBills />
        </>
      )}

      {activeTab === 'scanner' && (
        <>
          <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2 justify-center">
            <ScanLine className="w-5 h-5 md:w-7 md:h-7 text-[#ff6b6b]" /> Document Scanner
          </h2>
          <ShooterScanner />
        </>
      )}

      {/* KYC Application Modal */}
      {showKycModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg md:rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">KYC Verification Required</h3>
              <p className="text-gray-600">Complete your KYC verification to access wallet services.</p>
            </div>
            
            <form onSubmit={handleKycApplication} className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 font-semibold text-blue-700 text-sm">
                  <User className="w-4 h-4 text-blue-400" /> Full Name
                </Label>
                <Input
                  type="text"
                  value={profile.fullName}
                  disabled
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50"
                />
              </div>
              
              <div>
                <Label className="flex items-center gap-2 font-semibold text-blue-700 text-sm">
                  <Phone className="w-4 h-4 text-blue-400" /> Phone Number
                </Label>
                <Input
                  type="tel"
                  value={kycPhoneNumber}
                  onChange={(e) => setKycPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    setShowKycModal(false);
                    setKycPhoneNumber('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={kycLoading || !kycPhoneNumber}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {kycLoading ? "Applying..." : "Apply for KYC"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KYC Pending Modal */}
      {showKycPendingModal && kycApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg md:rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <ClockIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">KYC Verification Pending</h3>
              <p className="text-gray-600">
                Your KYC application is currently being reviewed. Please wait for 2 business days to access the wallet system and make payments.
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">Application Details</h4>
              <p className="text-sm text-blue-700">
                <strong>Status:</strong> {kycApplication.status.charAt(0).toUpperCase() + kycApplication.status.slice(1)}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Submitted:</strong> {kycApplication.applicationDate.toLocaleDateString()}
              </p>
            </div>
            
            <Button
              onClick={() => setShowKycPendingModal(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for text inputs
interface InputBlockProps {
  label: string;
  id: string;
  icon?: React.ReactNode;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

function InputBlock({ label, id, icon, type = "text", value, onChange, placeholder }: InputBlockProps) {
  return (
    <div>
      <Label htmlFor={id} className="flex items-center gap-2 font-semibold text-blue-700 text-sm md:text-base">
        {icon && <span className="text-[#ff6b6b]">{icon}</span>} {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition shadow-sm text-sm md:text-base p-2 md:p-2.5"
      />
    </div>
  );
}

// Helper component for dropdowns
interface SelectBlockProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}

function SelectBlock({ label, id, value, onChange, options }: SelectBlockProps) {
  return (
    <div>
      <Label htmlFor={id} className="flex items-center gap-2 text-blue-700 font-semibold text-sm md:text-base">
        <Star className="w-4 h-4 md:w-5 md:h-5 text-[#ff6b6b]" /> {label}
      </Label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition shadow-sm p-2 md:p-2.5 text-sm md:text-base"
      >
        <option value="">Select {label}</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}