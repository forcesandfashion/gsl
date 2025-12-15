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

// Imported Icons from existing dashboard, plus profile-specific ones
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

// Existing Firebase imports (assuming they are set up)
// import { db } from "@/firebase/config";
// import { doc, getDoc, updateDoc } from "firebase/firestore";


// --- PROFILE TYPES & MOCK DATA ---
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
  photoUrl: "https://via.placeholder.com/150/0000FF/FFFFFF?text=AS", // Original Placeholder URL
  discipline: "10m Air Rifle, 50m Rifle Prone",
  location: "New Delhi, India (Online & On-site)",
  experienceYears: 18,
  bio: "Lead Technical Coach focused on kinetic chain stability and trigger synchronization. My approach combines advanced video analysis with biofeedback training to break plateaus and achieve international podium finishes.",
  certification: "ISSF Level C, NSNIS Certified",
  isElite: true,
  studentsCoached: 55,
  avgRating: 4.8,
};

// Component for the Profile Page
const CoachProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CoachProfile>(mockCoachProfile);
  const [loading, setLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // States used *only* for the dialog session
  const [formData, setFormData] = useState(mockCoachProfile); 
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Initialize form data and preview URL when dialog opens or profile loads
  useEffect(() => {
    setFormData(profile);
    setPhotoPreviewUrl(profile.photoUrl);
  }, [profile]);
  
  // Reset image states when dialog is closed
  useEffect(() => {
    if (!isEditDialogOpen) {
        setNewPhotoFile(null);
        setPhotoPreviewUrl(profile.photoUrl); // Ensure preview resets to actual URL
    }
  }, [isEditDialogOpen, profile.photoUrl]);
  

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      // Create a URL for local preview which lives only for this session
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } else {
      setNewPhotoFile(null);
      setPhotoPreviewUrl(profile.photoUrl);
    }
  };


  const handleProfileUpdate = async () => {
    setLoading(true);

    // --- KEY CHANGE: IGNORE PHOTO URL FROM PREVIEW/NEW FILE ---
    // Since we are not saving the file, we ensure the photoUrl remains the original one
    // while other data (name, phone, bio) is saved.

    try {
        if (newPhotoFile) {
            // **MOCK PHOTO UPLOAD FAILURE/SKIP**: 
            // In a real app, you would upload here. For now, we skip saving the new URL.
            console.warn("Photo file selected but actual upload to Firebase Storage is currently skipped/mocked.");
        }

        const updatedData = {
            ...formData,
            // Explicitly force the photoUrl to be the currently persisted one
            photoUrl: profile.photoUrl, 
        };

        // 1. Placeholder for updating Firestore (db)
        /*
        if (user?.uid) {
            // Only update non-photo fields for mock scenario
            await updateDoc(doc(db, "coach_details", user.uid), updatedData);
        }
        */
        
        // Simulate successful update (Textual data saved, photo URL ignored)
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        
        setProfile(updatedData); // Update the main profile state with new text data
        
        // Reset image states (optional, but clean)
        setNewPhotoFile(null);
        setPhotoPreviewUrl(updatedData.photoUrl); 
        
        alert("Profile text details updated successfully! (Photo update skipped as database connection is mocked)");

    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Check console for details.");
    } finally {
        setLoading(false);
        setIsEditDialogOpen(false); // Close dialog
    }
  };

  // Helper component for metric cards (reusing dashboard style)
  const ProfileMetric = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card className={`shadow-lg border-0 hover:shadow-xl transition-shadow duration-300 group ${color}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-sm font-semibold text-gray-800">{title}</CardTitle>
        <div className="p-2 bg-white/70 rounded-lg group-hover:bg-white transition-colors text-indigo-600">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold text-gray-900">
          {value}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      {/* Replicating the Dashboard Header Structure */}
      <header className="bg-white/90 shadow-sm backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50 flex items-center h-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                  Coach Profile:
                  <span className="text-red-600">
                    {profile.name || user?.email?.split("@")[0] || "Coach"}
                  </span>
                  {profile.isElite && (
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-1 py-0 rounded-full flex items-center gap-1 text-xs font-semibold text-white shadow-md">
                      <Crown className="w-2.5 h-2.5 text-white" />
                      <span>Elite</span>
                    </div>
                  )}
                </h1>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Technical Coaching Specialist
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                onClick={() => navigate("/dashboard/technical-coach")}
                variant="outline"
                className="font-semibold px-3 py-1 border-slate-200 hover:bg-slate-50 transition-all duration-200 text-xs"
                size="sm"
              >
                <BarChart className="w-3 h-3 mr-1" /> Dashboard
              </Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    className="font-semibold px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-xs"
                    size="sm"
                  >
                    <Settings className="w-3 h-3 mr-1" /> Edit Profile
                  </Button>
                </DialogTrigger>
                {/* --- EDIT PROFILE MODAL --- */}
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5 text-indigo-600" /> Edit Coach Details
                    </DialogTitle>
                    <DialogDescription>
                      Update your professional information and contact details.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    
                    {/* --- NEW PHOTO UPLOAD FIELD --- */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="photo" className="text-right">
                            Picture
                        </Label>
                        <div className="col-span-3 flex flex-col items-center">
                            {/* Image Preview (Uses temporary URL or original URL) */}
                            <img
                                src={photoPreviewUrl || profile.photoUrl}
                                alt="Profile Preview"
                                className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-indigo-300"
                            />
                            <Input
                                id="photo"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="col-span-3 text-sm h-10 p-2"
                            />
                        </div>
                    </div>
                    {/* --- END NEW PHOTO UPLOAD FIELD --- */}

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={handleFormChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="discipline" className="text-right">
                        Discipline
                      </Label>
                      <Input
                        id="discipline"
                        value={formData.discipline}
                        onChange={handleFormChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="bio" className="text-right pt-2">
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={handleFormChange}
                        className="col-span-3 resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {loading ? "Saving..." : "Save changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
                {/* --- END EDIT PROFILE MODAL --- */}
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {loading && (
          <div className="text-center py-8 text-slate-500">Loading profile...</div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column: Personal and Contact Info */}
            <div className="lg:col-span-1 space-y-6 md:space-y-8">
              {/* Coach Avatar and Core Info Card */}
              <Card className="shadow-xl border-t-4 border-indigo-600 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  {/* Avatar/Photo Display - ALWAYS uses the persisted URL */}
                  <img
                    src={profile.photoUrl}
                    alt={`${profile.name} profile`}
                    className="w-24 h-24 mx-auto rounded-full object-cover mb-4 border-4 border-white shadow-lg"
                  />

                  <CardTitle className="text-2xl font-extrabold text-gray-900 mb-1">
                    {profile.name}
                  </CardTitle>
                  <CardDescription className="text-indigo-600 font-semibold mb-4 flex items-center justify-center gap-1">
                    <Shield className="w-4 h-4" /> Professional Coach
                  </CardDescription>

                  <div className="text-left space-y-2 mt-4 text-sm text-slate-700">
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Email:</span> {profile.email}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Phone:</span> {profile.phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Location:</span>{" "}
                      {profile.location}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Metrics (to fit the dashboard style) */}
              <div className="grid grid-cols-2 gap-4">
                <ProfileMetric
                  title="Exp. (Years)"
                  value={profile.experienceYears}
                  icon={<Zap className="w-5 h-5" />}
                  color="bg-indigo-50"
                />
                <ProfileMetric
                  title="Avg. Rating"
                  value={profile.avgRating.toFixed(1)}
                  icon={<Star className="w-5 h-5" />}
                  color="bg-amber-50"
                />
              </div>

              {/* Bio/Summary Card */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                  <CardTitle className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> Professional Bio
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Your philosophy and areas of focus.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-4 md:p-6">
                  <p className="text-slate-700 leading-relaxed text-sm">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Specialization and Coaching Stats */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Specialization Card */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                  <CardTitle className="font-bold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-500" /> Specialization & Certification
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Disciplines and professional credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-4 md:p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-3 bg-red-50/50 rounded-lg border border-red-100">
                      <Target className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">Disciplines:</p>
                        <p className="text-sm text-slate-700">
                          {profile.discipline}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <Award className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">Certification:</p>
                        <p className="text-sm text-slate-700">
                          {profile.certification}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coaching Success Metrics */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                  <CardTitle className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" /> Coaching Success
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Key statistics across your coaching tenure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 p-4 md:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <TechnicalMetric
                      title="Total Students"
                      value={profile.studentsCoached.toString()}
                      icon={<Users className="w-5 h-5" />}
                      trend="+5 since last year"
                      trendColor="text-green-500"
                    />
                    <TechnicalMetric
                      title="Average Score Delta"
                      value="+4.5 pts"
                      icon={<TrendingUp className="w-5 h-5" />}
                      trend="Avg improvement"
                      trendColor="text-blue-500"
                    />
                    <TechnicalMetric
                      title="Total Sessions Logged"
                      value="750+"
                      icon={<Calendar className="w-5 h-5" />}
                      trend="High activity"
                      trendColor="text-indigo-500"
                    />
                  </div>
                  <div className="mt-6">
                    <Button variant="link" className="text-sm text-indigo-600 px-0">
                      View detailed performance reports <ArrowRightCircle className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Reusing helper component from the dashboard
const TechnicalMetric = ({
  title,
  value,
  icon,
  trend,
  trendColor,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendColor: string;
}) => (
  <div className="p-4 bg-slate-50 rounded-lg shadow-sm border border-slate-200">
    <div className="flex items-center gap-2 text-blue-600 mb-2">
      {icon}
      <span className="text-xs font-semibold uppercase text-slate-600">
        {title}
      </span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className={`text-xs font-medium ${trendColor} mt-1`}>
      {trend}
    </div>
  </div>
);

export default CoachProfilePage;