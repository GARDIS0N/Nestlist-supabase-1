import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { PhotoUpload } from "../components/PhotoUpload";
import { PropertySkeleton } from "../components/PropertySkeleton";
import BoostListing from "../components/BoostListing";
import UnlockLead from "../components/UnlockLead";
import { 
  LayoutDashboard, Plus, MessageSquare, Building2, Eye, Check, X, Loader2, 
  CheckCircle, Clock, AlertTriangle, Send, Share2, Edit, Trash2, Copy, 
  ExternalLink, Phone, Mail, Coins, ShieldAlert, Sparkles, RefreshCw,
  Rocket, Lock, Unlock
} from "lucide-react";

const AMENITIES_LIST = [
  "Water 24/7", "Borehole", "Parking", "Security Guard", "CCTV",
  "Electric Fence", "Backup Generator", "WiFi Ready", "DSTV Ready",
  "Tiled Floors", "Servant Quarter", "Garden", "Balcony",
  "Near Tarmac", "Near School", "Near Shopping Centre"
];

const COUNTIES = ["Nairobi", "Kiambu", "Mombasa", "Kisumu", "Nakuru"];

const TYPES = [
  { value: "single_room", label: "Single Room", fee: 100 },
  { value: "bedsitter", label: "Bedsitter", fee: 200 },
  { value: "studio", label: "Studio Apartment", fee: 250 },
  { value: "1br", label: "1 Bedroom Apartment", fee: 500 },
  { value: "2br", label: "2 Bedroom Apartment", fee: 700 },
  { value: "3br", label: "3 Bedroom Apartment", fee: 1000 },
  { value: "4br", label: "4 Bedroom Apartment", fee: 1200 },
  { value: "5br_plus", label: "5 Bedroom Executive", fee: 1500 }
];

export const LandlordDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"listings" | "inquiries" | "credits_boosts">("listings");
  const [properties, setProperties] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnlocksSpent, setTotalUnlocksSpent] = useState(0);
  const [boostsList, setBoostsList] = useState<any[]>([]);
  const [unlocksList, setUnlocksList] = useState<any[]>([]);
  const [inquiryFilter, setInquiryFilter] = useState<"all" | "unlocked" | "locked">("all");

  // States for modals and flows
  const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [sharingProperty, setSharingProperty] = useState<any | null>(null);
  const [renewingProperty, setRenewingProperty] = useState<any | null>(null);
  const [replyingInquiry, setReplyingInquiry] = useState<any | null>(null);
  const [updatingPhotosProperty, setUpdatingPhotosProperty] = useState<any | null>(null);
  const [boostingProperty, setBoostingProperty] = useState<any | null>(null);
  const [unlockingInquiry, setUnlockingInquiry] = useState<any | null>(null);

  // Modal forms
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCounty, setEditCounty] = useState("Nairobi");
  const [editType, setEditType] = useState("bedsitter");
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [editImages, setEditImages] = useState<string[]>([]);

  // Renewal and Chat Reply Forms
  const [renewMpesaCode, setRenewMpesaCode] = useState("");
  const [renewingStatus, setRenewingStatus] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyingStatus, setReplyingStatus] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    activeCount: 0,
    totalProperties: 0,
    inquiryCount: 0,
  });

  // Selected Inquiry Chat State
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Custom Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getListingFee = (typeKey: string) => {
    return TYPES.find(t => t.value === typeKey)?.fee || 500;
  };

  const fetchDashboardData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // 1. Fetch properties
      const { data: propsData, error: propsError } = await supabase
        .from("properties")
        .select("*")
        .eq("landlord_id", profile.id)
        .order("created_at", { ascending: false });

      if (propsError) throw propsError;
      const listingsList = propsData || [];
      setProperties(listingsList);

      // 2. Fetch inquiries via secure API
      const inqRes = await fetch(`/api/inquiries/landlord/${profile.id}`);
      const inqData = await inqRes.json();
      if (!inqRes.ok) throw new Error(inqData.error || "Failed to load inquiries");
      const inqList = inqData.inquiries || [];
      setInquiries(inqList);

      // 3. Fetch fees paid
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("listing_payments")
        .select("amount")
        .eq("landlord_id", profile.id)
        .eq("status", "confirmed");

      if (!paymentsError && paymentsData) {
        const sum = paymentsData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        setTotalPaid(sum);
      }

      // Fetch unlocks paid
      const { data: unlocksData, error: unlocksError } = await supabase
        .from("lead_unlocks")
        .select("amount_paid")
        .eq("landlord_id", profile.id)
        .eq("status", "confirmed");

      if (!unlocksError && unlocksData) {
        const sum = unlocksData.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
        setTotalUnlocksSpent(sum);
      }

      // Fetch all boosts for history
      const { data: boostsHistory } = await supabase
        .from("listing_boosts")
        .select("*, property:properties(title)")
        .eq("landlord_id", profile.id)
        .order("created_at", { ascending: false });

      if (boostsHistory) {
        setBoostsList(boostsHistory);
      }

      // Fetch all unlocks for history
      const { data: unlocksHistory } = await supabase
        .from("lead_unlocks")
        .select("*, property:properties(title)")
        .eq("landlord_id", profile.id)
        .order("created_at", { ascending: false });

      if (unlocksHistory) {
        setUnlocksList(unlocksHistory);
      }

      // 4. Calculate Stats
      const activeCount = listingsList.filter(p => p.is_active).length;
      setStats({
        activeCount,
        totalProperties: listingsList.length,
        inquiryCount: inqList.length
      });

    } catch (err) {
      console.error("Error fetching landlord dashboard details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  // Load chat messages when inquiry is selected
  const fetchChatMessages = async (inquiryId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (err) {
      console.error("Failed to load chat messages:", err);
    }
  };

  useEffect(() => {
    if (!selectedInquiryId) return;

    fetchChatMessages(selectedInquiryId);

    // Setup realtime subscription for this inquiry's messages
    const channel = supabase
      .channel(`inquiry-messages-${selectedInquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `inquiry_id=eq.${selectedInquiryId}`,
        },
        (payload) => {
          const newMessage = payload.new;
          setChatMessages((prev) => {
            if (prev.some((msg) => msg.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedInquiryId]);

  const handleUpdateInquiryStatus = async (inquiryId: string, nextStatus: "responded" | "closed") => {
    try {
      const { error } = await supabase
        .from("inquiries")
        .update({ status: nextStatus })
        .eq("id", inquiryId);

      if (error) throw error;

      setInquiries(prev =>
        prev.map(item => (item.id === inquiryId ? { ...item, status: nextStatus } : item))
      );
      showToast(`Inquiry status updated to ${nextStatus}`, "success");
    } catch (err) {
      console.error("Failed to update inquiry status:", err);
    }
  };

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedInquiryId || !newMessageText.trim()) return;

    setSendingMessage(true);

    try {
      // 1. Insert chat message
      const { data: msgRow, error: msgError } = await supabase
        .from("messages")
        .insert({
          inquiry_id: selectedInquiryId,
          sender_id: profile.id,
          content: newMessageText,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Append locally
      setChatMessages(prev => [...prev, msgRow]);

      // 2. Fetch the inquiry and tenant profile to send SMS
      const selectedInquiry = inquiries.find(i => i.id === selectedInquiryId);
      if (selectedInquiry?.tenant?.phone) {
        // Send SMS to tenant notifying them of the landlord's response
        await supabase.functions.invoke("send-sms", {
          body: {
            type: "inquiry_sent", // reuse template to send message alert
            phone: selectedInquiry.tenant.phone,
            data: {
              tenant_name: selectedInquiry.tenant.full_name,
              property_title: selectedInquiry.property?.title || "Property",
              landlord_phone: profile.phone,
              message: `Reply: ${newMessageText.substring(0, 80)}`
            }
          }
        });
      }

      // 3. Mark inquiry as responded
      await handleUpdateInquiryStatus(selectedInquiryId, "responded");

      setNewMessageText("");
    } catch (err: any) {
      console.error("Failed to send reply message:", err);
      showToast(`Reply failed: ${err.message}`, "error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Redesigned Delete Confirmation flow (Change 5)
  const confirmDeleteProperty = async () => {
    if (!deletePropertyId) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", deletePropertyId);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== deletePropertyId));
      setStats(prev => ({ 
        ...prev, 
        totalProperties: prev.totalProperties - 1,
        activeCount: properties.find(p => p.id === deletePropertyId)?.is_active ? prev.activeCount - 1 : prev.activeCount
      }));
      setDeletePropertyId(null);
      showToast("Listing deleted successfully", "success");
    } catch (err: any) {
      showToast(`Deletion failed: ${err.message}`, "error");
    }
  };

  // Edit Listing Logic (Change 6)
  const openEditModal = (property: any) => {
    setEditingProperty(property);
    setEditTitle(property.title || "");
    setEditPrice(property.price?.toString() || "");
    setEditDescription(property.description || "");
    setEditLocation(property.location || "");
    setEditCounty(property.county || "Nairobi");
    setEditType(property.type || "bedsitter");
    setEditAmenities(property.amenities || []);
    setEditImages(property.images || []);
  };

  const savePropertyChanges = async () => {
    if (!editingProperty) return;
    if (!editTitle || !editPrice || !editLocation) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      const updatedData = {
        title: editTitle,
        price: parseFloat(editPrice),
        description: editDescription,
        location: editLocation,
        county: editCounty,
        type: editType,
        amenities: editAmenities,
        images: editImages
      };

      const { error } = await supabase
        .from("properties")
        .update(updatedData)
        .eq("id", editingProperty.id);

      if (error) throw error;

      setProperties(prev =>
        prev.map(p => (p.id === editingProperty.id ? { ...p, ...updatedData } : p))
      );
      setEditingProperty(null);
      showToast("✅ Listing updated!", "success");
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`, "error");
    }
  };

  // Save photos from dedicated Update Photos button (Fix 4)
  const saveReplacementPhotos = async () => {
    if (!updatingPhotosProperty) return;

    try {
      const { error } = await supabase
        .from("properties")
        .update({ images: updatingPhotosProperty.images })
        .eq("id", updatingPhotosProperty.id);

      if (error) throw error;

      setProperties(prev =>
        prev.map(p => (p.id === updatingPhotosProperty.id ? { ...p, images: updatingPhotosProperty.images } : p))
      );
      setUpdatingPhotosProperty(null);
      showToast("✅ Photos updated!", "success");
    } catch (err: any) {
      showToast(`Failed to update photos: ${err.message}`, "error");
    }
  };

  // Submit Renewal Payment (Change 9)
  const submitRenewalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !renewingProperty || !renewMpesaCode.trim()) return;

    setRenewingStatus(true);
    try {
      const cleanCode = renewMpesaCode.trim().toUpperCase();

      if (!/^[A-Z0-9]{8,12}$/.test(cleanCode)) {
        alert("Invalid M-Pesa code format. Example: UG42KAHXNA");
        setRenewingStatus(false);
        return;
      }

      const expectedFee = getListingFee(renewingProperty.type);

      const { error: paymentError } = await supabase
        .from("listing_payments")
        .insert({
          property_id: renewingProperty.id,
          landlord_id: profile.id,
          amount: expectedFee,
          property_type: renewingProperty.type,
          mpesa_code: cleanCode,
          mpesa_checkout_request_id: `RENEW-${renewingProperty.id}-${cleanCode}`,
          amount_paid: expectedFee,
          payer_phone: profile.phone || null,
          status: "pending",
        });

      if (paymentError) throw paymentError;

      const { error: propError } = await supabase
        .from("properties")
        .update({
          payment_status: "pending_verification",
          is_active: false
        })
        .eq("id", renewingProperty.id);

      if (propError) throw propError;

      setProperties(prev =>
        prev.map(p =>
          p.id === renewingProperty.id
            ? { ...p, payment_status: "pending_verification", is_active: false }
            : p
        )
      );

      setRenewingProperty(null);
      setRenewMpesaCode("");
      showToast("Renewal submitted! Admin will verify shortly.", "success");
    } catch (err: any) {
      alert(`Renewal failed: ${err.message}`);
    } finally {
      setRenewingStatus(false);
    }
  };

  // Submit reply message from Inquiry List card direct click (Change 8)
  const submitInquiryReplyFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !replyingInquiry || !replyText.trim()) return;

    setReplyingStatus(true);
    try {
      const { data: msgRow, error: msgError } = await supabase
        .from("messages")
        .insert({
          inquiry_id: replyingInquiry.id,
          sender_id: profile.id,
          content: replyText,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      if (replyingInquiry.tenant?.phone) {
        await supabase.functions.invoke("send-sms", {
          body: {
            type: "inquiry_sent",
            phone: replyingInquiry.tenant.phone,
            data: {
              tenant_name: replyingInquiry.tenant.full_name,
              property_title: replyingInquiry.property?.title || "Property",
              landlord_phone: profile.phone,
              message: `Reply: ${replyText.substring(0, 80)}`
            }
          }
        });
      }

      await handleUpdateInquiryStatus(replyingInquiry.id, "responded");
      setReplyText("");
      setReplyingInquiry(null);
      showToast("Reply sent successfully", "success");
      fetchDashboardData();
    } catch (err: any) {
      showToast(`Reply failed: ${err.message}`, "error");
    } finally {
      setReplyingStatus(false);
    }
  };

  // Smart Expiry Calculator Helper (Change 12)
  function getExpiryDisplay(expiresAt: string | null) {
    if (!expiresAt) {
      return {
        text: "Awaiting activation",
        color: "#D97706",
        bg: "#FFFBEB",
        border: "#FEF3C7",
        icon: "⏰",
        daysLeft: 0
      };
    }
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysLeft = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysLeft < 0) {
      return {
        text: `Expired ${Math.abs(daysLeft)} days ago`,
        color: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        icon: '❌',
        daysLeft
      };
    }
    if (daysLeft <= 3) {
      return {
        text: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`,
        color: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        icon: '🔴',
        daysLeft
      };
    }
    if (daysLeft <= 7) {
      return {
        text: `${daysLeft} days remaining`,
        color: '#D97706',
        bg: '#FEF3C7',
        border: '#FDE68A',
        icon: '⚠️',
        daysLeft
      };
    }
    if (daysLeft <= 14) {
      return {
        text: `${daysLeft} days remaining`,
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FEF3C7',
        icon: '⏰',
        daysLeft
      };
    }
    return {
      text: `${daysLeft} days remaining`,
      color: '#065F46',
      bg: '#F0FDF4',
      border: '#A7F3D0',
      icon: '✅',
      daysLeft
    };
  }

  // Heuristic checking for suspicious non-property photos (Fix 3)
  const isSuspectedBadPhoto = (url: string | undefined, title: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    
    if (
      lowerUrl.includes("flyer") || 
      lowerUrl.includes("poster") || 
      lowerUrl.includes("person") || 
      lowerUrl.includes("man") || 
      lowerUrl.includes("woman") || 
      lowerUrl.includes("whatsapp") || 
      lowerUrl.includes("screenshot") ||
      lowerUrl.includes("avatar") ||
      lowerUrl.includes("holding-phone") ||
      lowerUrl.includes("banner") ||
      lowerUrl.includes("promo") ||
      lowerUrl.includes("marketing") ||
      lowerUrl.includes("contact") ||
      lowerUrl.includes("advert") ||
      lowerUrl.includes("text")
    ) {
      return true;
    }
    return false;
  };

  const getBoostDaysLeft = (expiresAtStr: string | null) => {
    if (!expiresAtStr) return 0;
    const exp = new Date(expiresAtStr);
    const diffTime = exp.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Performance calculations (Change 11)
  const totalViews = properties.reduce((sum, p) => sum + (p.view_count || 0), 0);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newInquiriesThisWeek = inquiries.filter(i => new Date(i.created_at) >= oneWeekAgo).length;
  const bestPerformingProperty = properties.length > 0 
    ? [...properties].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0]
    : null;

  // General warning banner count for expired/expiring
  const expiringCount = properties.filter(p => {
    if (!p.is_active || !p.expires_at) return false;
    const exp = getExpiryDisplay(p.expires_at);
    return exp.daysLeft >= 0 && exp.daysLeft <= 7;
  }).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-white flex items-center space-x-2 animate-bounce ${
          toast.type === "success" ? "bg-emerald-600 border-emerald-500" : toast.type === "error" ? "bg-red-600 border-red-500" : "bg-stone-900 border-stone-800"
        }`}>
          {toast.type === "success" ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* CHANGE 1 — REDESIGN HEADER BANNER */}
      <div style={{
        background: "linear-gradient(135deg, #0A4D2E, #1E6B4A)",
        borderRadius: "16px",
        padding: "24px 20px",
        marginBottom: "20px",
        color: "white"
      }} className="shadow-lg shadow-emerald-950/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold font-serif tracking-tight flex items-center gap-2">
              <span>🏠</span> Landlord Dashboard
            </h1>
            <p className="text-sm font-semibold opacity-90">
              Welcome back, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Landlord'} 👋
            </p>
            <p className="text-xs opacity-70 font-medium">
              Managing {properties.length} properties · {inquiries.filter(i => i.status === 'pending').length} active inquiries
            </p>
          </div>

          <Link
            to="/list-property"
            style={{
              background: "white",
              color: "#1E6B4A",
              borderRadius: "10px",
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}
            className="inline-flex items-center space-x-1.5 transition active:scale-95 self-start md:self-auto hover:bg-stone-50"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>List New Property</span>
          </Link>
        </div>

        {/* Bottom row: Mini stats inline on green banner */}
        <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-white/10">
          <span className="rounded-lg px-3 py-2 bg-white/10 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm border border-white/5">
            🏠 {stats.totalProperties} Total
          </span>
          <span className="rounded-lg px-3 py-2 bg-white/10 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm border border-white/5">
            ✅ {stats.activeCount} Active
          </span>
          <span className="rounded-lg px-3 py-2 bg-white/10 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm border border-white/5">
            💬 {stats.inquiryCount} Inquiries
          </span>
        </div>
      </div>

      {/* CHANGE 2 — REDESIGN STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3" id="stats-grid">
        {/* CARD 1 — TOTAL LISTINGS */}
        <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between" style={{ borderTop: "3px solid #1E6B4A" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Listings</span>
            <div className="p-1.5 rounded-lg text-green-700" style={{ background: "#F0FDF4" }}>
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black" style={{ color: "#1E6B4A" }}>{stats.totalProperties}</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">All time listings</p>
          </div>
        </div>

        {/* CARD 2 — ACTIVE LISTINGS */}
        <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between" style={{ borderTop: "3px solid #2D9E6B" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Now</span>
            <div className="p-1.5 rounded-lg text-green-600" style={{ background: "#DCFCE7" }}>
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black" style={{ color: "#2D9E6B" }}>{stats.activeCount}</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Visible to tenants</p>
          </div>
        </div>

        {/* CARD 3 — TENANT INQUIRIES */}
        <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between relative" style={{ borderTop: "3px solid #D97706" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Inquiries</span>
            <div className="p-1.5 rounded-lg text-yellow-700 relative" style={{ background: "#FEF3C7" }}>
              <MessageSquare className="h-4 w-4" />
              {inquiries.filter(i => i.status === "pending").length > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-600 animate-ping"></span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black" style={{ color: "#D97706" }}>{stats.inquiryCount}</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Total received leads</p>
          </div>
        </div>

        {/* CARD 4 — FEES PAID */}
        <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between" style={{ borderTop: "3px solid #0A4D2E" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fees Paid</span>
            <div className="p-1.5 rounded-lg text-green-900" style={{ background: "#F0FDF4" }}>
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-emerald-950">KES {totalPaid.toLocaleString()}</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Upfront listing fees</p>
          </div>
        </div>

        {/* CARD 5 — ACTIVE BOOSTS */}
        <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between" style={{ borderTop: "3px solid #D97706" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Boosts</span>
            <div className="p-1.5 rounded-lg text-amber-700" style={{ background: "#FFFBEB" }}>
              <Rocket className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-amber-700">{properties.filter(p => p.is_boosted).length}</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Properties boosted</p>
          </div>
        </div>

        {/* CARD 6 — LOCKED LEADS */}
        <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between" style={{ borderTop: "3px solid #EA580C" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Locked Leads</span>
            <div className="p-1.5 rounded-lg text-orange-600" style={{ background: "#FFF7ED" }}>
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-orange-600">{inquiries.filter(i => i.is_locked).length}</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Awaiting unlock</p>
          </div>
        </div>

        {/* CARD 7 — LEADS REVENUE SPENT */}
        <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between" style={{ borderTop: "3px solid #B45309" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Leads Spent</span>
            <div className="p-1.5 rounded-lg text-amber-800" style={{ background: "#FFFBEB" }}>
              <Unlock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-amber-800">KES {totalUnlocksSpent.toLocaleString()}</span>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Total spent on leads</p>
          </div>
        </div>
      </div>

      {/* CHANGE 11 — ADD LISTING PERFORMANCE METRICS */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-1.5 uppercase tracking-wider">
          <Sparkles className="h-4.5 w-4.5 text-emerald-700" />
          <span>This Week's Performance Dashboard</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-150 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-400 uppercase font-black tracking-wider">Total Views</p>
              <p className="text-xl font-extrabold text-stone-950 mt-1">{totalViews}</p>
            </div>
            <span className="text-2xl">👁</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-150 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-400 uppercase font-black tracking-wider">New Inquiries</p>
              <p className="text-xl font-extrabold text-stone-950 mt-1">{newInquiriesThisWeek}</p>
            </div>
            <span className="text-2xl">💬</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-150 flex items-center justify-between col-span-1">
            <div className="truncate">
              <p className="text-[10px] text-stone-400 uppercase font-black tracking-wider">Best Performing</p>
              <p className="text-xs font-bold text-stone-800 truncate mt-1">
                {bestPerformingProperty ? bestPerformingProperty.title : "None yet"}
              </p>
              {bestPerformingProperty && (
                <p className="text-[10px] text-stone-500 font-semibold">{bestPerformingProperty.view_count || 0} views</p>
              )}
            </div>
            <span className="text-2xl">🏆</span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="border-b border-stone-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab("listings")}
            className={`py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "listings"
                ? "border-emerald-600 text-[#0A4D2E]"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            My Properties ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "inquiries"
                ? "border-emerald-600 text-[#0A4D2E]"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            Inquiries Received ({inquiries.length})
          </button>
          <button
            onClick={() => setActiveTab("credits_boosts")}
            className={`py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "credits_boosts"
                ? "border-emerald-600 text-[#0A4D2E]"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            Credits & Boosts 🚀
          </button>
        </div>
      </div>

      {/* Main Tab Contents */}
      {loading ? (
        activeTab === "listings" ? (
          <PropertySkeleton count={properties.length || 3} showActions={true} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-stone-200 rounded-xl p-4 bg-white animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-full bg-stone-200"></div>
                    <div className="space-y-1">
                      <div className="h-3 bg-stone-200 rounded w-24"></div>
                      <div className="h-2 bg-stone-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-stone-200 rounded-full w-14"></div>
                </div>
                <div className="h-3 bg-stone-100 rounded w-1/3"></div>
                <div className="h-8 bg-stone-50 rounded-lg w-full"></div>
                <div className="flex space-x-2 pt-2">
                  <div className="h-9 bg-stone-200 rounded-lg flex-1"></div>
                  <div className="h-9 bg-stone-200 rounded-lg flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "listings" ? (
        /* MY PROPERTIES TAB */
        <div className="space-y-6">
          
          {/* CHANGE 9 — AMBER WARNING BANNER FOR EXPIRING/EXPIRED */}
          {expiringCount > 0 && (
            <div style={{
              background: "#FEF3C7",
              border: "1px solid #FDE68A",
              borderRadius: "12px",
              padding: "14px",
            }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
              <div className="flex items-center space-x-3 text-[#92400E]">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">⚠️ {expiringCount} listing(s) expiring within 7 days</p>
                  <p className="text-xs font-semibold opacity-90">Renew now to keep your property visible to tenants</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const firstExpiring = properties.find(p => {
                    if (!p.is_active || !p.expires_at) return false;
                    const exp = getExpiryDisplay(p.expires_at);
                    return exp.daysLeft >= 0 && exp.daysLeft <= 7;
                  });
                  if (firstExpiring) setRenewingProperty(firstExpiring);
                }}
                className="bg-[#D97706] hover:bg-[#B45309] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto"
              >
                Renew Now →
              </button>
            </div>
          )}

          {properties.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 py-16 px-4 text-center max-w-lg mx-auto shadow-sm">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-bold text-lg text-stone-900">No properties listed yet</h3>
              <p className="text-stone-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
                List your rental house, pay the small Safaricom fee, and start receiving leads instantly!
              </p>
              <Link
                to="/list-property"
                className="mt-6 inline-flex items-center space-x-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <span>List Your First Rental</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-listings-grid">
              {properties.map((property) => {
                const daysLeftObj = getExpiryDisplay(property.expires_at);
                const hasSuspiciousPhotos = isSuspectedBadPhoto(property.images?.[0], property.title);

                return (
                  <div
                    key={property.id}
                    style={{
                      background: "white",
                      border: "1px solid #E2EAE6",
                      borderRadius: "16px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(15,26,20,0.06)"
                    }}
                    className="flex flex-col justify-between group"
                  >
                    <div>
                      {/* PHOTO SECTION */}
                      <div className="relative h-[200px] w-full bg-stone-100 overflow-hidden">
                        <img
                          src={property.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"}
                          alt={property.title}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";
                          }}
                        />

                        {/* TOP LEFT BADGE */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                          {property.is_active && daysLeftObj.daysLeft >= 0 ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>✓ ACTIVE</span>
                            </span>
                          ) : property.payment_status === "pending_verification" ? (
                            <span className="bg-[#D97706] text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>⏳ PENDING</span>
                            </span>
                          ) : property.payment_status === "unpaid" || !property.is_active ? (
                            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                              <Coins className="h-3 w-3" />
                              <span>💳 PAY NOW</span>
                            </span>
                          ) : daysLeftObj.daysLeft < 0 ? (
                            <span className="bg-stone-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>⚠️ EXPIRED</span>
                            </span>
                          ) : null}

                          {property.listing_model === "pay_per_lead" && (
                            <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow flex items-center space-x-1 self-start">
                              <span>🔓 PAY PER LEAD</span>
                            </span>
                          )}
                        </div>

                        {/* TOP RIGHT: View count */}
                        <div className="absolute top-3 right-3 bg-white/75 backdrop-blur-sm text-stone-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
                          <span>👁</span>
                          <span>{property.view_count || 0} views</span>
                        </div>

                        {/* BOTTOM RIGHT: Price with Gradient overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-end p-3">
                          <span className="text-white text-base font-black">
                            KSh {parseFloat(property.price).toLocaleString()}/mo
                          </span>
                        </div>
                      </div>

                      {/* BAD PHOTOS MANUAL WARNING (Fix 3) */}
                      {hasSuspiciousPhotos && (
                        <div className="bg-[#FEF3C7] border-y border-[#FDE68A] border-l-4 border-l-[#D97706] p-3 text-xs text-[#92400E] flex flex-col gap-2">
                          <p className="font-semibold">⚠️ Please ensure your photos show the actual property, not posters or people.</p>
                          <button
                            onClick={() => setUpdatingPhotosProperty(property)}
                            className="bg-[#D97706] hover:bg-[#B45309] text-white font-bold py-1 px-3 rounded-lg text-[11px] transition self-start"
                          >
                            Update Photos
                          </button>
                        </div>
                      )}

                      {/* CONTENT SECTION */}
                      <div className="p-4.5 space-y-3">
                        {/* Title & Inquiry Count Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-sans font-bold text-stone-900 text-[15px] leading-snug line-clamp-1">
                            {property.title}
                          </h3>
                          {inquiries.filter(i => i.property_id === property.id).length > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300/40 shrink-0 shadow-sm">
                              💬 {inquiries.filter(i => i.property_id === property.id).length}
                            </span>
                          )}
                        </div>

                        {/* Location */}
                        <p className="text-xs text-stone-500 font-semibold flex items-center gap-1">
                          <span>📍</span>
                          <span>{property.location}</span>
                        </p>

                        {/* Type & County chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 uppercase">
                            {property.type?.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 uppercase">
                            {property.county}
                          </span>
                        </div>

                        {/* Expiry Pill badge */}
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                          <span
                            style={{
                              color: daysLeftObj.color,
                              background: daysLeftObj.bg,
                              borderColor: daysLeftObj.border,
                            }}
                            className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                              daysLeftObj.daysLeft < 7 && daysLeftObj.daysLeft >= 0 ? "animate-pulse" : ""
                            }`}
                          >
                            <span>{daysLeftObj.icon}</span>
                            <span>{daysLeftObj.text}</span>
                          </span>

                          {property.listing_model === "pay_per_lead" && (
                            property.lead_credits > 1 ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                                <span>🔓 {property.lead_credits} lead credits</span>
                              </span>
                            ) : property.lead_credits === 1 ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                                <span>⚠️ 1 lead credit</span>
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 border border-red-200 inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                                <span>🔒 0 lead credits</span>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons row with 48px target compatibility */}
                    <div className="p-4 pt-0 border-t border-stone-100 bg-stone-50/50 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Link
                          to={`/property/${property.id}`}
                          className="flex-1 min-w-[50px] min-h-[48px] inline-flex items-center justify-center p-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold transition shadow-sm"
                          title="View details"
                        >
                          👁 View
                        </Link>

                        <button
                          onClick={() => openEditModal(property)}
                          className="flex-1 min-w-[50px] min-h-[48px] inline-flex items-center justify-center p-2 border border-emerald-500 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          ✏️ Edit
                        </button>

                        {/* Boost / Boosted Button */}
                        {property.is_boosted ? (
                          <div className="flex-1 min-w-[60px] min-h-[48px] inline-flex flex-col items-center justify-center p-1 border border-amber-200 bg-amber-50 text-amber-800 rounded-xl shadow-xs">
                            <span className="text-[10px] font-extrabold flex items-center gap-0.5">⭐ {getBoostDaysLeft(property.boost_expires_at)} days</span>
                            <button
                              onClick={() => setBoostingProperty(property)}
                              className="text-[9px] font-extrabold text-amber-600 hover:underline active:scale-95"
                            >
                              Extend
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setBoostingProperty(property)}
                            className="flex-1 min-w-[50px] min-h-[48px] inline-flex items-center justify-center p-2 border-2 border-amber-500 text-amber-800 hover:bg-amber-50 rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-0.5"
                          >
                            <span>🚀 Boost</span>
                          </button>
                        )}

                        {/* Renew option if expired/expiring */}
                        {daysLeftObj.daysLeft <= 7 && (
                          <button
                            onClick={() => setRenewingProperty(property)}
                            className="flex-1 min-w-[55px] min-h-[48px] inline-flex items-center justify-center p-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            🔄 Renew
                          </button>
                        )}

                        <button
                          onClick={() => setSharingProperty(property)}
                          className="flex-1 min-w-[50px] min-h-[48px] inline-flex items-center justify-center p-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          📤 Share
                        </button>

                        <button
                          onClick={() => setDeletePropertyId(property.id)}
                          className="flex-1 min-w-[50px] min-h-[48px] inline-flex items-center justify-center p-2 border border-red-500 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      {property.listing_model === "pay_per_lead" && (
                        <button
                          onClick={() => {
                            setUnlockingInquiry({
                              inquiryId: undefined, // buying bundle/credits, not unlocking specific inquiry
                              propertyId: property.id,
                              propertyTitle: property.title,
                              propertyType: property.type,
                              leadCredits: property.lead_credits || 0
                            });
                          }}
                          style={{
                            background: "#FFFBEB",
                            border: "1.5px solid #FDE68A",
                            color: "#D97706"
                          }}
                          className="w-full py-2 text-center font-extrabold text-xs rounded-xl shadow-xs hover:bg-[#FEF3C7] transition duration-200"
                        >
                          Buy Lead Credits
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "inquiries" ? (
        /* INQUIRIES RECEIVED TAB (Change 8) */
        inquiries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 py-16 px-4 text-center max-w-lg mx-auto shadow-sm">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-bold text-lg text-stone-900">No inquiries yet</h3>
            <p className="text-stone-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
              When house hunters view your active listings, their message inquiries will appear here, and you'll receive SMS notifications instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Inquiry Leads List */}
            <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {/* Inquiry filters */}
              <div className="flex bg-stone-100 p-1.5 rounded-xl gap-1 mb-4 border border-stone-200">
                <button
                  onClick={() => setInquiryFilter("all")}
                  className={`flex-1 py-2 text-[11px] font-extrabold rounded-lg transition duration-200 ${
                    inquiryFilter === "all" ? "bg-white text-stone-900 shadow-sm border border-stone-200/50" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  All ({inquiries.length})
                </button>
                <button
                  onClick={() => setInquiryFilter("unlocked")}
                  className={`flex-1 py-2 text-[11px] font-extrabold rounded-lg transition duration-200 ${
                    inquiryFilter === "unlocked" ? "bg-white text-emerald-800 shadow-sm border border-stone-200/50" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Unlocked ({inquiries.filter(i => !i.is_locked).length})
                </button>
                <button
                  onClick={() => setInquiryFilter("locked")}
                  className={`flex-1 py-2 text-[11px] font-extrabold rounded-lg transition duration-200 ${
                    inquiryFilter === "locked" ? "bg-white text-amber-800 shadow-sm border border-stone-200/50" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Locked 🔒 ({inquiries.filter(i => i.is_locked).length})
                </button>
              </div>

              {inquiries
                .filter((inquiry) => {
                  if (inquiryFilter === "unlocked") return !inquiry.is_locked;
                  if (inquiryFilter === "locked") return inquiry.is_locked;
                  return true;
                })
                .map((inquiry) => {
                const isSelected = selectedInquiryId === inquiry.id;
                const isUnread = inquiry.status === "pending";
                const tName = inquiry.tenant_name || inquiry.tenant?.full_name || "Tenant Lead";
                const initials = tName.charAt(0) || "T";

                return (
                  <div
                    key={inquiry.id}
                    style={{
                      border: "1px solid #E2EAE6",
                      borderLeft: isUnread ? "4px solid #1E6B4A" : "4px solid #E2EAE6",
                      borderRadius: "12px",
                      background: isUnread ? "#F0FDF4" : "white"
                    }}
                    className={`p-4 transition-all hover:shadow-md flex flex-col space-y-3 ${
                      isSelected ? "ring-2 ring-emerald-600/30" : ""
                    }`}
                  >
                    {/* Row 1 */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-inner uppercase">
                          {initials}
                        </div>
                        <div>
                          <p className={`text-sm text-stone-800 ${isUnread ? "font-black" : "font-semibold"}`}>
                            {tName}
                          </p>
                          <p className="text-[10px] text-stone-400 font-bold">
                            {new Date(inquiry.created_at).toLocaleDateString("en-KE")} at {new Date(inquiry.created_at).toLocaleTimeString("en-KE", {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-full ${
                          isUnread
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          {inquiry.status === "pending" ? "pending" : "responded"}
                        </span>
                        {inquiry.property?.listing_model === "pay_per_lead" && !inquiry.is_locked && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold uppercase px-2 py-1 rounded-full flex items-center gap-0.5 shadow-xs">
                            ✅ Unlocked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div>
                      <p className="text-[11px] font-extrabold text-emerald-800">
                        Re: {inquiry.property?.title || "Property"}
                      </p>
                    </div>

                    {/* Row 3 */}
                    <p className="text-xs text-stone-600 line-clamp-2 italic bg-stone-50 p-2 rounded-lg border border-stone-150">
                      "{inquiry.message}"
                    </p>

                    {/* Row 4 */}
                    {inquiry.is_locked ? (
                      <div className="flex flex-col gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-bold">
                          <span>🔒 Contact Details Locked</span>
                        </div>
                        <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                          This is a Pay-Per-Lead listing. Unlock this tenant contact for KES {inquiry.unlock_price || 50}.
                        </p>
                        <button
                          onClick={() => {
                            setUnlockingInquiry({
                              inquiryId: inquiry.id,
                              propertyId: inquiry.property_id,
                              propertyTitle: inquiry.property?.title || "Property",
                              propertyType: inquiry.property?.type || "bedsitter",
                              leadCredits: inquiry.property?.lead_credits || 0
                            });
                          }}
                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-md flex items-center justify-center gap-1 transition shadow-sm"
                        >
                          <span>🔑 Unlock Now</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5 text-[11px] text-stone-500 font-bold">
                        <a href={`tel:${inquiry.tenant_phone || inquiry.tenant?.phone}`} className="hover:underline flex items-center space-x-1.5 text-stone-700">
                          <span>📞 Phone: {inquiry.tenant_phone || inquiry.tenant?.phone}</span>
                        </a>
                      </div>
                    )}

                    {/* Row 5: Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                      {inquiry.is_locked ? (
                        <button
                          onClick={() => {
                            setUnlockingInquiry({
                              inquiryId: inquiry.id,
                              propertyId: inquiry.property_id,
                              propertyTitle: inquiry.property?.title || "Property",
                              propertyType: inquiry.property?.type || "bedsitter",
                              leadCredits: inquiry.property?.lead_credits || 0
                            });
                          }}
                          className="w-full min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition py-1 flex items-center justify-center gap-1 shadow"
                        >
                          <span>🔑 Unlock to Call or Reply</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setReplyingInquiry(inquiry)}
                            className="flex-1 min-h-[44px] bg-white border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-lg transition py-1 flex items-center justify-center gap-1 shadow-sm"
                          >
                            💬 Reply
                          </button>
                          
                          <a
                            href={`tel:${inquiry.tenant_phone || inquiry.tenant?.phone}`}
                            className="flex-1 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition py-1 flex items-center justify-center gap-1 shadow shadow-emerald-700/10"
                          >
                            📞 Call
                          </a>

                          <button
                            onClick={() => handleUpdateInquiryStatus(inquiry.id, "closed")}
                            className="flex-1 min-h-[44px] border border-stone-300 hover:bg-stone-50 text-stone-600 text-[10px] font-bold rounded-lg transition py-1"
                          >
                            Mark Resolved
                          </button>
                        </>
                      )}
                    </div>

                    {/* Select for Live console */}
                    <button
                      onClick={() => setSelectedInquiryId(inquiry.id)}
                      className="w-full text-center text-[10px] font-extrabold text-emerald-700 hover:underline pt-1"
                    >
                      Open Live Chat Console &rarr;
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Live Chat & Message Console */}
            <div className="lg:col-span-2 border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col h-[520px]">
              {selectedInquiryId ? (
                (() => {
                  const inquiry = inquiries.find(i => i.id === selectedInquiryId);
                  if (!inquiry) return null;

                  if (inquiry.is_locked) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-stone-50 h-full">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                          <ShieldAlert className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-stone-900">Conversation Locked</h4>
                          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 leading-relaxed">
                            This listing is configured on the pay-per-lead model. To chat with this tenant or view their full message, unlock the lead.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setUnlockingInquiry({
                              inquiryId: inquiry.id,
                              propertyId: inquiry.property_id,
                              propertyTitle: inquiry.property?.title || "Property",
                              propertyType: inquiry.property?.type || "bedsitter",
                              leadCredits: inquiry.property?.lead_credits || 0
                            });
                          }}
                          className="py-2.5 px-6 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition"
                        >
                          🔑 Unlock Tenant Contact
                        </button>
                      </div>
                    );
                  }

                  const tenantName = inquiry.tenant_name || inquiry.tenant?.full_name || "Tenant";
                  const tenantPhone = inquiry.tenant_phone || inquiry.tenant?.phone || "";

                  return (
                    <>
                      {/* Chat Header */}
                      <div className="bg-[#0A4D2E] text-white p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm leading-tight">{tenantName}</h4>
                          <p className="text-[10px] text-emerald-100 font-semibold">{inquiry.property?.title}</p>
                        </div>
                        <div className="flex space-x-2">
                          {inquiry.status !== "closed" && (
                            <button
                              onClick={() => handleUpdateInquiryStatus(selectedInquiryId, "closed")}
                              className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white py-1 px-2.5 rounded-md border border-white/20"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Chat Message Logs */}
                      <div className="flex-1 p-4.5 overflow-y-auto space-y-4.5 bg-stone-50">
                        {/* Initial Inquiry Box */}
                        <div className="flex flex-col space-y-1 max-w-[85%]">
                          <span className="text-[10px] text-stone-400 font-bold uppercase pl-1">
                            {tenantName} ({tenantPhone})
                          </span>
                          <div className="bg-white border border-stone-200 p-3 rounded-xl rounded-tl-none shadow-sm text-xs sm:text-sm text-stone-800">
                            {inquiry.message}
                          </div>
                        </div>

                        {/* Additional chat rows */}
                        {chatMessages.map((msg) => {
                          const isMe = msg.sender_id === profile.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col space-y-1 max-w-[85%] ${
                                isMe ? "ml-auto items-end" : ""
                              }`}
                            >
                              <span className="text-[10px] text-stone-400 font-bold uppercase pr-1">
                                {isMe ? "You" : tenantName}
                              </span>
                              <div
                                className={`p-3 rounded-xl shadow-sm text-xs sm:text-sm ${
                                  isMe
                                    ? "bg-stone-900 text-white rounded-tr-none"
                                    : "bg-white border border-stone-200 text-stone-800 rounded-tl-none"
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Input Console */}
                      {inquiry.status === "closed" ? (
                        <div className="p-4 bg-stone-100 text-center text-xs text-stone-500 font-semibold">
                          This inquiry is marked as CLOSED. Reopen by sending a reply below.
                        </div>
                      ) : null}

                      <form onSubmit={handleSendChatReply} className="border-t border-stone-200 p-3 flex gap-2">
                        <input
                          type="text"
                          placeholder={`SMS reply to ${tenantName}...`}
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/20 focus:border-[#1E6B4A]"
                          required
                        />
                        <button
                          type="submit"
                          disabled={sendingMessage}
                          className="py-2.5 px-4 bg-[#1E6B4A] hover:bg-[#0A4D2E] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow transition disabled:opacity-50"
                        >
                          {sendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Send SMS</span>
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  );
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400">
                  <MessageSquare className="h-10 w-10 text-stone-300 mb-2" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Select an inquiry</p>
                  <p className="text-[11px] max-w-xs mt-1">
                    Select a conversation lead from the sidebar to view full message details and chat back via SMS.
                  </p>
                </div>
              )}
            </div>

          </div>
        )) : (
          /* CREDITS & BOOSTS TAB UI (Part 2D) */
          <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0A4D2E] to-stone-900 rounded-2xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-500/30">
                  PRO MONETIZATION DASHBOARD
                </span>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Credits & Boosts History</h2>
                <p className="text-stone-300 text-xs md:text-sm max-w-xl leading-relaxed">
                  Review your active visibility boosts, pay-per-lead transactions, and lead credits. Drive more premium tenant connections instantly.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={() => {
                    const ppleadProp = properties.find(p => p.listing_model === "pay_per_lead");
                    setUnlockingInquiry({
                      inquiryId: undefined,
                      propertyId: ppleadProp?.id,
                      propertyTitle: ppleadProp?.title || "Property",
                      propertyType: ppleadProp?.type || "bedsitter",
                      leadCredits: ppleadProp?.lead_credits || 0
                    });
                  }}
                  className="flex-1 sm:flex-none min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-sm text-center"
                >
                  Buy Lead Credits
                </button>
                <a
                  href="#listings"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("listings");
                  }}
                  className="flex-1 sm:flex-none min-h-[44px] bg-white hover:bg-stone-50 text-stone-900 font-extrabold text-xs px-5 py-2.5 rounded-xl transition border border-stone-200 shadow-xs text-center flex items-center justify-center"
                >
                  Boost a Listing 🚀
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Boosts History List */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                    <h3 className="font-sans font-black text-stone-900 text-base flex items-center gap-2">
                      <span>⚡</span> Visibility Boost History
                    </h3>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-200">
                      {boostsList.length} Total Boosts
                    </span>
                  </div>

                  {boostsList.length === 0 ? (
                    <div className="py-12 text-center text-stone-400">
                      <p className="text-2xl">🚀</p>
                      <p className="text-xs font-bold uppercase tracking-wider mt-2">No listing boosts yet</p>
                      <p className="text-[11px] max-w-xs mx-auto mt-1">
                        Landlords who boost their listings get up to 10x more leads. Go to your properties list to boost.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-stone-100 text-stone-400 font-bold uppercase tracking-wider">
                            <th className="py-2.5">Property</th>
                            <th className="py-2.5">Tier</th>
                            <th className="py-2.5">Price</th>
                            <th className="py-2.5">Date</th>
                            <th className="py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {boostsList.map((boost) => {
                            const daysLeft = getBoostDaysLeft(boost.expires_at);
                            const isActive = daysLeft >= 0;
                            return (
                              <tr key={boost.id} className="hover:bg-stone-50/50 transition">
                                <td className="py-3 font-bold text-stone-800">
                                  {boost.property?.title || "Deleted Property"}
                                </td>
                                <td className="py-3">
                                  <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded font-black uppercase text-[10px]">
                                    {boost.boost_tier}
                                  </span>
                                </td>
                                <td className="py-3 font-bold text-stone-700">
                                  KSh {boost.amount_paid?.toLocaleString() || 0}
                                </td>
                                <td className="py-3 text-stone-500 font-semibold">
                                  {new Date(boost.created_at).toLocaleDateString("en-KE")}
                                </td>
                                <td className="py-3">
                                  {isActive ? (
                                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                                      ✓ Active ({daysLeft} days left)
                                    </span>
                                  ) : (
                                    <span className="bg-stone-100 text-stone-500 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-stone-200">
                                      Expired
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Lead Unlocks List */}
                <div className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                    <h3 className="font-sans font-black text-stone-900 text-base flex items-center gap-2">
                      <span>🔓</span> Pay-Per-Lead Transaction History
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-blue-200">
                      {unlocksList.length} Transactions
                    </span>
                  </div>

                  {unlocksList.length === 0 ? (
                    <div className="py-12 text-center text-stone-400">
                      <p className="text-2xl">🔓</p>
                      <p className="text-xs font-bold uppercase tracking-wider mt-2">No lead unlocks yet</p>
                      <p className="text-[11px] max-w-xs mx-auto mt-1">
                        Lead unlocks occur when you pay to unlock inquiries on Pay-Per-Lead properties or purchase bulk credit bundles.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-stone-100 text-stone-400 font-bold uppercase tracking-wider">
                            <th className="py-2.5">Type / Property</th>
                            <th className="py-2.5">Amount</th>
                            <th className="py-2.5">Credits Added</th>
                            <th className="py-2.5">Date</th>
                            <th className="py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {unlocksList.map((unlock) => {
                            const isBundle = unlock.transaction_type === "bundle_purchase" || !unlock.inquiry_id;
                            return (
                              <tr key={unlock.id} className="hover:bg-stone-50/50 transition">
                                <td className="py-3 font-bold text-stone-800">
                                  {isBundle ? (
                                    <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-black text-[10px] mr-1.5 uppercase">
                                      Bundle Purchase
                                    </span>
                                  ) : (
                                    <span className="text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-black text-[10px] mr-1.5 uppercase">
                                      Lead Unlock
                                    </span>
                                  )}
                                  <span className="text-stone-600 font-medium">{unlock.property?.title || "Property"}</span>
                                </td>
                                <td className="py-3 font-black text-stone-800">
                                  KSh {unlock.amount_paid?.toLocaleString() || 0}
                                </td>
                                <td className="py-3 font-bold text-stone-600">
                                  {isBundle ? `+${unlock.credits_added || 0} credits` : "-1 credit"}
                                </td>
                                <td className="py-3 text-stone-500 font-semibold">
                                  {new Date(unlock.created_at).toLocaleDateString("en-KE")}
                                </td>
                                <td className="py-3">
                                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
                                    Confirmed
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Pricing reference & Support contact */}
              <div className="space-y-6">
                <div className="bg-stone-900 text-white rounded-2xl p-5 md:p-6 shadow-sm border border-stone-800 space-y-4">
                  <h4 className="font-sans font-black text-base flex items-center gap-1.5 text-amber-400">
                    <span>💰</span> NestList Pricing Guide
                  </h4>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    All transactions are handled directly via premium automated **M-Pesa Express (STK Push)**. Our prices are fixed and round-numbers friendly.
                  </p>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="border-b border-stone-800 pb-2">
                      <p className="font-bold text-stone-200 uppercase tracking-wider text-[10px]">Boost Visibility Tiers:</p>
                      <div className="grid grid-cols-2 mt-1 gap-1 text-stone-300">
                        <div>3-Day Boost:</div>
                        <div className="text-right font-bold text-white">KES 300</div>
                        <div>7-Day Boost:</div>
                        <div className="text-right font-bold text-white">KES 500</div>
                        <div>14-Day Boost:</div>
                        <div className="text-right font-bold text-white">KES 900</div>
                        <div>30-Day Boost:</div>
                        <div className="text-right font-bold text-white">KES 1,500</div>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-stone-200 uppercase tracking-wider text-[10px]">Pay-Per-Lead Options:</p>
                      <div className="grid grid-cols-2 mt-1 gap-1 text-stone-300">
                        <div>Single Lead Unlock:</div>
                        <div className="text-right font-bold text-white">KES 50</div>
                        <div>5-Lead Bundle:</div>
                        <div className="text-right font-bold text-white">KES 200</div>
                        <div>15-Lead Bundle:</div>
                        <div className="text-right font-bold text-white">KES 500</div>
                        <div>40-Lead Bundle:</div>
                        <div className="text-right font-bold text-white">KES 1,000</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 md:p-6 space-y-3">
                  <h4 className="font-sans font-extrabold text-[#0A4D2E] text-sm flex items-center gap-1.5">
                    <span>📞</span> Need Help or Custom Packages?
                  </h4>
                  <p className="text-[#0A4D2E]/80 text-xs leading-relaxed font-medium">
                    We offer specialized packages for agency networks, managers, and property firms listing over 50 properties.
                  </p>
                  <div className="space-y-1.5 pt-2 text-xs font-semibold text-stone-700">
                    <p className="flex items-center gap-1.5">
                      <span>📧</span> <a href="mailto:info@nestlist.com" className="hover:underline text-emerald-800 font-extrabold">info@nestlist.com</a>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span>📞</span> <a href="tel:+254738244330" className="hover:underline text-emerald-800 font-extrabold">+254 738 244 330</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* CHANGE 5 — DELETE CONFIRMATION MODAL */}
      {deletePropertyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl animate-fade-in border border-stone-100">
            <div className="text-4xl mb-4">🗑️</div>
            <h3 className="text-lg font-black text-stone-900">Delete this listing?</h3>
            <p className="font-bold text-emerald-800 text-sm mt-1">
              "{properties.find(p => p.id === deletePropertyId)?.title}"
            </p>
            <p className="text-stone-500 text-xs mt-3 leading-relaxed">
              This will permanently remove your listing and all inquiries. This cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={confirmDeleteProperty}
                className="w-full min-h-[48px] bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl py-2.5 transition"
              >
                Yes, Delete Permanently
              </button>
              <button
                onClick={() => setDeletePropertyId(null)}
                className="w-full min-h-[48px] border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl py-2.5 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE 6 — EDIT LISTING MODAL */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>✏️</span> Edit Property Listing
              </h3>
              <button onClick={() => setEditingProperty(null)} className="p-1 hover:bg-stone-100 rounded-full">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-stone-500">Property Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-stone-500">Price (KSh/Mo)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-stone-500">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-stone-500">Estate / Landmark</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-stone-500">County</label>
                  <select
                    value={editCounty}
                    onChange={(e) => setEditCounty(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm bg-white"
                  >
                    {COUNTIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-stone-500">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2 text-sm"
                ></textarea>
              </div>

              {/* Amenities */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-stone-500 block">Amenities Checklist</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AMENITIES_LIST.map((amenity) => {
                    const isChecked = editAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          setEditAmenities(prev =>
                            prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
                          );
                        }}
                        className={`p-2 rounded-lg border text-left text-[11px] font-bold transition flex items-center space-x-1.5 ${
                          isChecked ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-white border-stone-200"
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
                          isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-stone-300"
                        }`}>
                          {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photos upload area in Edit listing modal (Change 6 requirement) */}
              <div className="space-y-2 border-t border-stone-100 pt-4">
                <label className="text-xs font-black uppercase text-stone-500 block">Update Listing Photos</label>
                <PhotoUpload
                  propertyId={editingProperty.id}
                  photos={editImages}
                  onChange={setEditImages}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex gap-2">
              <button
                onClick={() => setEditingProperty(null)}
                className="flex-1 py-3 border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={savePropertyChanges}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIX 4 — UPDATE PHOTOS INDEPENDENT MODAL */}
      {updatingPhotosProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>📸</span> Update Property Photos
              </h3>
              <button onClick={() => setUpdatingPhotosProperty(null)} className="p-1 hover:bg-stone-100 rounded-full">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div style={{
                background: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderLeft: "4px solid #D97706",
                borderRadius: "10px",
                padding: "12px 14px",
              }}>
                <div style={{ fontWeight: 700, color: "#92400E", marginBottom: 6 }}>
                  📸 Photo Guidelines
                </div>
                <ul style={{ color: "#92400E", fontSize: 13, lineHeight: 1.7 }} className="list-disc pl-4 space-y-1">
                  <li>✅ Upload photos of the actual property</li>
                  <li>✅ Show: living room, bedroom, kitchen, bathroom</li>
                  <li>✅ Take photos in good lighting</li>
                  <li>❌ Do NOT upload flyers or posters</li>
                  <li>❌ Do NOT upload photos of people</li>
                  <li>❌ Do NOT upload screenshots or text images</li>
                </ul>
              </div>

              <PhotoUpload
                propertyId={updatingPhotosProperty.id}
                photos={updatingPhotosProperty.images || []}
                onChange={(urls) => {
                  setUpdatingPhotosProperty(prev => ({ ...prev, images: urls }));
                }}
              />
            </div>

            <div className="pt-4 border-t border-stone-100 flex gap-2">
              <button
                onClick={() => setUpdatingPhotosProperty(null)}
                className="flex-1 py-3 border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={saveReplacementPhotos}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow"
              >
                Save New Photos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE 7 — SHARE LISTING MODAL SHEET */}
      {sharingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 animate-fade-in text-center">
            <h3 className="text-lg font-black text-stone-900 mb-4">Share your listing</h3>
            
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 mb-4 truncate">
              {sharingProperty.title}
            </div>

            <div className="space-y-2">
              {/* Copy Link */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://nestlist.com/listing/${sharingProperty.id}`);
                  showToast("✅ Link copied!", "success");
                }}
                className="w-full min-h-[48px] flex items-center justify-center space-x-2 p-3 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-bold text-stone-800 transition"
              >
                <Copy className="h-4.5 w-4.5" />
                <span>📋 Copy Link</span>
              </button>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=Check%20out%20this%20property%20on%20NestList%3A%20${encodeURIComponent(sharingProperty.title)}%20in%20${encodeURIComponent(sharingProperty.location)}%20-%20KSh%20${sharingProperty.price}%2Fmo%20https%3A%2F%2Fnestlist.com%2Flisting%2F${sharingProperty.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[48px] flex items-center justify-center space-x-2 p-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-sm font-bold transition"
              >
                <span>💬 Share via WhatsApp</span>
              </a>

              {/* SMS */}
              <a
                href={`sms:?body=Check%20out%20this%20property%20on%20NestList%3A%20${encodeURIComponent(sharingProperty.title)}%20in%20${encodeURIComponent(sharingProperty.location)}%20-%20KSh%20${sharingProperty.price}%2Fmo%20https%3A%2F%2Fnestlist.com%2Flisting%2F${sharingProperty.id}`}
                className="w-full min-h-[48px] flex items-center justify-center space-x-2 p-3 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-xl text-sm font-bold transition"
              >
                <span>📱 Share via SMS</span>
              </a>

              {/* Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=Check%20out%20this%20property%20on%20NestList%3A%20${encodeURIComponent(sharingProperty.title)}%20in%20${encodeURIComponent(sharingProperty.location)}%20-%20KSh%20${sharingProperty.price}%2Fmo%20https%3A%2F%2Fnestlist.com%2Flisting%2F${sharingProperty.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[48px] flex items-center justify-center space-x-2 p-3 bg-stone-900 text-white hover:bg-stone-800 rounded-xl text-sm font-bold transition"
              >
                <span>🐦 Share on Twitter/X</span>
              </a>
            </div>

            <button
              onClick={() => setSharingProperty(null)}
              className="mt-4 w-full text-stone-500 hover:text-stone-800 text-xs font-bold py-2"
            >
              Close Share Sheet
            </button>
          </div>
        </div>
      )}

      {/* CHANGE 9 — RENEW LISTING PAYMENT MODAL */}
      {renewingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-100 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>🔄</span> Renew Property Listing
              </h3>
              <button onClick={() => setRenewingProperty(null)} className="p-1 hover:bg-stone-100 rounded-full">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={submitRenewalPayment} className="space-y-4 py-4">
              <div>
                <p className="text-xs text-stone-400 uppercase font-bold">Property</p>
                <p className="text-sm font-black text-stone-950 mt-0.5">{renewingProperty.title}</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <p className="text-xs text-emerald-800 font-bold uppercase">Renewal Fee Amount</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">KES {getListingFee(renewingProperty.type)}</p>
                <p className="text-[10px] text-emerald-700 font-bold mt-1">Based on property type: {renewingProperty.type?.replace('_', ' ')}</p>
              </div>

              <div className="space-y-2 text-xs text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <p className="font-bold text-stone-800 text-xs">📲 M-Pesa Paybill Instructions:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to M-Pesa menu and select <strong>Lipa Na M-Pesa</strong></li>
                  <li>Click <strong>Paybill</strong> option</li>
                  <li>Enter Business Number: <strong>247247</strong></li>
                  <li>Enter Account Number: <strong>0715185037</strong></li>
                  <li>Enter Amount: <strong>KES {getListingFee(renewingProperty.type)}</strong></li>
                  <li>Confirm transaction and copy the transaction code!</li>
                </ol>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-stone-500 block">M-Pesa Transaction Code *</label>
                <input
                  type="text"
                  placeholder="e.g. UG42KAHXNA"
                  value={renewMpesaCode}
                  onChange={(e) => setRenewMpesaCode(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRenewingProperty(null)}
                  className="flex-1 py-3 border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewingStatus}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1 shadow"
                >
                  {renewingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Submit Renewal</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE 8 — INQUIRY REPLY MODAL */}
      {replyingInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                Reply to {replyingInquiry.tenant?.full_name}
              </h3>
              <button onClick={() => setReplyingInquiry(null)} className="p-1 hover:bg-stone-100 rounded-full">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={submitInquiryReplyFromModal} className="space-y-4 py-3">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-150 text-xs text-stone-600 italic">
                <p className="font-bold text-stone-500 not-italic mb-1">Original inquiry message:</p>
                "{replyingInquiry.message}"
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-stone-500 block">Type your SMS reply *</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Hi! The rental room is still vacant and water is available. Welcome to visit..."
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  required
                ></textarea>
              </div>

              {/* Call instead direct link */}
              <div>
                <a
                  href={`tel:${replyingInquiry.tenant?.phone}`}
                  className="text-emerald-700 hover:underline font-extrabold text-xs flex items-center gap-1.5"
                >
                  📞 Call Instead: {replyingInquiry.tenant?.phone}
                </a>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReplyingInquiry(null)}
                  className="flex-1 py-3 border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replyingStatus}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1 shadow"
                >
                  {replyingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Send SMS Reply</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOST LISTING MODAL */}
      {boostingProperty && (
        <BoostListing
          propertyId={boostingProperty.id}
          landlordId={profile.id}
          propertyTitle={boostingProperty.title}
          currentPhone={profile.phone || ""}
          onClose={() => setBoostingProperty(null)}
          onSuccess={() => {
            setBoostingProperty(null);
            fetchDashboardData();
            showToast("⚡ Property boosted successfully!", "success");
          }}
        />
      )}

      {/* UNLOCK LEAD MODAL */}
      {unlockingInquiry && (
        <UnlockLead
          inquiryId={unlockingInquiry.inquiryId}
          propertyId={unlockingInquiry.propertyId}
          landlordId={profile.id}
          propertyTitle={unlockingInquiry.propertyTitle}
          propertyType={unlockingInquiry.propertyType}
          leadCredits={unlockingInquiry.leadCredits}
          currentPhone={profile.phone || ""}
          onClose={() => setUnlockingInquiry(null)}
          onSuccess={() => {
            setUnlockingInquiry(null);
            fetchDashboardData();
            showToast("🔑 Lead unlocked successfully!", "success");
          }}
        />
      )}

    </div>
  );
};
