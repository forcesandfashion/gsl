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
// --- Added this import below ---
import { cn } from "@/lib/utils"; 

type UserRole =
  | "shooter"
  | "range_owner"
  | "technical_coach"
  | "dietician"
  | "mental_trainer"
  | "franchise_owner"
  | "investor"
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

  const handleAdminToggle = () => {
    const newAdminState = !isAdmin;
    setIsAdmin(newAdminState);
    if (newAdminState) {
      setRole("admin");
    } else {
      setRole("shooter");
      setAdminCode("");
    }
  };

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
      if (result && typeof result === 'object' && 'isNewUser' in result && 'user' in result) {
        if (result.isNewUser) {
          setGoogleUser(result.user);
          setShowGoogleRoleSelection(true);
        } else {
          toast({
            title: "Welcome back!",
            description: "You're already registered.",
          });
          navigate("/dashboard");
        }
      } else {
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

    if (isAdmin || role === "admin") {
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
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 w-full max-w-md mx-auto border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-widest text-gray-500">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#1d4ed8] focus:ring-0 transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-gray-500">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#1d4ed8] focus:ring-0 transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-gray-500">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#1d4ed8] focus:ring-0 transition-all duration-300"
            />
          </div>

          {!isAdmin && (
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-500">I am a</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "shooter", label: "Shooter" },
                  { id: "range_owner", label: "Range Owner" },
                  { id: "technical_coach", label: "Technical Coach" },
                  { id: "dietician", label: "Dietician" },
                  { id: "mental_trainer", label: "Mental Trainer" },
                  { id: "franchise_owner", label: "Franchise Owner" },
                  { id: "investor", label: "Investor" },
                ].map((item) => (
                  <label key={item.id} className={cn(
                    "flex items-center space-x-2 cursor-pointer p-3 rounded-xl border-2 transition-all",
                    role === item.id ? "border-[#1d4ed8] bg-[#1d4ed8]/5" : "border-gray-100 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      value={item.id}
                      checked={role === item.id}
                      onChange={() => handleRoleChange(item.id as UserRole)}
                      className="form-radio h-4 w-4 text-[#1d4ed8] focus:ring-[#1d4ed8]"
                    />
                    <span className={cn("text-xs font-bold uppercase tracking-tighter", role === item.id ? "text-[#1d4ed8]" : "text-gray-600")}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={handleAdminToggle}
              className="h-4 w-4 text-[#1d4ed8] focus:ring-[#1d4ed8] border-gray-300 rounded"
            />
            <label htmlFor="isAdmin" className="ml-2 text-xs font-black uppercase tracking-widest text-gray-500 cursor-pointer">
              Sign up as Admin
            </label>
          </div>

          {isAdmin && (
            <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="adminCode" className="text-xs font-black uppercase tracking-widest text-[#ff6b6b]">
                Admin Verification Code
              </Label>
              <Input
                id="adminCode"
                type="password"
                placeholder="Enter access code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                required={isAdmin}
                className="h-12 rounded-xl border-2 border-[#ff6b6b]/20 focus:border-[#ff6b6b] focus:ring-0 transition-all duration-300"
              />
            </div>
          )}

          {error && <p className="text-xs font-bold text-[#ff6b6b] text-center bg-red-50 py-2 rounded-lg">{error}</p>}

          <Button
            type="submit"
            className="w-full h-12 rounded-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest text-sm shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
          >
            Create account
          </Button>

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative bg-white px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Social Registration
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full h-12 rounded-full border-2 border-gray-100 bg-white text-[#0f172a] font-bold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3 text-sm"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? "Processing..." : "Continue with Google"}</span>
          </Button>

          <div className="text-[10px] font-black uppercase tracking-widest text-center text-gray-400 pt-4">
            Already a member?{" "}
            <Link
              to="/login"
              className="text-[#1d4ed8] hover:text-[#ff6b6b] transition-colors border-b-2 border-[#1d4ed8]/20"
            >
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}