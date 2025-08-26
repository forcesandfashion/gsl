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

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Common function to check user status after login
  const checkUserStatusAndNavigate = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not found after login");

    // Check if user is in "range-owner" collection
    const docRef = doc(db, "range-owners", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Only check pending status if role is "range_owner"
      if (data.role === "range_owner") {
        if (data.status === "pending") {
          // Sign out and redirect to not authorized page
          await signOut(auth);
          navigate("/not-authorized");
          return false; // Indicates user was redirected
        }
      }
    }

    // Allow login if passed all checks
    navigate("/dashboard");
    return true; // Indicates successful navigation
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitButton = document.getElementById("login-button");
    if (submitButton) submitButton.setAttribute("disabled", "true");

    try {
      setError("");

      // Step 1: Sign in to Firebase
      await signIn(email, password);

      // Step 2: Check status and navigate
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
      
      // Sign in with Google
      await signInWithGoogle();
      
      // Check user status and navigate accordingly
      const navigatedSuccessfully = await checkUserStatusAndNavigate();
      
      // Only show success toast if user wasn't redirected to not-authorized
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

  return (
    <AuthLayout title="Sign In">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-3">
            <Label
              htmlFor="email"
              className="text-sm font-semibold text-gray-700"
            >
              Email
            </Label>
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
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-gray-700"
              >
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-lg border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <Button
            id="login-button"
            type="submit"
            className="w-full h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            Sign In
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

          {/* Google Sign In Button */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
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
            <span>{googleLoading ? "Signing in..." : "Continue with Google"}</span>
          </Button>

          {/* Facebook Sign In Button (Placeholder) */}
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
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-600 hover:underline font-bold"
            >
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}