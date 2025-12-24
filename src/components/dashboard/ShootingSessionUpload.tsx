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
import { Upload, FileText, AlertCircle, CheckCircle, Star, Eye, File, MapPin } from "lucide-react";
import { db, storage } from "@/firebase/config";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  collection, 
  addDoc, 
  increment 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ShootingSessionUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessionName, setSessionName] = useState("");
  const [rangeName, setRangeName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rating, setRating] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
    setSuccess(false);
  };

  const handleStarClick = (starValue: number) => {
    setRating(starValue);
  };

  const handleViewDocuments = () => {
    navigate("/dashboard/documents");
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    let totalPoints = 0;
    let sessionData = {
      totalScore: 0,
      innerTens: 0,
      seriesScores: [],
      date: '',
      discipline: ''
    };

    for (const line of lines) {
      const cells = line.split(',');
      if (cells[0] && cells[0].trim() === 'Total:') {
        const totalText = cells[1] || '';
        const match = totalText.match(/(\d+)/);
        if (match) {
          totalPoints = parseInt(match[1]);
          sessionData.totalScore = totalPoints;
        }
      }
      if (cells[0] && cells[0].trim() === '' && cells[3] && cells[3].trim() === 'Inner tens:') {
        const innerTensText = cells[5] || '';
        const innerTensMatch = innerTensText.match(/(\d+)/);
        if (innerTensMatch) {
          sessionData.innerTens = parseInt(innerTensMatch[1]);
        }
      }
      if (cells[0] && (cells[0].includes('Pistol') || cells[0].includes('Rifle'))) {
        sessionData.discipline = cells[0].trim();
      }
      if (line.includes('2022') || line.includes('2023') || line.includes('2024') || line.includes('2025')) {
        const dateMatch = line.match(/(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) {
          sessionData.date = dateMatch[1];
        }
      }
    }

    return { totalPoints, sessionData, rawData: csvText };
  };

  const parsePDF = async (file: File) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          let text = '';
          for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              text += String.fromCharCode(uint8Array[i]);
            } else {
              text += ' ';
            }
          }
          let totalPoints = 0;
          let sessionData = { totalScore: 0, innerTens: 0, seriesScores: [], date: '', discipline: '' };
          const totalMatches = text.match(/(?:Total|Total Score|Final Score)[\s:]+(\d+)/gi);
          if (totalMatches) {
            const match = totalMatches[totalMatches.length - 1].match(/(\d+)/);
            if (match) {
              totalPoints = parseInt(match[1]);
              sessionData.totalScore = totalPoints;
            }
          }
          resolve({ totalPoints, sessionData, rawData: text.substring(0, 1000) });
        } catch (error) { reject(error); }
      };
      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file || !sessionName || !rangeName || !user || rating === 0) {
      setError("Please provide a session name, range name, rating, and select a file.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      let parsedResult;
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === '.csv') {
        const fileContent = await file.text();
        parsedResult = parseCSV(fileContent);
      } else if (fileExtension === '.pdf') {
        parsedResult = await parsePDF(file);
      }

      const { totalPoints, sessionData: parsedSessionData } = parsedResult as any;
      if (totalPoints === 0) {
        setError(`Could not extract valid points.`);
        return;
      }

      // Restore Coach Name functionality
      const shooterDocRef = doc(db, "shooters", user.uid);
      const coacherDocRef = doc(db, "technical-coaches", user.uid);
      const shooterDoc = await getDoc(shooterDocRef);
      const coacherDoc = await getDoc(coacherDocRef);
      
      const isShooter = shooterDoc.exists();
      const isCoach = coacherDoc.exists();
      
      const shooterData = shooterDoc.data();
      const coacherData = coacherDoc.data();
      
      const targetShooterId = user.uid;
      const targetShooterName = isShooter ? (shooterData?.name || 'Unknown Shooter') : 'N/A (Coach Upload)';

      if (isShooter) {
          await updateDoc(shooterDocRef, { totalPoints: increment(totalPoints) });
      }

      const fileName = `${targetShooterId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `shooting-sessions/${fileName}`);
      await uploadBytes(storageRef, file);
      const fileDownloadURL = await getDownloadURL(storageRef);

      const sessionDocData: any = {
        sessionName,
        rangeName,
        rating,
        fileName: file.name,
        fileType: fileExtension,
        pointsEarned: totalPoints,
        uploadDate: new Date(),
        fileUrl: fileDownloadURL,
        shooterId: targetShooterId,
        shooterName: targetShooterName,
        coacherName: coacherData?.fullName || 'N/A', // RESTORED
        uploadedBy: isCoach ? `Coach (${user.uid})` : `Shooter`,
        sessionStats: {
          totalScore: parsedSessionData.totalScore,
          innerTens: parsedSessionData.innerTens,
          discipline: parsedSessionData.discipline,
          date: parsedSessionData.date
        }
      };

      const mainSessionsCollectionRef = collection(db, "shootingSessions");
      const mainSessionDocRef = await addDoc(mainSessionsCollectionRef, sessionDocData);
      const userSessionsCollectionRef = collection(db, "shooters", targetShooterId, "shootingSessions");
      await addDoc(userSessionsCollectionRef, { ...sessionDocData, mainSessionId: mainSessionDocRef.id });

      setParsedData({ totalPoints, sessionData: parsedSessionData, fileType: fileExtension });
      setSuccess(true);
      setSessionName(""); setRangeName(""); setFile(null); setRating(0);
      const fileInput = document.getElementById("session-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      toast({ title: "Session Saved", description: `${totalPoints} points added!` });
    } catch (error: any) {
      setError(error.message || "Failed to upload.");
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1d4ed8]">
            <Upload className="h-5 w-5" />
            Upload Shooting Session
          </CardTitle>
          <CardDescription>
            Upload your shooting session data from CSV or PDF files.
            <span className="block mt-1 text-xs text-[#ff6b6b] font-bold uppercase tracking-tight">
              Points will be automatically verified and added to your profile.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="session-name" className="text-sm font-semibold block mb-1 text-gray-700">Session Name</label>
            <Input id="session-name" placeholder="e.g., Morning Practice" value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
          </div>

          <div>
            <label htmlFor="range-name" className="text-sm font-semibold mb-1 flex items-center gap-1 text-gray-700">
              <MapPin className="h-4 w-4 text-[#1d4ed8]" /> Range Name
            </label>
            <Input id="range-name" placeholder="Enter range location" value={rangeName} onChange={(e) => setRangeName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2 text-gray-700">Session Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  className={`p-1 transition-colors ${rating >= star ? "text-yellow-400" : "text-gray-300 hover:text-[#ff6b6b]"}`}
                >
                  <Star className={`h-6 w-6 ${rating >= star ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="session-file" className="text-sm font-semibold block mb-1 text-gray-700">Session File (CSV or PDF)</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Input id="session-file" type="file" accept=".csv,.pdf" onChange={handleFileChange} className="flex-1" />
              <Button
                onClick={handleUpload}
                disabled={!file || !sessionName || !rangeName || rating === 0 || uploading}
                className="bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white w-full sm:w-auto"
              >
                {uploading ? "Uploading..." : "Upload Session"}
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center text-sm text-[#1d4ed8] bg-blue-50 p-2 rounded border border-blue-100">
              <File className="mr-2 h-4 w-4" /> <span>{file.name}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="mr-2 h-4 w-4" /> <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
              <CheckCircle className="mr-2 h-4 w-4" /> <span>Upload Successful!</span>
            </div>
          )}

          {parsedData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-[#ff6b6b]">
              <h4 className="font-bold text-[#1d4ed8] mb-2 uppercase text-xs tracking-wider">Session Summary:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Points Added:</strong> <span className="text-[#ff6b6b] font-bold">{parsedData.totalPoints}</span></p>
                <p><strong>Rating:</strong> {rating}/5</p>
                {parsedData.sessionData.discipline && <p><strong>Discipline:</strong> {parsedData.sessionData.discipline}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full bg-white border-[#1d4ed8]/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1d4ed8] rounded-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#0f172a] uppercase text-sm">Session Vault</h3>
                <p className="text-xs text-gray-500">Browse and manage all your uploaded files</p>
              </div>
            </div>
            <Button
              onClick={handleViewDocuments}
              variant="outline"
              className="border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-bold uppercase text-xs w-full sm:w-auto"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Documents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShootingSessionUpload;