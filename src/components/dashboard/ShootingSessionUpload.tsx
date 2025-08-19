import React, { useState } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileText, AlertCircle, CheckCircle, Star } from "lucide-react";
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
  const [sessionName, setSessionName] = useState("");
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

  // Enhanced CSV parsing function to extract total points
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

    // Look for the total score line
    for (const line of lines) {
      const cells = line.split(',');
      
      // Look for "Total:" in the first cell
      if (cells[0] && cells[0].trim() === 'Total:') {
        const totalText = cells[1] || '';
        // Extract number before parentheses (e.g., "555 (583.2)" -> 555)
        const match = totalText.match(/(\d+)/);
        if (match) {
          totalPoints = parseInt(match[1]);
          sessionData.totalScore = totalPoints;
        }
      }
      
      // Look for Inner tens
      if (cells[0] && cells[0].trim() === '' && cells[3] && cells[3].trim() === 'Inner tens:') {
        const innerTensText = cells[5] || '';
        const innerTensMatch = innerTensText.match(/(\d+)/);
        if (innerTensMatch) {
          sessionData.innerTens = parseInt(innerTensMatch[1]);
        }
      }
      
      // Look for discipline (e.g., "Air Pistol 60")
      if (cells[0] && cells[0].includes('Pistol') || cells[0].includes('Rifle')) {
        sessionData.discipline = cells[0].trim();
      }
      
      // Look for date in the header
      if (line.includes('2022') || line.includes('2023') || line.includes('2024') || line.includes('2025')) {
        const dateMatch = line.match(/(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) {
          sessionData.date = dateMatch[1];
        }
      }
    }

    return {
      totalPoints,
      sessionData,
      rawData: csvText
    };
  };

  const handleUpload = async () => {
    if (!file || !sessionName || !user || rating === 0) {
      setError("Please provide a session name, rating, and select a file.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

      // Read and parse the CSV file
      const fileContent = await file.text();
      const { totalPoints, sessionData: parsedSessionData } = parseCSV(fileContent);

      if (totalPoints === 0) {
        setError("Could not extract valid points from CSV file.");
        return;
      }

      // Update shooter's total points
      const shooterDocRef = doc(db, "shooters", user.uid);
      const shooterDoc = await getDoc(shooterDocRef);
      
      if (shooterDoc.exists()) {
        // Update existing profile with incremented points
        await updateDoc(shooterDocRef, {
          totalPoints: increment(totalPoints)
        });
      } else {
        setError("Shooter profile not found. Please create your profile first.");
        return;
      }

      // Check if user is premium
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const isPremium = userData?.isPremium || false;

      // Prepare session data (common for all users)
      const sessionDocData: any = {
        sessionName,
        rating,
        fileName: file.name,
        pointsEarned: totalPoints,
        uploadDate: new Date(),
        sessionStats: {
          totalScore: parsedSessionData.totalScore,
          innerTens: parsedSessionData.innerTens,
          discipline: parsedSessionData.discipline,
          date: parsedSessionData.date
        }
      };

      // For premium users, also upload and store CSV file
      if (isPremium) {
        const fileName = `${user.uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `shooting-sessions/${fileName}`);
        await uploadBytes(storageRef, file);
        const csvDownloadURL = await getDownloadURL(storageRef);
        
        // Add CSV URL to session data for premium users
        sessionDocData.csvFileUrl = csvDownloadURL;
        
        toast({
          title: "Premium Session Saved",
          description: `Session "${sessionName}" saved with CSV file and ${totalPoints} points added!`,
        });
      } else {
        toast({
          title: "Session Saved",
          description: `Session "${sessionName}" saved and ${totalPoints} points added!`,
        });
      }

      // Save session data to subcollection for ALL users
      const sessionsCollectionRef = collection(db, "shooters", user.uid, "shootingSessions");
      await addDoc(sessionsCollectionRef, sessionDocData);

      setParsedData({ totalPoints, sessionData: parsedSessionData });
      setSuccess(true);
      setSessionName("");
      setFile(null);
      setRating(0);
      
      // Clear file input
      const fileInput = document.getElementById("csv-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || "Failed to upload session data.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Shooting Session
        </CardTitle>
        <CardDescription>
          Upload your shooting session data from a CSV file to add points to your profile.
          <span className="block mt-1 text-xs text-blue-600 font-medium">
            📁 Premium users get CSV file storage for session history
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="session-name"
              className="text-sm font-medium block mb-1"
            >
              Session Name
            </label>
            <Input
              id="session-name"
              placeholder="e.g., Morning Session with 12mm"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>

          {/* Star Rating Section */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Session Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  className={`p-1 rounded transition-colors ${
                    rating >= star
                      ? "text-yellow-400 hover:text-yellow-500"
                      : "text-gray-300 hover:text-yellow-300"
                  }`}
                >
                  <Star 
                    className={`h-6 w-6 ${rating >= star ? "fill-current" : ""}`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Rate your session from 1 to 4 stars
            </p>
          </div>

          <div>
            <label
              htmlFor="csv-file"
              className="text-sm font-medium block mb-1"
            >
              CSV File
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || !sessionName || rating === 0 || uploading}
                className="whitespace-nowrap"
              >
                {uploading ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center text-sm text-blue-600">
              <FileText className="mr-2 h-4 w-4" />
              <span>{file.name}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="mr-2 h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Session uploaded successfully!</span>
            </div>
          )}

          {parsedData && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Session Summary:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Points Added:</strong> {parsedData.totalPoints}</p>
                <p><strong>Rating:</strong> {rating}/4 stars</p>
                {parsedData.sessionData.discipline && (
                  <p><strong>Discipline:</strong> {parsedData.sessionData.discipline}</p>
                )}
                {parsedData.sessionData.date && (
                  <p><strong>Date:</strong> {parsedData.sessionData.date}</p>
                )}
                {parsedData.sessionData.innerTens > 0 && (
                  <p><strong>Inner Tens:</strong> {parsedData.sessionData.innerTens}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShootingSessionUpload;