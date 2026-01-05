import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { db, storage } from "@/firebase/config"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
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
import {
  Calendar,
  MapPin,
  TrendingUp,
  Shield,
  FileText,
  Target,
  User,
  Mail,
  Phone,
  Edit,
  Upload,
  Loader2,
  Briefcase,
  DollarSign,
  PieChart
} from "lucide-react";

interface InvestorProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string;
  investmentInterests: string;
  location: string;
  activeInvestments: number;
  bio: string;
  kycStatus: string;
  isVerified: boolean;
  totalCapitalCommitted: string;
  netReturnAvg: number;
}

const InvestorProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<InvestorProfile>>({});
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        setLoading(true);
        const docRef = doc(db, "investor", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as InvestorProfile;
          setProfile({ ...data, id: user.uid });
          setFormData(data);
          setPhotoPreviewUrl(data.photoUrl || "");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
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

      // 1. Handle Photo Upload
      if (newPhotoFile) {
        const storageRef = ref(storage, `investor-avatars/${user.uid}`);
        await uploadBytes(storageRef, newPhotoFile);
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      // 2. Prepare Payload (Ensuring field names match database exactly)
      const updatePayload = {
        fullName: formData.fullName || profile?.fullName || "",
        phone: formData.phone || profile?.phone || "",
        bio: formData.bio || profile?.bio || "",
        investmentInterests: formData.investmentInterests || profile?.investmentInterests || "",
        kycStatus: formData.kycStatus || profile?.kycStatus || "Pending",
        location: formData.location || profile?.location || "",
        photoUrl: finalPhotoUrl || ""
      };

      const docRef = doc(db, "investor", user.uid);
      await updateDoc(docRef, updatePayload);
      
      // Update Local State
      setProfile((prev) => (prev ? { ...prev, ...updatePayload } : null));
      setIsEditDialogOpen(false);
      
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved to the database.",
      });
    } catch (error: any) {
      console.error("Update error details:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not save profile changes.",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-[#1d4ed8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-[#1d4ed8] overflow-hidden">
                <img src={profile?.photoUrl} className="w-full h-full object-cover" alt="Profile" />
              </div>
              <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Investor <span className="text-[#ff6b6b]">Profile</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/dashboard/investor")} variant="outline" className="border-[#1d4ed8] text-[#1d4ed8] font-bold uppercase text-[10px]">Dashboard</Button>
              
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase text-[10px]">Edit Profile</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="font-black text-[#0f172a] uppercase">Update Portfolio Data</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex flex-col items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-dashed">
                        <img src={photoPreviewUrl || profile?.photoUrl} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl" />
                        <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} className="text-xs" />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="fullName" className="text-[10px] font-black uppercase text-gray-400">Full Name</Label>
                        <Input id="fullName" value={formData.fullName} onChange={handleFormChange} className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-[10px] font-black uppercase text-gray-400">Contact Number</Label>
                        <Input id="phone" value={formData.phone} onChange={handleFormChange} className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="investmentInterests" className="text-[10px] font-black uppercase text-gray-400">Investment Interests</Label>
                        <Input id="investmentInterests" value={formData.investmentInterests} onChange={handleFormChange} className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="bio" className="text-[10px] font-black uppercase text-gray-400">Investment Thesis</Label>
                        <Textarea id="bio" value={formData.bio} onChange={handleFormChange} className="rounded-xl min-h-[100px]" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleProfileUpdate} disabled={updating} className="w-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase py-6 rounded-2xl">
                      {updating ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Changes"}
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
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] border-t-8 border-[#1d4ed8]">
              <CardContent className="p-8 text-center">
                <img src={profile?.photoUrl} className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-white shadow-2xl" />
                <h2 className="text-2xl font-black text-[#0f172a] uppercase mt-4">{profile?.fullName}</h2>
                <div className="w-12 h-1.5 bg-[#ff6b6b] mx-auto my-4"></div>
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl text-xs font-bold text-[#0f172a]">
                    <Mail className="w-4 h-4 text-[#1d4ed8]" /> {profile?.email}
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl text-xs font-bold text-[#0f172a]">
                    <Phone className="w-4 h-4 text-[#ff6b6b]" /> {profile?.phone}
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl text-xs font-bold text-[#0f172a]">
                    <MapPin className="w-4 h-4 text-[#1d4ed8]" /> {profile?.location || "Global"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-[#0f172a] p-8">
                <CardTitle className="text-white font-black uppercase text-xs flex items-center gap-2">
                  <FileText className="text-[#ff6b6b] w-4 h-4" /> Portfolio Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 italic text-gray-600 leading-relaxed text-lg">
                "{profile?.bio || "Investment thesis not defined."}"
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="shadow-xl border-0 bg-white rounded-[2rem] border-b-8 border-[#ff6b6b]">
                <CardHeader className="p-6">
                  <CardTitle className="text-xs font-black uppercase text-[#0f172a]">Target Sectors</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 font-bold text-[#1d4ed8] uppercase">
                  {profile?.investmentInterests || "Not Specified"}
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white rounded-[2rem] border-b-8 border-[#1d4ed8]">
                <CardHeader className="p-6">
                  <CardTitle className="text-xs font-black uppercase text-[#0f172a]">KYC / Compliance</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 font-bold text-gray-700 uppercase">
                  {profile?.kycStatus || "Review Pending"}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InvestorProfilePage;