import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: "landlord" | "tenant" | "admin";
}

const spinStyle = `
  @keyframes nestlistSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Shared Loading Spinner
const LoadingSpinner: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#FFFFFF",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{spinStyle}</style>
      <div
        style={{
          fontSize: "36px",
          fontWeight: "800",
          color: "#1E6B4A",
          marginBottom: "20px",
          letterSpacing: "-0.04em",
        }}
      >
        Nestlist
      </div>
      <div
        style={{
          width: "44px",
          height: "44px",
          border: "4px solid #E2E5DF",
          borderTop: "4px solid #1E6B4A",
          borderRadius: "50%",
          animation: "nestlistSpin 0.9s linear infinite",
        }}
      />
    </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  // 1. If loading is TRUE -> show a centered loading spinner with the Nestlist logo
  if (loading) {
    return <LoadingSpinner />;
  }

  // 2. If no session -> redirect to /login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If session but no profile.role -> redirect to /onboarding
  if (!profile || !profile.role) {
    // If we are already on onboarding, let it render to avoid infinite loops
    if (location.pathname === "/onboarding") {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  // If a specific role is required
  if (role) {
    // Admin can access everything — never redirect admin
    if (profile.role === 'admin') {
      return <>{children}</>;
    }
    // Other roles must match exactly
    if (profile.role !== role) {
      const home = profile.role === 'landlord' ? '/dashboard' : '/';
      return <Navigate to={home} replace />;
    }
  }

  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  // 1. If loading -> show same spinner
  if (loading) {
    return <LoadingSpinner />;
  }

  // 2. If session AND profile.role exists -> redirect to role home
  if (session && profile?.role) {
    const destination = location.state?.from || (
      profile.role === "admin" ? "/admin" :
      profile.role === "landlord" ? "/dashboard" : "/"
    );
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
