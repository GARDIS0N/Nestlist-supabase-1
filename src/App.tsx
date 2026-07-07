import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";

// Pages
import { Browse } from "./pages/Browse";
import { PropertyDetail } from "./pages/PropertyDetail";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Onboarding } from "./pages/Onboarding";
import { SavedProperties } from "./pages/SavedProperties";
import { SearchAlerts } from "./pages/SearchAlerts";
import { LandlordDashboard } from "./pages/LandlordDashboard";
import { ListProperty } from "./pages/ListProperty";
import { AdminPanel } from "./pages/Admin";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { Profile } from "./pages/Profile";
import AuthCallback from "./pages/AuthCallback";
import { DevConnectionBanner } from "./components/DevConnectionBanner";
import { CookieBanner } from "./components/CookieBanner";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
          {/* Main Application Navigation Header */}
          <Header />

          {/* Page Routing Views */}
          <main className="flex-grow">
            <Routes>
              {/* Public Guest Only Pages (Redirects authenticated users based on their role) */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />

              {/* Onboarding View (requires session, no role required yet) */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              {/* OAuth Callback Redirect handling */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Protected Access Hubs */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Browse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/property/:id"
                element={
                  <ProtectedRoute>
                    <PropertyDetail />
                  </ProtectedRoute>
                }
              />

              {/* Tenant Reserved Pages */}
              <Route
                path="/saved"
                element={
                  <ProtectedRoute role="tenant">
                    <SavedProperties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute role="tenant">
                    <SearchAlerts />
                  </ProtectedRoute>
                }
              />

              {/* Landlord Reserved Pages */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute role="landlord">
                    <LandlordDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/list-property"
                element={
                  <ProtectedRoute role="landlord">
                    <ListProperty />
                  </ProtectedRoute>
                }
              />

              {/* Administrative Oversight Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />

              {/* User Profile (Tenants, Landlords, Admins) */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Publicly Accessible Privacy Policy */}
              <Route
                path="/privacy"
                element={
                  <Privacy />
                }
              />

              {/* Publicly Accessible Terms of Service */}
              <Route
                path="/terms"
                element={
                  <Terms />
                }
              />

              {/* Wildcard Fallback redirects unauthenticated/invalid routes to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>

          {/* Humble Branding Footer */}
          <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 text-xs py-8 text-center mt-12">
            <div className="max-w-7xl mx-auto px-4 space-y-2">
              <p className="font-bold text-white">Nestlist Rental Platforms Limited</p>
              <p className="text-white/60">
                Connecting Landlords and Tenants across Nairobi, Kiambu, Nakuru, Kisumu, and Mombasa.
              </p>
              <div className="flex justify-center space-x-4 text-white/60 text-[11px] font-medium pt-1">
                <Link to="/privacy" className="text-[#34D399] hover:text-white hover:underline transition">Privacy Policy</Link>
                <span>·</span>
                <Link to="/terms" className="text-[#34D399] hover:text-white hover:underline transition">Terms of Service</Link>
                <span>·</span>
                <span className="text-[#34D399] hover:text-[#34D399] select-all">Support: support@nestlist.com</span>
              </div>
              <p className="text-[10.5px] text-white/40 pt-1">
                © 2026 Nestlist Rental Platforms Limited · Nairobi, Kenya · Secure payments via M-Pesa
              </p>
            </div>
          </footer>
          <CookieBanner />
          <DevConnectionBanner />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
