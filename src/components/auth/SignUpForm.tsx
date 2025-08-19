import { useState } from "react";
import { useAuth } from "../../firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useToast } from "@/components/ui/use-toast";

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
  const { signUp } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Verify admin code if signing up as admin
    if (isAdmin || role === "admin") {
      const validAdminCode =  import.meta.env.VITE_ADMIN_CODE
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