import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Check, ArrowRight, Key, Coins, ShieldCheck, HeartHandshake, Info } from "lucide-react";

export const Pricing: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 py-12 sm:py-20 px-4">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header section with NestList branding style */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F0FDF4] border border-emerald-100 rounded-full text-xs font-semibold text-emerald-800">
            <Coins className="h-3.5 w-3.5" />
            Flexible landlord monetization
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-none">
            Simple, transparent <span className="text-emerald-700">monetization</span>.
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-medium">
            Choose the model that fits your listing strategy. Pay only for what you need with secure automated M-Pesa STK Push payments.
          </p>
        </div>

        {/* The Two Core Models (Flat Fee vs Pay Per Lead) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: Flat-Fee Listing */}
          <div className="bg-white border-2 border-stone-150 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs transition hover:shadow-md relative overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-stone-900">Standard Flat-Fee</h3>
                  <p className="text-xs text-stone-500 mt-1">Unlimited free lead inquiries</p>
                </div>
                <div className="px-3 py-1 bg-stone-100 text-stone-800 text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Traditional
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 py-2 border-b border-stone-100">
                <span className="text-3xl sm:text-4xl font-black font-mono text-stone-900">KES 1,000</span>
                <span className="text-xs font-bold text-stone-400">/ 60 days</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black text-stone-400 uppercase tracking-wider">What's included</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-stone-600 font-medium">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Property listed active for up to 60 consecutive days</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>**Unlimited Tenant Leads**: Receive all calls & messages completely free</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Full Live Chat console access to reply directly via free SMS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Basic photo and video upload support</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <Link
                to="/list-property"
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
              >
                <span>List a Property</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Pay-Per-Lead */}
          <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs transition hover:shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-xl shadow-xs">
              ★ Highly Recommended
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-stone-900">Zero Up-Front (Pay Per Lead)</h3>
                  <p className="text-xs text-emerald-700 mt-1 font-bold">List for free, unlock verified inquiries</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 py-2 border-b border-stone-100">
                <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-700">KES 0</span>
                <span className="text-xs font-bold text-stone-400">upfront cost</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black text-stone-400 uppercase tracking-wider">How it works</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-stone-600 font-medium">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>**Free Listing**: List your rentals with zero payment up-front</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Pay only for leads you wish to contact (KES 50 for Single/Bedsitter, KES 100 for 1+ Bedroom)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Unlocks include direct phone calls and SMS numbers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Buy Credit Bundles to **save up to 20%** on future unlocks</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 space-y-2.5">
              <Link
                to="/list-property"
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1 shadow-md shadow-emerald-700/10"
              >
                <span>List Free Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-[10px] text-stone-400 text-center font-medium">
                Tenant experiences remain 100% free with masked details until landlord unlocks.
              </p>
            </div>
          </div>

        </div>

        {/* Lead Credit Bundles section */}
        <div className="bg-[#F5F5F4] border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-1.5">
                <Key className="h-4 w-4 text-emerald-700" />
                Landlord Lead Credit Bundles (5 Unlocks)
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                Save on tenant acquisition by purchasing unlock bundles in advance through your landlord dashboard.
              </p>
            </div>
            <div className="px-3 py-1 bg-amber-150 border border-amber-200 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-wider self-start sm:self-center">
              🔥 Up to 20% Savings
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex justify-between items-center shadow-xs">
              <div>
                <p className="text-xs font-bold text-stone-800">Single Rooms</p>
                <p className="text-[10px] text-stone-400">Regular: KES 25 each</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-stone-900">KES 100</p>
                <p className="text-[9px] font-black text-emerald-700 uppercase">Save 20%</p>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 flex justify-between items-center shadow-xs">
              <div>
                <p className="text-xs font-bold text-stone-800">Bedsitters</p>
                <p className="text-[10px] text-stone-400">Regular: KES 50 each</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-stone-900">KES 200</p>
                <p className="text-[9px] font-black text-emerald-700 uppercase">Save 20%</p>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 flex justify-between items-center shadow-xs">
              <div>
                <p className="text-xs font-bold text-stone-800">1 Bedroom</p>
                <p className="text-[10px] text-stone-400">Regular: KES 120 each</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-stone-900">KES 500</p>
                <p className="text-[9px] font-black text-emerald-700 uppercase">Save 17%</p>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 flex justify-between items-center shadow-xs">
              <div>
                <p className="text-xs font-bold text-stone-800">2 Bedroom</p>
                <p className="text-[10px] text-stone-400">Regular: KES 160 each</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-stone-900">KES 700</p>
                <p className="text-[9px] font-black text-emerald-700 uppercase">Save 13%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Boosting Plans section */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">⚡ Boost Listings with Premium Packages</h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto font-medium">
              Landlords on either plan can boost listings to pin them to the top of results, adding distinctive featured badges to maximize visibility.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Tier 1: 3-day */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-500 font-mono">3 Days</div>
                <h4 className="text-sm font-bold text-stone-900">⚡ Featured Boost</h4>
                <p className="text-[11px] text-stone-400">Perfect for quick rentals</p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-stone-500">Price:</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">KES 50</span>
              </div>
            </div>

            {/* Tier 2: 7-day */}
            <div className="bg-white border-2 border-emerald-600/20 rounded-xl p-4 flex flex-col justify-between shadow-xs relative">
              <div className="absolute -top-2 right-2 px-1.5 py-0.5 bg-emerald-700 text-[8px] text-white font-black rounded uppercase tracking-wider">
                Popular
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-500 font-mono">7 Days</div>
                <h4 className="text-sm font-bold text-stone-900">⭐ Popular Boost</h4>
                <p className="text-[11px] text-stone-400">Weekly featured placement</p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-stone-500">Price:</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">KES 100</span>
              </div>
            </div>

            {/* Tier 3: 14-day */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-500 font-mono">14 Days</div>
                <h4 className="text-sm font-bold text-stone-900">🔥 Hot Property</h4>
                <p className="text-[11px] text-stone-400">Mid-term premium focus</p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-stone-500">Price:</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">KES 200</span>
              </div>
            </div>

            {/* Tier 4: 30-day */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-500 font-mono">30 Days</div>
                <h4 className="text-sm font-bold text-stone-900">👑 Premium Plus</h4>
                <p className="text-[11px] text-stone-400">Monthly premier slot</p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-stone-500">Price:</span>
                <span className="text-base font-extrabold text-[#7C3AED] font-mono">KES 350</span>
              </div>
            </div>

          </div>
        </div>

        {/* Security & Support Guarantee */}
        <div className="border-t border-stone-200 pt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="space-y-2">
            <div className="mx-auto md:mx-0 h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-extrabold text-stone-900">Secure M-Pesa Checkout</h4>
            <p className="text-xs text-stone-500 font-medium">
              Payments are fully secured via standard automated M-Pesa STK Push. No cash transactions, no fraud.
            </p>
          </div>

          <div className="space-y-2">
            <div className="mx-auto md:mx-0 h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-extrabold text-stone-900">100% Verified Tenants</h4>
            <p className="text-xs text-stone-500 font-medium">
              Tenant SMS inquiries are rate-limited and identity verified to prevent spam and waste.
            </p>
          </div>

          <div className="space-y-2">
            <div className="mx-auto md:mx-0 h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Info className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-extrabold text-stone-900">Dedicated Support</h4>
            <p className="text-xs text-stone-500 font-medium">
              Need assistance? Email our support desk directly at <span className="font-semibold text-stone-800">support@nestlist.com</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
