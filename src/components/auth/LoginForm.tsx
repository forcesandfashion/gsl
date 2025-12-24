import { useState } from "react";
import { useAuth } from "../../firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useToast } from "@/components/ui/use-toast";
import { User } from "firebase/auth";
import GoogleRoleSelection from "./GoogleRoleSelection";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [newGoogleUser, setNewGoogleUser] = useState<User | null>(null);
  
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkUserStatusAndNavigate = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not found after login");

    const docRef = doc(db, "range-owners", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.role === "range_owner") {
        if (data.status === "pending") {
          await signOut(auth);
          navigate("/not-authorized");
          return false;
        }
      }
    }

    navigate("/dashboard");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitButton = document.getElementById("login-button");
    if (submitButton) submitButton.setAttribute("disabled", "true");

    try {
      setError("");
      await signIn(email, password);
      await checkUserStatusAndNavigate();
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Failed to login");
    } finally {
      if (submitButton) submitButton.removeAttribute("disabled");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");
      const result = await signInWithGoogle();
      
      if (result && result.isNewUser) {
        setShowRoleSelection(true);
        setNewGoogleUser(result.user);
        return;
      }
      
      const navigatedSuccessfully = await checkUserStatusAndNavigate();
      if (navigatedSuccessfully) {
        toast({
          title: "Welcome back!",
          description: "You're signed in successfully.",
        });
      }
    } catch (error: any) {
      setError(error.message || "Failed to sign in with Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRoleSelectionCancel = async () => {
    if (newGoogleUser) {
      try {
        await newGoogleUser.delete();
      } catch (error) {
        console.error("Error deleting cancelled Google account:", error);
      }
    }
    setShowRoleSelection(false);
    setNewGoogleUser(null);
    setGoogleLoading(false);
  };

  if (showRoleSelection && newGoogleUser) {
    return (
      <GoogleRoleSelection 
        user={newGoogleUser} 
        onCancel={handleRoleSelectionCancel}
      />
    );
  }

  return (
    <AuthLayout title="Sign In">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 w-full max-w-md mx-auto border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-black uppercase tracking-widest text-gray-500"
            >
              Email Address
            </Label>
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
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-xs font-black uppercase tracking-widest text-gray-500"
              >
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-[#1d4ed8] hover:text-[#ff5252] transition-colors uppercase tracking-tighter"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#1d4ed8] focus:ring-0 transition-all duration-300"
            />
          </div>
          
          {error && <p className="text-xs font-bold text-[#ff5252] text-center bg-red-50 py-2 rounded-lg">{error}</p>}
          
          <Button
            id="login-button"
            type="submit"
            className="w-full h-12 rounded-full bg-[#1d4ed8] hover:bg-[#ff5252] text-white font-black uppercase tracking-widest text-sm shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
          >
            Sign In
          </Button>

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative bg-white px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Identity Verification
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
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
            <span>Continue with Google</span>
          </Button>

          <div className="text-[10px] font-black uppercase tracking-widest text-center text-gray-400 pt-4">
            New to Global Shooting League?{" "}
            <Link
              to="/signup"
              className="text-[#1d4ed8] hover:text-[#ff5252] transition-colors border-b-2 border-[#1d4ed8]/20"
            >
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}