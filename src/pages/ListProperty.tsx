import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { PhotoUpload } from "../components/PhotoUpload";
import { 
  MapPin, CheckSquare, Sparkles, Building, ChevronRight, ChevronLeft, 
  Loader2, ShieldCheck, Check, Clock, Phone, AlertTriangle, X, Hash, MessageSquare 
} from "lucide-react";

const COUNTIES = ["Nairobi", "Kiambu", "Mombasa", "Kisumu", "Nakuru"];

const TYPES = [
  { value: "single_room", label: "Single Room — KSh 100", fee: 100 },
  { value: "bedsitter", label: "Bedsitter — KSh 200", fee: 200 },
  { value: "studio", label: "Studio Apartment — KSh 250", fee: 250 },
  { value: "1br", label: "1 Bedroom — KSh 500", fee: 500 },
  { value: "2br", label: "2 Bedroom — KSh 700", fee: 700 },
  { value: "3br", label: "3 Bedroom — KSh 1000", fee: 1000 },
  { value: "4br", label: "4 Bedroom — KSh 1200", fee: 1200 },
  { value: "5br_plus", label: "5 Bedroom Executive — KSh 1500", fee: 1500 }
];

const POPULAR_ESTATES = ["Westlands", "Kilimani", "Karen", "Kasarani", "Ruaka", "Ngong Road", "Roysambu", "Lang'ata"];

const AMENITY_CATEGORIES = [
  {
    title: "💧 Water & Utilities",
    items: ["Water 24/7", "Borehole", "Backup Generator"]
  },
  {
    title: "🔒 Security",
    items: ["Security Guard", "CCTV", "Electric Fence"]
  },
  {
    title: "🏠 Property Features",
    items: ["Tiled Floors", "Servant Quarter", "Garden", "Balcony", "Furnished", "WiFi Ready", "DSTV Ready", "Parking"]
  },
  {
    title: "📍 Location Perks",
    items: ["Near Tarmac", "Near School", "Near Shopping Centre"]
  }
];

export const ListProperty: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Step Control
  const [step, setStep] = useState(1);

  // Property Form State
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [tempId] = useState(() => "temp-" + Math.random().toString(36).slice(2, 10));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("Nairobi");
  const [price, setPrice] = useState("");
  const [selectedType, setSelectedType] = useState("bedsitter");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Estate field autocomplete focus helper
  const [estateFocused, setEstateFocused] = useState(false);

  // Payment Processing State (Manual M-Pesa Verification Flow)
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending_verification" | "verified" | "rejected">("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Copy status
  const [copiedPaybill, setCopiedPaybill] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  useEffect(() => {
    // Check if resuming payment directly for an existing property
    const isResume = searchParams.get("resume_pay") === "true";
    const propId = searchParams.get("property_id");
    const pType = searchParams.get("type");

    if (isResume && propId && pType) {
      setPropertyId(propId);
      setSelectedType(pType);
      setStep(5); // Jump straight to payment step
    }

    if (profile?.phone) {
      setMpesaPhone(profile.phone);
    }
  }, [searchParams, profile]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!title || !locationName || !price || !selectedType) {
        alert("Please fill in all required fields.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const getListingFee = (typeKey: string) => {
    return TYPES.find(t => t.value === typeKey)?.fee || 100;
  };

  const getTypeNameLabel = (typeKey: string) => {
    const rawLabel = TYPES.find(t => t.value === typeKey)?.label || typeKey;
    return rawLabel.split(" — ")[0]; // Clean label for reviews / summaries (e.g. "Single Room")
  };

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleCopy = (text: string, type: "paybill" | "account") => {
    navigator.clipboard.writeText(text);
    if (type === "paybill") {
      setCopiedPaybill(true);
      setTimeout(() => setCopiedPaybill(false), 2000);
    } else {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  // Step 4 Completion -> Insert raw property first in draft status ('unpaid')
  const handleSavePropertyDraft = async () => {
    if (!profile) return;
    setPaying(true);

    try {
      if (!propertyId) {
        // Insert new property in active = false state
        const { data, error } = await supabase
          .from("properties")
          .insert({
            landlord_id: profile.id,
            title,
            description,
            location: locationName,
            county: selectedCounty,
            price: parseInt(price), // Fixed: Parse to integer as requested
            type: selectedType,
            amenities: selectedAmenities,
            images: uploadedImages,
            status: "available",
            is_active: false
          })
          .select()
          .single();

        if (error) throw error;
        setPropertyId(data.id);

        const { getSupabaseConfig } = await import("../lib/supabase");
        if (getSupabaseConfig().isMock) {
          try {
            await fetch("/api/mock/sync-property", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data)
            });
          } catch (syncErr) {
            console.warn("Backend mock sync failed:", syncErr);
          }
        }
      }
      setStep(5);
    } catch (err: any) {
      console.error("Draft listing creation failed:", err);
      alert(`Could not save listing: ${err.message}`);
    } finally {
      setPaying(false);
    }
  };

  // Step 5 Submit Manual Payment -> Direct Supabase Insertion and Verification
  const handleSubmitManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !propertyId || !mpesaCode) return;

    setPaying(true);
    setPaymentError(null);

    try {
      const cleanCode = mpesaCode.trim().toUpperCase();

      if (!/^[A-Z0-9]{8,12}$/.test(cleanCode)) {
        setPaymentError('Invalid M-Pesa code format. Example: UG42KAHXNA');
        setPaying(false);
        return;
      }

      const { data: duplicate } = await supabase
        .from('listing_payments')
        .select('id')
        .eq('mpesa_code', cleanCode)
        .maybeSingle();

      if (duplicate) {
        setPaymentError('This M-Pesa code has already been submitted.');
        setPaying(false);
        return;
      }

      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id, landlord_id, type, price')
        .eq('id', propertyId)
        .single();

      if (propError || !property) {
        setPaymentError('Property not found. Please go back and try again.');
        setPaying(false);
        return;
      }

      const expectedFee = getListingFee(property.type);

      const { error: paymentError } = await supabase
        .from('listing_payments')
        .insert({
          property_id: propertyId,
          landlord_id: property.landlord_id,
          amount: expectedFee,
          property_type: property.type,
          mpesa_code: cleanCode,
          mpesa_checkout_request_id: `MANUAL-${propertyId}-${cleanCode}`,
          amount_paid: expectedFee,
          payer_phone: mpesaPhone || null,
          status: 'pending',
        });

      if (paymentError) {
        if (paymentError.code === '23505') {
          setPaymentError('This M-Pesa code has already been submitted.');
        } else {
          setPaymentError('Could not submit payment: ' + paymentError.message);
        }
        setPaying(false);
        return;
      }

      setPaymentStatus("pending_verification");
    } catch (err: any) {
      console.error("Payment submission failed:", err);
      setPaymentError('Payment submission failed. Please check your connection.');
    } finally {
      setPaying(false);
    }
  };

  const totalSteps = 5;
  const stepLabels = ["Details", "Amenities", "Photos", "Review", "Pay"];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAF8] flex flex-col">
      
      {/* GLOBAL STEP PROGRESS INDICATOR CONTAINER */}
      <div className="bg-white border-b border-[#E2EAE6] sticky top-[64px] z-40 px-4 py-3 select-none">
        {/* Progress bar at top */}
        <div className="w-full max-w-[640px] mx-auto bg-[#E2EAE6] h-[3px] rounded-full overflow-hidden relative mb-3">
          <div
            className="h-full bg-gradient-to-r from-[#1E6B4A] to-[#34D399] transition-all duration-500 ease-out"
            style={{
              width: `${(step / totalSteps) * 100}%`,
              backgroundImage: "linear-gradient(to right, #1E6B4A, #34D399)"
            }}
          ></div>
        </div>

        {/* Step dots row below bar */}
        <div className="flex justify-between items-center max-w-[640px] mx-auto px-2">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const s = i + 1;
            const isCompleted = step > s;
            const isActive = step === s;
            return (
              <div key={s} className="flex flex-col items-center flex-1 relative">
                <div
                  className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#1E6B4A] text-white"
                      : isActive
                      ? "bg-[#1E6B4A] text-white ring-4 ring-[#1E6B4A]/10"
                      : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3.5]" />
                  ) : (
                    <span>{s}</span>
                  )}
                </div>
                <span
                  className={`text-[12px] mt-1 font-semibold tracking-tight transition-colors ${
                    isActive ? "text-[#1E6B4A] font-bold" : "text-stone-400"
                  }`}
                >
                  {stepLabels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full max-w-[640px] mx-auto px-4 py-6">

        {/* STEP 1: PROPERTY DETAILS */}
        {step === 1 && (
          <div 
            className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm space-y-5"
            style={{ minHeight: "350px" }}
          >
            <h2 
              style={{ fontFamily: "'DM Serif Display', serif" }}
              className="text-[20px] text-[#0F1A14] flex items-center gap-2.5"
            >
              <Building className="h-5.5 w-5.5 text-[#1E6B4A]" />
              <span>Step 1: Property Details</span>
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#4B5E54] block normal-case">
                  Listing Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spacious 2BR with parking in Kilimani"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ fontSize: "15px" }}
                  className="w-full border-[1.5px] border-[#E2EAE6] rounded-[10px] px-[14px] py-[12px] focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 outline-none transition bg-white"
                  required
                />
                <p className="text-[11px] text-stone-400 font-medium">
                  💡 Good titles include: type + location + key feature e.g. 'Spacious 2BR with parking in Kilimani'
                </p>
              </div>

              {/* Property Type Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#4B5E54] block normal-case">
                  Property Type *
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{ fontSize: "15px" }}
                  className="w-full border-[1.5px] border-[#E2EAE6] rounded-[10px] px-[14px] py-[12px] bg-white focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 outline-none transition"
                >
                  {TYPES.map((t, idx) => (
                    <option key={idx} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Fee Preview Banner (BELOW Property Type dropdown) */}
              <div className="bg-[#FEF3C7] border border-[#FDE68A] border-l-4 border-l-[#D97706] rounded-[10px] p-[12px] px-[14px] flex justify-between items-center animate-fade-in select-none">
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5 text-[13px]">
                    <span>📋</span> Listing Fee
                  </p>
                  <p className="text-[11px] text-amber-800">Your listing will be active for 30 days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#D97706] font-mono">KSh {getListingFee(selectedType)}</p>
                  <p className="text-stone-500 text-[11px] font-medium">One-time payment</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#4B5E54] block normal-case">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide directions, security features, water availability, and contact preferences..."
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setDescription(e.target.value);
                    }
                  }}
                  style={{ fontSize: "15px" }}
                  className="w-full border-[1.5px] border-[#E2EAE6] rounded-[10px] px-[14px] py-[12px] min-h-[100px] resize-vertical focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 outline-none transition bg-white"
                ></textarea>
                <div className="flex justify-between items-center text-[11px] font-medium">
                  <span className="text-stone-400">Provide details that help attract premium tenants.</span>
                  <span className={`transition-colors font-bold ${
                    description.length >= 500
                      ? "text-red-600"
                      : description.length >= 450
                      ? "text-orange-500"
                      : "text-stone-400"
                  }`}>
                    {description.length}/500 characters
                  </span>
                </div>
              </div>

              {/* Rent Price */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#4B5E54] block normal-case">
                  Monthly Rent (KSh) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{ fontSize: "15px" }}
                  className="w-full border-[1.5px] border-[#E2EAE6] rounded-[10px] px-[14px] py-[12px] focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 outline-none transition bg-white"
                  required
                />
              </div>

              {/* County & Specific Estate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#4B5E54] block normal-case">
                    County *
                  </label>
                  <select
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                    style={{ fontSize: "15px" }}
                    className="w-full border-[1.5px] border-[#E2EAE6] rounded-[10px] px-[14px] py-[12px] bg-white focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 outline-none transition"
                  >
                    {COUNTIES.map((c, idx) => (
                      <option key={idx} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#4B5E54] block normal-case">
                    Estate or Area *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="e.g. Roysambu, Behind TRM Mall"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      onFocus={() => setEstateFocused(true)}
                      onBlur={() => setTimeout(() => setEstateFocused(false), 200)} // Delay so click triggers
                      style={{ fontSize: "15px" }}
                      className="w-full pl-10 pr-4 py-[12px] border-[1.5px] border-[#E2EAE6] rounded-[10px] focus:border-[#1E6B4A] focus:ring-4 focus:ring-[#1E6B4A]/10 outline-none transition bg-white"
                      required
                    />
                  </div>

                  {/* Autocomplete Quick Tap Chips */}
                  {estateFocused && (
                    <div className="pt-1.5 flex flex-wrap gap-1.5 animate-fade-in select-none">
                      {POPULAR_ESTATES.map((est) => (
                        <button
                          key={est}
                          type="button"
                          onMouseDown={() => {
                            setLocationName(est);
                            setEstateFocused(false);
                          }}
                          className="text-[11px] font-bold bg-stone-100 hover:bg-[#F0FDF4] hover:text-[#065F46] border border-stone-200 hover:border-[#A7F3D0] text-stone-600 px-2.5 py-1 rounded-full transition active:scale-95"
                        >
                          + {est}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex gap-3 pt-5 border-t border-[#E2EAE6]">
              <button
                type="button"
                disabled
                className="px-5 py-[13px] border-[1.5px] border-[#E2EAE6] text-stone-300 rounded-[12px] font-bold text-sm cursor-not-allowed opacity-50 flex-shrink-0"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)",
                  boxShadow: "0 4px 16px rgba(30,107,74,0.3)"
                }}
                className="flex-1 text-center py-[14px] text-white rounded-[12px] font-bold text-[15px] flex items-center justify-center space-x-1 hover:opacity-95 transition active:scale-[0.99]"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: AMENITIES CHECKLIST */}
        {step === 2 && (
          <div 
            className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm space-y-5"
            style={{ minHeight: "350px" }}
          >
            <h2 
              style={{ fontFamily: "'DM Serif Display', serif" }}
              className="text-[20px] text-[#0F1A14] flex items-center gap-2.5"
            >
              <CheckSquare className="h-5.5 w-5.5 text-[#1E6B4A]" />
              <span>Step 2: Amenities Checklist</span>
            </h2>

            {/* Selected Count */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E2EAE6] select-none">
              <p className={`text-sm font-bold transition-colors ${selectedAmenities.length > 0 ? "text-[#1E6B4A]" : "text-stone-400"}`}>
                {selectedAmenities.length} {selectedAmenities.length === 1 ? "amenity" : "amenities"} selected
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-normal select-none">
              Check amenities provided at your rental property. Select accurate details to avoid negative reviews from visiting renters.
            </p>

            {/* Grouped Amenities with Custom Pill Chips */}
            <div className="space-y-4">
              {AMENITY_CATEGORIES.map((cat, catIdx) => (
                <div key={catIdx} className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase text-[#8A9E94] tracking-[0.08em] select-none">
                    {cat.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map((amenity, idx) => {
                      const isChecked = selectedAmenities.includes(amenity);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleAmenity(amenity)}
                          style={{
                            minHeight: "44px"
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 px-[14px] py-[9px] border-[1.5px] rounded-[24px] text-[13px] font-semibold transition cursor-pointer select-none active:scale-[0.97] ${
                            isChecked
                              ? "border-[#1E6B4A] bg-[#F0FDF4] text-[#065F46] font-bold"
                              : "border-[#E2EAE6] bg-white text-[#4B5E54] hover:bg-stone-50"
                          }`}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3] shrink-0" />}
                          <span>{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Tip for Landlords Banner */}
            <div className="bg-[#F0FDF4] rounded-[10px] p-[12px] border border-[#A7F3D0]/60 text-[13px] text-[#065F46] leading-normal flex items-start gap-2 select-none">
              <span className="text-base shrink-0">💡</span>
              <span><strong>Tip:</strong> Listings with more amenities get more inquiries from tenants. Select all that apply!</span>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex gap-3 pt-5 border-t border-[#E2EAE6]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-[13px] bg-white border-[1.5px] border-[#E2EAE6] text-[#4B5E54] rounded-[12px] font-bold text-sm hover:bg-stone-50 transition active:scale-[0.99] flex-shrink-0"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)",
                  boxShadow: "0 4px 16px rgba(30,107,74,0.3)"
                }}
                className="flex-1 text-center py-[14px] text-white rounded-[12px] font-bold text-[15px] flex items-center justify-center space-x-1 hover:opacity-95 transition active:scale-[0.99]"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROPERTY IMAGES */}
        {step === 3 && (
          <div 
            className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm space-y-5"
            style={{ minHeight: "350px" }}
          >
            <h2 
              style={{ fontFamily: "'DM Serif Display', serif" }}
              className="text-[20px] text-[#0F1A14] flex items-center gap-2.5"
            >
              <Sparkles className="h-5.5 w-5.5 text-[#1E6B4A]" />
              <span>Step 3: Property Images</span>
            </h2>

            {/* Guidelines Box Redesign */}
            <div className="bg-[#FEF3C7] border border-[#FDE68A] border-l-4 border-l-[#D97706] rounded-[12px] p-4 select-none">
              <div className="font-bold text-[#92400E] text-sm mb-1.5">
                📸 Photo Guidelines
              </div>
              <ul className="space-y-1 list-none font-semibold text-[13px] leading-[1.8]">
                <li className="text-[#065F46]">✅ Upload photos of the actual property</li>
                <li className="text-[#065F46]">✅ Show: living room, bedroom, kitchen, bathroom</li>
                <li className="text-[#065F46]">✅ Take photos in good lighting</li>
                <li className="text-[#DC2626]">❌ Do NOT upload flyers or posters</li>
                <li className="text-[#DC2626]">❌ Do NOT upload photos of people</li>
                <li className="text-[#DC2626]">❌ Do NOT upload screenshots or text images</li>
              </ul>
            </div>

            <PhotoUpload 
              propertyId={propertyId || tempId} 
              photos={uploadedImages} 
              onChange={(urls) => setUploadedImages(urls)} 
            />

            {/* Step Navigation Buttons */}
            <div className="flex gap-3 pt-5 border-t border-[#E2EAE6]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-[13px] bg-white border-[1.5px] border-[#E2EAE6] text-[#4B5E54] rounded-[12px] font-bold text-sm hover:bg-stone-50 transition active:scale-[0.99] flex-shrink-0"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)",
                  boxShadow: "0 4px 16px rgba(30,107,74,0.3)"
                }}
                className="flex-1 text-center py-[14px] text-white rounded-[12px] font-bold text-[15px] flex items-center justify-center space-x-1 hover:opacity-95 transition active:scale-[0.99]"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW SUMMARY */}
        {step === 4 && (
          <div 
            className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm space-y-5"
            style={{ minHeight: "350px" }}
          >
            <h2 
              style={{ fontFamily: "'DM Serif Display', serif" }}
              className="text-[20px] text-[#0F1A14] flex items-center gap-2.5"
            >
              <ShieldCheck className="h-5.5 w-5.5 text-[#1E6B4A]" />
              <span>Step 4: Review Summary</span>
            </h2>

            {/* EXPANDED REVIEW SUMMARY */}
            <div className="space-y-4">
              
              {/* PROPERTY DETAILS */}
              <div className="border border-[#E2EAE6] rounded-xl p-4 bg-white space-y-3 relative">
                <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Property Details</h3>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-xs text-[#1E6B4A] font-bold hover:underline"
                  >
                    Edit ✏️
                  </button>
                </div>
                <div className="space-y-2 text-sm text-stone-700">
                  <div>
                    <span className="text-stone-400 text-xs font-medium block">Title</span>
                    <strong className="text-stone-900 font-semibold">{title}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-stone-400 text-xs font-medium block">County & Estate</span>
                      <strong className="text-stone-800 font-semibold">{locationName}, {selectedCounty}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 text-xs font-medium block">Rent Cost</span>
                      <strong className="text-stone-900 font-bold font-mono">
                        KSh {parseInt(price).toLocaleString()} / Month
                      </strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-stone-400 text-xs font-medium block">Property Type</span>
                      <strong className="text-stone-800 font-semibold">{getTypeNameLabel(selectedType)}</strong>
                    </div>
                  </div>
                  {description && (
                    <div className="pt-1">
                      <span className="text-stone-400 text-xs font-medium block">Description</span>
                      <p className="text-stone-600 line-clamp-2 text-xs leading-relaxed italic">{description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AMENITIES SECTION */}
              <div className="border border-[#E2EAE6] rounded-xl p-4 bg-white space-y-2">
                <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Amenities</h3>
                  <button 
                    type="button" 
                    onClick={() => setStep(2)} 
                    className="text-xs text-[#1E6B4A] font-bold hover:underline"
                  >
                    Edit ✏️
                  </button>
                </div>
                {selectedAmenities.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedAmenities.map((am) => (
                      <span key={am} className="text-[11px] font-bold bg-[#F0FDF4] text-[#065F46] border border-[#A7F3D0]/60 px-2.5 py-1 rounded-full">
                        ✓ {am}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic py-1">No amenities selected</p>
                )}
              </div>

              {/* PHOTOS SECTION */}
              <div className="border border-[#E2EAE6] rounded-xl p-4 bg-white space-y-2">
                <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Photos</h3>
                  <button 
                    type="button" 
                    onClick={() => setStep(3)} 
                    className="text-xs text-[#1E6B4A] font-bold hover:underline"
                  >
                    Edit ✏️
                  </button>
                </div>
                {uploadedImages.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-[#1E6B4A] font-bold">{uploadedImages.length} photo(s) uploaded</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 select-none">
                      {uploadedImages.map((img, i) => (
                        <div key={i} className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 overflow-hidden relative">
                          <img src={img} alt="Thumbnail" className="h-full w-full object-cover" />
                          {i === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-[#1E6B4A] text-white text-[7px] font-bold text-center uppercase">
                              COVER
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 border border-[#FDE68A] p-3 rounded-lg text-xs text-[#92400E] font-medium leading-normal flex items-start gap-1.5 select-none">
                    <span>⚠️</span>
                    <span>No photos — listings without photos get fewer inquiries</span>
                  </div>
                )}
              </div>

              {/* LISTING FEE SECTION */}
              <div className="border border-[#FDE68A] rounded-xl p-4 bg-[#FEF3C7] space-y-1.5 relative select-none">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">NestList Listing Fee</h3>
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <p className="text-xs text-amber-800 font-semibold">Active Period: <strong>30 days</strong></p>
                    <p className="text-xs text-amber-800 font-semibold">Payment Method: <strong>M-Pesa Paybill</strong></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-mono font-black text-[#D97706]">KSh {getListingFee(selectedType)}</p>
                    <p className="text-[10px] text-amber-700/80 font-bold uppercase">Listing Activation Fee</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Message Banner */}
            <div className="bg-[#F0FDF4] rounded-[10px] p-[12px] text-[13px] text-[#065F46] font-medium leading-normal flex items-start gap-2 select-none">
              <span className="text-base shrink-0">✅</span>
              <span>Your listing will go <strong>LIVE</strong> within minutes of payment verification by our team.</span>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex gap-3 pt-5 border-t border-[#E2EAE6]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-[13px] bg-white border-[1.5px] border-[#E2EAE6] text-[#4B5E54] rounded-[12px] font-bold text-sm hover:bg-stone-50 transition active:scale-[0.99] flex-shrink-0"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSavePropertyDraft}
                disabled={paying}
                style={{
                  background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)",
                  boxShadow: "0 4px 16px rgba(30,107,74,0.3)"
                }}
                className="flex-1 text-center py-[14px] text-white rounded-[12px] font-bold text-[15px] flex items-center justify-center space-x-1 hover:opacity-95 transition active:scale-[0.99] disabled:opacity-50"
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-1" />
                ) : (
                  <>
                    <span>Save & Proceed to Pay</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: M-PESA PAYMENT (MANUAL VERIFICATION) */}
        {step === 5 && (
          <div 
            className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm space-y-5 relative overflow-hidden"
            style={{ minHeight: "350px" }}
          >
            {/* Top gold aesthetic light */}
            <div className="absolute top-0 right-0 h-32 w-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {paymentStatus === "verified" ? (
              /* CONGRATULATIONS / VERIFIED PAGE */
              <div className="text-center py-6 space-y-5 animate-fade-in select-none">
                <div className="mx-auto h-16 w-16 bg-[#F0FDF4] text-emerald-600 border-2 border-emerald-300 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-9 w-9 stroke-[3.5]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-950 font-sans">Listing Activated!</h2>
                  <p className="text-stone-600 text-sm leading-relaxed max-w-sm mx-auto">
                    Hongera! We verified your manual payment of <span className="font-bold text-[#1E6B4A]">KSh {getListingFee(selectedType)}</span>. Your property listing is now live on NestList and alert subscribers have been notified!
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => navigate("/dashboard")}
                    style={{
                      background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)",
                      boxShadow: "0 4px 16px rgba(30,107,74,0.3)"
                    }}
                    className="w-full sm:w-auto py-3 px-6 text-white font-bold text-sm rounded-xl transition hover:opacity-95"
                  >
                    Landlord Dashboard
                  </button>
                  <button
                    onClick={() => navigate(`/property/${propertyId}`)}
                    className="w-full sm:w-auto py-3 px-6 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition"
                  >
                    View Listing
                  </button>
                </div>
              </div>
            ) : paymentStatus === "pending_verification" ? (
              /* PENDING REVIEW PAGE */
              <div className="text-center py-6 space-y-5 animate-fade-in select-none">
                <div className="mx-auto h-16 w-16 bg-[#FEF3C7] text-[#D97706] border-2 border-[#FDE68A] rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <Clock className="h-9 w-9 stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-950 font-sans">Verification in Progress</h2>
                  <p className="text-stone-600 text-sm leading-relaxed max-w-sm mx-auto">
                    Your payment submission is received! Our administrators are manually cross-referencing your code <span className="font-mono font-bold text-stone-950 bg-stone-100 px-1.5 py-0.5 rounded">{mpesaCode.toUpperCase()}</span>.
                  </p>
                  
                  <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-4 text-xs text-emerald-950 font-medium max-w-md mx-auto mt-4 space-y-2 text-left">
                    <p className="text-sm font-bold text-[#065F46]">
                      ✅ Payment submitted! Your listing will go live within 1 hour once our team verifies your M-Pesa payment.
                    </p>
                    <hr className="border-emerald-100" />
                    <p className="text-stone-700 font-semibold">✓ Code Submitted: {mpesaCode.toUpperCase()}</p>
                    <p className="text-stone-700 font-semibold">✓ Amount to Verify: KSh {getListingFee(selectedType)}</p>
                    <p className="text-stone-500 font-normal pt-1">
                      Manual verification takes between 15 to 30 minutes during normal business hours (8am-8pm). Your listing will automatically go live once approved!
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => navigate("/dashboard")}
                    style={{
                      background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)"
                    }}
                    className="py-3 px-6 text-white font-bold text-sm rounded-xl shadow transition hover:opacity-95"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            ) : paymentStatus === "rejected" ? (
              /* REJECTED STATE */
              <div className="text-center py-6 space-y-5 animate-fade-in select-none">
                <div className="mx-auto h-16 w-16 bg-red-50 text-red-600 border-2 border-red-300 rounded-full flex items-center justify-center shadow-lg">
                  <X className="h-9 w-9" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-950 font-sans">Verification Rejected</h2>
                  <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                    Our administrators could not verify your manual transaction code.
                  </p>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-800 font-medium max-w-md mx-auto">
                    <p className="font-bold">Reason for rejection:</p>
                    <p className="text-stone-600 font-normal mt-1">
                      The provided transaction reference code is incorrect or could not be found on our statement.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setPaymentStatus("idle");
                      setMpesaCode("");
                    }}
                    style={{
                      background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)"
                    }}
                    className="py-3 px-6 text-white font-bold text-sm rounded-xl shadow transition hover:opacity-95"
                  >
                    Re-submit Confirmation Code
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE MANUAL PAYMENT SUBMISSION BOX */
              <div className="space-y-6">
                
                {/* IMPROVED HEADER WITH M-PESA GREEN/GOLD GRADIENT */}
                <div 
                  style={{
                    background: "linear-gradient(135deg, #0A4D2E, #1E6B4A)"
                  }}
                  className="rounded-xl p-4.5 text-white flex justify-between items-center shadow-md select-none"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl shrink-0">📱</span>
                    <div>
                      <h2 className="text-[18px] font-bold text-white leading-tight">Pay via M-Pesa</h2>
                      <p className="text-white/70 text-[13px] font-medium mt-0.5">Lipa Na M-Pesa Paybill</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] font-mono font-black text-white">KSh {getListingFee(selectedType)}</p>
                    <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider">Listing Fee</p>
                  </div>
                </div>

                {/* COPYABLE PAYBILL & ACCOUNT BOXES */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Paybill Box */}
                  <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-3 flex justify-between items-center select-none">
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">PAYBILL NUMBER</p>
                      <p className="text-2xl font-mono font-black text-[#1E6B4A]">247247</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy("247247", "paybill")}
                      style={{
                        background: "#1E6B4A"
                      }}
                      className="px-2.5 py-1.5 text-white rounded-lg text-[12px] font-bold hover:opacity-90 transition active:scale-95 shrink-0 ml-1.5"
                    >
                      {copiedPaybill ? "Copied! ✓" : "📋 Copy"}
                    </button>
                  </div>

                  {/* Account Box */}
                  <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-3 flex justify-between items-center select-none">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">ACCOUNT NUMBER</p>
                      <p className="text-lg font-mono font-extrabold text-stone-950 truncate">0715185037</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy("0715185037", "account")}
                      style={{
                        background: "#1E6B4A"
                      }}
                      className="px-2.5 py-1.5 text-white rounded-lg text-[12px] font-bold hover:opacity-90 transition active:scale-95 shrink-0 ml-1.5"
                    >
                      {copiedAccount ? "Copied! ✓" : "📋 Copy"}
                    </button>
                  </div>

                </div>

                {/* NUMBERED STEP CARDS WITH GREEN AND GOLD HIGHLIGHTS */}
                <div className="space-y-1 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h3 className="text-stone-900 font-extrabold text-xs uppercase tracking-wider mb-2.5">M-Pesa Payment Steps:</h3>
                  
                  <div className="space-y-3">
                    
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 pb-2.5 border-b border-[#F0FDF4]">
                      <div className="w-7 h-7 bg-[#1E6B4A] text-white font-extrabold text-[13px] rounded-full flex items-center justify-center shrink-0">
                        1
                      </div>
                      <p className="text-[14px] text-stone-700 leading-normal">
                        Go to your M-Pesa menu and select <strong className="text-stone-900">Lipa na M-Pesa</strong>.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3 pb-2.5 border-b border-[#F0FDF4]">
                      <div className="w-7 h-7 bg-[#1E6B4A] text-white font-extrabold text-[13px] rounded-full flex items-center justify-center shrink-0">
                        2
                      </div>
                      <p className="text-[14px] text-stone-700 leading-normal">
                        Select <strong className="text-stone-900">Paybill</strong> and enter Business Number <strong className="text-[#1E6B4A] font-bold">247247</strong>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3 pb-2.5 border-b border-[#F0FDF4]">
                      <div className="w-7 h-7 bg-[#1E6B4A] text-white font-extrabold text-[13px] rounded-full flex items-center justify-center shrink-0">
                        3
                      </div>
                      <p className="text-[14px] text-stone-700 leading-normal">
                        Enter Account Number <strong className="text-[#1E6B4A] font-bold">0715185037</strong>.
                      </p>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-3 pb-2.5 border-b border-[#F0FDF4]">
                      <div className="w-7 h-7 bg-[#1E6B4A] text-white font-extrabold text-[13px] rounded-full flex items-center justify-center shrink-0">
                        4
                      </div>
                      <p className="text-[14px] text-stone-700 leading-normal">
                        Enter the exact amount of <strong className="text-[#D97706] font-bold">KSh {getListingFee(selectedType)}</strong>.
                      </p>
                    </div>

                    {/* Step 5 */}
                    <div className="flex items-start gap-3 pb-1">
                      <div className="w-7 h-7 bg-[#1E6B4A] text-white font-extrabold text-[13px] rounded-full flex items-center justify-center shrink-0">
                        5
                      </div>
                      <p className="text-[14px] text-stone-700 leading-normal">
                        Complete payment and enter the 10-character transaction code below to submit.
                      </p>
                    </div>

                  </div>
                </div>

                {/* MANUAL PAYMENT SUBMISSION FORM */}
                <form onSubmit={handleSubmitManualPayment} className="space-y-5">
                  {paymentError && (
                    <div className="p-4 bg-red-50 text-red-800 border border-red-150 rounded-xl text-xs sm:text-sm font-medium flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{paymentError}</p>
                    </div>
                  )}

                  {/* Confirmation Code Input with Auto-uppercase & Checkmark */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                        M-PESA CONFIRMATION CODE
                      </label>
                      <span className="text-[11px] text-stone-400 font-semibold">{mpesaCode.length}/10</span>
                    </div>
                    
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-[15px] h-4.5 w-4.5 text-stone-400" />
                      <input
                        type="text"
                        value={mpesaCode.toUpperCase()}
                        onChange={(e) => setMpesaCode(e.target.value.slice(0, 12))}
                        placeholder="e.g. QBG582Y78X"
                        style={{ letterSpacing: "2px" }}
                        className="w-full pl-10 pr-10 py-3.5 border-2 border-[#E2EAE6] rounded-xl text-lg font-mono uppercase focus:outline-none focus:border-[#1E6B4A] transition"
                        required
                      />
                      {mpesaCode.length >= 10 && (
                        <div className="absolute right-3.5 top-3 bg-[#F0FDF4] text-emerald-600 rounded-full p-1 border border-emerald-300">
                          <Check className="h-4 w-4 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400">
                      From your Safaricom SMS e.g. QBG582Y78X
                    </p>
                  </div>

                  {/* Sender Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      SENDER PHONE NUMBER (OPTIONAL)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="e.g. 0715185037"
                        className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <p className="text-[11px] text-stone-400">
                      The Safaricom number that initiated the Paybill payment to help verify.
                    </p>
                  </div>

                  {/* RE-DESIGNED SUBMIT PAYMENT CONFIRMATION CODE BUTTON (DARK GREEN GRADIENT) */}
                  <button
                    type="submit"
                    disabled={paying || !mpesaCode}
                    style={{
                      background: "linear-gradient(135deg, #1E6B4A, #2D9E6B)",
                      boxShadow: "0 4px 16px rgba(30,107,74,0.3)"
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-[14px] px-4 text-white font-bold text-[15px] rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paying ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>✓ Submit Payment Confirmation Code</span>
                      </>
                    )}
                  </button>

                  {/* COMPONENT 2 — Terms Footer Banner */}
                  <p className="text-[11px] text-stone-500 leading-normal text-center select-none">
                    By submitting this payment you confirm you have read and agree to NestList's{" "}
                    <Link to="/terms" target="_blank" className="text-[#1E6B4A] hover:underline font-bold">
                      Terms of Service
                    </Link>{" "}
                    and that the M-Pesa code is genuine.
                  </p>

                  {/* Reassurance Message Banner */}
                  <div className="bg-[#F0FDF4] rounded-[10px] p-3 text-[13px] text-[#065F46] leading-normal flex items-start gap-1.5 select-none">
                    <span>⚡</span>
                    <span>Listings are typically verified within <strong>30 minutes</strong> during business hours (8am-8pm). You'll receive an SMS confirmation when live.</span>
                  </div>

                  {/* Fraud Warning Banner */}
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-2.5 text-[12px] text-[#991B1B] leading-normal flex items-start gap-1.5 select-none">
                    <span>⚠️</span>
                    <span><strong>NestList will NEVER ask for your M-Pesa PIN.</strong> Only submit the confirmation code from your SMS.</span>
                  </div>
                </form>

                {/* WhatsApp Support Link */}
                <div className="text-center pt-2 select-none border-t border-stone-100">
                  <p className="text-xs text-stone-400">Need help? Contact us on WhatsApp</p>
                  <a 
                    href="https://wa.me/254715185037" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-[#1E6B4A] font-bold hover:underline"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>📞 +254715185037</span>
                  </a>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
