import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ChevronRight, X, Phone, ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';
import { BOOST_TIERS } from '../lib/constants';

interface BoostListingProps {
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  currentPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BoostListing({
  propertyId,
  landlordId,
  propertyTitle,
  currentPhone = '',
  onClose,
  onSuccess
}: BoostListingProps) {
  const [selectedTier, setSelectedTier] = useState<keyof typeof BOOST_TIERS>('7day');
  const [paymentMethod, setPaymentMethod] = useState<'stk_push' | 'manual'>('stk_push');
  const [phone, setPhone] = useState(currentPhone);
  const [mpesaCode, setMpesaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'pricing' | 'payment' | 'polling' | 'success'>('pricing');
  const [checkoutId, setCheckoutId] = useState('');
  const [boostId, setBoostId] = useState('');
  const [pollAttempts, setPollAttempts] = useState(0);

  const tierInfo = BOOST_TIERS[selectedTier];

  // Helper to format phone to 254XXXXXXXXX
  const formatPhoneForApi = (p: string) => {
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1);
    } else if (clean.startsWith('7') || clean.startsWith('1')) {
      clean = '254' + clean;
    }
    return clean;
  };

  const handleInitiatePayment = async () => {
    setLoading(true);
    setError(null);

    const formattedPhone = formatPhoneForApi(phone);
    if (paymentMethod === 'stk_push' && (!phone || formattedPhone.length !== 12)) {
      setError('Please enter a valid M-Pesa phone number (e.g., 0712345678)');
      setLoading(false);
      return;
    }

    if (paymentMethod === 'manual' && (!mpesaCode || mpesaCode.trim().length < 8)) {
      setError('Please enter a valid M-Pesa transaction code (minimum 8 characters)');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/boost/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          landlordId,
          boostTier: selectedTier,
          amount: tierInfo.price,
          paymentMethod,
          mpesaCode: paymentMethod === 'manual' ? mpesaCode.toUpperCase().trim() : undefined,
          phone: paymentMethod === 'stk_push' ? formattedPhone : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      if (paymentMethod === 'stk_push') {
        setCheckoutId(data.checkoutId);
        setBoostId(data.boostId);
        setStep('polling');
        setPollAttempts(0);
      } else {
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment');
    } finally {
      setLoading(false);
    }
  };

  // Poll for STK push status
  useEffect(() => {
    if (step !== 'polling' || !boostId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/boost/status?boostId=${boostId}`);
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.status === 'active') {
            clearInterval(interval);
            setStep('success');
          } else if (data.status === 'cancelled' || data.status === 'failed') {
            clearInterval(interval);
            setError('Payment was cancelled or failed on your phone.');
            setStep('payment');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      setPollAttempts(prev => {
        if (prev >= 12) { // 12 attempts * 5s = 60s timeout
          clearInterval(interval);
          setError('We have not received payment confirmation yet. If you completed the transaction, our admin will verify it shortly.');
          setStep('payment');
        }
        return prev + 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [step, boostId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="boost_modal">
      <div className="relative w-full max-w-xl overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Boost Listing</h2>
              <p className="text-xs text-slate-500 mt-0.5">{propertyTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'pricing' && (
            <div className="space-y-6">
              <div className="text-sm text-slate-600 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                ⭐ <strong className="text-emerald-900">Why boost?</strong> Boosted properties show up at the very top of tenant searches, carry premium badges, and generate up to 5x more inquiry leads!
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(BOOST_TIERS).map(([key, value]) => {
                  const isSelected = selectedTier === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedTier(key as keyof typeof BOOST_TIERS)}
                      className={`relative flex flex-col justify-between p-4 text-left rounded-xl border-2 transition-all ${
                        isSelected 
                          ? 'border-emerald-600 bg-emerald-50/20 shadow-xs' 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      {(value as any).popular && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100 rounded-full uppercase tracking-wider">
                          Popular
                        </span>
                      )}
                      {(value as any).bestValue && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold text-purple-800 bg-purple-100 rounded-full uppercase tracking-wider">
                          Best Value
                        </span>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{value.label}</div>
                        <div className="inline-flex mt-1.5 px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 rounded-md">
                          {value.badge}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Price:</span>
                        <span className="text-lg font-bold text-slate-950">KES {value.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep('payment')}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-md transition-colors"
              >
                <span>Proceed to Payment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl">
                  ⚠️ {error}
                </div>
              )}

              {/* Order Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Selected Package</div>
                  <div className="text-sm font-semibold text-slate-900">{tierInfo.label} ({tierInfo.days} Days)</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase">Amount Due</div>
                  <div className="text-base font-bold text-emerald-700">KES {tierInfo.price}</div>
                </div>
              </div>

              {/* Method Switcher */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => { setPaymentMethod('stk_push'); setError(null); }}
                  className={`flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                    paymentMethod === 'stk_push' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>STK Push (Instant)</span>
                </button>
                <button
                  onClick={() => { setPaymentMethod('manual'); setError(null); }}
                  className={`flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                    paymentMethod === 'manual' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Manual Paybill</span>
                </button>
              </div>

              {paymentMethod === 'stk_push' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      We will send an M-Pesa STK push menu to this phone requesting KES {tierInfo.price}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">How to pay manually:</h4>
                  <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside">
                    <li>Go to <strong className="text-slate-800">M-Pesa</strong> menu on your phone</li>
                    <li>Select <strong className="text-slate-800">Lipa na M-Pesa</strong> &gt; <strong className="text-slate-800">Paybill</strong></li>
                    <li>Enter Business No: <strong className="text-slate-950 font-bold">400200</strong> (Co-op)</li>
                    <li>Enter Account No: <strong className="text-slate-950 font-bold">123456</strong> (NestList)</li>
                    <li>Enter Amount: <strong className="text-slate-950 font-bold">KES {tierInfo.price}</strong></li>
                    <li>Enter your M-Pesa PIN &amp; complete payment</li>
                  </ol>

                  <div className="pt-3 border-t border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Enter M-Pesa Transaction Code
                    </label>
                    <input
                      type="text"
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value)}
                      placeholder="e.g. RHF7X9W28B"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase font-mono tracking-widest placeholder:normal-case placeholder:tracking-normal"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('pricing')}
                  className="w-1/3 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleInitiatePayment}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <span>{paymentMethod === 'stk_push' ? 'Send STK Push' : 'Submit Code'}</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'polling' && (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Smartphone className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">M-Pesa STK Menu Sent</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                  Please check your phone and enter your M-Pesa PIN to authorize KES {tierInfo.price} payment.
                </p>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Waiting for confirmation... ({pollAttempts * 5}s)</span>
              </div>
              <button
                onClick={() => setStep('payment')}
                className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
              >
                Cancel or choose another method
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="p-3.5 bg-emerald-100 text-emerald-800 rounded-full">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Boost Activated!</h3>
                <p className="text-sm text-slate-600 max-w-sm mx-auto mt-1">
                  {paymentMethod === 'stk_push' 
                    ? `Congratulations! Your listing is now actively boosted with the "${tierInfo.badge}" badge.`
                    : 'Payment submitted! Our team is verifying your manual payment. Once verified, your boost will go live.'}
                </p>
              </div>
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
              >
                Go back to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-center space-x-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secure payments processed via Safaricom M-Pesa API</span>
        </div>
      </div>
    </div>
  );
}
