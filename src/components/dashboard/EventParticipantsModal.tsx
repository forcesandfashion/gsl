import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { 
  Users, 
  X, 
  Trophy,
  Award,
  Crown,
  Medal,
  Save,
  Edit,
  Calendar,
  Mail,
  Phone,
  User
} from "lucide-react";
import { db } from "@/firebase/config";
import { updateDoc, doc } from "firebase/firestore";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Types
interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string;
  userId: string;
  joinedAt: string;
  billId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  points?: number;
  position?: number;
}

interface Event {
  id: string;
  name: string;
  participants: Participant[];
  availableseats: string;
  startDate: string;
  endDate: string;
  location: string;
}

interface EventParticipantsModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// Main Component
export default function EventParticipantsModal({ 
  event, 
  isOpen, 
  onClose, 
  onUpdate 
}: EventParticipantsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Initialize and sort participants when event changes
  useEffect(() => {
    if (event && event.participants) {
      const sortedParticipants = [...event.participants]
        .sort((a, b) => {
          const pointsA = a.points || 0;
          const pointsB = b.points || 0;
          return pointsB - pointsA;
        })
        .map((participant, index) => ({
          ...participant,
          position: index + 1
        }));
      
      setParticipants(sortedParticipants);
    }
  }, [event]);

  // Handle points change for a participant
  const handlePointsChange = (participantId: string, points: string) => {
    const pointsValue = points === '' ? 0 : parseInt(points);
    
    setParticipants(prev => 
      prev.map(participant => 
        participant.id === participantId 
          ? { ...participant, points: pointsValue }
          : participant
      )
      .sort((a, b) => {
        const pointsA = a.points || 0;
        const pointsB = b.points || 0;
        return pointsB - pointsA;
      })
      .map((participant, index) => ({
        ...participant,
        position: index + 1
      }))
    );
  };

  // Save points to Firebase
  const savePoints = async () => {
    if (!event) return;

    setLoading(true);
    try {
      const eventRef = doc(db, "events", event.id);
      
      const updatedParticipants = participants.map(participant => {
        const originalParticipant = event.participants.find(p => p.id === participant.id);
        return {
          ...originalParticipant,
          points: participant.points || 0,
          position: participant.position
        };
      });

      await updateDoc(eventRef, {
        participants: updatedParticipants
      });

      toast({
        title: "Success",
        description: "Points updated successfully"
      });

      setEditingPoints(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating points:", error);
      toast({
        title: "Error",
        description: "Failed to update points. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get position icon
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-500" />;
      default:
        return <Trophy className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get position background color
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200 shadow-md";
      case 2:
        return "bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200";
      case 3:
        return "bg-gradient-to-r from-orange-100 to-orange-50 border-orange-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6" />
              <CardTitle className="text-white">Participants - {event.name}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm opacity-90 mt-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>
                {event.startDate === event.endDate 
                  ? formatDate(event.startDate)
                  : `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Registered: {participants.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>Seats: {event.availableseats} (Available: {parseInt(event.availableseats) - participants.length})</span>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-0 max-h-[calc(90vh-200px)] overflow-y-auto">
          {participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No Participants Yet</h3>
              <p className="text-gray-500">No one has registered for this event yet.</p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`p-4 rounded-lg border-2 ${getPositionColor(participant.position || 0)} transition-all duration-200 hover:shadow-md`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Position and Icon */}
                      <div className="flex items-center space-x-3">
                        {getPositionIcon(participant.position || 0)}
                        <Badge 
                          variant="secondary" 
                          className={
                            `font-bold text-sm ${
                              participant.position === 1 ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                              participant.position === 2 ? "bg-gray-100 text-gray-800 border-gray-300" :
                              participant.position === 3 ? "bg-orange-100 text-orange-800 border-orange-300" :
                              "bg-blue-100 text-blue-800 border-blue-300"
                            }`
                          }
                        >
                          #{participant.position}
                        </Badge>
                      </div>
                      
                      {/* Participant Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900 text-lg">{participant.name}</h4>
                          {participant.paymentStatus === 'paid' && (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs border-green-300">
                              Paid
                            </Badge>
                          )}
                          {participant.paymentStatus === 'pending' && (
                            <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs border-yellow-300">
                              Pending
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span className="truncate">{participant.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-green-500" />
                            <span>{participant.phone}</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Joined: {new Date(participant.joinedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Points Input */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <Label htmlFor={`points-${participant.id}`} className="text-sm font-medium text-gray-700 block mb-1">
                          Points
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id={`points-${participant.id}`}
                            type="number"
                            min="0"
                            max="1000"
                            value={participant.points || 0}
                            onChange={(e) => handlePointsChange(participant.id, e.target.value)}
                            disabled={!editingPoints}
                            className="w-24 text-center font-bold text-lg"
                          />
                          {participant.points !== undefined && participant.points > 0 && (
                            <span className="text-sm font-medium text-gray-600">
                              pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Trophy className="w-4 h-4" />
              <span>Participants are automatically sorted by points (highest to lowest)</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {editingPoints ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingPoints(false);
                      // Reset to original points
                      if (event) {
                        const sortedParticipants = [...event.participants]
                          .sort((a, b) => {
                            const pointsA = a.points || 0;
                            const pointsB = b.points || 0;
                            return pointsB - pointsA;
                          })
                          .map((p, i) => ({ ...p, position: i + 1 }));
                        setParticipants(sortedParticipants);
                      }
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={savePoints}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Points
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditingPoints(true)}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Points
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}