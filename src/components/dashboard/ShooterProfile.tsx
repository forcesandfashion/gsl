import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { User, Calendar, Award, Star, Briefcase, Target, Crosshair, Package, BarChart3, TrendingUp, Filter, Clock } from "lucide-react";
import { db, storage } from "@/firebase/config";
import { collection, doc, getDocs, query, setDoc, where, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

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
  });
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Analytics state with proper typing
  const [shootingData, setShootingData] = useState<ShootingSession[]>([]);
  const [bookingData, setBookingData] = useState<BookingData[]>([]);
  const [filteredData, setFilteredData] = useState<ShootingSession[]>([]);
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [dateFilter, setDateFilter] = useState<{startDate: string, endDate: string}>({ startDate: '', endDate: '' });
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    setProfileData();
    loadAnalyticsData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [dateFilter, disciplineFilter, yearFilter, shootingData]);

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
            // Fix: Ensure preferredDisciplines is always an array
            const safeData = {
              ...data,
              preferredDisciplines: Array.isArray(data.preferredDisciplines) 
                ? data.preferredDisciplines 
                : []
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

  // Load analytics data from Firebase
  const loadAnalyticsData = async () => {
    if (!user) return;
    
    try {
      // Load shooting sessions from CSV data
      const shootingSessionsRef = collection(db, `shooters/${user.uid}/shootingSessions`);
      const shootingSnapshot = await getDocs(shootingSessionsRef);
      
      const shootingSessions: ShootingSession[] = [];
      shootingSnapshot.forEach((doc) => {
        const data = doc.data();
        // Parse CSV data and convert to analytics format
        const parsedData = parseShootingSessionData(data);
        if (parsedData) {
          shootingSessions.push(parsedData);
        }
      });
      
      // Load bookings data
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

  // Parse CSV shooting session data with proper return type
  const parseShootingSessionData = (sessionData: any): ShootingSession | null => {
    try {
      // Assuming sessionData contains parsed CSV content
      if (!sessionData.totalScore && !sessionData.csvContent) return null;
      
      // If CSV content exists, parse it
      let totalScore = 0;
      let accuracy = 0;
      let innerTens = 0;
      let groupSize = 0;
      let series: any[] = [];
      
      if (sessionData.csvContent) {
        // Parse CSV content - adapt this based on your CSV structure
        const lines = sessionData.csvContent.split('\n');
        
        // Look for total score line
        const totalLine = lines.find((line: string) => line.includes('Total:'));
        if (totalLine) {
          const scoreMatch = totalLine.match(/(\d+)/);
          if (scoreMatch) totalScore = parseInt(scoreMatch[1]);
        }
        
        // Look for inner tens
        const innerTensLine = lines.find((line: string) => line.includes('Inner tens:'));
        if (innerTensLine) {
          const tensMatch = innerTensLine.match(/(\d+)/);
          if (tensMatch) innerTens = parseInt(tensMatch[1]);
        }
        
        // Parse series data
        for (let i = 1; i <= 6; i++) {
          const seriesLine = lines.find((line: string) => line.includes(`Series ${i}:`));
          if (seriesLine) {
            const scores = seriesLine.match(/\d+/g);
            if (scores && scores.length > 1) {
              const seriesScore = scores.slice(-1)[0]; // Last number is usually the total
              series.push({
                seriesNumber: i,
                score: parseInt(seriesScore),
                groupSize: Math.random() * 20 + 25, // Placeholder, extract from MPI if available
              });
            }
          }
        }
      } else {
        // Use direct values if available
        totalScore = sessionData.totalScore || 0;
        accuracy = sessionData.accuracy || 0;
        innerTens = sessionData.innerTens || 0;
      }
      
      // Calculate accuracy if not provided
      if (!accuracy && totalScore > 0) {
        const maxScore = sessionData.discipline?.includes('60') ? 600 : 
                        sessionData.discipline?.includes('40') ? 400 : 600;
        accuracy = (totalScore / maxScore * 100);
      }
      
      // Calculate average group size
      const avgGroupSize = series.length > 0 ? 
        series.reduce((sum, s) => sum + s.groupSize, 0) / series.length : 
        Math.random() * 20 + 25;
      
      const sessionDate = sessionData.date || sessionData.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0];
      const dateObj = new Date(sessionDate);
      
      return {
        id: sessionData.id || Date.now(),
        date: sessionDate,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        discipline: sessionData.discipline || 'Air Pistol 60',
        totalScore,
        maxScore: sessionData.discipline?.includes('60') ? 600 : 400,
        accuracy: accuracy.toFixed(1),
        innerTens,
        totalShots: sessionData.totalShots || 60,
        avgGroupSize: avgGroupSize.toFixed(1),
        series,
        weather: sessionData.weather || 'Unknown',
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
      // Fix: Ensure discipline is a string before using includes
      filtered = filtered.filter(session => 
        typeof session.discipline === 'string' && session.discipline.includes(disciplineFilter)
      );
    }
    if (yearFilter !== 'all') {
      // Fix: Convert yearFilter to number for comparison
      const targetYear = parseInt(yearFilter);
      filtered = filtered.filter(session => session.year === targetYear);
    }

    setFilteredData(filtered);
  };

  // Fix: Properly type the event parameter
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs
    if (type === 'number') {
      // Fix: Handle empty string properly for number inputs
      const numericValue = value === '' ? 0 : Number(value);
      setProfile({ ...profile, [name]: numericValue });
    } else {
      setProfile({ ...profile, [name]: value });
    }
  };

  const handleDisciplineChange = (discipline: string) => {
    setProfile(prev => {
      // Fix: Ensure preferredDisciplines is always an array before using includes
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
        // Ensure preferredDisciplines is always an array when saving
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

  // Calculate statistics
  const calculateStats = (): {
    totalSessions?: number;
    avgScore?: number;
    avgAccuracy?: number;
    bestScore?: number;
    avgGroupSize?: number;
  } => {
    if (filteredData.length === 0) return {};

    const totalSessions = filteredData.length;
    const avgScore = filteredData.reduce((sum, session) => sum + session.totalScore, 0) / totalSessions;
    const avgAccuracy = filteredData.reduce((sum, session) => sum + parseFloat(session.accuracy), 0) / totalSessions;
    const bestScore = Math.max(...filteredData.map(session => session.totalScore));
    const avgGroupSize = filteredData.reduce((sum, session) => sum + parseFloat(session.avgGroupSize), 0) / totalSessions;

    return { totalSessions, avgScore, avgAccuracy, bestScore, avgGroupSize };
  };

  const stats = calculateStats();

  // Prepare data for different charts
  const prepareMonthlyData = () => {
    const monthlyData: any = {};
    filteredData.forEach(session => {
      const key = `${session.year}-${session.month.toString().padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { 
          month: key, 
          sessions: 0, 
          totalScore: 0, 
          totalAccuracy: 0,
          totalGroupSize: 0
        };
      }
      monthlyData[key].sessions++;
      monthlyData[key].totalScore += session.totalScore;
      monthlyData[key].totalAccuracy += parseFloat(session.accuracy);
      monthlyData[key].totalGroupSize += parseFloat(session.avgGroupSize);
    });

    return Object.values(monthlyData).map((data: any) => ({
      ...data,
      avgScore: Number((data.totalScore / data.sessions).toFixed(1)),
      avgAccuracy: Number((data.totalAccuracy / data.sessions).toFixed(1)),
      avgGroupSize: Number((data.totalGroupSize / data.sessions).toFixed(1))
    }));
  };

  const prepareFrequencyData = () => {
    const frequencyData: any = {};
    
    // Combine shooting sessions and bookings
    [...filteredData, ...bookingData.filter(b => b.attended)].forEach(session => {
      const monthKey = `${session.year}-${session.month.toString().padStart(2, '0')}`;
      if (!frequencyData[monthKey]) {
        frequencyData[monthKey] = { month: monthKey, shootingSessions: 0, totalVisits: 0 };
      }
      if ('totalScore' in session) {
        frequencyData[monthKey].shootingSessions++;
      }
      frequencyData[monthKey].totalVisits++;
    });

    return Object.values(frequencyData);
  };

  const prepareAccuracyTrendData = () => {
    return filteredData.map((session, index) => ({
      sessionNumber: index + 1,
      date: session.date,
      accuracy: parseFloat(session.accuracy),
      score: session.totalScore,
      groupSize: parseFloat(session.avgGroupSize),
      innerTens: session.innerTens
    }));
  };

  const prepareDisciplineData = () => {
    const disciplineData: any = {};
    filteredData.forEach(session => {
      if (!disciplineData[session.discipline]) {
        disciplineData[session.discipline] = { 
          name: session.discipline, 
          sessions: 0, 
          totalScore: 0, 
          totalAccuracy: 0 
        };
      }
      disciplineData[session.discipline].sessions++;
      disciplineData[session.discipline].totalScore += session.totalScore;
      disciplineData[session.discipline].totalAccuracy += parseFloat(session.accuracy);
    });

    return Object.values(disciplineData).map((data: any) => ({
      ...data,
      avgScore: Number((data.totalScore / data.sessions).toFixed(1)),
      avgAccuracy: Number((data.totalAccuracy / data.sessions).toFixed(1))
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const years = [...new Set(shootingData.map(s => s.year))].sort();
  const disciplines = [...new Set(shootingData.map(s => s.discipline))];

  if (loading) return <div className="text-center text-lg mt-6">Loading profile...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 rounded-2xl shadow-xl p-6">
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <h2 className="text-2xl font-extrabold text-blue-700 mb-4 flex items-center gap-2 justify-center">
            <User className="w-7 h-7 text-blue-400" /> Shooter Profile
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            {/* Image Upload Section */}
            <div className="flex flex-col items-center mb-6">
              {image ? (
                <img src={image} alt="Shooter" className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-md mb-2" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-2">
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
                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                {image ? "Change Image" : "Upload Image"}
              </button>
              <span className="text-xs text-gray-500 mt-1">Max size: 10MB</span>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputBlock label="Full Name" id="fullName" icon={<User />} value={profile.fullName} onChange={handleChange} />
              <InputBlock label="Age" id="age" type="number" icon={<Calendar />} value={profile.age} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <InputBlock label="Experience" id="experience" icon={<Briefcase />} value={profile.experience} onChange={handleChange} />
              <InputBlock label="Achievements" id="achievements" icon={<Award />} value={profile.achievements} onChange={handleChange} />
            </div>

            {/* Preferred Disciplines - Multi-select */}
            <div className="mb-6 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 border border-blue-100">
              <h3 className="text-xl font-extrabold mb-4 text-blue-700 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-400" /> Preferred Disciplines
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "10m Air Pistol", "25m Pistol", "50m Pistol", 
                  "10m Air Rifle", "50m Rifle", "300m Rifle",
                  "Trap", "Skeet", "Double Trap",
                  "Running Target", "Sport Pistol", "Free Pistol"
                ].map((discipline) => (
                  <label key={discipline} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(profile.preferredDisciplines || []).includes(discipline)}
                      onChange={() => handleDisciplineChange(discipline)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{discipline}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Equipment Section */}
            <div className="mb-6 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 border border-pink-100">
              <h3 className="text-xl font-extrabold mb-4 text-pink-700 flex items-center gap-2">
                <Package className="w-6 h-6 text-pink-400" /> Equipment & Preferences
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Favorite Gun Dropdown */}
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

                {/* Favorite Ammunition */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Favorite Stance */}
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

              {/* Custom gun input if "Other" is selected */}
              {profile.favoriteGun === "Other" && (
                <div className="mt-4">
                  <InputBlock
                    label="Specify Your Favorite Gun"
                    id="customGun"
                    value=""
                    onChange={(e) => setProfile({ ...profile, favoriteGun: e.target.value })}
                    placeholder="Enter your favorite gun"
                  />
                </div>
              )}

              {/* Custom ammunition input if "Other" is selected */}
              {profile.favoriteAmmunition === "Other" && (
                <div className="mt-4">
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
            <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border border-blue-100">
              <h3 className="text-xl font-extrabold mb-4 text-blue-700 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-400" /> Physical Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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

            <Button type="submit" className="w-full py-3 text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:from-purple-500 hover:to-blue-500 transition rounded-lg mt-4">
              {isNewProfile ? "Create Profile" : "Update Profile"}
            </Button>
          </form>
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          <h2 className="text-2xl font-extrabold text-blue-700 mb-4 flex items-center gap-2 justify-center">
            <BarChart3 className="w-7 h-7 text-blue-400" /> Shooting Analytics
          </h2>

          {/* Filters */}
          <div className="mb-6 p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discipline</label>
                <select
                  value={disciplineFilter}
                  onChange={(e) => setDisciplineFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalSessions || 0}</p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-green-600">{stats.avgScore?.toFixed(1) || 0}</p>
                </div>
                <Award className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Accuracy</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgAccuracy?.toFixed(1) || 0}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Best Score</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.bestScore || 0}</p>
                </div>
                <Award className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Group Size</p>
                  <p className="text-2xl font-bold text-red-600">{stats.avgGroupSize?.toFixed(1) || 0}mm</p>
                </div>
                <Target className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {shootingData.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Shooting Data Available</h3>
              <p className="text-gray-500">Upload your shooting session CSV files to see detailed analytics and performance trends.</p>
            </div>
          ) : (
            <>
              {/* Analytics Charts */}
              <div className="space-y-6">
                {/* Accuracy Trend Chart */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Accuracy Trend Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
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
                          name === 'groupSize' ? 'Group Size' : name
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="Accuracy %" strokeWidth={2} />
                      <Line type="monotone" dataKey="score" stroke="#82ca9d" name="Score" strokeWidth={2} />
                      <Line type="monotone" dataKey="groupSize" stroke="#ff7300" name="Group Size (mm)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Training Frequency Chart */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Training Frequency
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
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

                {/* Monthly Performance Analysis */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Monthly Performance Analysis
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
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

                {/* Discipline Comparison */}
                {prepareDisciplineData().length > 1 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-600" />
                      Performance by Discipline
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={250}>
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
                      
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={prepareDisciplineData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, sessions }: any) => `${name}: ${sessions}`}
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
                )}
              </div>

              {/* Additional Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Performance Insights
                  </h4>
                  <div className="space-y-2 text-sm">
                    {filteredData.length > 5 && (
                      <>
                        <p>• Recent trend: {
                          filteredData.slice(-5).reduce((sum, s) => sum + parseFloat(s.accuracy), 0) / 5 >
                          filteredData.slice(-10, -5).reduce((sum, s) => sum + parseFloat(s.accuracy), 0) / 5
                          ? 'Improving accuracy' : 'Declining accuracy'
                        }</p>
                        <p>• Best performing discipline: {
                          prepareDisciplineData().length > 0 ? 
                          prepareDisciplineData().reduce((best, curr) => 
                            parseFloat(curr.avgAccuracy.toString()) > parseFloat(best.avgAccuracy.toString()) ? curr : best
                          ).name : 'N/A'
                        }</p>
                        <p>• Average sessions per month: {
                          filteredData.length > 0 ? 
                          (filteredData.length / Math.max(1, new Set(filteredData.map(s => `${s.year}-${s.month}`)).size)).toFixed(1) : 0
                        }</p>
                      </>
                    )}
                    {filteredData.length <= 5 && (
                      <p>• Upload more sessions to see detailed insights</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Training Pattern
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>• Total training sessions: {bookingData.filter(b => b.attended).length}</p>
                    <p>• Sessions with data uploaded: {filteredData.length}</p>
                    <p>• Data upload rate: {
                      bookingData.filter(b => b.attended).length > 0 ? 
                      ((filteredData.length / bookingData.filter(b => b.attended).length) * 100).toFixed(1) : 0
                    }%</p>
                    <p>• Most active year: {
                      years.length > 0 ? 
                      years.reduce((mostActive, year) => 
                        filteredData.filter(s => s.year === year).length > 
                        filteredData.filter(s => s.year === mostActive).length ? year : mostActive
                      ) : 'N/A'
                    }</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
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
      <Label htmlFor={id} className="flex items-center gap-2 font-semibold text-blue-700">
        {icon && <span className="text-blue-400">{icon}</span>} {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition shadow-sm"
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
      <Label htmlFor={id} className="flex items-center gap-2 text-pink-700 font-semibold">
        <Star className="w-5 h-5 text-pink-400" /> {label}
      </Label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition shadow-sm p-2"
      >
        <option value="">Select {label}</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}