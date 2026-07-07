import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Home, Heart, Bell, LayoutDashboard, Shield, LogOut, User, Menu, X } from "lucide-react";

export const Header: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [counts, setCounts] = React.useState({ listings: 0, inquiries: 0, unreadInquiries: 0 });

  React.useEffect(() => {
    if (profile?.role === "landlord") {
      const fetchCounts = async () => {
        try {
          const { count: listingsCount } = await supabase
            .from("properties")
            .select("id", { count: "exact", head: true })
            .eq("landlord_id", profile.id);

          const { data: inquiriesData } = await supabase
            .from("inquiries")
            .select("status")
            .eq("landlord_id", profile.id);

          const totalInquiries = inquiriesData?.length || 0;
          const unreadInquiries = inquiriesData?.filter(i => i.status === "pending").length || 0;

          setCounts({
            listings: listingsCount || 0,
            inquiries: totalInquiries,
            unreadInquiries: unreadInquiries
          });
        } catch (e) {
          console.error("Error fetching counts in Header:", e);
        }
      };
      fetchCounts();
    }
  }, [profile, location.pathname]);

  // Check if current user has the admin privilege
  const isAdmin = profile?.role === "admin" || profile?.email === "gardisonkirui11@gmail.com" || profile?.id === "42eca9a0-c070-4898-b830-46c3247ea71d" || profile?.id === "admin-1";

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const linkStyle = (path: string) => {
    return `flex items-center space-x-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
      isActive(path)
        ? "bg-primary-50 text-primary-800"
        : "text-stone-600 hover:text-primary-800 hover:bg-stone-100"
    }`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white shadow-md shadow-primary-600/10">
              <span className="font-sans text-xl font-black tracking-tighter">N</span>
            </div>
            <div>
              <span className="font-sans text-lg font-bold tracking-tight text-stone-900">
                Nest<span className="text-primary-600">list</span>
              </span>
              <span className="block text-[10px] font-medium text-stone-400 -mt-1 tracking-wider uppercase">
                Kenyan Rentals
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {profile && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/" className={linkStyle("/")}>
                <Home className="h-4 w-4" />
                <span>Browse</span>
              </Link>

              {profile.role === "tenant" && (
                <>
                  <Link to="/saved" className={linkStyle("/saved")}>
                    <Heart className="h-4 w-4 text-rose-500 fill-current" />
                    <span>Saved</span>
                  </Link>
                  <Link to="/alerts" className={linkStyle("/alerts")}>
                    <Bell className="h-4 w-4 text-primary-600" />
                    <span>Alerts</span>
                  </Link>
                </>
              )}

              {profile.role === "landlord" && (
                <Link to="/dashboard" className={linkStyle("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Landlord Hub</span>
                </Link>
              )}

              {profile?.role === "admin" && (
                <Link to="/admin" className={linkStyle("/admin")}>
                  <span>🔐 Admin Panel</span>
                </Link>
              )}
            </nav>
          )}

          {/* User Widget */}
          <div className="hidden md:flex items-center space-x-4">
            {profile ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-stone-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-800 leading-tight">
                    {profile.full_name}
                  </p>
                  <Link
                    to="/profile"
                    className="text-[10px] font-bold text-primary-600 hover:text-primary-700 hover:underline block text-right mt-0.5"
                  >
                    View Profile
                  </Link>
                </div>
                <Link to="/profile" title="View Profile">
                  {profile.avatar_url ? (
                    <img
                       src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-9 w-9 rounded-full object-cover border border-stone-200 shadow-sm hover:ring-2 hover:ring-primary-500 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 border border-stone-200 hover:border-primary-500 transition-all">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg hover:bg-stone-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && profile && (
        <div className="md:hidden border-b border-stone-200 bg-white rounded-b-2xl shadow-xl overflow-hidden animate-fade-in mx-4 my-2">
          {/* Header in menu: green gradient with NestList logo */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#0A4D2E] to-[#1E6B4A] text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#1E6B4A] font-bold text-sm shadow">
                N
              </div>
              <span className="font-sans font-bold tracking-tight text-white text-sm">
                Nestlist <span className="text-[10px] font-normal opacity-85 uppercase tracking-wide">Menu</span>
              </span>
            </div>
            {/* Role badge */}
            <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {profile.role}
            </span>
          </div>

          <div className="p-2 space-y-1">
            {profile.role === "landlord" ? (
              <>
                {/* My Listings */}
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between h-[48px] px-4 rounded-xl text-sm font-semibold transition-all ${
                    isActive("/dashboard") ? "bg-emerald-50 text-emerald-800" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">📋</span>
                    <span>My Listings ({counts.listings})</span>
                  </div>
                </Link>

                {/* Inquiries */}
                <Link
                  to="/dashboard?tab=inquiries"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between h-[48px] px-4 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">💬</span>
                    <span>Inquiries ({counts.inquiries})</span>
                  </div>
                  {counts.unreadInquiries > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {counts.unreadInquiries} new
                    </span>
                  )}
                </Link>

                {/* Payment History */}
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-all"
                >
                  <span className="text-base">💳</span>
                  <span>Payment History</span>
                </Link>

                {/* Account Settings */}
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-semibold transition-all ${
                    isActive("/profile") ? "bg-emerald-50 text-emerald-800" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span className="text-base">⚙️</span>
                  <span>Account Settings</span>
                </Link>
              </>
            ) : (
              <>
                {/* Tenant Menu */}
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-semibold transition-all ${
                    isActive("/") ? "bg-emerald-50 text-emerald-800" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Home className="h-5 w-5 text-stone-500" />
                  <span>Browse Rentals</span>
                </Link>

                <Link
                  to="/saved"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-semibold transition-all ${
                    isActive("/saved") ? "bg-emerald-50 text-emerald-800" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Heart className="h-5 w-5 text-rose-500" />
                  <span>Saved Rentals</span>
                </Link>

                <Link
                  to="/alerts"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-semibold transition-all ${
                    isActive("/alerts") ? "bg-emerald-50 text-emerald-800" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Bell className="h-5 w-5 text-primary-600" />
                  <span>Search Alerts</span>
                </Link>
              </>
            )}

            {profile.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-semibold transition-all ${
                  isActive("/admin") ? "bg-emerald-50 text-emerald-800" : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span>🔐</span>
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Dividers & Common sections */}
            <div className="border-t border-[#F3F4F6] my-2"></div>

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-all"
            >
              <span className="text-base">🏠</span>
              <span>Browse Rentals</span>
            </Link>

            <div className="border-t border-[#F3F4F6] my-2"></div>

            {/* User Info & Sign out */}
            <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl">
              <div className="flex items-center space-x-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-10 w-10 rounded-full object-cover border border-stone-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-stone-700 font-bold">
                    {profile.full_name?.charAt(0) || "U"}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-stone-400">
                    Logged in as
                  </p>
                  <p className="text-sm font-bold text-stone-800 leading-tight">
                    {profile.full_name}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="w-full flex items-center space-x-2.5 h-[48px] px-4 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <span className="text-base">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
