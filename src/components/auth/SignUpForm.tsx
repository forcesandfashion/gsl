import { useState } from "react";
import { useAuth } from "../../firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useToast } from "@/components/ui/use-toast";
import { User } from "firebase/auth";
import GoogleRoleSelection from "./GoogleRoleSelection";

type UserRole =
  | "shooter"
  | "range_owner"
  | "technical_coach"
  | "dietician"
  | "mental_trainer"
  | "franchise_owner"
  | "admin";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("shooter");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleRoleSelection, setShowGoogleRoleSelection] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  // Handle admin checkbox toggle
  const handleAdminToggle = () => {
    const newAdminState = !isAdmin;
    setIsAdmin(newAdminState);
    
    if (newAdminState) {
      // If selecting admin, set role to admin
      setRole("admin");
    } else {
      // If deselecting admin, reset to default role
      setRole("shooter");
      setAdminCode("");
    }
  };

  // Handle role selection - deselect admin if any other role is selected
  const handleRoleChange = (newRole: UserRole) => {
    if (newRole !== "admin") {
      setIsAdmin(false);
      setAdminCode("");
    }
    setRole(newRole);
  };

const handleGoogleSignUp = async () => {
  try {
    setGoogleLoading(true);
    setError("");
    const result = await signInWithGoogle();
    
    // Type guard to check if result is the expected object
    if (result && typeof result === 'object' && 'isNewUser' in result && 'user' in result) {
      if (result.isNewUser) {
        // New user needs to select role
        setGoogleUser(result.user);
        setShowGoogleRoleSelection(true);
      } else {
        // Existing user, redirect based on role
        toast({
          title: "Welcome back!",
          description: "You're already registered.",
        });
        navigate("/dashboard");
      }
    } else {
      // Handle case where result is void or unexpected
      setError("Unexpected response from Google sign-in");
    }
  } catch (error: any) {
    setError(error.message || "Failed to sign up with Google");
  } finally {
    setGoogleLoading(false);
  }
};

  const handleCancelGoogleSignup = () => {
    setShowGoogleRoleSelection(false);
    setGoogleUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Verify admin code if signing up as admin
    if (isAdmin || role === "admin") {
      const validAdminCode = import.meta.env.VITE_ADMIN_CODE
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
      await signUp(email, password, fullName, role);

      toast({
        title: "Account created successfully",
        description: "Please check your email to verify your account.",
        duration: 5000,
      });
      if (role === "range_owner") {
        navigate("/waitingPage");
      } else {
        navigate("/login");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setError(error.message || "Error creating account. Please try again.");
    }
  };

  if (showGoogleRoleSelection && googleUser) {
    return (
      <GoogleRoleSelection 
        user={googleUser} 
        onCancel={handleCancelGoogleSignup}
      />
    );
  }

  return (
    <AuthLayout title="Sign Up">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-3">
            <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-12 rounded-lg border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-lg border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-lg border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>

          {/* Role selection - only show if not admin */}
          {!isAdmin && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">I am a</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="shooter"
                    checked={role === "shooter"}
                    onChange={() => handleRoleChange("shooter")}
                    className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />{" "}
                  <span className="text-gray-700 text-sm">Shooter</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="range_owner"
                    checked={role === "range_owner"}
                    onChange={() => handleRoleChange("range_owner")}
                    className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />{" "}
                  <span className="text-gray-700 text-sm">Range Owner</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="technical_coach"
                    checked={role === "technical_coach"}
                    onChange={() => handleRoleChange("technical_coach")}
                    className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />{" "}
                  <span className="text-gray-700 text-sm">Technical Coach</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="dietician"
                    checked={role === "dietician"}
                    onChange={() => handleRoleChange("dietician")}
                    className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />{" "}
                  <span className="text-gray-700 text-sm">Dietician</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="mental_trainer"
                    checked={role === "mental_trainer"}
                    onChange={() => handleRoleChange("mental_trainer")}
                    className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />{" "}
                  <span className="text-gray-700 text-sm">Mental Trainer</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="franchise_owner"
                    checked={role === "franchise_owner"}
                    onChange={() => handleRoleChange("franchise_owner")}
                    className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />{" "}
                  <span className="text-gray-700 text-sm">Franchise Owner</span>
                </label>
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

          <Button
            type="submit"
            className="w-full h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            Create account
          </Button>

          {/* Social Login Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative bg-white px-4 text-sm text-gray-500">
              Or continue with
            </div>
          </div>

          {/* Google Sign Up Button */}
          <Button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full h-12 rounded-full border-2 border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? "Signing up..." : "Continue with Google"}</span>
          </Button>

          {/* Facebook Sign Up Button (Placeholder) */}
          <Button
            type="button"
            disabled
            className="w-full h-12 rounded-full border-2 border-gray-200 bg-gray-100 text-gray-400 font-medium cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Continue with Facebook</span>
          </Button>

          <div className="text-sm text-center text-gray-600 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:underline font-bold"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}