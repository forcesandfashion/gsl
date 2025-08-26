import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth } from './config';
import { useToast } from '../components/ui/use-toast';
import { db } from "./config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { sendWelcomeEmail } from '@/lib/sendWelcomeEmail';

type UserRole =
  | "shooter"
  | "range_owner"
  | "technical_coach"
  | "dietician"
  | "mental_trainer"
  | "franchise_owner"
  | "admin";

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean; user: User } | void>;
  completeGoogleSignUp: (user: User, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // First check if user has role in displayName (existing users)
        let role = user.displayName?.split('|')[1] as UserRole;
        
        // If no role in displayName, check Firestore
        if (!role) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              role = userDoc.data().role as UserRole;
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
          }
        }
        
        setUserRole(role || "shooter");
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
  ): Promise<void> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${fullName}|${role}`
      });

      // Store user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email,
        fullName,
        role,
        provider: "email",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setUser(user);
      setUserRole(role);

      // Create role-specific collections
      if (role === "range_owner") {
        await setDoc(doc(db, "range-owners", user.uid), {
          username: fullName,
          email,
          role: "range_owner",
          status: "pending",
          premium: false,
          createdAt: serverTimestamp()
        });
      } else if (role === "shooter") {
        await setDoc(doc(db, "shooters", user.uid), {
          uid: user.uid,
          fullName,
          email,
          totalPoints: 0,
          createdAt: serverTimestamp()
        });
      } else if (role === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          uid: user.uid,
          fullName,
          email,
          role: "admin",
          createdAt: serverTimestamp()
        });
      } else if (role === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          uid: user.uid,
          fullName,
          email,
          role: "admin",
          createdAt: serverTimestamp()
        });
      }

      // Role-specific messages
      let roleMessage = "";
      if (role === "shooter") {
        roleMessage = "Your Shooter account has been created. You can log in using the link below.";
      } else if (role === "range_owner") {
        roleMessage = "Your Range Owner account has been created. Please wait until confirmation mail before logging in to your dashboard.";
      } else {
        roleMessage = `Your ${role} account has been created. You can log in using the link below.`;
      }

      // Send welcome email
      await sendWelcomeEmail(email, fullName, roleMessage);

      toast({ title: "Account created successfully" });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({ 
        title: "Signup failed", 
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<{ isNewUser: boolean; user: User } | void> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser || false;

      if (!isNewUser) {
        // Existing user - check if they have a role set
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role as UserRole;
          setUser(user);
          setUserRole(role);
          toast({ title: "Login successful" });
          return;
        } else {
          // User exists in auth but not in Firestore - treat as new user
          return { isNewUser: true, user };
        }
      }

      // New user - return user data for role selection
      return { isNewUser: true, user };
      
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // Handle specific Google sign-in errors
      let errorMessage = error.message;
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up blocked by browser. Please enable pop-ups and try again.';
      }
      
      toast({ 
        title: "Google sign-in failed", 
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  const completeGoogleSignUp = async (user: User, fullName: string, role: UserRole): Promise<void> => {
    try {
      // Update display name with role
      await updateProfile(user, {
        displayName: `${fullName}|${role}`
      });

      // Store user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        fullName,
        role,
        provider: "google",
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setUser(user);
      setUserRole(role);

      if (role === "range_owner") {
        await setDoc(doc(db, "range-owners", user.uid), {
          username: fullName,
          email: user.email,
          role: "range_owner",
          status: "pending",
          premium: false,
          createdAt: serverTimestamp()
        });
      } else if (role === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          uid: user.uid,
          fullName,
          email: user.email,
          role: "admin",
          createdAt: serverTimestamp()
        });
      } else if (role === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          uid: user.uid,
          fullName,
          email: user.email,
          role: "admin",
          createdAt: serverTimestamp()
        });
      }

      // Role-specific messages
      let roleMessage = "";
      if (role === "shooter") {
        roleMessage = "Your Shooter account has been created. You can log in using the link below.";
      } else if (role === "range_owner") {
        roleMessage = "Your Range Owner account has been created. Please wait until confirmation mail before logging in to your dashboard.";
      } else {
        roleMessage = `Your ${role} account has been created. You can log in using the link below.`;
      }

      // Send welcome email
      if (user.email) {
        await sendWelcomeEmail(user.email, fullName, roleMessage);
      }

      toast({ title: "Account setup completed successfully" });
    } catch (error: any) {
      console.error('Complete Google signup error:', error);
      toast({ 
        title: "Setup failed", 
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      let role = user.displayName?.split('|')[1] as UserRole;
      
      // If no role in displayName, check Firestore
      if (!role) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          role = userDoc.data().role as UserRole;
        }
      }
      
      setUser(user);
      setUserRole(role || "shooter");
      toast({ title: "Login successful" });
    } catch (error: any) {
      console.error("Sign-in error:", error);
      toast({ 
        title: "Login failed", 
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserRole(null);
      toast({ title: "Logged out successfully" });
    } catch (error: any) {
      console.error("Sign-out error:", error);
      toast({ 
        title: "Logout failed", 
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        userRole, 
        loading, 
        signUp, 
        signIn, 
        signInWithGoogle,
        completeGoogleSignUp,
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const ProtectedRoute = ({ 
  children, 
  roles 
}: { 
  children: JSX.Element;
  roles: UserRole[];
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!roles.includes(userRole!)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};