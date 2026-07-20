import React, { useState, useEffect } from 'react';
import { Key, Check, ChevronRight, X, Phone, ShieldCheck, RefreshCw, Smartphone, Award, Sparkles } from 'lucide-react';
import { LEAD_PRICES, LEAD_BUNDLES } from '../lib/constants';

interface UnlockLeadProps {
  inquiryId?: string; // Optional if they just want to buy a bundle
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  propertyType: string;
  leadCredits?: number;
  currentPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnlockLead({
  inquiryId,
  propertyId,
  landlordId,
  propertyTitle,
  propertyType,
  leadCredits = 0,
  currentPhone = '',
  onClose,
  onSuccess
}: UnlockLeadProps) {
  const [purchaseType, setPurchaseType] = useState<'single' | 'bundle'>('single');
  const [paymentMethod, setPaymentMethod] = useState<'stk_push' | 'manual' | 'credit'>('stk_push');
  const [phone, setPhone] = useState(currentPhone);
  const [mpesaCode, setMpesaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'options' | 'payment' | 'polling' | 'success'>('options');
  const [checkoutId, setCheckoutId] = useState('');
  const [unlockId, setUnlockId] = useState('');
  const [pollAttempts, setPollAttempts] = useState(0);

  const singlePrice = LEAD_PRICES[propertyType] || 50;
  const bundleInfo = LEAD_BUNDLES[propertyType] || { count: 5, price: 200, saving: 20 };
  
  const currentPrice = purchaseType === 'single' ? singlePrice : bundleInfo.price;

  useEffect(() => {
    // If they have credits and are unlocking a single inquiry, default to credit payment method
    if (leadCredits > 0 && inquiryId && step === 'options') {
      setPaymentMethod('credit');
    }
  }, [leadCredits, inquiryId, step]);

  const formatPhoneForApi = (p: string) => {
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1);
    } else if (clean.startsWith('7') || clean.startsWith('1')) {
      clean = '254' + clean;
    }
    return clean;
  };

  const handleProcessUnlock = async () => {
    setLoading(true);
    setError(null);

    const activeMethod = paymentMethod;

    if (activeMethod === 'stk_push') {
      const formattedPhone = formatPhoneForApi(phone);
      if (!phone || formattedPhone.length !== 12) {
        setError('Please enter a valid M-Pesa phone number (e.g., 0712345678)');
        setLoading(false);
        return;
      }
    }

    if (activeMethod === 'manual') {
      if (!mpesaCode || mpesaCode.trim().length < 8) {
        setError('Please enter a valid M-Pesa transaction code (minimum 8 characters)');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/leads/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: purchaseType === 'single' ? inquiryId : undefined,
          propertyId,
          landlordId,
          amount: activeMethod === 'credit' ? 0 : currentPrice,
          paymentMethod: activeMethod,
          mpesaCode: activeMethod === 'manual' ? mpesaCode.toUpperCase().trim() : undefined,
          bundleSize: purchaseType === 'bundle' ? 5 : 1,
          phone: activeMethod === 'stk_push' ? formatPhoneForApi(phone) : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (activeMethod === 'credit') {
        setStep('success');
      } else if (activeMethod === 'stk_push') {
        setCheckoutId(data.checkoutId);
        setUnlockId(data.unlockId);
        setStep('polling');
        setPollAttempts(0);
      } else {
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred processing unlock request');
    } finally {
      setLoading(false);
    }
  };

  // Poll for STK push status
  useEffect(() => {
    if (step !== 'polling' || !unlockId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/leads/unlock/status?unlockId=${unlockId}`);
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.status === 'confirmed') {
            clearInterval(interval);
            setStep('success');
          } else if (data.status === 'failed' || data.status === 'cancelled') {
            clearInterval(interval);
            setError('Payment failed on your phone.');
            setStep('payment');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      setPollAttempts(prev => {
        if (prev >= 12) {
          clearInterval(interval);
          setError('We are still waiting for M-Pesa. If you paid, our admin will verify the transaction shortly.');
          setStep('payment');
        }
        return prev + 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [step, unlockId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="unlock_lead_modal">
      <div className="relative w-full max-w-xl overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Unlock Tenant Contact</h2>
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
          {step === 'options' && (
            <div className="space-y-6">
              {/* Credit check header */}
              {leadCredits > 0 && inquiryId ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3.5">
                  <div className="flex items-start space-x-3">
                    <Award className="w-5 h-5 text-amber-700 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Use Available Credits</h4>
                      <p className="text-xs text-amber-800/80 mt-0.5">
                        You have <strong className="text-amber-950">{leadCredits} credits</strong> left. Use 1 credit to unlock this tenant contact instantly.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPurchaseType('single');
                      setPaymentMethod('credit');
                      handleProcessUnlock();
                    }}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>Unlock Using 1 Credit (KES 0)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>You have <strong className="text-slate-800">0 credits</strong>. Choose a purchase method below to unlock.</span>
                </div>
              )}

              {/* Purchase Options */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Unlock Options</h3>
                
                {/* Single Lead Option */}
                {inquiryId && (
                  <button
                    onClick={() => {
                      setPurchaseType('single');
                      setPaymentMethod('stk_push');
                      setStep('payment');
                    }}
                    className={`w-full p-4 text-left border-2 rounded-xl transition-all flex justify-between items-center ${
                      purchaseType === 'single' && paymentMethod !== 'credit'
                        ? 'border-emerald-600 bg-emerald-50/10'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Unlock This Lead Only</h4>
                      <p className="text-xs text-slate-500 mt-1">Get immediate access to this tenant's phone and email.</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-950">KES {singlePrice}</div>
                      <div className="text-[10px] text-slate-400">Single unlock</div>
                    </div>
                  </button>
                )}

                {/* Bundle Option */}
                <button
                  onClick={() => {
                    setPurchaseType('bundle');
                    setPaymentMethod('stk_push');
                    setStep('payment');
                  }}
                  className={`w-full p-4 text-left border-2 rounded-xl transition-all flex justify-between items-center ${
                    purchaseType === 'bundle'
                      ? 'border-emerald-600 bg-emerald-50/10'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900">Buy 5-Lead Bundle</h4>
                      {bundleInfo.saving > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 rounded-md">
                          Save {bundleInfo.saving}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Adds 5 credits to your property. Spend them whenever you receive a lead.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-700">KES {bundleInfo.price}</div>
                    <div className="text-[10px] text-slate-400">KES {bundleInfo.price / 5} per lead</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl">
                  ⚠️ {error}
                </div>
              )}

              {/* Order Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Selected Option</div>
                  <div className="text-sm font-bold text-slate-900">
                    {purchaseType === 'single' ? 'Single Inquiry Unlock' : '5 Lead Credit Bundle'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase">Amount Due</div>
                  <div className="text-base font-extrabold text-emerald-700">KES {currentPrice}</div>
                </div>
              </div>

              {/* Method Selector */}
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
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      We will prompt this phone for a pin popup request of KES {currentPrice}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">How to pay manually:</h4>
                  <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                    <li>Go to M-Pesa Paybill</li>
                    <li>Enter Business No: <strong className="text-slate-950 font-bold">400200</strong></li>
                    <li>Enter Account No: <strong className="text-slate-950 font-bold">123456</strong></li>
                    <li>Enter Amount: <strong className="text-slate-950 font-bold">KES {currentPrice}</strong></li>
                    <li>Enter transaction code below once completed</li>
                  </ol>

                  <div className="pt-3 border-t border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Enter M-Pesa Code
                    </label>
                    <input
                      type="text"
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value)}
                      placeholder="e.g. REG4H9W28K"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden uppercase font-mono tracking-widest placeholder:normal-case placeholder:tracking-normal"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('options')}
                  className="w-1/3 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleProcessUnlock}
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
                  Please check your phone and enter your M-Pesa PIN to complete payment of KES {currentPrice}.
                </p>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Waiting for confirmation... ({pollAttempts * 5}s)</span>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="p-3.5 bg-emerald-100 text-emerald-800 rounded-full">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Success!</h3>
                <p className="text-sm text-slate-600 max-w-sm mx-auto mt-1">
                  {paymentMethod === 'credit' 
                    ? '1 credit has been deducted. Lead unmasked successfully!'
                    : paymentMethod === 'stk_push'
                      ? 'Congratulations! Lead unlocked successfully. You can now view the tenant contact details.'
                      : 'Payment code submitted! Our team is verifying your payment. Once verified, the lead will be unlocked.'}
                </p>
              </div>
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
              >
                Close and View Lead
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
