"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { User, Calendar, Award, Star, Briefcase } from "lucide-react";
import { db, storage } from "@/firebase/config";
import { collection, doc, getDocs, query, setDoc, where, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  totalPoints?: number; // Add this field to the interface
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
  const [isNewProfile, setIsNewProfile] = useState(false); // Track if this is a new profile
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileData();
  }, []);

  const setProfileData = async () => {
    if (user) {
      setLoading(true);
      try {
        const shootersRef = collection(db, "shooters");
        const shootersQuery = query(shootersRef, where("uid", "==", user.uid));
        const shootersSnapshot = await getDocs(shootersQuery);
        
        if (shootersSnapshot.empty) {
          // No profile exists - this will be a new profile
          setIsNewProfile(true);
        } else {
          // Profile exists - load existing data
          setIsNewProfile(false);
          shootersSnapshot.forEach((doc) => {
            const data = doc.data() as ShooterProfile;
            setProfile(data);
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

  const handleChange = (e: any) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const docRef = doc(db, "shooters", user.uid);
      
      // Prepare the data to save
      let dataToSave = { ...profile, uid: user.uid };
      
      if (isNewProfile) {
        // First time creating profile - set totalPoints to 0
        dataToSave.totalPoints = 0;
        toast({ title: "Profile Created", description: "Your profile has been created with 0 points." });
      } else {
        // Profile already exists - check if totalPoints exists in current profile
        // If it doesn't exist, we'll preserve any existing totalPoints from the database
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
          const existingData = existingDoc.data();
          if (existingData.totalPoints !== undefined) {
            // Preserve existing totalPoints
            dataToSave.totalPoints = existingData.totalPoints;
          }
        }
        toast({ title: "Profile Updated", description: "Your profile has been updated." });
      }
      
      await setDoc(docRef, dataToSave);
      setIsNewProfile(false); // After first save, it's no longer a new profile
      
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Error", description: "Could not save profile." });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center text-lg mt-6">Loading profile...</div>;

  return (
    <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 rounded-2xl shadow-xl p-6">
      
      <h2 className="text-2xl font-extrabold text-blue-700 mb-4 flex items-center gap-2 justify-center">
        <User className="w-7 h-7 text-blue-400" /> Shooter Profile
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
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

        {/* Form fields */}
        <InputBlock label="Full Name" id="fullName" icon={<User />} value={profile.fullName} onChange={handleChange} />
        <InputBlock label="Age" id="age" type="number" icon={<Calendar />} value={profile.age} onChange={handleChange} />
        <InputBlock label="Experience" id="experience" icon={<Briefcase />} value={profile.experience} onChange={handleChange} />
        <InputBlock label="Achievements" id="achievements" icon={<Award />} value={profile.achievements} onChange={handleChange} />

        {/* Favorite Gun Dropdown */}
        <SelectBlock
          label="Favorite Gun"
          id="favoriteGun"
          value={profile.favoriteGun}
          onChange={handleChange}
          options={[
            "Glock 17", "Beretta M9 (92FS)", "SIG Sauer P320",
            "Colt M1911", "Smith & Wesson Model 686", "Other"
          ]}
        />
        {profile.favoriteGun === "Other" && (
          <Input
            name="favoriteGun"
            placeholder="Enter your favorite gun"
            value={""}
            onChange={(e) => setProfile({ ...profile, favoriteGun: e.target.value })}
          />
        )}

        {/* More fields like favoriteAmmunition, stance, equipment, etc. */}
        <InputBlock label="Additional Equipment" id="additionalEquipment" icon={<Star />} value={profile.additionalEquipment} onChange={handleChange} />

        {/* Physical Details Section */}
        <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border border-blue-100">
          <h3 className="text-xl font-extrabold mb-4 text-blue-700 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-400" /> Physical Details
          </h3>
          <InputBlock label="Height (cm)" id="height" value={profile.height} onChange={handleChange} />
          <InputBlock label="Weight (kg)" id="weight" value={profile.weight} onChange={handleChange} />
          <InputBlock label="Left Eye Sight" id="leftEyeSight" value={profile.leftEyeSight} onChange={handleChange} />
          <InputBlock label="Right Eye Sight" id="rightEyeSight" value={profile.rightEyeSight} onChange={handleChange} />
          <InputBlock label="Dominant Hand" id="dominantHand" value={profile.dominantHand} onChange={handleChange} />
        </div>

        <Button type="submit" className="w-full py-3 text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:from-purple-500 hover:to-blue-500 transition rounded-lg mt-4">
          {isNewProfile ? "Create Profile" : "Update Profile"}
        </Button>
      </form>
    </div>
  );
}

// Helper component for text inputs
function InputBlock({ label, id, icon, type = "text", value, onChange }: any) {
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
        className="mt-1 w-full rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition shadow-sm"
      />
    </div>
  );
}

// Helper component for dropdowns
function SelectBlock({ label, id, value, onChange, options }: any) {
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
        className="mt-1 w-full rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition shadow-sm"
      >
        <option value="">Select</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}