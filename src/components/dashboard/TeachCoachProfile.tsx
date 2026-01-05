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
import { db, storage } from "@/firebase/config"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/components/ui/use-toast";

import {
  Users,
  Calendar,
  MapPin,
  TrendingUp,
  Star,
  Shield,
  FileText,
  Target,
  User,
  Mail,
  Phone,
  Edit,
  Award,
  Upload,
  Loader2
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

const CoachProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CoachProfile>>({});
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        setLoading(true);
        const docRef = doc(db, "technical-coaches", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedProfile: CoachProfile = {
            id: user.uid,
            name: data.fullName || "",
            email: user.email || data.email || "",
            phone: data.phone || "",
            photoUrl: data.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            discipline: data.discipline || "",
            location: data.location || "",
            experienceYears: data.experienceYears || 0,
            bio: data.bio || "",
            certification: data.certification || "",
            isElite: data.isElite || false,
            studentsCoached: data.studentsCoached || 0,
            avgRating: data.avgRating || 5.0,
          };
          setProfile(loadedProfile);
          setFormData(loadedProfile);
          setPhotoPreviewUrl(loadedProfile.photoUrl);
        }
      } catch (error) {
        console.error("Error fetching coach profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async () => {
    if (!user?.uid) return;
    setUpdating(true);
    try {
        let finalPhotoUrl = profile?.photoUrl;

        // 1. Handle Photo Upload if a new file is selected
        if (newPhotoFile) {
            const storageRef = ref(storage, `coach-avatars/${user.uid}`);
            await uploadBytes(storageRef, newPhotoFile);
            finalPhotoUrl = await getDownloadURL(storageRef);
        }

        // 2. Sync to Firestore
        const docRef = doc(db, "technical-coaches", user.uid);
        const updatePayload = {
            fullName: formData.name,
            phone: formData.phone,
            bio: formData.bio,
            discipline: formData.discipline,
            certification: formData.certification,
            location: formData.location,
            photoUrl: finalPhotoUrl
        };

        await updateDoc(docRef, updatePayload);
        
        setProfile(prev => prev ? { ...prev, ...formData, photoUrl: finalPhotoUrl! } : null);
        setIsEditDialogOpen(false);
        toast({ title: "Profile Updated", description: "Your credentials have been synced successfully." });
    } catch (error) {
        toast({ variant: "destructive", title: "Update Failed", description: "Could not save changes." });
    } finally {
        setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d4ed8]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-[#1d4ed8] overflow-hidden shadow-md">
                <img src={profile?.photoUrl} className="w-full h-full object-cover" alt="Profile" />
              </div>
              <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                COACH <span className="text-[#ff6b6b]">COMMAND</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/dashboard/technical-coach")} variant="outline" className="border-[#1d4ed8] text-[#1d4ed8] font-bold uppercase text-[10px]">Dashboard</Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase text-[10px] shadow-lg">Edit Profile</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-black text-[#0f172a] uppercase tracking-tight flex items-center gap-2">
                      <Edit className="w-5 h-5 text-[#ff6b6b]" /> Update Professional File
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
                    <div className="flex flex-col items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-dashed border-gray-200">
                        <img src={photoPreviewUrl || profile?.photoUrl} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl" />
                        <div className="relative">
                          <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                          <Label htmlFor="photo" className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 transition-all">
                            <Upload className="w-3 h-3" /> Change Avatar
                          </Label>
                        </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase text-gray-400">Full Name</Label>
                        <Input id="name" value={formData.name} onChange={handleFormChange} className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="certification" className="text-[10px] font-black uppercase text-gray-400">Add Certifications</Label>
                        <Input id="certification" placeholder="e.g. ISSF Level C, NSNIS" value={formData.certification} onChange={handleFormChange} className="rounded-xl border-[#1d4ed8]/30 focus:border-[#1d4ed8]" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="discipline" className="text-[10px] font-black uppercase text-gray-400">Disciplines</Label>
                        <Input id="discipline" value={formData.discipline} onChange={handleFormChange} className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="bio" className="text-[10px] font-black uppercase text-gray-400">Philosophy</Label>
                        <Textarea id="bio" value={formData.bio} onChange={handleFormChange} className="rounded-xl min-h-[100px]" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleProfileUpdate} disabled={updating} className="w-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase py-6 rounded-2xl">
                      {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Updates"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Identity Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden border-t-8 border-[#1d4ed8]">
              <CardContent className="p-8 text-center">
                <img src={profile?.photoUrl} className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-white shadow-2xl" />
                <h2 className="text-2xl font-black text-[#0f172a] uppercase mt-4">{profile?.name}</h2>
                <div className="w-12 h-1.5 bg-[#ff6b6b] mx-auto my-4"></div>
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <Mail className="w-4 h-4 text-[#1d4ed8]" />
                    <span className="text-sm font-bold text-[#0f172a] truncate">{profile?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <Phone className="w-4 h-4 text-[#ff6b6b]" />
                    <span className="text-sm font-bold text-[#0f172a]">{profile?.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <MapPin className="w-4 h-4 text-[#1d4ed8]" />
                    <span className="text-sm font-bold text-[#0f172a]">{profile?.location || "Not Set"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-xl border-t-4 border-[#1d4ed8] text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Experience</p>
                <div className="text-xl font-black text-[#0f172a]">{profile?.experienceYears} YR</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-xl border-t-4 border-[#ff6b6b] text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Rating</p>
                <div className="text-xl font-black text-[#0f172a]">{profile?.avgRating}/5</div>
              </div>
            </div>
          </div>

          {/* Detailed Info */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-[#0f172a] p-8">
                <CardTitle className="text-white font-black uppercase text-xs flex items-center gap-2">
                  <FileText className="text-[#ff6b6b] w-4 h-4" /> Professional Bio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 italic text-gray-600 leading-relaxed text-lg">
                "{profile?.bio || "No biography provided yet."}"
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="shadow-xl border-0 bg-white rounded-[2rem] border-b-8 border-[#ff6b6b]">
                <CardHeader className="p-6">
                  <CardTitle className="text-xs font-black uppercase text-[#0f172a] flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#ff6b6b]" /> Specializations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 font-bold text-[#1d4ed8] uppercase">
                  {profile?.discipline}
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white rounded-[2rem] border-b-8 border-[#1d4ed8]">
                <CardHeader className="p-6">
                  <CardTitle className="text-xs font-black uppercase text-[#0f172a] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#1d4ed8]" /> Valid Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 font-bold text-gray-700 uppercase">
                  {profile?.certification || "Pending Verification"}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] p-8">
              <CardTitle className="text-lg font-black text-[#0f172a] uppercase mb-6 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-[#1d4ed8]" /> Performance Intelligence
              </CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatItem icon={<Users />} title="Students" val={profile?.studentsCoached || 0} />
                  <StatItem icon={<TrendingUp />} title="Success" val="Elite" />
                  <StatItem icon={<Calendar />} title="Status" val="Active" />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatItem = ({ icon, title, val }: { icon: any, title: string, val: any }) => (
  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
    <div className="text-[#1d4ed8] mb-4">{icon}</div>
    <span className="text-[10px] font-black uppercase text-gray-400">{title}</span>
    <div className="text-2xl font-black text-[#0f172a] uppercase">{val}</div>
  </div>
);

export default CoachProfilePage;