import React, { useState } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileText, AlertCircle, CheckCircle, Star, Eye, File, MapPin, Keyboard } from "lucide-react";
import { db, storage } from "@/firebase/config";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  increment 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ShootingSessionUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Basic Info
  const [sessionName, setSessionName] = useState("");
  const [rangeName, setRangeName] = useState("");
  const [rating, setRating] = useState(0);
  
  // Manual Entry States (New)
  const [manualScore, setManualScore] = useState("");
  const [manualInnerTens, setManualInnerTens] = useState("");
  const [manualDiscipline, setManualDiscipline] = useState("10M Air Pistol");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // File States
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
    setSuccess(false);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    let sessionData = { totalScore: 0, innerTens: 0, date: '', discipline: '' };

    for (const line of lines) {
      const cells = line.split(',');
      if (cells[0]?.trim() === 'Total:') {
        sessionData.totalScore = parseInt(cells[1]?.match(/(\d+)/)?.[1] || "0");
      }
      if (cells[3]?.trim() === 'Inner tens:') {
        sessionData.innerTens = parseInt(cells[5]?.match(/(\d+)/)?.[1] || "0");
      }
      if (cells[0] && (cells[0].includes('Pistol') || cells[0].includes('Rifle'))) {
        sessionData.discipline = cells[0].trim();
      }
      const dateMatch = line.match(/(\d{2}-\d{2}-\d{4})/);
      if (dateMatch) sessionData.date = dateMatch[1];
    }
    return sessionData;
  };

  const handleUpload = async () => {
    // Validation: Require basic info and EITHER a file OR a manual score
    if (!sessionName || !rangeName || !user || rating === 0) {
      setError("Please provide Session Name, Range, and Rating.");
      return;
    }

    if (!file && !manualScore) {
      setError("Please either upload a file or enter your score manually.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      let finalSessionStats = {
        totalScore: parseInt(manualScore) || 0,
        innerTens: parseInt(manualInnerTens) || 0,
        discipline: manualDiscipline,
        date: manualDate
      };

      let fileDownloadURL = "";
      let fileNameToStore = "Manual Entry";
      let fileExtension = "none";

      // If file exists, override manual stats with parsed stats
      if (file) {
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        fileExtension = fileExt;
        fileNameToStore = file.name;

        if (fileExt === '.csv') {
          const content = await file.text();
          const parsed = parseCSV(content);
          if (parsed.totalScore > 0) finalSessionStats = { ...finalSessionStats, ...parsed };
        }

        const storagePath = `shooting-sessions/${user.uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        fileDownloadURL = await getDownloadURL(storageRef);
      }

      if (finalSessionStats.totalScore === 0) {
        setError("Invalid score. Please enter a score greater than 0.");
        setUploading(false);
        return;
      }

      // Firestore Updates
      const shooterDocRef = doc(db, "shooters", user.uid);
      const coacherDocRef = doc(db, "technical-coaches", user.uid);
      const [shooterDoc, coacherDoc] = await Promise.all([getDoc(shooterDocRef), getDoc(coacherDocRef)]);
      
      if (shooterDoc.exists()) {
        await updateDoc(shooterDocRef, { totalPoints: increment(finalSessionStats.totalScore) });
      }

      const sessionDocData = {
        sessionName,
        rangeName,
        rating,
        fileName: fileNameToStore,
        fileType: fileExtension,
        pointsEarned: finalSessionStats.totalScore,
        uploadDate: new Date(),
        fileUrl: fileDownloadURL,
        shooterId: user.uid,
        shooterName: shooterDoc.data()?.fullName || 'Unknown Shooter',
        coacherName: coacherDoc.data()?.fullName || 'N/A',
        uploadedBy: coacherDoc.exists() ? `Coach` : `Shooter`,
        sessionStats: finalSessionStats
      };

      const mainRef = await addDoc(collection(db, "shootingSessions"), sessionDocData);
      await addDoc(collection(db, "shooters", user.uid, "shootingSessions"), { 
        ...sessionDocData, 
        mainSessionId: mainRef.id 
      });

      setSuccess(true);
      toast({ title: "Success!", description: `${finalSessionStats.totalScore} points added.` });
      
      // Reset Form
      setSessionName(""); setRangeName(""); setFile(null); setRating(0);
      setManualScore(""); setManualInnerTens("");
    } catch (error: any) {
      setError(error.message || "Failed to save session.");
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocuments = () => {
    navigate("/dashboard/documents");
  };

  return (
    <div className="space-y-4">
      <Card className="w-full bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1d4ed8]">
            <Upload className="h-5 w-5" />
            Log Shooting Session
          </CardTitle>
          <CardDescription>
            Enter your session details manually or upload a data file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="col-span-full">
                <h4 className="text-xs font-black uppercase text-gray-400 mb-2 flex items-center gap-2">
                    <Keyboard className="w-3 h-3" /> Basic Information
                </h4>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-gray-600 uppercase">Session Name</label>
              <Input placeholder="e.g., Weekly Match" value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-gray-600 uppercase text-gray-700 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#1d4ed8]" /> Range Location
              </label>
              <Input placeholder="Enter range name" value={rangeName} onChange={(e) => setRangeName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold block mb-2 text-gray-600 uppercase">Session Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className={`p-1 ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}>
                    <Star className={`h-6 w-6 ${rating >= star ? "fill-current" : ""}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Manual Stats Entry */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-2 border-dashed border-blue-100 rounded-xl">
             <div className="col-span-full">
                <h4 className="text-xs font-black uppercase text-[#1d4ed8] mb-2">Manual Stats (Required if no file)</h4>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-gray-600 uppercase">Total Score</label>
              <Input type="number" placeholder="e.g. 574" value={manualScore} onChange={(e) => setManualScore(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-gray-600 uppercase">Inner Tens</label>
              <Input type="number" placeholder="e.g. 12" value={manualInnerTens} onChange={(e) => setManualInnerTens(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-gray-600 uppercase">Discipline</label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={manualDiscipline} 
                onChange={(e) => setManualDiscipline(e.target.value)}
              >
                <option>10M Air Pistol</option>
                <option>25M Pistol</option>
                <option>50M Pistol</option>
                <option>10M Air Rifle</option>
                <option>50M Rifle</option>
                <option>300M Rifle</option>
                <option>Trap</option>
                <option>Skeet</option>
                <option>Double Trap</option>
                <option>Running Target</option>
                <option>Sport Pistol</option>
                <option>Free Pistol</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-gray-600 uppercase">Match Date</label>
              <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            </div>
          </div>

          {/* Section 3: Optional File Upload */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <label className="text-xs font-black block mb-2 text-[#1d4ed8] uppercase">Optional: Attach Evidence (CSV/PDF)</label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Input id="session-file" type="file" accept=".csv,.pdf" onChange={handleFileChange} className="bg-white" />
              {file && <span className="text-[10px] font-bold text-green-600 uppercase whitespace-nowrap">File Selected</span>}
            </div>
          </div>

          {error && <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="mr-2 h-4 w-4" /> {error}</div>}
          {success && <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100"><CheckCircle className="mr-2 h-4 w-4" /> Session Logged Successfully!</div>}

          <Button onClick={handleUpload} disabled={uploading} className="bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white w-full h-12 text-lg font-bold uppercase tracking-widest transition-all">
            {uploading ? "Processing..." : "Save Session Data"}
          </Button>
          <Button
              onClick={handleViewDocuments}
              variant="outline"
              className="border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-bold uppercase text-xs w-full sm:w-auto"
            >
              <FileText className="mr-2 h-4 w-4" />View Documents
            </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShootingSessionUpload;