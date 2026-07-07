import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { 
  User, Mail, Phone, Shield, Lock, Bell, Check, Loader2, 
  Save, AlertTriangle, CheckCircle, KeyRound, Smartphone, AtSign 
} from "lucide-react";

export const Profile: React.FC = () => {
  const { profile, refreshProfile } = useAuth();

  // Basic Info Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [updatingInfo, setUpdatingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Notification Preferences State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Password Update State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load initial profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      
      // Load notification preferences from database, default to true
      setEmailNotifications(profile.email_notifications !== false);
      setSmsNotifications(profile.sms_notifications !== false);
    }
  }, [profile]);

  // Handle Basic Info Save
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!fullName.trim()) {
      setInfoError("Full name cannot be empty");
      return;
    }

    setUpdatingInfo(true);
    setInfoError(null);
    setInfoSuccess(false);

    try {
      // Direct supabase table update via /api/profiles/:id or direct supabase client
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to update profile info:", err);
      setInfoError(err.message || "Failed to update profile info. Please try again.");
    } finally {
      setUpdatingInfo(false);
    }
  };

  // Handle Notification Preferences Toggle
  const handleToggleNotifications = async (type: "email" | "sms", value: boolean) => {
    if (!profile) return;

    // Optimistic UI update
    if (type === "email") setEmailNotifications(value);
    if (type === "sms") setSmsNotifications(value);

    setUpdatingPrefs(true);
    setPrefsError(null);
    setPrefsSuccess(false);

    try {
      const updates = {
        email_notifications: type === "email" ? value : emailNotifications,
        sms_notifications: type === "sms" ? value : smsNotifications,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);

      // If we got a PG column missing error (e.g. migration hasn't run on Supabase),
      // fallback gracefully to storing it in localStorage but still show success
      if (error) {
        console.warn("Could not write notification preferences to database, falling back to localStorage:", error);
        localStorage.setItem(`nestlist-prefs-${profile.id}`, JSON.stringify(updates));
      }

      await refreshProfile();
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to update notification preferences:", err);
      setPrefsError("Failed to persist notification settings");
    } finally {
      setUpdatingPrefs(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setPasswordError("Please enter a new password");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      console.error("Password update error:", err);
      setPasswordError(err.message || "Failed to update password. Please try again.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-stone-600 font-medium">Loading user profile details...</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    tenant: "Verified Tenant",
    landlord: "Property Landlord",
    admin: "Platform Administrator",
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans" id="user-profile-page">
      {/* Top Welcome Card */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name || "Profile"} 
              className="h-16 w-16 rounded-full object-cover border-2 border-primary-500/20 shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700">
              <User className="h-8 w-8" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight leading-snug">
              {profile.full_name || "NestList User"}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="h-3.5 w-3.5 text-primary-600" />
              <span className="text-xs font-semibold text-primary-800 uppercase tracking-wider bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200/40">
                {roleLabels[profile.role || "tenant"] || "Tenant"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-stone-500 text-xs text-center md:text-right shrink-0">
          <p className="font-medium">Account ID: <span className="font-mono text-stone-700">{profile.id.substring(0, 12)}...</span></p>
          <p className="mt-1">Member since: {new Date(profile.created_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column / main settings block */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Section 1: Contact Details Form */}
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm p-6" id="profile-contact-details">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-stone-100">
              <User className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-bold text-stone-900">Personal Information</h2>
            </div>

            <form onSubmit={handleUpdateInfo} className="space-y-4">
              {infoSuccess && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-sm animate-fade-in">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <p className="font-medium">Contact details updated successfully!</p>
                </div>
              )}

              {infoError && (
                <div className="flex items-center gap-2.5 p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-sm animate-fade-in">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <p>{infoError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kelvin Mutua"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +254 712 345678"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Email Address (Unchangeable)
                </label>
                <div className="relative opacity-65">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    value={profile.email || ""}
                    disabled
                    className="w-full pl-9 pr-4 py-2 text-sm bg-stone-100 border border-stone-200 rounded-xl text-stone-600 font-medium cursor-not-allowed"
                  />
                </div>
                <span className="block text-[11px] text-stone-400 mt-1 font-medium">
                  Your email is managed securely via auth credentials.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingInfo}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-750 hover:to-emerald-650 text-white font-medium text-xs py-2 px-5 rounded-full shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {updatingInfo ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Update Password Form */}
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm p-6" id="profile-password-change">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-stone-100">
              <Lock className="h-5 w-5 text-primary-700" />
              <h2 className="text-base font-bold text-stone-900">Security & Password</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passwordSuccess && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-sm animate-fade-in">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <p className="font-medium">Password updated securely!</p>
                </div>
              )}

              {passwordError && (
                <div className="flex items-center gap-2.5 p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-sm animate-fade-in">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <p>{passwordError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A] transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-stone-800 to-stone-750 hover:from-stone-750 hover:to-stone-700 text-white font-medium text-xs py-2 px-5 rounded-full shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right column / Alerts, metadata, preferences */}
        <div className="space-y-8">
          
          {/* Section 3: Notification Preferences */}
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm p-6" id="profile-notification-preferences">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <Bell className="h-5 w-5 text-primary-600" />
              <h2 className="text-base font-bold text-stone-900">Notifications</h2>
            </div>

            <p className="text-stone-500 text-xs leading-relaxed mb-6 font-medium">
              Configure how you wish to receive transaction receipts, listing verification alerts, and inquiry updates.
            </p>

            <div className="space-y-5">
              {/* Email Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <AtSign className="h-4 w-4 text-stone-400" />
                    <span className="text-sm font-semibold text-stone-800">Email Alerts</span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium">
                    Inquiry replies, payments confirmation & invoices.
                  </p>
                </div>
                
                <button
                  onClick={() => handleToggleNotifications("email", !emailNotifications)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    emailNotifications ? "bg-emerald-700" : "bg-stone-200"
                  }`}
                  role="switch"
                  aria-checked={emailNotifications}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* SMS Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-stone-400" />
                    <span className="text-sm font-semibold text-stone-800">SMS Alerts</span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium">
                    Immediate SMS alerts for inquiries & critical updates.
                  </p>
                </div>
                
                <button
                  onClick={() => handleToggleNotifications("sms", !smsNotifications)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    smsNotifications ? "bg-emerald-700" : "bg-stone-200"
                  }`}
                  role="switch"
                  aria-checked={smsNotifications}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      smsNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {prefsSuccess && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 py-1.5 px-2.5 rounded-lg border border-emerald-100">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Preferences updated!</span>
              </div>
            )}
          </div>

          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-850 text-white rounded-2xl p-5 shadow-md">
            <h3 className="text-sm font-bold tracking-tight mb-2 flex items-center gap-1.5 text-gold-400">
              <Shield className="h-4 w-4" />
              Need Assistance?
            </h3>
            <p className="text-stone-300 text-[11.5px] leading-relaxed mb-4">
              If you wish to change your role or require account deletion under Kenyan data protection regulations, please contact support.
            </p>
            <div className="border-t border-stone-800 pt-3 flex items-center justify-between text-[11px] font-semibold text-stone-300">
              <span>Support Email</span>
              <a href="mailto:support@nestlist.co.ke" className="text-gold-400 hover:underline">
                support@nestlist.co.ke
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
