"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { User, Calendar, Award, Star, Briefcase, Target, Crosshair, Package } from "lucide-react";
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
  totalPoints?: number;
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
          setIsNewProfile(true);
        } else {
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

  const handleDisciplineChange = (discipline: string) => {
    setProfile(prev => ({
      ...prev,
      preferredDisciplines: prev.preferredDisciplines.includes(discipline)
        ? prev.preferredDisciplines.filter(d => d !== discipline)
        : [...prev.preferredDisciplines, discipline]
    }));
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
      
      let dataToSave = { ...profile, uid: user.uid };
      
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

  if (loading) return <div className="text-center text-lg mt-6">Loading profile...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 rounded-2xl shadow-xl p-6">
      
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
                  checked={profile.preferredDisciplines.includes(discipline)}
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
    </div>
  );
}

// Helper component for text inputs
function InputBlock({ label, id, icon, type = "text", value, onChange, placeholder }: any) {
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