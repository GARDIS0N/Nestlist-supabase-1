import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, setSupabaseConfig } from "../lib/supabase";
import { 
  Database, 
  Key, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal,
  FileText,
  Lock
} from "lucide-react";

export const SupabaseConfigPanel: React.FC = () => {
  const config = getSupabaseConfig();
  
  const [url, setUrl] = useState(config.isUsingStored ? config.url : "");
  const [anonKey, setAnonKey] = useState(config.isUsingStored ? config.anonKey : "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    migrationNeeded: boolean;
    message: string;
  } | null>(null);
  
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!config.isMock);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        migrationNeeded: false,
        message: "Please fill in both the Supabase URL and the Anon Public Key."
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const sanitizedUrl = url.trim();
      const sanitizedKey = anonKey.trim();

      // Create a temporary client to test the credentials
      const testClient = createClient(sanitizedUrl, sanitizedKey, {
        auth: { persistSession: false }
      });

      // Test 1: Try reading from public profiles table
      const { data: profileData, error: profileError } = await testClient
        .from("profiles")
        .select("id")
        .limit(1);

      if (profileError) {
        // Check if the error is "relation public.profiles does not exist"
        if (profileError.code === "PGRST116" || profileError.message?.includes("does not exist")) {
          setTestResult({
            success: true,
            migrationNeeded: true,
            message: "Connected to Supabase! However, the 'profiles' table was not found. You need to run the SQL migration script in your Supabase SQL Editor."
          });
          
          // Save anyway because credentials are valid, but note that migration is needed
          setSupabaseConfig(sanitizedUrl, sanitizedKey);
        } else {
          // Other API errors (like invalid key, wrong URL, etc.)
          throw profileError;
        }
      } else {
        // Table exists and query worked!
        setTestResult({
          success: true,
          migrationNeeded: false,
          message: "Excellent! Successfully connected to your live Supabase database. Reloading to apply..."
        });

        setSupabaseConfig(sanitizedUrl, sanitizedKey);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      console.error("Supabase test failed:", err);
      setTestResult({
        success: false,
        migrationNeeded: false,
        message: err.message || "Failed to connect. Please check your URL and Anon Key."
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    setSupabaseConfig("", "");
    setUrl("");
    setAnonKey("");
    setTestResult(null);
    window.location.reload();
  };

  const handleCopySql = () => {
    const sqlText = `-- Create Profiles table matching auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text CHECK (role IN ('landlord', 'tenant')) NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow select and update policies
CREATE POLICY select_profiles_policy ON public.profiles FOR SELECT USING (true);
CREATE POLICY insert_profiles_policy ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY update_profiles_policy ON public.profiles FOR UPDATE USING (auth.uid() = id);`;

    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-stone-50 border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
      
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 bg-white border-b border-stone-100 cursor-pointer select-none hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl ${config.isMock ? "bg-[#FEF3C7] text-[#92400E]" : "bg-emerald-50 text-emerald-600"}`}>
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-stone-900 font-sans">
                Supabase Database Connection
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                config.isMock 
                  ? "bg-gold-100 text-gold-800 border border-gold-200/30" 
                  : "bg-emerald-100/70 text-emerald-800"
              }`}>
                {config.isMock ? "Simulator Mode (Mock)" : "Live Connected"}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              {config.isMock 
                ? "Operating locally. Connect to a real Supabase DB to enable live persistent authentication."
                : `Connected to: ${config.url.replace(/^https?:\/\//, "").split(".")[0]}.supabase.co`
              }
            </p>
          </div>
        </div>
        <button className="text-xs font-bold text-primary-600 hover:text-primary-700 transition">
          {isExpanded ? "Collapse Settings" : "Configure Connection"}
        </button>
      </div>

      {/* Expanded Settings Content */}
      {isExpanded && (
        <div className="p-5 space-y-5 bg-white/50 border-t border-stone-100">
          
          {/* Main Info */}
          <div className="text-xs text-stone-600 leading-relaxed space-y-2">
            <p className="font-medium">
              Connecting a real Supabase instance enables fully active Supabase signups, email verification, database row level protection, and storage buckets for landlords and tenants across Kenya.
            </p>
          </div>

          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Project URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                  Supabase Project URL
                </label>
                <div className="relative">
                  <Database className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/10 focus:border-[#1E6B4A] text-xs sm:text-sm font-medium"
                    required
                    disabled={!config.isMock && config.isUsingStored}
                  />
                </div>
              </div>

              {/* Anon Public Key */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                  Anon Public Key (API Key)
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/10 focus:border-[#1E6B4A] text-xs sm:text-sm font-mono"
                    required
                    disabled={!config.isMock && config.isUsingStored}
                  />
                </div>
              </div>

            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start space-x-3 font-medium leading-relaxed ${
                testResult.success 
                  ? testResult.migrationNeeded 
                    ? "bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]" 
                    : "bg-emerald-50 border-emerald-200/80 text-emerald-800"
                  : "bg-red-50 border-red-200/80 text-red-800"
              }`}>
                {testResult.success ? (
                  testResult.migrationNeeded ? (
                    <AlertCircle className="h-5 w-5 text-[#D97706] shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  )
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div className="space-y-1">
                  <p>{testResult.message}</p>
                  {testResult.migrationNeeded && (
                    <button
                      type="button"
                      onClick={() => setShowSql(!showSql)}
                      className="text-xs font-bold text-[#92400E] underline hover:text-black transition block mt-1"
                    >
                      {showSql ? "Hide SQL Migration Instructions" : "View SQL Migration Instructions"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SQL Migration Script Box */}
            {showSql && (
              <div className="border border-[#FDE68A] bg-[#FEF3C7]/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#92400E] flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Quick Table Setup SQL
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center gap-1 py-1 px-2 bg-white rounded-lg border border-[#FDE68A] text-[11px] font-bold hover:bg-[#FEF3C7] transition text-[#92400E]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy SQL
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-bold underline text-[#92400E] inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="h-2.5 w-2.5" /></a>, select your project, go to the <strong>SQL Editor</strong> tab, click <strong>New Query</strong>, paste the copied code below, and click <strong>Run</strong>.
                </p>
                <pre className="text-[10px] font-mono bg-stone-900 text-stone-100 p-3 rounded-lg overflow-x-auto max-h-48 leading-relaxed">
{`-- Create Profiles table matching auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text CHECK (role IN ('landlord', 'tenant')) NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow select and update policies
CREATE POLICY select_profiles_policy ON public.profiles FOR SELECT USING (true);
CREATE POLICY insert_profiles_policy ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY update_profiles_policy ON public.profiles FOR UPDATE USING (auth.uid() = id);`}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              {config.isMock ? (
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-primary-600/10 hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" /> Save & Connect Real DB
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-3 w-full justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Real Supabase Connection Active</span>
                  </div>
                  {config.isUsingStored && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-xs font-bold rounded-xl border border-red-200 transition flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" /> Disconnect & Use Simulator
                    </button>
                  )}
                </div>
              )}
            </div>

          </form>

          {/* Quick Setup Instructions link */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span className="font-medium">Need help setting up Supabase?</span>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-0.5"
            >
              Go to Supabase Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </div>

        </div>
      )}

    </div>
  );
};
