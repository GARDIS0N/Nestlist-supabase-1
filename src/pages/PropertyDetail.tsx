import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { MapPin, Phone, MessageSquare, ChevronLeft, ChevronRight, Check, Heart, Mail, ShieldCheck, ArrowLeft, Loader2, Send } from "lucide-react";

export const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<any | null>(null);
  const [landlord, setLandlord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Carousel State
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Inquiry Modal State
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [tenantPhone, setTenantPhone] = useState("");

  useEffect(() => {
    if (profile?.phone) {
      setTenantPhone(profile.phone);
    }
  }, [profile]);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!id) return;
      setLoading(true);

      try {
        // Fetch property row
        const { data: propData, error: propError } = await supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (propError) throw propError;

        if (propData) {
          setProperty(propData);

          // Fetch landlord profile
          const { data: landlordData, error: landError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", propData.landlord_id)
            .maybeSingle();

          if (landError) throw landError;
          setLandlord(landlordData);

          // Check if saved by current tenant
          if (profile && profile.role === "tenant") {
            const { data: savedData } = await supabase
              .from("saved_properties")
              .select("*")
              .eq("tenant_id", profile.id)
              .eq("property_id", id)
              .maybeSingle();

            setIsSaved(!!savedData);
          }
        }
      } catch (err) {
        console.error("Error loading property details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [id, profile]);

  const handleToggleSave = async () => {
    if (!profile) {
      navigate("/login");
      return;
    }
    if (profile.role !== "tenant") {
      alert("Only tenant accounts can save properties.");
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from("saved_properties")
          .delete()
          .eq("tenant_id", profile.id)
          .eq("property_id", property.id);
        setIsSaved(false);
      } else {
        await supabase
          .from("saved_properties")
          .insert({
            tenant_id: profile.id,
            property_id: property.id,
          });
        setIsSaved(true);
      }
    } catch (err: any) {
      console.error("Error saving property:", err);
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      navigate("/login");
      return;
    }
    if (!inquiryMessage.trim()) return;

    const activePhone = profile.phone || tenantPhone;
    if (!activePhone) {
      alert("Please provide a valid phone number before submitting.");
      return;
    }

    setSendingInquiry(true);

    try {
      // 1. If tenant has no phone stored in profile, save it now
      if (!profile.phone) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ phone: activePhone })
          .eq("id", profile.id);

        if (updateError) throw updateError;
        
        if (typeof updateProfile === "function") {
          await updateProfile({ phone: activePhone });
        }
      }

      // 2. Insert new inquiry row
      const { error } = await supabase
        .from("inquiries")
        .insert({
          property_id: property.id,
          tenant_id: profile.id,
          landlord_id: property.landlord_id,
          message: inquiryMessage,
          status: "pending",
        });

      if (error) throw error;

      // 3. Notify landlord via SMS
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            type: "inquiry_sent",
            phone: landlord?.phone,
            data: {
              tenant_name: profile.full_name || "A tenant",
              property_title: property.title,
              tenant_phone: activePhone,
              message: inquiryMessage.substring(0, 80),
            }
          }
        });
      } catch (smsErr) {
        console.warn("SMS notification failed (non-blocking):", smsErr);
      }

      setInquirySuccess(true);
      setInquiryMessage("");
    } catch (err: any) {
      console.error("Inquiry submission failed:", err);
      alert(`Could not send inquiry: ${err.message}`);
    } finally {
      setSendingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
          <p className="text-stone-500 font-medium text-sm">Loading rental details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-stone-900">Property Not Found</h2>
        <p className="text-stone-500 mt-2">The listing you are trying to view has expired, been deactivated or deleted.</p>
        <Link to="/" className="mt-6 inline-flex items-center space-x-1.5 py-2 px-4 bg-primary-600 text-white rounded-lg text-sm font-semibold shadow">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Browse</span>
        </Link>
      </div>
    );
  }

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getPropertyTypeLabel = (typeKey: string) => {
    const typesMap: Record<string, string> = {
      single_room: "Single Room",
      bedsitter: "Bedsitter",
      studio: "Studio",
      "1br": "1 Bedroom Apartment",
      "2br": "2 Bedroom Apartment",
      "3br": "3 Bedroom Apartment",
      "4br": "4 Bedroom Apartment",
      "5br_plus": "5 Bedroom Executive House"
    };
    return typesMap[typeKey] || typeKey;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back to Browse */}
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center space-x-1 text-sm font-semibold text-stone-500 hover:text-stone-900">
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Listings</span>
        </Link>

        {(!profile || profile.role === "tenant") && (
          <button
            onClick={handleToggleSave}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm transition ${
              isSaved
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            <span>{isSaved ? "Saved" : "Save Rental"}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Details and Media Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Visual Carousel */}
          <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 shadow-md group">
            <img
              src={images[activeImageIndex]}
              alt={`${property.title} - view ${activeImageIndex + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80";
              }}
            />

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white transition shadow opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white transition shadow opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Dot Index Indicators */}
                <div className="absolute bottom-4 inset-x-0 flex justify-center space-x-2">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === activeImageIndex ? "w-6 bg-gold-500" : "w-2 bg-white/60"
                      }`}
                    ></button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Heading Metadata */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="bg-gold-100 text-gold-900 border border-gold-200/30 text-xs font-bold px-3 py-1 rounded-full capitalize">
                  {getPropertyTypeLabel(property.type)}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-sans text-stone-950 mt-2.5">
                  {property.title}
                </h1>
                <div className="flex items-center space-x-1 text-stone-500 text-xs sm:text-sm font-semibold mt-1">
                  <MapPin className="h-4 w-4 text-primary-600 shrink-0" />
                  <span>{property.location}, {property.county}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-black text-stone-950 font-sans">
                  KSh {parseFloat(property.price).toLocaleString()}
                </p>
                <p className="text-xs text-stone-400 font-semibold leading-none">Per Month</p>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-stone-100 pt-4 space-y-2">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wide">
                Property Description
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wide">
              Included Amenities & Utilities
            </h3>
            {property.amenities && property.amenities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.amenities.map((amenity: string, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 text-stone-700 text-xs font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-xs">No amenities specified for this listing.</p>
            )}
          </div>

        </div>

        {/* Sidebar Column (Landlord Details & Inquiry Call to Action) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-6 sticky top-24">
            <h3 className="font-sans font-bold text-stone-900 text-base border-b border-stone-100 pb-3">
              Listing Contact
            </h3>

            {/* Landlord Identity card */}
            {landlord ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/50">
                  <div className="h-11 w-11 rounded-full bg-primary-50 border border-primary-200 text-primary-900 font-bold flex items-center justify-center text-sm capitalize">
                    {landlord.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm leading-tight">
                      {landlord.full_name}
                    </h4>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                      Verified Owner
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-semibold text-stone-600">
                  <div className="flex items-center space-x-2.5">
                    <Phone className="h-4 w-4 text-stone-400" />
                    <span>{landlord.phone || "No phone listed"}</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Mail className="h-4 w-4 text-stone-400" />
                    <span className="truncate">Landlord via Nestlist</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50 text-center text-stone-400 text-xs">
                Owner details unretrievable.
              </div>
            )}

            <div className="border-t border-stone-100 pt-5 space-y-3">
              <div className="flex items-start space-x-2 text-[11px] text-stone-400 font-medium leading-relaxed bg-[#FEF3C7]/40 p-2.5 rounded-lg border border-[#FDE68A]/50">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Landlord verified via safaricom billing. Nestlist logs all chat histories for tenant safety. Do not pay deposit before viewing.
                </p>
              </div>

              {/* Inquiry Trigger */}
              {profile?.role === "landlord" ? (
                <div className="text-center p-3 text-xs bg-stone-100 text-stone-500 rounded-xl font-medium">
                  You are viewing your own listing.
                </div>
              ) : (
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md font-bold text-sm transition"
                >
                  <MessageSquare className="h-4.5 w-4.5" />
                  <span>Send SMS Inquiry</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* INQUIRY MODAL POPUP */}
      {inquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-stone-200 overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-sans font-bold text-base">Inquire about Listing</h3>
                <p className="text-xs text-stone-400 truncate max-w-xs">{property.title}</p>
              </div>
              <button
                onClick={() => {
                  setInquiryModalOpen(false);
                  setInquirySuccess(false);
                }}
                className="text-stone-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {inquirySuccess ? (
                <div className="space-y-4 text-center py-6">
                  <div className="mx-auto h-12 w-12 bg-emerald-50 rounded-full text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Check className="h-6 w-6 stroke-[3]" />
                  </div>
                  <h4 className="font-sans font-extrabold text-stone-900 text-base">Inquiry Sent Successfully!</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                    Jambo! Your message was submitted. We sent an instant **SMS notification** to the landlord ({landlord?.full_name}) and dispatched a delivery confirmation to your phone. The landlord will contact you soon!
                  </p>
                  <button
                    onClick={() => {
                      setInquiryModalOpen(false);
                      setInquirySuccess(false);
                    }}
                    className="mt-2 py-2 px-6 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInquiry} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Write a message to {landlord?.full_name || "the landlord"}
                    </label>
                    <textarea
                      rows={5}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="e.g. Jambo, I am interested in renting this bedsitter. Is it available for viewing this Saturday at 10 AM?"
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A]"
                      required
                    ></textarea>
                    {!profile?.phone ? (
                      <div className="space-y-1.5 mt-3">
                        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                          Your Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +254700123456"
                          value={tenantPhone}
                          onChange={(e) => setTenantPhone(e.target.value)}
                          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A]"
                        />
                        <p className="text-[10px] text-stone-400">
                          Enter your phone number so the landlord can contact you directly. This will be saved to your profile.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-stone-400 leading-normal">
                        Note: Your phone number ({profile?.phone}) will be included in the SMS body so the landlord can call or WhatsApp you directly.
                      </p>
                    )}

                    <p className="text-[10.5px] text-stone-500 leading-normal mt-3 border-t border-stone-100 pt-3">
                      By submitting this inquiry your name and phone number will be shared with the landlord.{" "}
                      <Link to="/privacy" className="text-emerald-750 hover:text-emerald-900 underline font-semibold">
                        See our Privacy Policy
                      </Link>.
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setInquiryModalOpen(false)}
                      className="py-2.5 px-4 text-xs font-semibold border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingInquiry}
                      className="flex items-center space-x-1.5 py-2.5 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {sendingInquiry ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Submit & Send SMS</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
