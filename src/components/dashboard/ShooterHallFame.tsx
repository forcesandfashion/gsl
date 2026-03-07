import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { db, storage } from "@/firebase/config"; // Ensure storage is exported from your config
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  deleteDoc, doc, serverTimestamp 
} from "firebase/firestore";
import { 
  Trophy, Plus, Trash2, Calendar, Star, Award, Image as ImageIcon, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const HallOfFameManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const hofRef = collection(db, "shooters", user.uid, "hallOfFame");
    const q = query(hofRef, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setAchievements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
  }, [user?.uid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (selectedFiles.length + files.length > 5) {
        toast({ title: "Limit Exceeded", description: "You can only upload up to 5 photos.", variant: "destructive" });
        return;
      }
      // Check file size (10MB = 10 * 1024 * 1024 bytes)
      const oversized = files.filter(f => f.size > 10 * 1024 * 1024);
      if (oversized.length > 0) {
        toast({ title: "File too large", description: "Each photo must be under 10MB.", variant: "destructive" });
        return;
      }
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !newTitle) return;

    try {
      setUploading(true);
      const imageUrls: string[] = [];

      // 1. Upload Images to Storage
      for (const file of selectedFiles) {
        const fileRef = ref(storage, `shooters/${user.uid}/hallOfFame/${Date.now()}-${file.name}`);
        const uploadResult = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        imageUrls.push(url);
      }

      // 2. Save to Firestore
      const hofRef = collection(db, "shooters", user.uid, "hallOfFame");
      await addDoc(hofRef, {
        title: newTitle,
        description: newDesc,
        date: newDate,
        images: imageUrls,
        createdAt: serverTimestamp(),
      });

      // Reset
      setNewTitle(""); setNewDesc(""); setNewDate(""); setSelectedFiles([]);
      setIsAdding(false);
      toast({ title: "Achievement Saved!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* Header logic same as before */}
      <div className="flex items-center justify-between">
         <h2 className="text-3xl font-black text-[#0f172a] uppercase tracking-tighter">HALL OF <span className="text-[#ff6b6b]">FAME</span></h2>
         <Button onClick={() => setIsAdding(!isAdding)} className="bg-[#1d4ed8] rounded-full w-12 h-12">{isAdding ? <X /> : <Plus />}</Button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="rounded-[2rem] border-2 border-blue-50 shadow-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Achievement Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                  <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
                <Textarea placeholder="Describe your success..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                
                {/* Image Upload Area */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                    <ImageIcon className="w-3 h-3" /> Photos (Max 5, 10MB each)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border">
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                        <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full"><X className="w-3 h-3 text-white" /></button>
                      </div>
                    ))}
                    {selectedFiles.length < 5 && (
                      <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#1d4ed8] hover:bg-blue-50 transition-all">
                        <Plus className="w-6 h-6 text-gray-300" />
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <Button onClick={handleAddAchievement} disabled={uploading} className="w-full bg-[#1d4ed8] h-12 rounded-xl uppercase font-black tracking-widest">
                  {uploading ? <Loader2 className="animate-spin mr-2" /> : "Immortalize Achievement"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement List */}
      <div className="space-y-6">
        {achievements.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-50 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1d4ed8]"><Award /></div>
                <div>
                  <h3 className="text-xl font-black uppercase">{item.title}</h3>
                  <p className="text-xs text-[#ff6b6b] font-bold">{item.date}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db, "shooters", user.uid, "hallOfFame", item.id))}><Trash2 className="w-4 h-4 text-gray-300" /></Button>
            </div>
            
            <p className="text-sm text-gray-500">{item.description}</p>
            
            {/* Image Gallery */}
            {item.images?.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                {item.images.map((img: string, i: number) => (
                  <img key={i} src={img} className="w-32 h-32 rounded-2xl object-cover shadow-md" onClick={() => window.open(img, '_blank')} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HallOfFameManager;