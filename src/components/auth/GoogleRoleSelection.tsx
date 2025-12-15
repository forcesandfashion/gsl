import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '@/firebase/auth';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Target, Building, Dumbbell, Apple, Brain, Crown, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserRole =
  | "shooter"
  | "range_owner"
  | "technical_coach"
  | "dietician"
  | "mental_trainer"
  | "franchise_owner"
  | "investor"
  | "admin";

interface GoogleRoleSelectionProps {
  user: User;
  onCancel: () => void;
}

const roleOptions = [
  {
    value: "shooter" as UserRole,
    label: "Shooter",
    description: "Individual athlete looking to improve shooting skills",
    icon: Target,
    color: "bg-blue-100 text-blue-700 border-blue-200"
  },
  {
    value: "range_owner" as UserRole,
    label: "Range Owner",
    description: "Shooting range facility owner or manager",
    icon: Building,
    color: "bg-green-100 text-green-700 border-green-200"
  },
  {
    value: "technical_coach" as UserRole,
    label: "Technical Coach",
    description: "Professional shooting technique instructor",
    icon: Dumbbell,
    color: "bg-orange-100 text-orange-700 border-orange-200"
  },
  {
    value: "dietician" as UserRole,
    label: "Dietician",
    description: "Sports nutrition specialist",
    icon: Apple,
    color: "bg-pink-100 text-pink-700 border-pink-200"
  },
  {
    value: "mental_trainer" as UserRole,
    label: "Mental Trainer",
    description: "Sports psychology and mental performance coach",
    icon: Brain,
    color: "bg-purple-100 text-purple-700 border-purple-200"
  },
  {
    value: "franchise_owner" as UserRole,
    label: "Franchise Owner",
    description: "Owner of franchise locations",
    icon: Crown,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200"
  },
  {
    value: "investor" as UserRole,
    label: "Investor",
    description: "Investor in shooting sports facilities or programs",
    icon: Shield,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200"
  }
];

const GoogleRoleSelection: React.FC<GoogleRoleSelectionProps> = ({ user, onCancel }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState(user.displayName || '');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const { completeGoogleSignUp } = useAuth();
  const navigate = useNavigate();

  // Handle admin checkbox toggle
  const handleAdminToggle = () => {
    const newAdminState = !isAdmin;
    setIsAdmin(newAdminState);
    
    if (newAdminState) {
      setSelectedRole("admin");
    } else {
      setSelectedRole("shooter");
      setAdminCode("");
    }
    setError("");
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole !== "admin") {
      setIsAdmin(false);
      setAdminCode("");
    }
    setSelectedRole(newRole);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole || !fullName.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    // Verify admin code if signing up as admin
    if (isAdmin || selectedRole === "admin") {
      const validAdminCode = import.meta.env.VITE_ADMIN_CODE;
      if (!validAdminCode) {
        setError("Admin registration is not configured");
        return;
      }
      if (adminCode !== validAdminCode) {
        setError("Invalid admin code");
        return;
      }
    }

    try {
      setLoading(true);
      await completeGoogleSignUp(user, fullName.trim(), selectedRole);
      
      // Redirect based on role
      if (selectedRole === 'range_owner') {
        navigate('/waitingPage');
      } else if (selectedRole === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error completing Google sign-up:', error);
      setError("Failed to complete account setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <UserCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Complete Your Profile
          </h2>
          
          <p className="text-gray-600">
            Welcome {user.displayName}! Please select your role and confirm your details to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Full Name Input */}
          <div className="space-y-3">
            <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 rounded-lg border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email Display */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Email Address
            </Label>
            <div className="h-12 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-600 flex items-center">
              {user.email}
            </div>
          </div>

          {/* Role Selection - only show if not admin */}
          {!isAdmin && (
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-gray-700">
                I am a
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleOptions.map((role) => {
                  const IconComponent = role.icon;
                  const isSelected = selectedRole === role.value;
                  
                  return (
                    <label
                      key={role.value}
                      className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected
                          ? `${role.color} border-current shadow-md`
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={isSelected}
                        onChange={() => handleRoleChange(role.value)}
                        className="sr-only"
                      />
                      
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white bg-opacity-50' : 'bg-gray-100'}`}>
                          <IconComponent className={`w-5 h-5 ${isSelected ? 'text-current' : 'text-gray-600'}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isSelected ? 'text-current' : 'text-gray-900'}`}>
                            {role.label}
                          </div>
                          <div className={`text-xs mt-1 ${isSelected ? 'text-current opacity-80' : 'text-gray-500'}`}>
                            {role.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sign up as Admin option */}
          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={handleAdminToggle}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isAdmin" className="ml-2 text-sm text-gray-700">
              Sign up as Admin
            </label>
          </div>

          {/* Admin code input - only show if admin is selected */}
          {isAdmin && (
            <div className="space-y-3 mt-4">
              <Label htmlFor="adminCode" className="text-sm font-semibold text-gray-700">
                Admin Code
              </Label>
              <Input
                id="adminCode"
                type="password"
                placeholder="Enter admin code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                required={isAdmin}
                className="h-12 rounded-lg border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              />
              <p className="text-xs text-gray-500">
                Selected role: <span className="font-semibold text-blue-600">Administrator</span>
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 rounded-full border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-all duration-300"
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={!selectedRole || !fullName.trim() || loading}
              className="flex-1 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Setting up account...
                </div>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </div>
        </form>

        {/* Special Notice for Range Owners */}
        {selectedRole === 'range_owner' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Range Owner accounts require verification. You'll receive a confirmation email before accessing your dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleRoleSelection;