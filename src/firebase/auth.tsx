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
import { serverTimestamp, Timestamp } from "firebase/firestore";
import { sendWelcomeEmail } from '@/lib/sendWelcomeEmail';

type UserRole =
  | "shooter"
  | "range_owner"
  | "technical_coach"
  | "dietician"
  | "mental_trainer"
  | "franchise_owner"
  | "investor"
  | "admin"
  | "manager"
  | "sub_admin"
  | "cmb";

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

// Helper function to create role-based documents
const createRoleBasedDocument = async (user: User, fullName: string, email: string, role: UserRole) => {
  const timestamp = serverTimestamp();
  
  switch (role) {
    case "shooter":
      await setDoc(doc(db, "shooters", user.uid), {
        fullName,
        uid: user.uid,
        email,
        wallet: false,
        kyc: false,
        premium: false,
        createdAt: timestamp
      });
      break;

    case "range_owner":
      await setDoc(doc(db, "range-owners", user.uid), {
        uid: user.uid,
        status: "pending",
        createdAt: timestamp,
        // Add any other existing fields from your current code
        username: fullName,
        email,
        role: "range_owner",
        premium: false
      });
      break;

    case "investor":
      await setDoc(doc(db, "investor", user.uid), {
        uid: user.uid,
        createdAt: timestamp,
        // Add any other existing fields from your current code
        username: fullName,
        email,
        role: "investor",
        premium: false
      });
      break;

    case "admin":
      await setDoc(doc(db, "admins", user.uid), {
        createdAt: timestamp,
        email,
        fullName,
        role: "admin",
        uid: user.uid
      });
      break;



    // Note: sub_admin documents are created by backend Cloud Function, not here

    case "technical_coach":
    case "dietician":
    case "mental_trainer":
    case "franchise_owner":
      // Create documents in their respective collections
      const collectionName = role === "technical_coach" ? "technical-coaches" :
                           role === "dietician" ? "dieticians" :
                           role === "mental_trainer" ? "mental-trainers" :
                           "franchise-owners";
      
      await setDoc(doc(db, collectionName, user.uid), {
        uid: user.uid,
        fullName,
        email,
        role,
        createdAt: timestamp,
        status: "pending",
      });
      break;

    default:
      console.warn(`No specific collection handler for role: ${role}`);
  }
};

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
        
        // If no role in displayName, check role-specific collections
        if (!role) {
          try {
            // Check different collections based on potential roles
            const collections = [
              'shooters', 
              'range-owners', 
              'admins',
              'sub-admin',  // Check for sub-admin documents created by backend
              'manager', 
              'technical-coaches', 
              'investor',
              'dieticians', 
              'mental-trainers', 
              'franchise-owners',
              'cmbs'  // Added cmbs collection
            ];
            
            for (const collection of collections) {
              const userDoc = await getDoc(doc(db, collection, user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                // Get role from document or infer from collection name
                role = userData.role as UserRole || 
                       (collection === 'shooters' ? 'shooter' : 
                        collection === 'range-owners' ? 'range_owner' : 
                        collection === 'admins' ? 'admin' :
                        collection === 'sub-admin' ? 'sub_admin' :
                        collection === 'manager' ? 'manager' :
                        collection === 'cmbs' ? 'cmb' :
                        collection === 'investor' ? 'investor' :
                        userData.role) as UserRole;
                break;
              }
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

      // Create role-specific document (sub_admin not created here)
      await createRoleBasedDocument(user, fullName, email, role);

      setUser(user);
      setUserRole(role);

      // Role-specific messages
      let roleMessage = "";
      if (role === "shooter") {
        roleMessage = "Your Shooter account has been created. You can log in using the link below.";
      } else if (role === "range_owner") {
        roleMessage = "Your Range Owner account has been created. Please wait until confirmation mail before logging in to your dashboard.";
      } else if (role === "cmb") {
        roleMessage = "Your CMB account has been created. You can log in using the link below.";
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
        // Check role-specific collections to find existing user
        const collections = [
          'shooters', 
          'range-owners', 
          'admins', 
          'sub-admin',  // Include sub-admin collection
          'technical-coaches', 
          'dieticians', 
          'mental-trainers', 
          'franchise-owners',
          'cmbs'  // Added cmbs collection
        ];
        let foundRole = null;
        
        for (const collection of collections) {
          const userDoc = await getDoc(doc(db, collection, user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            foundRole = userData.role as UserRole || 
                       (collection === 'shooters' ? 'shooter' : 
                        collection === 'range-owners' ? 'range_owner' : 
                        collection === 'admins' ? 'admin' :
                        collection === 'sub-admin' ? 'sub_admin' :
                        collection === 'cmbs' ? 'cmb' :
                        userData.role) as UserRole;
            break;
          }
        }
        
        if (foundRole) {
          setUser(user);
          setUserRole(foundRole);
          toast({ title: "Login successful" });
          return;
        } else {
          // User exists in auth but not in role collections - treat as new user
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

      // Create role-specific document (sub_admin not created here)
      if (user.email) {
        await createRoleBasedDocument(user, fullName, user.email, role);
      }

      setUser(user);
      setUserRole(role);

      // Role-specific messages
      let roleMessage = "";
      if (role === "shooter") {
        roleMessage = "Your Shooter account has been created. You can log in using the link below.";
      } else if (role === "range_owner") {
        roleMessage = "Your Range Owner account has been created. Please wait until confirmation mail before logging in to your dashboard.";
      } else if (role === "cmb") {
        roleMessage = "Your CMB account has been created. You can log in using the link below.";
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
      
      // If no role in displayName, check Firestore collections
      if (!role) {
        const collections = [
          'shooters', 
          'range-owners', 
          'admins', 
          'sub-admin',  // Include sub-admin collection
          'manager', 
          'technical-coaches', 
          'dieticians', 
          'mental-trainers', 
          'franchise-owners',
          'cmbs'  // Added cmbs collection
        ];
        
        for (const collection of collections) {
          const userDoc = await getDoc(doc(db, collection, user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            role = userData.role as UserRole || 
                   (collection === 'shooters' ? 'shooter' : 
                    collection === 'range-owners' ? 'range_owner' : 
                    collection === 'admins' ? 'admin' :
                    collection === 'sub-admin' ? 'sub_admin' :
                    collection === 'manager' ? 'manager' :
                    collection === 'cmbs' ? 'cmb' :
                    userData.role) as UserRole;
            break;
          }
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