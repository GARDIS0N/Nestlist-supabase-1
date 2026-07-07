import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Session, User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: "landlord" | "tenant" | "admin" | null;
  avatar_url: string | null;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  created_at: string;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: "landlord" | "tenant" | "admin"
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => void;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Derived user state
  const user = session ? session.user : null;

  // Fetch profile function
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error loading user profile:", error);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error("Exception loading user profile:", err);
      return null;
    }
  };

  // INITIALIZATION in useEffect
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      try {
        console.log("AuthContext: Initializing session check...");
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setSession(initialSession);
          if (initialSession?.user?.id) {
            const prof = await fetchProfile(initialSession.user.id);
            if (isMounted) setProfile(prof);
          } else {
            if (isMounted) setProfile(null);
          }
        }
      } catch (err) {
        console.error("Error during initial session check:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state change events explicitly
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[Auth Event Debug] AuthStateChange: ${event}`);
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setSession(null);
        setProfile(null);
        setLoading(false);
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        setSession(currentSession);
        if (currentSession?.user?.id) {
          const prof = await fetchProfile(currentSession.user.id);
          if (isMounted) {
            setProfile(prof);
            setLoading(false);
          }
        } else {
          if (isMounted) {
            setProfile(null);
            setLoading(false);
          }
        }
      } else {
        setSession(currentSession);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // SIGN UP
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: "landlord" | "tenant" | "admin"
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role,
        },
      },
    });

    if (error) return { error: error.message };
    if (!data.user) return { error: "Sign up failed. Please try again." };
    return { error: null };
  };

  // SIGN IN
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let userMsg = error.message;
        const lowerMsg = userMsg.toLowerCase();
        if (lowerMsg.includes("email not confirmed") || lowerMsg.includes("email_not_confirmed") || lowerMsg.includes("confirm your email")) {
          userMsg = "Please check your inbox for a verification link";
        } else if (
          lowerMsg.includes("invalid grant") || 
          lowerMsg.includes("invalid credentials") || 
          lowerMsg.includes("incorrect password") || 
          lowerMsg.includes("invalid login")
        ) {
          userMsg = "Incorrect email or password";
        }
        return { error: userMsg };
      }

      if (data?.user) {
        const prof = await fetchProfile(data.user.id);
        setProfile(prof);
      }

      return { error: null };
    } catch (error: any) {
      console.error("Signin exception caught:", error);
      return { error: error.message || "Login failed" };
    }
  };

  // SIGN IN WITH GOOGLE
  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/onboarding",
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Google login exception caught:", error);
      return { error: error.message || "Google OAuth failed." };
    }
  };

  // SIGN OUT
  const signOut = () => {
    setSession(null);
    setProfile(null);
    try {
      supabase.auth.signOut();
    } catch (error) {
      console.error("Signout exception caught:", error);
    }
  };

  // UPDATE PROFILE
  const updateProfile = async (data: Partial<Profile>): Promise<{ error: string | null }> => {
    const userId = session?.user?.id;
    if (!userId) return { error: "No active user session found" };
    try {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", userId);

      if (error) throw error;

      const prof = await fetchProfile(userId);
      setProfile(prof);

      return { error: null };
    } catch (error: any) {
      console.error("Update profile exception caught:", error);
      return { error: error.message || "Failed to update profile." };
    }
  };

  // REFRESH PROFILE
  const refreshProfile = async (): Promise<void> => {
    const userId = session?.user?.id;
    if (userId) {
      const prof = await fetchProfile(userId);
      setProfile(prof);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
