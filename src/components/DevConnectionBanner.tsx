import { useState, useEffect } from "react";
import { isSupabaseConfigured, checkSupabaseConnection } from "../lib/supabase";

export function DevConnectionBanner() {
  const [status, setStatus] = useState<"checking" | "connected" | "mock" | "error">("checking");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!(import.meta as any).env?.DEV) return;

    if (!isSupabaseConfigured) {
      setStatus("mock");
      return;
    }

    checkSupabaseConnection().then((result) => {
      if (result.connected) {
        setStatus("connected");
      } else {
        setStatus("error");
        setErrorMsg(result.error || "Unknown error");
      }
    });
  }, []);

  // Only show in development
  if (!(import.meta as any).env?.DEV) return null;
  // Hide if connected successfully
  if (status === "connected") return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-xl p-3 text-xs font-medium shadow-lg max-w-xs ${
        status === "mock"
          ? "bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]"
          : status === "error"
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-stone-50 border border-stone-200 text-stone-600"
      }`}
    >
      {status === "checking" && "⏳ Checking Supabase..."}
      {status === "mock" && (
        <div>
          <div className="font-bold">⚠️ Mock Mode (Dev Only)</div>
          <div className="mt-1 text-[#92400E] font-sans">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env for real database connections.
          </div>
        </div>
      )}
      {status === "error" && (
        <div>
          <div className="font-bold">❌ Supabase Error</div>
          <div className="mt-1 font-sans">{errorMsg}</div>
        </div>
      )}
    </div>
  );
}
