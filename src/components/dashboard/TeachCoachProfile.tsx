import React, { useState, useEffect } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  Users,
  Calendar,
  MapPin,
  BarChart,
  ArrowRightCircle,
  TrendingUp,
  Clock,
  Star,
  Crown,
  Zap,
  Shield,
  Camera,
  HeartHandshake,
  FileText,
  MessageSquare,
  UserCheck,
  CreditCard,
  Target,
  User,
  Mail,
  Phone,
  Settings,
  Edit,
  Globe,
  Award,
} from "lucide-react";

interface CoachProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  discipline: string;
  location: string;
  experienceYears: number;
  bio: string;
  certification: string;
  isElite: boolean;
  studentsCoached: number;
  avgRating: number;
}

const mockCoachProfile: CoachProfile = {
  id: "C101",
  name: "Dr. Arjun Sharma",
  email: "arjun.sharma@elitecoach.com",
  phone: "+91 98765 43210",
  photoUrl: "https://via.placeholder.com/150/1d4ed8/FFFFFF?text=AS", 
  discipline: "10m Air Rifle, 50m Rifle Prone",
  location: "New Delhi, India (Online & On-site)",
  experienceYears: 18,
  bio: "Lead Technical Coach focused on kinetic chain stability and trigger synchronization. My approach combines advanced video analysis with biofeedback training to break plateaus and achieve international podium finishes.",
  certification: "ISSF Level C, NSNIS Certified",
  isElite: true,
  studentsCoached: 55,
  avgRating: 4.8,
};

const CoachProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CoachProfile>(mockCoachProfile);
  const [loading, setLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState(mockCoachProfile); 
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setFormData(profile);
    setPhotoPreviewUrl(profile.photoUrl);
  }, [profile]);
  
  useEffect(() => {
    if (!isEditDialogOpen) {
        setNewPhotoFile(null);
        setPhotoPreviewUrl(profile.photoUrl);
    }
  }, [isEditDialogOpen, profile.photoUrl]);
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } else {
      setNewPhotoFile(null);
      setPhotoPreviewUrl(profile.photoUrl);
    }
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
        const updatedData = { ...formData, photoUrl: profile.photoUrl };
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        setProfile(updatedData); 
        alert("Profile details updated successfully!");
    } catch (error) {
        alert("Failed to update profile.");
    } finally {
        setLoading(false);
        setIsEditDialogOpen(false);
    }
  };

  const ProfileMetric = ({ title, value, icon, borderColor }: { title: string; value: string | number; icon: React.ReactNode; borderColor: string; }) => (
    <Card className={cn("shadow-lg border-0 bg-white group border-t-4 transition-transform hover:scale-105", borderColor)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</CardTitle>
        <div className="text-[#1d4ed8] group-hover:text-[#ff6b6b] transition-colors">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-black text-[#0f172a] uppercase">
          {value}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                  Coach <span className="text-[#ff6b6b]">Profile</span>:
                  <span className="ml-2 text-[#0f172a]">
                    {profile.name}
                  </span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {profile.isElite && (
                    <span className="bg-[#ff6b6b] text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Elite Certified
                    </span>
                  )}
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#1d4ed8]" /> Master Technical Specialist
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/dashboard/technical-coach")}
                variant="outline"
                className="border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-bold uppercase tracking-widest text-[10px]"
              >
                Dashboard
              </Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase tracking-widest text-[10px] shadow-lg">
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-black text-[#0f172a] uppercase tracking-tight flex items-center gap-2">
                      <Edit className="w-5 h-5 text-[#ff6b6b]" /> Update Credentials
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="flex flex-col items-center gap-4">
                        <img src={photoPreviewUrl || profile.photoUrl} className="w-20 h-20 rounded-full object-cover border-4 border-[#1d4ed8]/20 shadow-md" />
                        <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} className="text-xs" />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                        <Input id="name" value={formData.name} onChange={handleFormChange} className="rounded-xl border-gray-100" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Direct Line</Label>
                        <Input id="phone" value={formData.phone} onChange={handleFormChange} className="rounded-xl border-gray-100" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Coaching Philosophy</Label>
                        <Textarea id="bio" value={formData.bio} onChange={handleFormChange} className="rounded-xl border-gray-100 min-h-[100px]" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleProfileUpdate} disabled={loading} className="w-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest py-6 rounded-2xl">
                      {loading ? "Syncing..." : "Push Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Identity Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden border-t-8 border-[#1d4ed8]">
              <CardContent className="p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-[#ff6b6b] rounded-full blur-lg opacity-20"></div>
                  <img src={profile.photoUrl} className="relative w-32 h-32 mx-auto rounded-full object-cover border-4 border-white shadow-2xl" />
                </div>

                <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-tighter mb-2">{profile.name}</h2>
                <div className="w-12 h-1.5 bg-[#ff6b6b] mx-auto mb-8"></div>

                <div className="space-y-6 text-left">
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <Mail className="w-5 h-5 text-[#1d4ed8]" />
                    <div className="min-w-0">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Node</span>
                      <span className="text-sm font-bold text-[#0f172a] truncate block">{profile.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <Phone className="w-5 h-5 text-[#ff6b6b]" />
                    <div>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Hash</span>
                      <span className="text-sm font-bold text-[#0f172a]">{profile.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <MapPin className="w-5 h-5 text-[#1d4ed8]" />
                    <div>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Base</span>
                      <span className="text-sm font-bold text-[#0f172a]">{profile.location}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <ProfileMetric title="Experience" value={`${profile.experienceYears} YR`} icon={<Zap className="w-4 h-4" />} borderColor="border-[#1d4ed8]" />
              <ProfileMetric title="User Rating" value={`${profile.avgRating}/5`} icon={<Star className="w-4 h-4" />} borderColor="border-[#ff6b6b]" />
            </div>
          </div>

          {/* Right Column: Intelligence & Stats */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-[#0f172a] p-8 border-b border-white/10">
                <CardTitle className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  <FileText className="text-[#ff6b6b] w-4 h-4" /> Strategic Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-gray-600 leading-relaxed text-lg font-medium italic">
                  "{profile.bio}"
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="shadow-xl border-0 bg-white rounded-[2rem] overflow-hidden border-b-8 border-[#ff6b6b]">
                <CardHeader className="p-6 border-b border-gray-50">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-[#0f172a] flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#ff6b6b]" /> Core Disciplines
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm font-bold text-[#1d4ed8] leading-relaxed uppercase tracking-tight">{profile.discipline}</p>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white rounded-[2rem] overflow-hidden border-b-8 border-[#1d4ed8]">
                <CardHeader className="p-6 border-b border-gray-50">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-[#0f172a] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#1d4ed8]" /> Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm font-bold text-gray-700 leading-relaxed uppercase tracking-tight">{profile.certification}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-gray-50 p-8 border-b border-gray-100">
                <CardTitle className="text-lg font-black text-[#0f172a] uppercase tracking-widest flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-[#1d4ed8]" /> Performance <span className="text-[#ff6b6b]">Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <TechnicalMetric title="Total Mentored" value={profile.studentsCoached.toString()} icon={<Users className="w-5 h-5" />} trend="+12% Retention" trendColor="text-green-600" />
                  <TechnicalMetric title="Avg improvement" value="+4.5 PTS" icon={<TrendingUp className="w-5 h-5" />} trend="Per cycle" trendColor="text-[#1d4ed8]" />
                  <TechnicalMetric title="Sessions Logged" value="750+" icon={<Calendar className="w-5 h-5" />} trend="High Volume" trendColor="text-[#ff6b6b]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

const TechnicalMetric = ({ title, value, icon, trend, trendColor }: { title: string; value: string; icon: React.ReactNode; trend: string; trendColor: string; }) => (
  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
    <div className="flex items-center gap-2 text-[#1d4ed8] mb-4">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</span>
    </div>
    <div className="text-2xl font-black text-[#0f172a] mb-2 uppercase">{value}</div>
    <div className={cn("text-[9px] font-black uppercase tracking-widest", trendColor)}>
      {trend}
    </div>
  </div>
);

export default CoachProfilePage;