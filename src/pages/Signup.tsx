import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff } from "lucide-react";

export const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "", color: "transparent", width: "0%" };
    if (pwd.length < 5) return { label: "Weak", color: "#DC2626", width: "25%" };
    if (pwd.length < 8) return { label: "Fair", color: "#D97706", width: "50%" };
    const hasNumbers = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (hasNumbers && hasSpecial) return { label: "Strong", color: "#1E6B4A", width: "100%" };
    return { label: "Good", color: "#F59E0B", width: "75%" };
  };

  const strength = getPasswordStrength(password);

  const isFormValid =
    fullName.trim() !== "" &&
    phone.trim() !== "" &&
    email.trim() !== "" &&
    password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
      } else {
        setError("Please fill in all fields.");
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          email: email.trim().toLowerCase(),
          role: role || 'tenant',
          is_active: true,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
        navigate('/onboarding');
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setError('Google sign in failed. Please try again.');
      setLoading(false);
    }
    // No need to handle success — Supabase redirects automatically
  };

  // Styles based on requested design rules
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAF8",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "24px",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    borderRadius: "20px",
    border: "1px solid #E2EAE6",
    padding: "40px",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "0 10px 30px rgba(15,26,20,0.04)",
    textAlign: "center",
    boxSizing: "border-box",
  };

  const logoStyle: React.CSSProperties = {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "16px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0F1A14",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  };

  const loginLinkStyle: React.CSSProperties = {
    color: "#D97706",
    fontSize: "14px",
    fontWeight: "700",
    textDecoration: "none",
  };

  const roleCardStyle = (selected: boolean): React.CSSProperties => ({
    border: selected ? "2px solid #1E6B4A" : "2px solid #E2EAE6",
    backgroundColor: selected ? "#F0FDF4" : "#FFFFFF",
    borderRadius: "12px",
    padding: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    flex: 1,
    outline: "none",
    fontWeight: "700",
    fontSize: "14px",
    color: "#0F1A14",
    boxSizing: "border-box",
    boxShadow: selected ? "0 0 0 3px rgba(30,107,74,0.1)" : "none",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#4B5E54",
    marginBottom: "6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #E2EAE6",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const buttonStyle: React.CSSProperties = {
    background: isFormValid ? "linear-gradient(135deg,#1E6B4A,#2D9E6B)" : "#D1D5DB",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "12px",
    padding: "14px 20px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: !isFormValid || loading ? "not-allowed" : "pointer",
    width: "100%",
    marginTop: "16px",
    opacity: loading ? 0.7 : 1,
    transition: "all 0.2s",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "inherit",
    boxShadow: isFormValid ? "0 4px 16px rgba(30,107,74,0.25)" : "none",
  };

  if (isSuccess) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>
            <div style={{ display: "flex", height: "36px", width: "36px", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "linear-gradient(135deg,#1E6B4A,#34D399)", color: "white", boxShadow: "0 8px 24px rgba(30,107,74,0.3)" }}>
              <span style={{ fontSize: "18px", fontWeight: "950" }}>N</span>
            </div>
            <span style={{ color: "#0F1A14", fontWeight: "800", fontSize: "24px", letterSpacing: "-0.03em" }}>Nest<span style={{ color: "#1E6B4A" }}>list</span></span>
          </div>
          <h1 style={{ ...headingStyle, color: "#1E6B4A", marginBottom: "16px" }}>Account created!</h1>
          <p style={{ fontSize: "15px", color: "#4B5E54", lineHeight: "1.6", marginBottom: "32px" }}>
            We sent a confirmation to <strong style={{ color: "#0F1A14" }}>{email}</strong>. <br />
            Click the link in the email to verify your account.
          </p>
          <Link to="/login" style={buttonStyle} className="hover:brightness-95 active:scale-95 duration-150">
            Already confirmed? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle} className="animate-fade-in">
        <Link to="/" style={logoStyle}>
          <div style={{ display: "flex", height: "36px", width: "36px", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "linear-gradient(135deg,#1E6B4A,#34D399)", color: "white", boxShadow: "0 8px 24px rgba(30,107,74,0.3)" }} className="animate-float">
            <span style={{ fontSize: "18px", fontWeight: "950" }}>N</span>
          </div>
          <span style={{ color: "#0F1A14", fontWeight: "800", fontSize: "24px", letterSpacing: "-0.03em" }}>Nest<span style={{ color: "#1E6B4A" }}>list</span></span>
        </Link>
        <h1 style={headingStyle}>Create account</h1>
        <div style={{ marginBottom: "24px" }}>
          <span style={{ fontSize: "14px", color: "#4B5E54" }}>Already have one? </span>
          <Link to="/login" style={loginLinkStyle}>Sign in →</Link>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FECACA",
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
          {/* Google Sign-up Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#fff',
              color: '#374151',
              border: '1.5px solid #E2E5DF',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'border-color .15s',
              marginBottom: '16px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Sign up with Google
          </button>

          <div style={{ 
            display: 'flex', alignItems: 'center', 
            gap: 10, marginBottom: '20px' 
          }}>
            <div style={{ flex: 1, height: 1, background: '#E2E5DF' }} />
            <span style={{ fontSize: 12, color: '#6B7280' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#E2E5DF' }} />
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Who are you?</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setRole("tenant")}
                style={roleCardStyle(role === "tenant")}
              >
                <span>Tenant 🔍</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("landlord")}
                style={roleCardStyle(role === "landlord")}
              >
                <span>Landlord 🏠</span>
              </button>
            </div>
          </div>

          {/* Name and Phone side-by-side */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Peter Kamau"
                required
                style={inputStyle}
                className="focus:border-[#1E6B4A] focus:ring-2 focus:ring-[#1E6B4A]/10 transition"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0712345678"
                required
                style={inputStyle}
                className="focus:border-[#1E6B4A] focus:ring-2 focus:ring-[#1E6B4A]/10 transition"
              />
            </div>
          </div>

          {/* Email input */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="you@example.com"
              required
              style={inputStyle}
              className="focus:border-[#1E6B4A] focus:ring-2 focus:ring-[#1E6B4A]/10 transition"
            />
          </div>

          {/* Password input with toggle and strength indicator */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Password (min 8 chars)</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                required
                style={{ ...inputStyle, paddingRight: "44px" }}
                className="focus:border-[#1E6B4A] focus:ring-2 focus:ring-[#1E6B4A]/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#8A9E94",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength meter */}
            {password && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContents: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#4B5E54" }}>Password Strength:</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: strength.color }}>{strength.label}</span>
                </div>
                <div style={{ width: "100%", height: "5px", backgroundColor: "#E2EAE6", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ width: strength.width, height: "100%", backgroundColor: strength.color, transition: "width 0.3s ease" }} />
                </div>
                {password.length < 8 && (
                  <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px", display: "block" }}>
                    Password is too short (needs at least 8 characters)
                  </span>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={!isFormValid || loading} style={buttonStyle} className="hover:brightness-95 active:scale-95 duration-150">
            {loading ? "Creating..." : `Create ${role === "tenant" ? "Tenant" : "Landlord"} account →`}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#4B5E54", lineHeight: "1.5" }}>
          By creating an account you agree to our{" "}
          <Link to="#" style={{ color: "#4B5E54", fontWeight: "600", textDecoration: "underline" }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" style={{ color: "#1E6B4A", fontWeight: "750", textDecoration: "underline" }}>
            Privacy Policy
          </Link>.
        </div>
      </div>
    </div>
  );
};
