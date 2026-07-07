import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Onboarding: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (profile.full_name && !fullName) {
        setFullName(profile.full_name);
      }
      if (profile.phone && !phone) {
        setPhone(profile.phone);
      }
    }
  }, [profile]);

  useEffect(() => {
    // If profile already has a role, redirect immediately
    if (profile?.role) {
      if (profile.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (profile.role === "landlord") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await updateProfile({ role, phone, full_name: fullName });
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      // After success, navigate to appropriate home page by role
      if (role === "landlord") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  };

  // Inline styles matching palette
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "24px",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    borderRadius: "20px",
    border: "1px solid #E2E5DF",
    padding: "40px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
    textAlign: "center",
    boxSizing: "border-box",
  };

  const logoStyle: React.CSSProperties = {
    fontSize: "36px",
    fontWeight: "800",
    color: "#1E6B4A",
    marginBottom: "12px",
    letterSpacing: "-0.04em",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1F2937",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  };

  const subStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#6B7280",
    margin: "0 0 30px 0",
  };

  const roleCardStyle = (selected: boolean): React.CSSProperties => ({
    border: selected ? "2px solid #1E6B4A" : "2px solid #E2E5DF",
    backgroundColor: selected ? "#F2F4F0" : "#FFFFFF",
    borderRadius: "12px",
    padding: "20px 16px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    flex: 1,
    outline: "none",
    boxSizing: "border-box",
  });

  const buttonStyle: React.CSSProperties = {
    backgroundColor: "#1E6B4A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    width: "100%",
    marginTop: "24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    opacity: loading ? 0.7 : 1,
    transition: "background-color 0.2s",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>Nestlist</div>
        <h1 style={headingStyle}>One last step</h1>
        <p style={subStyle}>Tell us how you will use Nestlist</p>

        {error && (
          <div
            style={{
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FEE2E2",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "14px",
              marginBottom: "20px",
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <button
              type="button"
              onClick={() => setRole("tenant")}
              style={roleCardStyle(role === "tenant")}
            >
              <span style={{ fontSize: "28px" }}>🔍</span>
              <span style={{ fontWeight: "700", color: "#1F2937", fontSize: "15px" }}>I'm a Tenant</span>
              <span style={{ fontSize: "12px", color: "#6B7280", textAlign: "center" }}>
                Looking for a place to rent
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole("landlord")}
              style={roleCardStyle(role === "landlord")}
            >
              <span style={{ fontSize: "28px" }}>🏠</span>
              <span style={{ fontWeight: "700", color: "#1F2937", fontSize: "15px" }}>I'm a Landlord</span>
              <span style={{ fontSize: "12px", color: "#6B7280", textAlign: "center" }}>
                I have property to list
              </span>
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#4B5563",
                marginBottom: "6px",
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #E2E5DF",
                borderRadius: "10px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#4B5563",
                marginBottom: "6px",
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #E2E5DF",
                borderRadius: "10px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Saving..." : `Continue as ${role === "tenant" ? "Tenant" : "Landlord"} →`}
          </button>
        </form>
      </div>
    </div>
  );
};
