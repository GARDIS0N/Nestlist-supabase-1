import { useAuth as useCtxAuth } from "../context/AuthContext";
import { User, Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export function useAuth() {
  const ctx = useCtxAuth();

  const isAdmin = ctx.profile?.role === "admin" || ctx.profile?.role === "superadmin";
  const isLandlord = ["landlord", "caretaker", "agent"].includes(ctx.profile?.role || "");
  const isTenant = ctx.profile?.role === "tenant";

  return {
    user: (ctx.session?.user as User) || null,
    profile: ctx.profile as unknown as Profile | null,
    session: ctx.session as Session | null,
    loading: ctx.loading,
    isAdmin,
    isLandlord,
    isTenant,
    signOut: ctx.signOut,
    updateProfile: ctx.updateProfile,
    refetchProfile: ctx.refreshProfile,
  };
}
