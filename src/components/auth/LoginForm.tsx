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

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const submitButton = document.getElementById("login-button");
  if (submitButton) submitButton.setAttribute("disabled", "true");

  try {
    setError("");

    // Step 1: Sign in to Firebase
    await signIn(email, password);

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not found after login");

    // Step 2: Check if user is in "range-owner" collection
    const docRef = doc(db, "range-owners", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Step 3: Only check pending status if role is "range_owner"
      if (data.role === "range_owner") {
        if (data.status === "pending") {
          // Sign out and redirect to not authorized page
          await signOut(auth);
          navigate("/not-authorized");
          return; // ⬅️ Prevents further code execution
        }
      }
    }

    // Step 4: Allow login if passed all checks
    navigate("/dashboard");
  } catch (error: any) {
    console.error("Login error:", error);
    setError(error.message || "Failed to login");
  } finally {
    if (submitButton) submitButton.removeAttribute("disabled");
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
