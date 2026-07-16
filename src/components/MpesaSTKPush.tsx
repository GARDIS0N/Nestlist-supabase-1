import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MpesaSTKPushProps {
  propertyId: string;
  propertyTitle: string;
  amount: number;
  landlordId: string;
  onSuccess: (receipt: string) => void;
  onFallback: () => void;
}

type STKPhase = 'idle' | 'loading' | 'waiting' | 'confirmed' | 'failed';

export function MpesaSTKPush({
  propertyId,
  propertyTitle,
  amount,
  landlordId,
  onSuccess,
  onFallback
}: MpesaSTKPushProps) {
  const [phase, setPhase] = useState<STKPhase>('idle');
  const [phone, setPhone] = useState("");
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [mpesaCode, setMpesaCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  
  const pollIntervalRef = useRef<any>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Format phone number to 254XXXXXXXXX style
  const cleanPhoneInput = (val: string) => {
    const numbers = val.replace(/[^0-9]/g, "");
    setPhone(numbers);
  };

  const getFormattedPhoneForAPI = () => {
    let p = phone.trim();
    if (p.startsWith("0")) {
      p = "254" + p.slice(1);
    } else if (p.startsWith("254")) {
      // already starts with country code
    } else if (p.length === 9) {
      p = "254" + p;
    }
    return p;
  };

  const isPhoneValid = () => {
    const formatted = getFormattedPhoneForAPI();
    return formatted.length === 12 && formatted.startsWith("254");
  };

  // Initiate STK Push
  const handleSendPrompt = async () => {
    if (!isPhoneValid()) {
      setError("Please enter a valid M-Pesa mobile number (e.g., 0712345678 or 254712345678)");
      return;
    }

    setError(null);
    setPhase('loading');

    const formattedPhone = getFormattedPhoneForAPI();

    try {
      const response = await fetch("/api/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          amount,
          propertyId,
          propertyTitle,
          landlordId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate M-Pesa prompt. Please try again.");
      }

      setCheckoutId(data.checkoutId);
      setCountdown(120);
      setPhase('waiting');
      startPolling(data.checkoutId);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please check your network or try manual payment.");
      setPhase('failed');
    }
  };

  // Start polling backend status
  const startPolling = (chkId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/mpesa/status?checkoutId=${chkId}`);
        const data = await response.json();

        if (data.status === 'confirmed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setMpesaCode(data.mpesaCode);
          setPhase('confirmed');
          onSuccess(data.mpesaCode);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError(data.failureReason || "Payment was failed or cancelled by user.");
          setPhase('failed');
        }
      } catch (err) {
        // Silently retry polling
        console.error("Error polling M-Pesa status:", err);
      }
    }, 3000);
  };

  // Manual verify check button
  const handleManualStatusCheck = async () => {
    if (!checkoutId) return;
    try {
      const response = await fetch(`/api/mpesa/status?checkoutId=${checkoutId}`);
      const data = await response.json();

      if (data.status === 'confirmed') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setMpesaCode(data.mpesaCode);
        setPhase('confirmed');
        onSuccess(data.mpesaCode);
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setError(data.failureReason || "Payment failed or was cancelled.");
        setPhase('failed');
      } else {
        // Still pending
        setError("We haven't received confirmation from Safaricom yet. Please wait a moment and try again if you have already entered your PIN.");
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      setError("Unable to connect. Please check your internet connection.");
    }
  };

  // Countdown clock inside WAITING state
  useEffect(() => {
    if (phase !== 'waiting') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError("The payment request timed out. Please try sending the prompt again or use manual payment.");
          setPhase('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div id="mpesa-stk-push-container" className="w-full bg-white rounded-2xl border border-[#E2EAE6] p-6 shadow-sm overflow-hidden text-[#0F1A14]">
      <AnimatePresence mode="wait">
        
        {/* IDLE STATE */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="text-center sm:text-left">
              <h3 className="font-serif text-lg font-bold text-[#0F1A14] flex items-center justify-center sm:justify-start gap-2">
                📱 Pay via M-Pesa STK Push
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Get an instant secure payment prompt directly on your Safaricom line.
              </p>
            </div>

            {/* Fee summary box */}
            <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0A4D2E]">Listing Activation Fee</p>
                <p className="text-[11px] text-stone-500 mt-0.5">30 days active · Goes live instantly</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-[#1E6B4A]">KES {amount}</span>
              </div>
            </div>

            {/* Error box */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            {/* Phone input */}
            <div className="space-y-1.5">
              <label htmlFor="stk-phone-input" className="block text-xs font-semibold text-stone-600">
                Your M-Pesa Phone Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-medium text-stone-400 select-none">
                  🇰🇪 +254
                </span>
                <input
                  id="stk-phone-input"
                  type="text"
                  maxLength={10}
                  placeholder="712 345 678"
                  value={phone.startsWith("254") ? phone.slice(3) : phone}
                  onChange={(e) => cleanPhoneInput(e.target.value)}
                  className="w-full pl-20 pr-4 py-3 bg-[#F8FAf9] border border-[#E2EAE6] rounded-xl text-sm font-medium focus:outline-none focus:border-[#1E6B4A] focus:bg-white transition"
                />
              </div>
              <p className="text-[10px] text-stone-400">
                Format: 07XXXXXXXX or 01XXXXXXXX (Safaricom M-Pesa lines only)
              </p>
            </div>

            {/* Benefits Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 bg-[#F8FAf9] border border-[#E2EAE6] px-2.5 py-1 rounded-lg text-[11px] text-[#2C523C] font-medium">
                ⚡ Instant activation
              </span>
              <span className="inline-flex items-center gap-1 bg-[#F8FAf9] border border-[#E2EAE6] px-2.5 py-1 rounded-lg text-[11px] text-[#2C523C] font-medium">
                🔒 Secure Safaricom API
              </span>
              <span className="inline-flex items-center gap-1 bg-[#F8FAf9] border border-[#E2EAE6] px-2.5 py-1 rounded-lg text-[11px] text-[#2C523C] font-medium">
                ✅ No manual codes
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSendPrompt}
                disabled={!phone}
                className="w-full py-3.5 bg-gradient-to-r from-[#1E6B4A] to-[#2D9E6B] text-white hover:brightness-95 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold shadow-md active:scale-[0.99] transition duration-150 flex items-center justify-center gap-2"
              >
                Send M-Pesa Prompt →
              </button>

              <button
                type="button"
                onClick={onFallback}
                className="w-full text-center py-2 text-[11px] font-semibold text-[#1E6B4A] hover:underline"
              >
                Pay manually via Paybill instead
              </button>
            </div>
          </motion.div>
        )}

        {/* LOADING STATE */}
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="w-12 h-12 border-4 border-[#1E6B4A]/20 border-t-[#1E6B4A] rounded-full animate-spin"></div>
            <div>
              <h4 className="text-sm font-bold text-[#0F1A14]">Connecting to Safaricom Daraja...</h4>
              <p className="text-xs text-stone-500 mt-1">Requesting payment prompt. Please keep your phone unlocked.</p>
            </div>
          </motion.div>
        )}

        {/* WAITING STATE */}
        {phase === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center space-y-5 py-2"
          >
            {/* Bouncing Phone Emoji Wrapper with Pulse Ring */}
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 bg-[#34D399]/10 rounded-full animate-ping"></div>
              <div className="absolute inset-2 bg-[#34D399]/20 rounded-full animate-pulse"></div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="text-5xl z-10"
              >
                📱
              </motion.div>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-[#0F1A14]">Check Your Phone!</h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-sm">
                We sent an automatic payment request to <strong className="text-stone-700">+{getFormattedPhoneForAPI()}</strong>.
              </p>
              <p className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1 rounded-full inline-block">
                Enter your M-Pesa PIN when prompted to pay KES {amount}
              </p>
            </div>

            {/* Countdown timer & progress bar */}
            <div className="w-full max-w-xs space-y-2 pt-2">
              <div className="flex justify-between text-[11px] font-semibold text-stone-500">
                <span>Waiting for M-Pesa confirmation</span>
                <span className={`transition-colors duration-300 font-mono ${countdown < 10 ? 'text-rose-600 animate-pulse font-bold' : countdown < 30 ? 'text-amber-500' : 'text-[#1E6B4A]'}`}>
                  {formatCountdown(countdown)}
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 linear ${countdown < 10 ? 'bg-rose-500' : countdown < 30 ? 'bg-amber-500' : 'bg-[#1E6B4A]'}`}
                  style={{ width: `${(countdown / 120) * 100}%` }}
                ></div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl max-w-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Help notes */}
            <div className="text-[10px] text-stone-400 max-w-xs">
              If you don't receive the prompt within 15 seconds, make sure your SIM card is active and unlocked, or use the check button below.
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
              <button
                type="button"
                onClick={handleManualStatusCheck}
                className="w-full py-2.5 border border-[#1E6B4A] text-[#1E6B4A] hover:bg-stone-50 rounded-xl text-xs font-semibold transition"
              >
                ✅ Check Payment Status
              </button>
              
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={handleSendPrompt}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[11px] font-semibold transition"
                >
                  🔄 Resend Prompt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setPhase('idle');
                    setError(null);
                  }}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-[11px] font-semibold transition"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* CONFIRMED STATE */}
        {phase === 'confirmed' && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center space-y-5 py-4"
          >
            {/* Pop-in Celebration Emoji with CSS Confetti falling */}
            <div className="relative flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-4xl"
              >
                🎉
              </motion.span>
              
              {/* CSS Confetti dots around */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#1E6B4A] animate-ping duration-1000"></div>
                <div className="absolute bottom-4 right-2 w-1.5 h-1.5 rounded-full bg-[#D97706] animate-ping duration-1500"></div>
                <div className="absolute top-8 right-6 w-2 h-2 rounded-full bg-[#3B82F6] animate-ping duration-700"></div>
                <div className="absolute bottom-2 left-6 w-1.5 h-1.5 rounded-full bg-[#34D399] animate-ping duration-2000"></div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#0F1A14]">Payment Confirmed!</h3>
              <p className="text-xs text-stone-500">
                Your listing is now fully verified and LIVE on NestList!
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-4 w-full text-left space-y-2">
              <div className="flex justify-between text-xs border-b border-[#A7F3D0]/40 pb-2">
                <span className="text-stone-500 font-medium">Receipt Code:</span>
                <span className="font-mono font-bold text-[#1E6B4A] uppercase select-all">{mpesaCode || "STK_AUTO"}</span>
              </div>
              <div className="flex justify-between text-xs pt-0.5">
                <span className="text-stone-500 font-medium">Amount Paid:</span>
                <span className="font-bold text-stone-800">KES {amount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 font-medium">Validity:</span>
                <span className="text-stone-700 font-medium">30 Days Active Listing</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 font-medium">Expires On:</span>
                <span className="text-stone-700 font-semibold">
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // Trigger the parent's success callback
                if (mpesaCode) onSuccess(mpesaCode);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-[#1E6B4A] to-[#2D9E6B] text-white hover:brightness-95 rounded-xl text-xs font-semibold shadow-md transition"
            >
              Continue to My Dashboard →
            </button>
          </motion.div>
        )}

        {/* FAILED STATE */}
        {phase === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center space-y-5 py-4"
          >
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 border border-rose-100">
              <span className="text-3xl">⚠️</span>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#0F1A14]">Payment Not Completed</h3>
              <p className="text-xs text-rose-700 max-w-sm leading-relaxed font-medium">
                {error || "We could not verify your M-Pesa transaction."}
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-[11px] text-stone-500 max-w-xs leading-relaxed">
              If you have already entered your PIN and paid, please try checking status again, otherwise you can select manual entry to paste your SMS receipt code.
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 w-full max-w-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPhase('idle');
                }}
                className="w-full py-3 bg-gradient-to-r from-[#1E6B4A] to-[#2D9E6B] text-white hover:brightness-95 rounded-xl text-xs font-semibold shadow-md transition"
              >
                🔄 Try STK Push Again
              </button>
              
              <button
                type="button"
                onClick={onFallback}
                className="w-full py-2.5 border border-[#E2EAE6] text-stone-700 hover:text-[#0A4D2E] hover:bg-stone-50 rounded-xl text-xs font-semibold transition"
              >
                📋 Paste SMS Receipt Code Manually
              </button>
            </div>

            <div className="text-[10px] text-stone-400">
              Need help? Contact support@nestlist.com or WhatsApp +254715185037
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
