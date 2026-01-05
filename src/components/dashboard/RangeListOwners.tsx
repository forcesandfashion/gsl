import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { cn } from "@/lib/utils";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  getDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Edit, 
  Trash2, 
  Plus, 
  Eye,
  Star,
  Building,
  Image as ImageIcon,
  Calendar,
  Crown,
  QrCode,
  Download,
  Ban,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import EditRange from "../dashboard/EditRange";
import CreateEventModal from "./CreateEventModal";
import SubscriptionModal from "./SubscriptionModal";

type WeeklyHours = {
  Monday: { start: string; end: string };
  Tuesday: { start: string; end: string };
  Wednesday: { start: string; end: string };
  Thursday: { start: string; end: string };
  Friday: { start: string; end: string };
  Saturday: { start: string; end: string };
  Sunday: { start: string; end: string };
};

interface Range {
  id: string;
  name: string;
  address: string;
  description: string;
  facilities: string;
  openingHours: string;
  structuredOpeningHours?: WeeklyHours;
  contactNumber: string;
  logoUrl: string;
  rangeImages: string[];
  ownerId: string;
  ownerEmail: string;
  createdAt: any;
  updatedAt: any;
  status: string;
  price?: string;
  rating?: number;
  maxBookingsPerSlot?: number;
  qrCodeUrl?: string;
}

export default function RangeListOwners() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ranges, setRanges] = useState<Range[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editingRange, setEditingRange] = useState<Range | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [subscriptionRange, setSubscriptionRange] = useState<Range | null>(null);
  const [userPremiumStatus, setUserPremiumStatus] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);
  const [selectedRangeName, setSelectedRangeName] = useState<string | null>(null);
  
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const getDisplayTime = (range: Range) => {
    if (range.structuredOpeningHours) {
      for (const day of weekdays) {
        const hours = range.structuredOpeningHours[day];
        if (hours && hours.start && hours.end) {
          const startTime = new Date(`2000-01-01T${hours.start}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          const endTime = new Date(`2000-01-01T${hours.end}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          return `${startTime} - ${endTime}`;
        }
      }
      return "Hours not set";
    }
    return range.openingHours || "Hours not available";
  };

  const fetchUserPremiumStatus = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "range-owners", user.uid));
      if (userDoc.exists()) {
        setUserPremiumStatus(userDoc.data().premium || false);
      }
    } catch (error) {
      setUserPremiumStatus(false);
    }
  };

  const fetchRanges = async () => {
    if (!user) return;
    try {
      const rangesRef = collection(db, "ranges");
      const q = query(rangesRef, where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const rangesData: Range[] = [];
      querySnapshot.forEach((doc) => {
        rangesData.push({ id: doc.id, ...doc.data() } as Range);
      });
      setRanges(rangesData);
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to load ranges`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEventClick = (rangeId: string) => { setSelectedRangeId(rangeId); setCreateModal(true); };
  const handleCreateEventModalClose = () => { setCreateModal(false); setSelectedRangeId(null); };
  const handleEditClick = (range: Range) => { setEditingRange(range); setShowEditModal(true); };
  const handleSubscriptionClick = (range: Range) => { setSubscriptionRange(range); setSubscriptionModal(true); };
  const handleSubscriptionModalClose = () => { setSubscriptionModal(false); setSubscriptionRange(null); };
  const handleQrCodeClick = (range: Range) => { setSelectedQrCode(range.qrCodeUrl || null); setSelectedRangeName(range.name); setQrModalOpen(true); };
  const handleQrModalClose = () => { setQrModalOpen(false); setSelectedQrCode(null); setSelectedRangeName(null); };
  const downloadQRCode = () => {
    if (!selectedQrCode) return;
    const link = document.createElement('a');
    link.download = `qr-code-${selectedRangeName?.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = selectedQrCode;
    link.click();
  };
  const handleRangeUpdate = (updatedData: Partial<Range>) => {
    if (!editingRange) return;
    setRanges(prev => prev.map(range => range.id === editingRange.id ? { ...range, ...updatedData } : range));
  };
  const handleModalClose = () => { setShowEditModal(false); setEditingRange(null); };

  const createDeleteRequest = async (rangeId: string, rangeName: string) => {
    try {
      await addDoc(collection(db, "actions"), {
        type: "delete_range_request", rangeId, rangeName, ownerId: user?.uid, ownerEmail: user?.email, completed: false, createdAt: serverTimestamp(), status: "pending", message: "Request to delete range"
      });
      return true;
    } catch (error) { return false; }
  };

  const handleDelete = async (rangeId: string, rangeName: string, status: string) => {
    if (status === "pending") {
      if (!confirm(`Are you sure you want to delete "${rangeName}"?`)) return;
      setDeleteLoading(rangeId);
      try {
        await deleteDoc(doc(db, "ranges", rangeId));
        setRanges(ranges.filter(range => range.id !== rangeId));
        toast({ title: "Success", description: "Range deleted successfully" });
      } catch (error) { toast({ title: "Error", variant: "destructive" });
      } finally { setDeleteLoading(null); }
    } else {
      if (!confirm(`Are you sure you want to request deletion for "${rangeName}"?`)) return;
      setDeleteLoading(rangeId);
      try {
        await updateDoc(doc(db, "ranges", rangeId), { status: "blocked", updatedAt: serverTimestamp() });
        const requestCreated = await createDeleteRequest(rangeId, rangeName);
        if (requestCreated) {
          setRanges(prev => prev.map(range => range.id === rangeId ? { ...range, status: "blocked" } : range));
          toast({ title: "Success", description: "Delete request submitted." });
        }
      } catch (error) { toast({ title: "Error", variant: "destructive" });
      } finally { setDeleteLoading(null); }
    }
  };

  useEffect(() => { if (user) { fetchRanges(); fetchUserPremiumStatus(); } }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <LoadingSpinner className="text-[#1d4ed8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - White background with Blue border */}
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#0f172a] uppercase tracking-tighter flex items-center gap-3">
                  MY <span className="text-[#ff6b6b]">RANGES</span>
                  {userPremiumStatus && (
                    <Badge className="bg-[#ff6b6b] text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5">
                      PREMIUM
                    </Badge>
                  )}
                </h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Operational Facility Management</p>
              </div>
            </div>
            <Link to="/dashboard/range-owner">
              <Button className="bg-[#1d4ed8] hover:bg-[#0f172a] text-white font-black uppercase tracking-widest text-[10px] px-8 py-6 rounded-2xl shadow-xl transition-all">
                <Plus className="w-4 h-4 mr-2" /> Add New Facility
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Modals maintained from original detail */}
      {createModal && selectedRangeId && (
        <CreateEventModal isOpen={createModal} onClose={handleCreateEventModalClose} title="Create Event" rangeId={selectedRangeId} />
      )}
      {subscriptionModal && subscriptionRange && (
        <SubscriptionModal isOpen={subscriptionModal} onClose={handleSubscriptionModalClose} rangeName={subscriptionRange.name} rangeId={subscriptionRange.id} ownerId={user?.uid || ""} />
      )}

      {/* QR Code Modal - Themed */}
      {qrModalOpen && selectedQrCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-[2rem] p-8 max-w-md w-full border-none shadow-2xl">
            <div className="text-center">
              <h3 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter mb-4 flex items-center justify-center gap-2">
                <QrCode className="w-6 h-6 text-[#1d4ed8]" /> Access Key
              </h3>
              <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-6">
                <img src={selectedQrCode} alt="Range QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={downloadQRCode} className="w-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase text-[10px] py-6 rounded-xl">
                  <Download className="w-4 h-4 mr-2" /> Download Key
                </Button>
                <Button onClick={handleQrModalClose} variant="ghost" className="font-black uppercase text-[10px] tracking-widest text-gray-400">Close</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {ranges.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 shadow-inner">
            <Building className="w-16 h-16 text-gray-100 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Facilities Found</h3>
            <Link to="/dashboard/range-owner" className="mt-6 block">
              <Button variant="outline" className="border-[#1d4ed8] text-[#1d4ed8] font-black uppercase text-[10px]">Initialize First Range</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {ranges.map((range) => (
              <Card key={range.id} className="border-0 shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                <div className="relative h-56">
                  {range.rangeImages?.[0] ? (
                    <img src={range.rangeImages[0]} alt={range.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[#1d4ed8]">
                      <ImageIcon className="w-12 h-12 opacity-20" />
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <Badge className={cn(
                      "px-3 py-1 font-black text-[9px] uppercase tracking-widest border-none text-white",
                      range.status === 'active' ? 'bg-[#10b981]' : range.status === 'pending' ? 'bg-[#f59e0b]' : 'bg-[#ff6b6b]'
                    )}>
                      {range.status}
                    </Badge>
                  </div>

                  {range.logoUrl && (
                    <div className="absolute -bottom-6 left-6">
                      <img src={range.logoUrl} className="w-16 h-16 rounded-2xl border-4 border-white shadow-xl object-cover bg-white" alt="logo" />
                    </div>
                  )}
                </div>

                <CardContent className="pt-10 px-8 pb-8 space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter truncate group-hover:text-[#1d4ed8] transition-colors">
                      {range.name}
                    </h3>
                    <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">
                      <MapPin className="w-3 h-3 mr-1 text-[#ff6b6b]" /> {range.address}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center text-[11px] font-black text-[#0f172a] uppercase tracking-tight">
                      <Clock className="w-4 h-4 mr-3 text-[#1d4ed8]" /> {getDisplayTime(range)}
                    </div>
                    <div className="flex items-center text-[11px] font-black text-[#0f172a] uppercase tracking-tight">
                      <Phone className="w-4 h-4 mr-3 text-[#1d4ed8]" /> {range.contactNumber}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button onClick={() => handleEditClick(range)} variant="outline" className="border-gray-100 text-[#0f172a] font-black uppercase text-[9px] h-10 rounded-xl hover:bg-blue-50">
                      <Edit className="w-3 h-3 mr-2 text-[#1d4ed8]" /> Edit
                    </Button>
                    <Button onClick={() => handleSubscriptionClick(range)} variant="outline" className="border-gray-100 text-[#0f172a] font-black uppercase text-[9px] h-10 rounded-xl hover:bg-yellow-50">
                      <Crown className="w-3 h-3 mr-2 text-yellow-500" /> Plan
                    </Button>
                    <Button onClick={() => handleCreateEventClick(range.id)} className="bg-[#1d4ed8] text-white font-black uppercase text-[9px] h-10 rounded-xl">
                      <Calendar className="w-3 h-3 mr-2" /> Event
                    </Button>
                    <Button asChild variant="outline" className="border-gray-100 text-[#1d4ed8] font-black uppercase text-[9px] h-10 rounded-xl">
                      <Link to={`/ranges/${range.id}`}> <Eye className="w-3 h-3 mr-2" /> Preview</Link>
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                        range.status === "pending" ? "text-[#ff6b6b] hover:bg-red-50" : "text-orange-500 hover:bg-orange-50"
                      )}
                      onClick={() => handleDelete(range.id, range.name, range.status)}
                      disabled={deleteLoading === range.id}
                    >
                      {deleteLoading === range.id ? <LoadingSpinner size="sm" /> : (
                        <>{range.status === "pending" ? <Trash2 className="w-4 h-4 mr-2" /> : <Ban className="w-4 h-4 mr-2" />} {range.status === "pending" ? "Purge Record" : "Request Delete"}</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Global Summary Stats */}
        {ranges.length > 0 && (
          <div className="mt-16 bg-[#0f172a] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden border-b-8 border-[#1d4ed8]">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BarChart className="w-32 h-32 text-white" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
              <Star className="w-6 h-6 text-[#ff6b6b] fill-current" /> Operational Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10">
              <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                <div className="text-4xl font-black text-white">{ranges.length}</div>
                <div className="text-[10px] font-black text-[#ffffff] uppercase tracking-widest mt-2">Total Nodes</div>
              </div>
              <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                <div className="text-4xl font-black text-blue-500">{ranges.filter(r => r.status === 'active').length}</div>
                <div className="text-[10px] font-black text-white uppercase tracking-widest mt-2">Verified Active</div>
              </div>
              <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                <div className="text-4xl font-black text-[#ff6b6b]">{ranges.reduce((total, range) => total + (range.rangeImages?.length || 0), 0)}</div>
                <div className="text-[10px] font-black text-white uppercase tracking-widest mt-2">Assets Logged</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <EditRange range={editingRange} isOpen={showEditModal} onClose={handleModalClose} onUpdate={handleRangeUpdate} premium={userPremiumStatus} />
    </div>
  );
}

// Minimal BarChart icon for the summary background
const BarChart = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);