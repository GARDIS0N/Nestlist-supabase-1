import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already accepted cookie consent
    const consent = localStorage.getItem("nestlist-cookie-consent");
    if (consent !== "accepted") {
      // Small delay to make the entrance smooth
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("nestlist-cookie-consent", "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] py-4 px-6 z-50 animate-fade-in"
      id="nestlist-cookie-banner"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-stone-700 text-sm font-sans text-center md:text-left">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-full shrink-0 hidden sm:block">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p>
            NestList uses essential cookies to keep you logged in and ensure secure payment checkouts. By continuing to browse our platform, you agree to our{" "}
            <Link 
              to="/privacy" 
              className="text-emerald-700 font-semibold hover:text-emerald-800 underline hover:no-underline transition"
            >
              Privacy Policy
            </Link>.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleAccept}
            className="bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-sans font-medium text-xs py-2 px-5 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
            id="cookie-consent-accept-btn"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
