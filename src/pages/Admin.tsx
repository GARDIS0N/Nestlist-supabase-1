import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { BOOST_TIERS } from "../lib/constants";
import { 
  Shield, Landmark, Users, Home, RefreshCw, Check, X, 
  Loader2, ArrowLeft, Calendar, Coins, MapPin, User, Mail, 
  Phone, Eye, Power, AlertCircle, FileText, CheckCircle2,
  Download, Bell, Clock, Trash, AlertTriangle, ShieldCheck, Search
} from "lucide-react";

export const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [profile]);

  const [activeTab, setActiveTab] = useState<"payments" | "listings" | "users" | "boosts" | "unlocks">("payments");
  const [loading, setLoading] = useState(true);

  // States
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [allBoosts, setAllBoosts] = useState<any[]>([]);
  const [allUnlocks, setAllUnlocks] = useState<any[]>([]);
  const [grantBoostLoading, setGrantBoostLoading] = useState(false);
  const [grantCreditsLoading, setGrantCreditsLoading] = useState(false);
  const [boostSearch, setBoostSearch] = useState("");
  const [unlockSearch, setUnlockSearch] = useState("");
  const [activityLimit, setActivityLimit] = useState(5);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isPulling, setIsPulling] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);

  // Form States for Granting Visibility Boosts & Credits
  const [boostFormPropertyId, setBoostFormPropertyId] = useState("");
  const [boostFormTier, setBoostFormTier] = useState("3day");
  const [boostFormAmount, setBoostFormAmount] = useState(50);
  const [creditsFormPropertyId, setCreditsFormPropertyId] = useState("");
  const [creditsFormAmount, setCreditsFormAmount] = useState(5);
  const [creditsFormPaid, setCreditsFormPaid] = useState(0);

  // Stats State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeListings: 0,
    pendingPayments: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
    listingRevenue: 0,
    boostRevenue: 0,
    leadRevenue: 0,
  });

  // Toast message state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Search & Filter States
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilter, setListingFilter] = useState<"all" | "active" | "pending" | "expired" | "rejected">("all");

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");

  // Dialog & Modal States
  const [verifyingPayment, setVerifyingPayment] = useState<any | null>(null);
  const [verifyingLoading, setVerifyingLoading] = useState(false);

  const [rejectingPayment, setRejectingPayment] = useState<any | null>(null);
  const [rejectingLoading, setRejectingLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [listingActionLoading, setListingActionLoading] = useState<string | null>(null);

  // Helper to show custom notification toast
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  if (profile?.role !== 'admin') {
    return null;
  }

  // Data Fetching functions
  const fetchPendingPayments = async () => {
    try {
      // 1. Try standard implicit join first (most reliable when single foreign key exists)
      const { data, error } = await supabase
        .from('listing_payments')
        .select(`
          *,
          properties(title, type, price, location),
          profiles(full_name, phone)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Admin pending payments standard join error, trying explicit modifier:', error);
        
        // 2. Try explicit modifier
        const { data: data2, error: error2 } = await supabase
          .from('listing_payments')
          .select(`
            *,
            properties(title, type, price, location),
            profiles!landlord_id(full_name, phone)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (error2) {
          console.warn('Admin pending payments explicit modifier error, trying manual resolution:', error2);
          
          // 3. Fallback: select listing_payments and then query profiles manually
          const { data: rawPayments, error: error3 } = await supabase
            .from('listing_payments')
            .select('*, properties(title, type, price, location)')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

          if (error3) {
            throw error3;
          }

          const payments = rawPayments || [];
          if (payments.length === 0) {
            setPendingPayments([]);
            return;
          }

          const landlordIds = Array.from(new Set(payments.map((p: any) => p.landlord_id).filter(Boolean)));
          if (landlordIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, phone')
              .in('id', landlordIds);

            if (!profilesError && profilesData) {
              const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
              const merged = payments.map((p: any) => ({
                ...p,
                profiles: profilesMap.get(p.landlord_id) || null
              }));
              setPendingPayments(merged);
              return;
            }
          }
          setPendingPayments(payments.map((p: any) => ({ ...p, profiles: null })));
        } else {
          setPendingPayments(data2 || []);
        }
      } else {
        setPendingPayments(data || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch pending payments:", err);
      showToast("Error loading pending payments: " + err.message, "error");
    }
  };

  const fetchAllListings = async () => {
    setListingsError(null);
    try {
      // 1. Try standard implicit profiles join first (most reliable)
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles (
            id,
            full_name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Admin listings standard join error, trying explicit modifier:', error);
        
        // 2. Try explicit relation qualifier
        const { data: data2, error: error2 } = await supabase
          .from('properties')
          .select(`
            *,
            profiles!landlord_id (
              id,
              full_name,
              phone,
              email
            )
          `)
          .order('created_at', { ascending: false });
          
        if (error2) {
          console.warn('Admin listings explicit modifier error, trying manual resolution:', error2);
          
          // 3. Fallback: select properties alone and then query profiles manually
          const { data: data3, error: error3 } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error3) {
            throw error3;
          }
          
          const rawProperties = data3 || [];
          if (rawProperties.length === 0) {
            setAllListings([]);
            return;
          }
          
          const landlordIds = Array.from(new Set(rawProperties.map((p: any) => p.landlord_id).filter(Boolean)));
          
          if (landlordIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, phone, email')
              .in('id', landlordIds);
              
            if (!profilesError && profilesData) {
              const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
              const merged = rawProperties.map((p: any) => ({
                ...p,
                profiles: profilesMap.get(p.landlord_id) || null
              }));
              setAllListings(merged);
              return;
            }
          }
          
          setAllListings(rawProperties.map((p: any) => ({ ...p, profiles: null })));
        } else {
          setAllListings(data2 || []);
        }
      } else {
        setAllListings(data || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch listings:", err);
      setListingsError(err.message || "Failed to load listings");
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      showToast("Error loading users: " + err.message, "error");
    }
  };

  const fetchBoosts = async () => {
    try {
      const { data, error } = await supabase
        .from('listing_boosts')
        .select(`
          *,
          property:properties(title, type, location),
          landlord:profiles(full_name, phone)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllBoosts(data || []);
    } catch (err: any) {
      console.error("Failed to fetch boosts:", err);
    }
  };

  const fetchUnlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_unlocks')
        .select(`
          *,
          property:properties(title, type, location),
          landlord:profiles(full_name, phone)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllUnlocks(data || []);
    } catch (err: any) {
      console.error("Failed to fetch unlocks:", err);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const [
        { data: profilesData },
        { data: paymentsData },
        { data: propertiesData }
      ] = await Promise.all([
        supabase.from('profiles')
          .select('id, full_name, role, created_at')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('listing_payments')
          .select('id, mpesa_code, status, created_at, landlord_id, properties(title)')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('properties')
          .select('id, title, landlord_id, expires_at, created_at')
          .order('created_at', { ascending: false })
          .limit(15)
      ]);

      const activities: any[] = [];

      profilesData?.forEach((p: any) => {
        const eventType = p.role === 'landlord' ? 'landlord_registered' : 'tenant_registered';
        activities.push({
          id: `user-${p.id}-${p.created_at}`,
          userId: p.id,
          eventType,
          boldName: p.full_name || 'A new user',
          boldRole: p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : 'Tenant',
          timestamp: new Date(p.created_at)
        });
      });

      paymentsData?.forEach((pm: any) => {
        if (pm.status === 'pending') {
          activities.push({
            id: `payment-sub-${pm.id}`,
            userId: pm.landlord_id,
            eventType: 'payment_submitted',
            title: pm.properties?.title || 'a property',
            mpesaCode: pm.mpesa_code || 'code',
            timestamp: new Date(pm.created_at)
          });
        } else if (pm.status === 'confirmed') {
          activities.push({
            id: `payment-live-${pm.id}`,
            userId: pm.landlord_id,
            eventType: 'listing_live',
            title: pm.properties?.title || 'property',
            timestamp: new Date(pm.created_at)
          });
          activities.push({
            id: `payment-verified-${pm.id}`,
            userId: pm.landlord_id,
            eventType: 'payment_verified',
            mpesaCode: pm.mpesa_code || 'code',
            timestamp: new Date(pm.created_at)
          });
        } else if (pm.status === 'failed') {
          activities.push({
            id: `payment-fail-${pm.id}`,
            userId: pm.landlord_id,
            eventType: 'payment_rejected',
            mpesaCode: pm.mpesa_code || 'code',
            timestamp: new Date(pm.created_at)
          });
        }
      });

      propertiesData?.forEach((p: any) => {
        const now = new Date();
        const hasExpiry = p.expires_at ? new Date(p.expires_at) : null;
        if (hasExpiry && hasExpiry < now) {
          activities.push({
            id: `prop-expired-${p.id}`,
            userId: p.landlord_id,
            eventType: 'listing_expired',
            title: p.title,
            timestamp: hasExpiry
          });
        }
      });

      // Sort combined array by timestamp desc
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Deduplicate: if same user_id + same event_type within 60 seconds, or multiple registrations of the same user
      const deduplicated: any[] = [];
      const seenRegistrations = new Set<string>(); // Track seen user ids and names for registration events

      for (const act of activities) {
        const isReg = act.eventType === 'tenant_registered' || act.eventType === 'landlord_registered';
        
        if (isReg) {
          const regKey = act.userId || act.boldName;
          if (regKey && regKey !== 'A new user') {
            if (seenRegistrations.has(regKey)) {
              continue; // Skip duplicate registration event
            }
            seenRegistrations.add(regKey);
          }
        }

        const isDuplicate = deduplicated.some(item => 
          item.userId === act.userId && 
          item.eventType === act.eventType && 
          Math.abs(item.timestamp.getTime() - act.timestamp.getTime()) < 60000
        );
        if (!isDuplicate) {
          deduplicated.push(act);
        }
      }

      setRecentActivities(deduplicated);
    } catch (err) {
      console.error("Failed to load recent activity:", err);
    }
  };

  // Consolidated loading handler based on active tab
  const refreshData = async () => {
    setLoading(true);
    setListingsError(null);

    try {
      const statsRes = await fetch('/api/admin/stats');
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.error || "Failed to load stats");

      setStats({
        totalRevenue: statsData.totalRevenue || 0,
        activeListings: statsData.activeListings || 0,
        pendingPayments: statsData.pendingPayments || 0,
        totalUsers: statsData.totalUsers || 0,
        monthlyRevenue: statsData.monthlyRevenue || 0,
        listingRevenue: statsData.listingRevenue || 0,
        boostRevenue: statsData.boostRevenue || 0,
        leadRevenue: statsData.leadRevenue || 0,
      });

      setLastUpdated(new Date().toLocaleTimeString("en-KE", { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error("Failed to load statistics via API, trying direct supabase fallback:", err);
      try {
        const [
          { count: activeCount },
          { count: pendingCount },
          { count: usersCount },
          { data: payments },
        ] = await Promise.all([
          supabase.from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase.from('listing_payments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase.from('profiles')
            .select('*', { count: 'exact', head: true }),
          supabase.from('listing_payments')
            .select('amount')
            .eq('status', 'confirmed'),
        ]);

        const revenue = payments?.reduce(
          (sum, p) => sum + (p.amount || 0), 0
        ) || 0;

        setStats({
          totalRevenue: revenue,
          activeListings: activeCount || 0,
          pendingPayments: pendingCount || 0,
          totalUsers: usersCount || 0,
          monthlyRevenue: revenue,
          listingRevenue: revenue,
          boostRevenue: 0,
          leadRevenue: 0,
        });
        setLastUpdated(new Date().toLocaleTimeString("en-KE", { hour: '2-digit', minute: '2-digit' }));
      } catch (fallbackErr) {
        console.error("Fallback statistics query failed:", fallbackErr);
      }
    }

    // Refresh current selected view
    await Promise.all([
      fetchPendingPayments(),
      fetchAllListings(),
      fetchAllUsers(),
      fetchRecentActivity(),
      fetchBoosts(),
      fetchUnlocks()
    ]);

    setLoading(false);
  };

  // Trigger initial fetch when tab changes or loads
  useEffect(() => {
    if (profile?.role === 'admin') {
      refreshData();
    }
  }, [profile]);

  // Auto-refresh every 60 seconds if admin has pending payments > 0
  useEffect(() => {
    if (stats.pendingPayments > 0) {
      const interval = setInterval(refreshData, 60000);
      return () => clearInterval(interval);
    }
  }, [stats.pendingPayments]);

  // Real-time notification subscription for new pending payments
  useEffect(() => {
    const channel = supabase
      .channel('admin-payments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listing_payments',
          filter: 'status=eq.pending'
        },
        (payload) => {
          showToast(
            '🆕 New payment submitted! ' + payload.new.mpesa_code,
            'info'
          );
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Pull to refresh setup
  useEffect(() => {
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (startY && window.scrollY === 0) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        if (pullDistance > 120 && !loading) {
          setIsPulling(true);
        }
      }
    };
    const handleTouchEnd = () => {
      if (isPulling) {
        setIsPulling(false);
        refreshData();
      }
      startY = 0;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [loading, isPulling]);

  // Actions: Approve Payment Submit
  const handleApprovePaymentSubmit = async () => {
    if (!verifyingPayment) return;
    setVerifyingLoading(true);
    try {
      // 1. Update payment status to confirmed
      const { error: paymentError } = await supabase
        .from('listing_payments')
        .update({ 
          status: 'confirmed', 
          confirmed_at: new Date().toISOString(),
          verified_at: new Date().toISOString()
        })
        .eq('id', verifyingPayment.id);

      if (paymentError) throw paymentError;

      // 2. Activate the property listing and set its expiry to 30 days
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ 
          is_active: true, 
          payment_status: 'verified',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', verifyingPayment.property_id);

      if (propertyError) throw propertyError;

      showToast("✅ Listing is now LIVE!", "success");
      setVerifyingPayment(null);
      await refreshData();
    } catch (err: any) {
      console.error("Failed to approve listing:", err);
      showToast("Approval failed: " + err.message, "error");
    } finally {
      setVerifyingLoading(false);
    }
  };

  // Actions: Reject Payment Submit
  const handleRejectPaymentSubmit = async () => {
    if (!rejectingPayment) return;
    if (!rejectionReason.trim()) {
      showToast("Reason for rejection is required.", "error");
      return;
    }
    setRejectingLoading(true);
    try {
      const { error: paymentError } = await supabase
        .from('listing_payments')
        .update({ 
          status: 'failed', 
          rejection_reason: rejectionReason 
        })
        .eq('id', rejectingPayment.id);

      if (paymentError) throw paymentError;

      // Update property payment status as well
      const { error: propertyError } = await supabase
        .from('properties')
        .update({
          payment_status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', rejectingPayment.property_id);

      if (propertyError) throw propertyError;

      showToast("Payment rejected. Landlord notified.", "success");
      setRejectingPayment(null);
      setRejectionReason("");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to reject payment:", err);
      showToast("Rejection failed: " + err.message, "error");
    } finally {
      setRejectingLoading(false);
    }
  };

  // Actions: Toggle Listing Activation
  const handleToggleListingActive = async (property: any) => {
    const nextActive = !property.is_active;
    setListingActionLoading(property.id);
    try {
      const payload: any = { is_active: nextActive };
      if (nextActive) {
        payload.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        payload.expires_at = null;
      }

      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', property.id);

      if (error) throw error;

      showToast(`Property listing successfully ${nextActive ? "activated" : "suspended"}!`, "success");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to toggle property state:", err);
      showToast("Error updating listing status: " + err.message, "error");
    } finally {
      setListingActionLoading(null);
    }
  };

  // Actions: Toggle User status (Suspend / Restore)
  const handleToggleUserActive = async (user: any) => {
    const nextActive = !user.is_active;
    setUserActionLoading(user.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextActive })
        .eq('id', user.id);

      if (error) throw error;

      showToast(`User account successfully ${nextActive ? "restored" : "suspended"}!`, "success");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to toggle user status:", err);
      showToast("Error updating user status: " + err.message, "error");
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleCancelBoost = async (boost: any) => {
    if (!window.confirm("Are you sure you want to cancel this boost?")) return;
    try {
      // Update property
      const { error: propError } = await supabase
        .from('properties')
        .update({
          is_boosted: false,
          boost_tier: null,
          boost_expires_at: null,
          boost_badge: null
        })
        .eq('id', boost.property_id);
      if (propError) throw propError;

      // Update boost history
      const { error: boostError } = await supabase
        .from('listing_boosts')
        .update({
          expires_at: new Date().toISOString(),
          status: 'expired'
        })
        .eq('id', boost.id);
      if (boostError) throw boostError;

      showToast("⚡ Boost cancelled successfully!", "success");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to cancel boost:", err);
      showToast("Failed to cancel boost: " + err.message, "error");
    }
  };

  const handleGrantBoost = async (propertyId: string, tier: string, customAmount: number) => {
    if (!propertyId || !tier) {
      showToast("Please select a property and boost tier", "error");
      return;
    }
    setGrantBoostLoading(true);
    try {
      const prop = allListings.find(p => p.id === propertyId);
      if (!prop) throw new Error("Property not found");

      const daysMap: Record<string, number> = { '3day': 3, '7day': 7, '14day': 14, '30day': 30 };
      const badgeMap: Record<string, string> = { '3day': '⚡ Featured', '7day': '⭐ Featured', '14day': '🔥 Hot Property', '30day': '👑 Premium' };
      const days = daysMap[tier] || 3;
      const badge = badgeMap[tier] || '⚡ Featured';
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      // 1. Update property
      const { error: propError } = await supabase
        .from('properties')
        .update({
          is_boosted: true,
          boost_tier: tier,
          boost_expires_at: expiresAt,
          boost_badge: badge
        })
        .eq('id', propertyId);
      if (propError) throw propError;

      // 2. Insert into listing_boosts
      const { error: boostError } = await supabase
        .from('listing_boosts')
        .insert({
          property_id: propertyId,
          landlord_id: prop.landlord_id,
          boost_tier: tier,
          amount_paid: customAmount,
          status: 'confirmed',
          mpesa_code: 'ADMIN_GRANTED',
          starts_at: new Date().toISOString(),
          expires_at: expiresAt
        });
      if (boostError) throw boostError;

      showToast("⚡ Boost granted successfully!", "success");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to grant boost:", err);
      showToast("Failed to grant boost: " + err.message, "error");
    } finally {
      setGrantBoostLoading(false);
    }
  };

  const handleGrantCredits = async (propertyId: string, credits: number, customAmount: number) => {
    if (!propertyId || !credits) {
      showToast("Please select a property and number of credits", "error");
      return;
    }
    setGrantCreditsLoading(true);
    try {
      const prop = allListings.find(p => p.id === propertyId);
      if (!prop) throw new Error("Property not found");

      const newCredits = (prop.lead_credits || 0) + credits;

      // 1. Update property
      const { error: propError } = await supabase
        .from('properties')
        .update({
          lead_credits: newCredits
        })
        .eq('id', propertyId);
      if (propError) throw propError;

      // 2. Insert into lead_unlocks (as bundle purchase)
      const { error: unlockError } = await supabase
        .from('lead_unlocks')
        .insert({
          property_id: propertyId,
          landlord_id: prop.landlord_id,
          amount_paid: customAmount,
          bundle_size: credits,
          status: 'confirmed',
          mpesa_code: 'ADMIN_GRANTED',
          unlocked_at: new Date().toISOString()
        });
      if (unlockError) throw unlockError;

      showToast(`🔓 Successfully added ${credits} credits!`, "success");
      await refreshData();
    } catch (err: any) {
      console.error("Failed to grant credits:", err);
      showToast("Failed to grant credits: " + err.message, "error");
    } finally {
      setGrantCreditsLoading(false);
    }
  };

  const handleBellClick = () => {
    setActiveTab("payments");
    const el = document.getElementById("admin-segmented-tabs");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // CSV Exporter helper
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : JSON.stringify(val ?? '');
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
  };

  const handleExportUsers = () => {
    const dataToExport = filteredUsers.map(u => ({
      Name: u.full_name || '',
      Email: u.email || '',
      Phone: u.phone || '',
      Role: u.role || 'tenant',
      "Joined Date": u.created_at ? new Date(u.created_at).toLocaleDateString("en-KE") : '',
      "Listing Count": allListings.filter(p => p.landlord_id === u.id).length,
      Status: u.is_active ? 'Active' : 'Suspended'
    }));
    exportToCSV(dataToExport, 'nestlist_users_' + new Date().toISOString().split('T')[0]);
    showToast("Users exported successfully!", "success");
  };

  const handleExportPayments = async () => {
    try {
      showToast("Preparing CSV export...", "info");
      
      const executeExport = (paymentsList: any[]) => {
        const formatted = paymentsList.map((p: any) => ({
          "M-Pesa Code": p.mpesa_code || '',
          "Landlord Name": p.profiles?.full_name || '',
          Phone: p.profiles?.phone || '',
          "Property Title": p.properties?.title || '',
          Type: p.properties?.type || '',
          Amount: p.amount || 0,
          Status: p.status || 'pending',
          "Submission Date": p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : '',
          "Verification Date": p.verified_at ? new Date(p.verified_at).toLocaleDateString("en-KE") : ''
        }));

        exportToCSV(formatted, 'nestlist_payments_' + new Date().toISOString().split('T')[0]);
        showToast("Payments exported successfully!", "success");
      };

      // 1. Try standard implicit join first (most reliable)
      const { data, error } = await supabase
        .from('listing_payments')
        .select(`
          mpesa_code,
          amount,
          status,
          created_at,
          verified_at,
          properties(title, type),
          profiles(full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Admin export payments standard join error, trying explicit modifier:', error);
        
        // 2. Try explicit modifier
        const { data: data2, error: error2 } = await supabase
          .from('listing_payments')
          .select(`
            mpesa_code,
            amount,
            status,
            created_at,
            verified_at,
            properties(title, type),
            profiles!landlord_id(full_name, phone)
          `)
          .order('created_at', { ascending: false });

        if (error2) {
          console.warn('Admin export payments explicit modifier error, trying manual resolution:', error2);
          
          // 3. Fallback: query raw payments and manually map profiles
          const { data: rawPayments, error: error3 } = await supabase
            .from('listing_payments')
            .select(`
              mpesa_code,
              amount,
              status,
              created_at,
              verified_at,
              landlord_id,
              properties(title, type)
            `)
            .order('created_at', { ascending: false });

          if (error3) throw error3;

          const payments = rawPayments || [];
          if (payments.length === 0) {
            showToast("No payments found to export.", "error");
            return;
          }

          const landlordIds = Array.from(new Set(payments.map((p: any) => p.landlord_id).filter(Boolean)));
          if (landlordIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, phone')
              .in('id', landlordIds);

            if (!profilesError && profilesData) {
              const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
              const merged = payments.map((p: any) => ({
                ...p,
                profiles: profilesMap.get(p.landlord_id) || null
              }));
              executeExport(merged);
              return;
            }
          }
          executeExport(payments.map((p: any) => ({ ...p, profiles: null })));
        } else {
          if (!data2 || data2.length === 0) {
            showToast("No payments found to export.", "error");
            return;
          }
          executeExport(data2);
        }
      } else {
        if (!data || data.length === 0) {
          showToast("No payments found to export.", "error");
          return;
        }
        executeExport(data);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Export failed: " + err.message, "error");
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filter listings based on listingSearch & listingFilter
  const filteredListings = allListings.filter(property => {
    const titleMatch = property.title?.toLowerCase().includes(listingSearch.toLowerCase());
    const landlordMatch = property.profiles?.full_name?.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesSearch = titleMatch || landlordMatch;

    if (!matchesSearch) return false;

    if (listingFilter !== "all") {
      const now = new Date();
      const hasExpiry = property.expires_at ? new Date(property.expires_at) : null;
      
      if (listingFilter === "active") {
        return property.is_active && (!hasExpiry || hasExpiry >= now);
      }
      if (listingFilter === "expired") {
        return hasExpiry && hasExpiry < now;
      }
      if (listingFilter === "rejected") {
        return !!property.rejection_reason || property.payment_status === "rejected";
      }
      if (listingFilter === "pending") {
        return !property.is_active && !property.rejection_reason && (!hasExpiry || hasExpiry >= now);
      }
    }
    return true;
  });

  // Filter users based on userSearch & userRoleFilter
  const filteredUsers = allUsers.filter(u => {
    const nameMatch = u.full_name?.toLowerCase().includes(userSearch.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const phoneMatch = u.phone?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesSearch = nameMatch || emailMatch || phoneMatch;

    if (!matchesSearch) return false;

    if (userRoleFilter !== "all") {
      const r = u.role?.toLowerCase() || 'tenant';
      if (userRoleFilter === "landlords" && r !== "landlord") return false;
      if (userRoleFilter === "caretakers" && r !== "caretaker") return false;
      if (userRoleFilter === "agents" && r !== "agent") return false;
      if (userRoleFilter === "tenants" && r !== "tenant") return false;
      if (userRoleFilter === "admins" && r !== "admin" && r !== "superadmin") return false;
    }
    return true;
  });

  const getPropertyStatusDetails = (property: any) => {
    const now = new Date();
    const hasExpiry = property.expires_at ? new Date(property.expires_at) : null;
    if (hasExpiry && hasExpiry < now) {
      return { label: "Expired", bg: "bg-stone-100 text-stone-600 border-stone-200" };
    }
    if (property.is_active) {
      return { label: "Verified & Active", bg: "bg-green-100 text-green-800 border-green-200" };
    }
    if (property.rejection_reason || property.payment_status === "rejected") {
      return { label: "Rejected", bg: "bg-red-100 text-red-800 border-red-200" };
    }
    if (property.payment_status === "pending_verification") {
      return { label: "Pending Verification", bg: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    return { label: "Unpaid", bg: "bg-rose-100 text-rose-800 border-rose-200" };
  };

  const getPillCount = (f: "all" | "active" | "pending" | "expired" | "rejected") => {
    const now = new Date();
    return allListings.filter(property => {
      if (f === "all") return true;
      const hasExpiry = property.expires_at ? new Date(property.expires_at) : null;
      if (f === "active") {
        return property.is_active && (!hasExpiry || hasExpiry >= now);
      }
      if (f === "expired") {
        return hasExpiry && hasExpiry < now;
      }
      if (f === "rejected") {
        return !!property.rejection_reason || property.payment_status === "rejected";
      }
      if (f === "pending") {
        return !property.is_active && !property.rejection_reason && (!hasExpiry || hasExpiry >= now);
      }
      return true;
    }).length;
  };

  const getActivityStyle = (type: string) => {
    switch(type) {
      case 'listing_live':
        return { dot: '#1E6B4A', icon: '🏠' }; 
      case 'landlord_registered':
        return { dot: '#1E6B4A', icon: '🔑' }; 
      case 'tenant_registered':
        return { dot: '#3B82F6', icon: '🔍' }; 
      case 'payment_submitted':
        return { dot: '#D97706', icon: '💳' }; 
      case 'payment_verified':
        return { dot: '#1E6B4A', icon: '✅' }; 
      case 'payment_rejected':
        return { dot: '#DC2626', icon: '❌' }; 
      case 'listing_expired':
        return { dot: '#9CA3AF', icon: '⏰' }; 
      default:
        return { dot: '#9CA3AF', icon: '📋' };
    }
  };

  const renderActivityText = (item: any) => {
    switch(item.eventType) {
      case 'listing_live':
        return (
          <span>
            Listing '<span className="font-bold text-[#1E6B4A]">{item.title}</span>' went <span className="font-bold text-emerald-700">LIVE</span>
          </span>
        );
      case 'landlord_registered':
      case 'tenant_registered':
        return (
          <span>
            <span className="font-semibold text-stone-900">{item.boldName}</span> registered as <strong className="font-bold text-emerald-700">{item.boldRole}</strong>
          </span>
        );
      case 'payment_submitted':
        return (
          <span>
            Payment <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">{item.mpesaCode}</span> submitted for <span className="font-semibold text-stone-900">'{item.title}'</span>
          </span>
        );
      case 'payment_verified':
        return (
          <span>
            Payment <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">{item.mpesaCode}</span> was verified
          </span>
        );
      case 'payment_rejected':
        return (
          <span>
            Payment <span className="font-mono font-bold text-red-800 bg-red-50 px-1 py-0.5 rounded border border-red-200">{item.mpesaCode}</span> was rejected
          </span>
        );
      case 'listing_expired':
        return (
          <span>
            Listing <span className="font-semibold text-stone-700">'{item.title}'</span> has <span className="text-stone-500 font-semibold">expired</span>
          </span>
        );
      default:
        return <span>{item.text || 'System event'}</span>;
    }
  };

  return (
    <div 
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(30,107,74,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        minHeight: '100vh',
        backgroundColor: '#FAFAF8'
      }}
      className="w-full pb-16"
    >
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 py-3 px-5 rounded-xl border shadow-lg text-sm transition-all duration-300 animate-fade-in ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : toast.type === "info"
              ? "bg-blue-50 border-blue-100 text-blue-800"
              : "bg-rose-50 border-rose-100 text-rose-800"
          }`}
          id="admin-toast-message"
        >
          {toast.type === "success" && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />}
          {toast.type === "info" && <AlertCircle className="h-4.5 w-4.5 text-blue-600 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />}
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Pull down gesture release message */}
      {isPulling && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 z-50 animate-bounce">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Release to refresh terminal...</span>
        </div>
      )}

      {/* Main bounded container of exactly max-width 900px, centered with 16px padding */}
      <div className="max-w-[900px] mx-auto pt-8 px-4" id="admin-panel-page">
        
        {/* HEADER BANNER */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #0A4D2E, #1E6B4A)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white',
          }}
          className="shadow-md relative"
        >
          {/* Bell notification badge top right */}
          <button 
            onClick={handleBellClick}
            className="absolute top-4 right-16 p-2 rounded-full hover:bg-white/10 transition text-white relative cursor-pointer"
            title="Pending notification bell"
          >
            <Bell className={`h-5 w-5 ${stats.pendingPayments > 0 ? "animate-swing" : ""}`} />
            {stats.pendingPayments > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-[#0A4D2E]" />
            )}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-white leading-none flex items-center gap-2">
                  Nestlist Admin Hub
                </h1>
                <p className="text-white/60 text-xs mt-1.5 font-medium">Verified Administrator Terminal</p>
                <p className="text-white/60 text-xs font-mono">Managed by {profile?.email || "gardisonkirui11@gmail.com"}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
              <button
                onClick={refreshData}
                disabled={loading}
                className="h-9 w-9 rounded-full border border-white/20 hover:bg-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-40"
                title="Refresh all data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <span className="text-[11px] text-white/50">Last updated: {lastUpdated || "never"}</span>
            </div>
          </div>

          {/* Bottom row (4 mini stats inline, 2x2 grid on mobile) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-6">
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Total Revenue</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">KES {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">🏠</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Active Listings</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">{stats.activeListings}</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">⏳</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Pending</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">{stats.pendingPayments}</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-lg">👥</span>
              <div>
                <p className="text-[11px] text-white/70 leading-tight">Users</p>
                <p className="text-sm sm:text-[18px] font-bold text-white font-mono leading-tight">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS CARDS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1 — Total Revenue */}
          <div 
            className="bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            style={{ borderTop: '3px solid #1E6B4A' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Total Revenue</span>
              <div className="h-8 w-8 rounded-full bg-[#F0FDF4] border border-emerald-100 flex items-center justify-center text-sm">
                💰
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold font-mono" style={{ color: '#1E6B4A' }}>
                KES {stats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5 mb-2.5">All time</p>
              
              <div className="border-t border-stone-100 pt-2 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-stone-600 font-medium">
                  <span>📌 Listings</span>
                  <span className="font-mono font-semibold text-stone-900">KES {(stats.listingRevenue || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600 font-medium">
                  <span>⚡ Boosts</span>
                  <span className="font-mono font-semibold text-stone-900">KES {(stats.boostRevenue || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600 font-medium">
                  <span>🔑 Unlocks</span>
                  <span className="font-mono font-semibold text-stone-900">KES {(stats.leadRevenue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — Active Listings */}
          <div 
            className="bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            style={{ borderTop: '3px solid #2D9E6B' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Active Listings</span>
              <div className="h-8 w-8 rounded-full bg-[#DCFCE7] border border-green-100 flex items-center justify-center text-sm">
                🏠
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold font-mono" style={{ color: '#2D9E6B' }}>
                {stats.activeListings}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Currently live</p>
            </div>
          </div>

          {/* Card 3 — Pending Payments */}
          <div 
            className={`bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md ${
              stats.pendingPayments > 0 ? "animate-pulse border-amber-300" : ""
            }`}
            style={{ 
              borderTop: '3px solid #D97706' 
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Pending Review</span>
              <div className="h-8 w-8 rounded-full bg-[#FEF3C7] flex items-center justify-center text-sm">
                ⏳
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold font-mono" style={{ color: '#D97706' }}>
                {stats.pendingPayments}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Awaiting verification</p>
            </div>
          </div>

          {/* Card 4 — Total Users */}
          <div 
            className="bg-white border border-[#E2EAE6] rounded-xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            style={{ borderTop: '3px solid #0A4D2E' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Registered Users</span>
              <div className="h-8 w-8 rounded-full bg-[#F0FDF4] border border-emerald-100 flex items-center justify-center text-sm">
                👥
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold font-mono" style={{ color: '#0A4D2E' }}>
                {stats.totalUsers}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Landlords & tenants</p>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY FEED */}
        <div className="bg-white border border-[#E2EAE6] rounded-2xl p-5 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
            <div className="flex flex-col">
              <h2 className="text-xs font-black text-stone-500 uppercase tracking-wider">
                RECENT ACTIVITY • {recentActivities.length} events logged
              </h2>
              <span className="text-[11px] text-stone-400 mt-0.5">Last updated: {lastUpdated || "never"}</span>
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="h-8 w-8 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-600 flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-40"
              title="Refresh Activity"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          
          {recentActivities.length === 0 ? (
            <p className="text-xs text-stone-400 py-4 text-center">No recent activities logged today.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentActivities.slice(0, activityLimit).map((item) => {
                const style = getActivityStyle(item.eventType);
                return (
                  <div key={item.id} className="py-2.5 flex items-start gap-3">
                    {/* Left: Circle Dot + Emoji Stack */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.dot }} />
                      <span className="text-sm shrink-0">{style.icon}</span>
                    </div>

                    {/* Center: Wording with bold components */}
                    <div className="flex-1 min-w-0 text-sm text-stone-700 leading-relaxed">
                      {renderActivityText(item)}
                    </div>

                    {/* Right: Time Ago */}
                    <span className="text-[11px] text-stone-400 font-mono shrink-0 self-start pt-1">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {recentActivities.length > 5 && activityLimit === 5 && (
            <button
              onClick={() => setActivityLimit(15)}
              className="text-xs text-[#1E6B4A] font-bold mt-4 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all activity →
            </button>
          )}
          {activityLimit > 5 && (
            <button
              onClick={() => setActivityLimit(5)}
              className="text-xs text-[#1E6B4A] font-bold mt-4 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Collapse activity feed ↑
            </button>
          )}
        </div>

        {/* STICKY TAB NAVIGATION */}
        <div 
          className="sticky top-[64px] z-40 bg-white border border-[#E2EAE6] rounded-xl p-1 flex gap-1 mb-6 shadow-sm"
          id="admin-segmented-tabs"
        >
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex-1 py-2.5 px-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "payments" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] shadow-[0_1px_4px_rgba(30,107,74,0.1)] border border-emerald-100" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-pending-payments"
          >
            <span className="text-base shrink-0">🏛</span>
            <span>Pending</span>
            <span className={`text-[10px] font-black rounded-full px-2 py-0.5 leading-none ${
              stats.pendingPayments > 0
                ? "bg-red-100 text-red-700 animate-pulse"
                : "bg-[#F0FDF4] text-green-700"
            }`}>
              {stats.pendingPayments}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("listings")}
            className={`flex-1 py-2.5 px-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "listings" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] shadow-[0_1px_4px_rgba(30,107,74,0.1)] border border-emerald-100" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-all-listings"
          >
            <span className="text-base shrink-0">🏠</span>
            <span>Listings</span>
            <span className="text-[10px] bg-stone-100 text-stone-600 rounded-full px-2 py-0.5 leading-none font-bold">
              {allListings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-2.5 px-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "users" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] shadow-[0_1px_4px_rgba(30,107,74,0.1)] border border-emerald-100" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-all-users"
          >
            <span className="text-base shrink-0">👥</span>
            <span>Users</span>
            <span className="text-[10px] bg-stone-100 text-stone-600 rounded-full px-2 py-0.5 leading-none font-bold">
              {stats.totalUsers}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("boosts")}
            className={`flex-1 py-2.5 px-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "boosts" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] shadow-[0_1px_4px_rgba(30,107,74,0.1)] border border-emerald-100" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-all-boosts"
          >
            <span className="text-base shrink-0">⚡</span>
            <span>Boosts</span>
            <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 leading-none font-bold">
              {allBoosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("unlocks")}
            className={`flex-1 py-2.5 px-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "unlocks" 
                ? "bg-[#F0FDF4] text-[#1E6B4A] shadow-[0_1px_4px_rgba(30,107,74,0.1)] border border-emerald-100" 
                : "bg-transparent text-[#4B5E54] hover:bg-[#FAFAF8]"
            }`}
            id="tab-btn-all-unlocks"
          >
            <span className="text-base shrink-0">🔓</span>
            <span>Unlocks</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 leading-none font-bold">
              {allUnlocks.length}
            </span>
          </button>
        </div>

        {/* MAIN TAB RENDER SPACE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-stone-200/80 rounded-2xl shadow-xs">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700 mb-3" />
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider">Syncing Database...</p>
          </div>
        ) : (
          <div id="admin-tab-content-container">
            
            {/* TAB 1: PENDING PAYMENTS */}
            {activeTab === "payments" && (
              <div>
                {pendingPayments.length === 0 ? (
                  /* PENDING PAYMENTS EMPTY STATE */
                  <div className="text-center py-12 px-6 bg-white border border-stone-200/80 rounded-2xl shadow-xs animate-fade-in" id="empty-payments-state">
                    <style>{`
                      @keyframes pulseCheck {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.06); }
                      }
                      .pulse-check-anim {
                        animation: pulseCheck 2s infinite ease-in-out;
                      }
                    `}</style>
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mb-4 pulse-check-anim">
                      <Check className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900">All caught up! ✅</h3>
                    <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                      No payments are waiting for verification.
                    </p>
                    
                    {/* Green Hint Box */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6 text-left max-w-md mx-auto">
                      <p className="text-xs text-green-800 leading-relaxed font-semibold">
                        💡 When a landlord submits their M-Pesa code it will appear here for you to verify.
                      </p>
                      <div className="mt-2.5 pt-2.5 border-t border-green-200/60 flex justify-between text-[11px] font-mono text-green-700">
                        <span>Paybill: <strong className="font-extrabold">247247</strong></span>
                        <span>Account: <strong className="font-extrabold">0715185037</strong></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4" id="pending-payments-cards-grid">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-stone-500 uppercase">{pendingPayments.length} pending submissions</span>
                      <button
                        onClick={handleExportPayments}
                        className="flex items-center gap-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 font-semibold text-xs py-1.5 px-3 rounded-lg transition active:scale-95 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    {pendingPayments.map((payment) => (
                      /* Payment Card */
                      <div 
                        key={payment.id} 
                        style={{
                          border: '1px solid #E2EAE6',
                          borderLeft: '4px solid #D97706',
                          borderRadius: '14px',
                          padding: '16px 18px',
                          background: 'white',
                          boxShadow: '0 2px 8px rgba(15,26,20,0.06)'
                        }}
                        className="animate-fade-in hover:shadow-md transition-shadow duration-150"
                        id={`payment-card-${payment.id}`}
                      >
                        {/* Row 1: Title + time ago */}
                        <div className="flex justify-between items-start gap-3">
                          <h4 className="font-bold text-sm sm:text-base text-stone-900 line-clamp-1">
                            {payment.properties?.title || "Listing Activation"}
                          </h4>
                          <span className="text-[11px] text-stone-400 font-mono shrink-0 pt-0.5">
                            {formatTimeAgo(new Date(payment.created_at))}
                          </span>
                        </div>

                        {/* Row 2: Property Type + Location Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="bg-emerald-50 border border-emerald-100/60 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize">
                            {payment.properties?.type?.replace('_', ' ') || "Apartment"}
                          </span>
                          <span className="bg-stone-100 border border-stone-200/60 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-full line-clamp-1 max-w-[150px]">
                            📍 {payment.properties?.location || "N/A"}
                          </span>
                        </div>

                        {/* Row 3: Landlord Info & Price */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-stone-100">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-stone-700">
                              <User className="h-3.5 w-3.5 text-stone-400" />
                              <span className="text-xs font-bold">{payment.profiles?.full_name || "Unknown Landlord"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-stone-500">
                              <Phone className="h-3.5 w-3.5 text-stone-400" />
                              <span className="text-xs font-mono">{payment.profiles?.phone || "No phone info"}</span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className="block text-[9px] text-stone-400 font-bold uppercase tracking-wider">Amount Paid</span>
                            <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                              KES {(payment.amount || payment.amount_paid || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Row 4: M-Pesa Code Display */}
                        <div className="mt-4 bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-3 flex flex-col items-center justify-center">
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">M-PESA CODE</span>
                          <span className="text-lg sm:text-2xl font-black font-mono tracking-widest text-[#1E6B4A] uppercase">
                            {payment.mpesa_code}
                          </span>
                        </div>

                        {/* Row 5: Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <button
                            type="button"
                            onClick={() => setRejectingPayment(payment)}
                            className="w-full h-12 sm:h-auto py-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] font-bold text-sm sm:text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#DC2626] hover:text-white transition active:scale-95 duration-150 cursor-pointer"
                          >
                            <X className="h-4 w-4 shrink-0" />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVerifyingPayment(payment)}
                            className="w-full h-12 sm:h-auto py-2.5 bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] font-bold text-sm sm:text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#1E6B4A] hover:text-white transition active:scale-95 duration-150 cursor-pointer"
                          >
                            <Check className="h-4 w-4 shrink-0" />
                            <span>Verify Payment</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ALL LISTINGS */}
            {activeTab === "listings" && (
              <div className="animate-fade-in" id="all-listings-tab">
                
                {/* Search Bar & Status Filter Row */}
                <div className="bg-white border border-[#E2EAE6] rounded-2xl p-4 mb-4 shadow-sm space-y-3">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input 
                      type="text"
                      placeholder="Search by title or landlord name..."
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                      style={{ border: '1.5px solid #E2EAE6' }}
                      className="w-full p-2.5 pl-10 pr-4 rounded-xl text-sm focus:border-[#1E6B4A] focus:ring-1 focus:ring-[#1E6B4A] outline-none transition"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                      {(["all", "active", "pending", "expired", "rejected"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setListingFilter(f)}
                          style={{
                            borderRadius: '24px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s'
                          }}
                          className={`text-[13px] font-semibold px-3.5 py-1.5 border cursor-pointer ${
                            listingFilter === f
                              ? f === "all" ? "bg-[#0F1A14] border-[#0F1A14] text-white"
                                : f === "active" ? "bg-[#1E6B4A] border-[#1E6B4A] text-white"
                                : f === "pending" ? "bg-[#D97706] border-[#D97706] text-white"
                                : f === "expired" ? "bg-[#6B7280] border-[#6B7280] text-white"
                                : "bg-[#DC2626] border-[#DC2626] text-white"
                              : "bg-white border-[#E2EAE6] text-[#4B5E54] hover:bg-[#FAFAF8]"
                          }`}
                        >
                          {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({getPillCount(f)})
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleExportPayments}
                      className="flex items-center gap-1 border border-[#E2EAE6] bg-white hover:bg-stone-50 text-[#4B5E54] hover:text-stone-900 font-semibold text-xs py-1.5 px-3 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {/* Database Fail Error Banner */}
                {listingsError ? (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-4 text-center text-rose-800 space-y-3">
                    <p className="font-bold text-sm">❌ Failed to load listings: {listingsError}</p>
                    <button
                      onClick={fetchAllListings}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : allListings.length === 0 ? (
                  /* TRULY EMPTY LISTINGS STATE */
                  <div className="text-center py-16 px-6 bg-white border border-[#E2EAE6] rounded-2xl shadow-sm animate-fade-in" id="empty-listings-state">
                    <span className="text-[48px] block mb-3">🏠</span>
                    <h3 className="text-lg font-extrabold text-stone-900">No listings yet</h3>
                    <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                      Listings appear here after landlords post and pay their listing fee.
                    </p>
                    
                    {/* Gold info box */}
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] border-l-4 border-l-[#D97706] rounded-xl p-3.5 mt-6 text-left max-w-md mx-auto">
                      <p className="text-xs text-[#92400E] leading-relaxed font-semibold">
                        💡 Listing fees: KES 100 (Single Room) to KES 1,500 (5+ Bedroom) · 30 days active
                      </p>
                    </div>
                  </div>
                ) : filteredListings.length === 0 ? (
                  /* FILTERED EMPTY LISTINGS STATE */
                  <div className="text-center py-16 px-6 bg-white border border-[#E2EAE6] rounded-2xl shadow-sm animate-fade-in" id="empty-filtered-listings-state">
                    <span className="text-[48px] block mb-3">🔍</span>
                    <h3 className="text-lg font-extrabold text-stone-900">No {listingFilter !== "all" ? listingFilter : ""} listings found</h3>
                    <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                      Try selecting 'All' to see all listings or search with other keywords
                    </p>
                    <button
                      onClick={() => { setListingFilter("all"); setListingSearch(""); }}
                      className="mt-4 px-4 py-2 bg-[#1E6B4A] hover:bg-[#154D34] text-white text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  </div>
                ) : (
                  /* RENDER RESPONSIVE FLEX LIST */
                  <div className="space-y-2.5" id="listings-list-container">
                    {filteredListings.map((property) => {
                      const statDetails = getPropertyStatusDetails(property);
                      const hasThumbnail = property.images && property.images.length > 0;
                      const priceVal = parseFloat(property.price) || 0;
                      
                      let badgeStyle = "bg-[#F0FDF4] border-[#DCFCE7] text-[#15803D]";
                      if (statDetails.label === "Verified & Active") {
                        badgeStyle = "bg-[#F0FDF4] border-[#DCFCE7] text-[#15803D]";
                      } else if (statDetails.label === "Pending Verification") {
                        badgeStyle = "bg-[#FFFBEB] border-[#FEF3C7] text-[#B45309]";
                      } else if (statDetails.label === "Rejected") {
                        badgeStyle = "bg-[#FEF2F2] border-[#FEE2E2] text-[#B91C1C]";
                      } else if (statDetails.label === "Expired") {
                        badgeStyle = "bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563]";
                      } else if (statDetails.label === "Unpaid") {
                        badgeStyle = "bg-[#FEF2F2] border-[#FEE2E2] text-[#B91C1C]";
                      }

                      return (
                        <div 
                          key={property.id}
                          className="bg-white border border-[#E2EAE6] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:shadow-sm transition duration-150"
                        >
                          <div className="flex items-center gap-3">
                            {hasThumbnail ? (
                              <img 
                                src={property.images[0]} 
                                alt={property.title} 
                                className="h-12 w-12 rounded-[10px] object-cover shrink-0 border border-stone-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-[10px] bg-[#F0FDF4] border border-emerald-100 flex items-center justify-center text-xl shrink-0">
                                🏠
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm sm:text-base text-stone-900 truncate max-w-[200px] sm:max-w-md" title={property.title}>
                                {property.title}
                              </h4>
                              <p className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                                <span className="capitalize font-semibold">{property.type?.replace('_', ' ')}</span>
                                <span className="text-stone-300">•</span>
                                <span>📍 {property.location}</span>
                              </p>
                              <p className="text-xs text-[#1E6B4A] font-semibold mt-0.5">
                                Landlord: {property.profiles?.full_name || "N/A"} ({property.profiles?.phone || "N/A"})
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 pt-2.5 sm:pt-0 border-t border-stone-100 sm:border-0 shrink-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${badgeStyle}`}>
                                {statDetails.label}
                              </span>
                              <span className="font-extrabold text-sm sm:text-base text-[#1E6B4A] font-mono">
                                KES {priceVal.toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Link
                                to={`/property/${property.id}`}
                                target="_blank"
                                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition"
                                title="View listing details"
                              >
                                <Eye className="h-4 w-4 shrink-0" />
                              </Link>
                              
                              <button
                                onClick={() => handleToggleListingActive(property)}
                                disabled={listingActionLoading === property.id}
                                className={`inline-flex items-center gap-1 font-bold text-xs py-1.5 px-3 rounded-lg border transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                                  property.is_active
                                    ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626] hover:bg-[#DC2626] hover:text-white"
                                    : "bg-[#E6F4EA] border-[#A7F3D0] text-[#137333] hover:bg-[#137333] hover:text-white"
                                }`}
                              >
                                {listingActionLoading === property.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                ) : (
                                  <Power className="h-3 w-3 shrink-0" />
                                )}
                                <span>{property.is_active ? "Suspend" : "Restore"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ALL USERS */}
            {activeTab === "users" && (
              <div className="animate-fade-in" id="all-users-tab">
                
                {/* Search Bar & Export Row */}
                <div className="bg-white border border-[#E2EAE6] rounded-2xl p-4 mb-4 shadow-sm space-y-3">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input 
                      type="text"
                      placeholder="Search by name, email or phone..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ border: '1.5px solid #E2EAE6' }}
                      className="w-full p-2.5 pl-10 pr-4 rounded-xl text-sm focus:border-[#1E6B4A] focus:ring-1 focus:ring-[#1E6B4A] outline-none transition"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                      {["all", "landlords", "caretakers", "agents", "tenants", "admins"].map((role) => {
                        const count = allUsers.filter(u => {
                          if (role === "all") return true;
                          const r = u.role?.toLowerCase() || 'tenant';
                          if (role === "landlords" && r !== "landlord") return false;
                          if (role === "caretakers" && r !== "caretaker") return false;
                          if (role === "agents" && r !== "agent") return false;
                          if (role === "tenants" && r !== "tenant") return false;
                          if (role === "admins" && r !== "admin" && r !== "superadmin") return false;
                          return true;
                        }).length;

                        return (
                          <button
                            key={role}
                            onClick={() => setUserRoleFilter(role)}
                            style={{
                              borderRadius: '24px',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s'
                            }}
                            className={`text-[13px] font-semibold px-3.5 py-1.5 border cursor-pointer ${
                              userRoleFilter === role
                                ? "bg-[#1E6B4A] border-[#1E6B4A] text-white"
                                : "bg-white border-[#E2EAE6] text-[#4B5E54] hover:bg-[#FAFAF8]"
                            }`}
                          >
                            {role === "all" ? "All" : role.charAt(0).toUpperCase() + role.slice(1)} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleExportUsers}
                      className="flex items-center gap-1 border border-[#E2EAE6] bg-white hover:bg-stone-50 text-[#4B5E54] hover:text-stone-900 font-semibold text-xs py-1.5 px-3 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="mb-3 flex justify-between items-center text-xs text-stone-400 font-bold uppercase tracking-wider px-1">
                  <span>{filteredUsers.length} users registered</span>
                </div>

                {filteredUsers.length === 0 ? (
                  /* ALL USERS EMPTY STATE */
                  <div className="text-center py-16 px-4 bg-white border border-stone-200/80 rounded-2xl shadow-xs animate-fade-in" id="empty-users-state">
                    <span className="text-5xl block mb-3">👥</span>
                    <h3 className="text-base font-bold text-stone-900">No users registered yet</h3>
                    <p className="text-stone-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      Share your platform to get landlords signing up
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden" id="all-users-table-container">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead className="bg-stone-50 text-stone-400 font-bold uppercase border-b border-stone-200">
                          <tr>
                            <th className="p-4">User</th>
                            <th className="p-4 hidden xs:table-cell">Contact & Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4 text-center">Listings</th>
                            <th className="p-4">Joined Date</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-150 text-stone-700 font-medium">
                          {filteredUsers.map((user) => {
                            const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
                            const listingCount = allListings.filter(p => p.landlord_id === user.id).length;

                            let roleStyles = { bg: "bg-blue-100 text-blue-700 border-blue-200" };
                            const rLower = user.role?.toLowerCase() || 'tenant';
                            if (rLower === "landlord") roleStyles = { bg: "bg-green-100 text-green-700 border-green-200" };
                            else if (rLower === "caretaker") roleStyles = { bg: "bg-yellow-100 text-yellow-700 border-yellow-200" };
                            else if (rLower === "agent") roleStyles = { bg: "bg-purple-100 text-purple-700 border-purple-200" };
                            else if (rLower === "admin" || rLower === "superadmin") roleStyles = { bg: "bg-red-100 text-red-700 border-red-200" };

                            return (
                              <tr key={user.id} className={`hover:bg-stone-50/40 ${!user.is_active ? "opacity-60 bg-stone-50/30" : ""}`}>
                                {/* Avatar & Name */}
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    {user.avatar_url ? (
                                      <img 
                                        src={user.avatar_url} 
                                        alt={user.full_name || "Profile"} 
                                        className="h-10 w-10 rounded-full object-cover shrink-0 border border-stone-200"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border shrink-0 ${roleStyles.bg}`}>
                                        {initial}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-stone-900 truncate max-w-[150px]">
                                        {user.full_name || "NestList User"}
                                      </p>
                                      {/* Mobile-only view for email/phone */}
                                      <div className="xs:hidden space-y-0.5 mt-0.5">
                                        <p className="text-[10px] text-stone-500 truncate">{user.email || 'N/A'}</p>
                                        <p className="text-[10px] text-stone-500 font-mono">{user.phone || 'N/A'}</p>
                                      </div>
                                      {!user.is_active && (
                                        <span className="inline-block text-[9px] bg-red-100 text-red-800 font-black px-1.5 py-0.2 rounded-full mt-1">
                                          SUSPENDED
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Contact & Email */}
                                <td className="p-4 hidden xs:table-cell">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-stone-700 truncate max-w-[180px]" title={user.email}>{user.email || 'N/A'}</p>
                                    <p className="text-[11px] text-stone-400 font-mono">{user.phone || 'N/A'}</p>
                                  </div>
                                </td>

                                {/* Role Badge */}
                                <td className="p-4">
                                  <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${roleStyles.bg}`}>
                                    {user.role || 'tenant'}
                                  </span>
                                </td>

                                {/* Listings count */}
                                <td className="p-4 text-center font-bold text-stone-800">
                                  {listingCount > 0 ? (
                                    <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-100 font-mono text-xs">
                                      {listingCount} listings
                                    </span>
                                  ) : (
                                    <span className="text-stone-300 font-normal">—</span>
                                  )}
                                </td>

                                {/* Joined Date */}
                                <td className="p-4 text-xs font-mono text-stone-400">
                                  {user.created_at ? new Date(user.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" }) : 'N/A'}
                                </td>

                                {/* Actions (Suspend / Restore User) */}
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleToggleUserActive(user)}
                                    disabled={userActionLoading === user.id}
                                    className={`inline-flex items-center gap-1 font-semibold text-xs py-1.5 px-3 rounded-full border transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                                      user.is_active
                                        ? "bg-rose-50 hover:bg-rose-100 border-rose-200/40 text-rose-700"
                                        : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200/40 text-emerald-800"
                                    }`}
                                  >
                                    {userActionLoading === user.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                    ) : (
                                      <Power className="h-3 w-3 shrink-0" />
                                    )}
                                    <span>{user.is_active ? "Suspend" : "Restore"}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: VISIBILITY BOOSTS */}
            {activeTab === "boosts" && (
              <div className="animate-fade-in" id="visibility-boosts-tab">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form Column */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">⚡</span>
                        <h3 className="font-bold text-stone-900 text-base">Grant Complimenary/Promo Boost</h3>
                      </div>
                      <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                        Manually apply a visibility boost to any property listing. This will immediately push the listing to the top of browse queries.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Select Property</label>
                          <select
                            value={boostFormPropertyId}
                            onChange={(e) => {
                              setBoostFormPropertyId(e.target.value);
                            }}
                            style={{ border: '1.5px solid #E2EAE6' }}
                            className="w-full p-2.5 rounded-xl text-sm bg-white focus:border-[#1E6B4A] outline-none"
                          >
                            <option value="">-- Choose Listing --</option>
                            {allListings.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title} ({p.profiles?.full_name || 'N/A'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Boost Tier</label>
                          <select
                            value={boostFormTier}
                            onChange={(e) => {
                              setBoostFormTier(e.target.value);
                              const tPrice = BOOST_TIERS[e.target.value as keyof typeof BOOST_TIERS]?.price || 0;
                              setBoostFormAmount(tPrice);
                            }}
                            style={{ border: '1.5px solid #E2EAE6' }}
                            className="w-full p-2.5 rounded-xl text-sm bg-white focus:border-[#1E6B4A] outline-none"
                          >
                            <option value="3day">3 Days Boost (KES 50)</option>
                            <option value="7day">7 Days Boost (KES 100)</option>
                            <option value="14day">14 Days Boost (KES 200)</option>
                            <option value="30day">30 Days Premium (KES 350)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Custom Price Recorded (KES)</label>
                          <input
                            type="number"
                            value={boostFormAmount}
                            onChange={(e) => setBoostFormAmount(Math.max(0, parseInt(e.target.value) || 0))}
                            style={{ border: '1.5px solid #E2EAE6' }}
                            className="w-full p-2.5 rounded-xl text-sm focus:border-[#1E6B4A] outline-none"
                            placeholder="0 for complimentary"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleGrantBoost(boostFormPropertyId, boostFormTier, boostFormAmount)}
                          disabled={grantBoostLoading || !boostFormPropertyId}
                          className="w-full py-3 bg-[#1E6B4A] hover:bg-[#154D34] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {grantBoostLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          <span>Grant Boost Status</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List/Table Column */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h3 className="font-extrabold text-stone-900 text-base">Boost History & Tracker</h3>
                        
                        <div className="relative max-w-xs w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Filter by title, landlord, code..."
                            value={boostSearch}
                            onChange={(e) => setBoostSearch(e.target.value)}
                            style={{ border: '1px solid #E2EAE6' }}
                            className="w-full p-2 pl-8 pr-4 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>

                      {allBoosts.length === 0 ? (
                        <div className="text-center py-12 text-stone-400 text-sm">
                          No boosts have been registered on the platform yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 font-bold uppercase">
                              <tr>
                                <th className="p-3">Listing</th>
                                <th className="p-3">Landlord</th>
                                <th className="p-3">Tier</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Expires At</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-150 text-stone-700">
                              {allBoosts
                                .filter(b => {
                                  if (!boostSearch) return true;
                                  const term = boostSearch.toLowerCase();
                                  return (
                                    b.property?.title?.toLowerCase().includes(term) ||
                                    b.landlord?.full_name?.toLowerCase().includes(term) ||
                                    b.mpesa_code?.toLowerCase().includes(term) ||
                                    b.boost_tier?.toLowerCase().includes(term)
                                  );
                                })
                                .map((b) => {
                                  const isExpired = new Date(b.expires_at).getTime() < Date.now();
                                  return (
                                    <tr key={b.id} className="hover:bg-stone-50/50">
                                      <td className="p-3 font-semibold text-stone-900">
                                        {b.property?.title || "Deleted Property"}
                                        <div className="text-[10px] text-stone-400 font-normal">
                                          {b.property?.location}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="font-semibold text-stone-800">{b.landlord?.full_name || "N/A"}</div>
                                        <div className="text-[10px] text-stone-400 font-mono">{b.landlord?.phone || "N/A"}</div>
                                      </td>
                                      <td className="p-3">
                                        <span className={`inline-block font-extrabold px-2 py-0.5 rounded text-[10px] uppercase ${
                                          b.boost_tier === '30day' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                          b.boost_tier === '14day' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                          'bg-stone-100 text-stone-700 border border-stone-200'
                                        }`}>
                                          {b.boost_tier}
                                        </span>
                                      </td>
                                      <td className="p-3 font-mono font-bold text-stone-900">
                                        KES {b.amount_paid}
                                        <div className="text-[9px] text-stone-400 uppercase font-bold">{b.mpesa_code || "N/A"}</div>
                                      </td>
                                      <td className="p-3">
                                        <div className={isExpired ? "text-stone-400 line-through font-mono" : "text-[#1E6B4A] font-mono font-semibold"}>
                                          {new Date(b.expires_at).toLocaleDateString("en-KE")}
                                        </div>
                                        <div className="text-[10px]">
                                          {isExpired ? "Expired" : "Active"}
                                        </div>
                                      </td>
                                      <td className="p-3 text-right">
                                        {!isExpired && (
                                          <button
                                            type="button"
                                            onClick={() => handleCancelBoost(b)}
                                            className="text-red-600 hover:text-red-900 font-bold hover:underline cursor-pointer"
                                          >
                                            Cancel
                                          </button>
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
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: LEAD UNLOCKS & CREDITS */}
            {activeTab === "unlocks" && (
              <div className="animate-fade-in" id="lead-unlocks-tab">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form Column */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🔓</span>
                        <h3 className="font-bold text-stone-900 text-base">Grant Lead Credits</h3>
                      </div>
                      <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                        Directly add lead inquiry credits to any Pay-Per-Lead property listing. Landlords will be able to unlock tenant inquiries instantly.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Select Pay-Per-Lead Property</label>
                          <select
                            value={creditsFormPropertyId}
                            onChange={(e) => setCreditsFormPropertyId(e.target.value)}
                            style={{ border: '1.5px solid #E2EAE6' }}
                            className="w-full p-2.5 rounded-xl text-sm bg-white focus:border-[#1E6B4A] outline-none"
                          >
                            <option value="">-- Choose PPL Listing --</option>
                            {allListings
                              .filter(p => p.listing_model === 'pay_per_lead')
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.title} ({p.profiles?.full_name || 'N/A'}) - Credits: {p.lead_credits || 0}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Number of Credits to Add</label>
                          <input
                            type="number"
                            min="1"
                            value={creditsFormAmount}
                            onChange={(e) => setCreditsFormAmount(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ border: '1.5px solid #E2EAE6' }}
                            className="w-full p-2.5 rounded-xl text-sm focus:border-[#1E6B4A] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase">Custom Price Recorded (KES)</label>
                          <input
                            type="number"
                            value={creditsFormPaid}
                            onChange={(e) => setCreditsFormPaid(Math.max(0, parseInt(e.target.value) || 0))}
                            style={{ border: '1.5px solid #E2EAE6' }}
                            className="w-full p-2.5 rounded-xl text-sm focus:border-[#1E6B4A] outline-none"
                            placeholder="0 for complimentary"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleGrantCredits(creditsFormPropertyId, creditsFormAmount, creditsFormPaid)}
                          disabled={grantCreditsLoading || !creditsFormPropertyId}
                          className="w-full py-3 bg-[#1E6B4A] hover:bg-[#154D34] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {grantCreditsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          <span>Grant Lead Credits</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List/Table Column */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-[#E2EAE6] rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h3 className="font-extrabold text-stone-900 text-base">Unlocks & Credit Bundles History</h3>
                        
                        <div className="relative max-w-xs w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Filter by title, landlord, code..."
                            value={unlockSearch}
                            onChange={(e) => setUnlockSearch(e.target.value)}
                            style={{ border: '1px solid #E2EAE6' }}
                            className="w-full p-2 pl-8 pr-4 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>

                      {allUnlocks.length === 0 ? (
                        <div className="text-center py-12 text-stone-400 text-sm">
                          No lead unlocks or credit purchases recorded on the platform yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 font-bold uppercase">
                              <tr>
                                <th className="p-3">Listing</th>
                                <th className="p-3">Landlord</th>
                                <th className="p-3">Transaction Details</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Date</th>
                                <th className="p-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-150 text-stone-700">
                              {allUnlocks
                                .filter(u => {
                                  if (!unlockSearch) return true;
                                  const term = unlockSearch.toLowerCase();
                                  return (
                                    u.property?.title?.toLowerCase().includes(term) ||
                                    u.landlord?.full_name?.toLowerCase().includes(term) ||
                                    u.mpesa_code?.toLowerCase().includes(term) ||
                                    (u.inquiry_id ? 'single unlock' : 'bundle purchase').includes(term)
                                  );
                                })
                                .map((u) => (
                                  <tr key={u.id} className="hover:bg-stone-50/50">
                                    <td className="p-3 font-semibold text-stone-900">
                                      {u.property?.title || "Deleted Property"}
                                      <div className="text-[10px] text-stone-400 font-normal">
                                        {u.property?.location}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="font-semibold text-stone-800">{u.landlord?.full_name || "N/A"}</div>
                                      <div className="text-[10px] text-stone-400 font-mono">{u.landlord?.phone || "N/A"}</div>
                                    </td>
                                    <td className="p-3">
                                      {u.inquiry_id ? (
                                        <span className="inline-block bg-blue-50 text-blue-700 border border-blue-150 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                          🔓 Single Lead Unlock
                                        </span>
                                      ) : (
                                        <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                          💳 +{u.bundle_size || 1} Credit Bundle
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 font-mono font-bold text-stone-900">
                                      KES {u.amount_paid}
                                      <div className="text-[9px] text-stone-400 uppercase font-bold">{u.mpesa_code || "N/A"}</div>
                                    </td>
                                    <td className="p-3 text-stone-400 font-mono">
                                      {new Date(u.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                                    </td>
                                    <td className="p-3 text-right">
                                      <span className="inline-block bg-green-100 text-green-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-green-200">
                                        {u.status || 'confirmed'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* VERIFY CONFIRMATION DIALOG MODAL */}
      {verifyingPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-emerald-700 mb-4">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="text-lg font-bold">Verify Payment</h3>
            </div>
            
            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              Confirm verification of M-Pesa code <strong className="font-mono text-stone-950 text-base">{verifyingPayment.mpesa_code}</strong> for <strong className="text-emerald-800 font-extrabold text-base">KES {(verifyingPayment.amount || verifyingPayment.amount_paid || 0).toLocaleString()}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setVerifyingPayment(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 font-semibold text-sm rounded-xl hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePaymentSubmit}
                disabled={verifyingLoading}
                className="flex-1 py-2.5 bg-[#1E6B4A] hover:bg-[#154D34] text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {verifyingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Yes, Verify and Go Live</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT COMPLAINT MODAL */}
      {rejectingPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-[#DC2626] mb-4">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Reject Payment Submission</h3>
            </div>
            
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">
              Provide a reason for rejecting the M-Pesa code <strong className="font-mono text-stone-900">{rejectingPayment.mpesa_code}</strong>.
            </p>

            {/* Quick reasons (clickable chips) */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Quick Reasons</label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Code not found",
                  "Wrong amount paid",
                  "Duplicate code",
                  "Payment too old"
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`text-xs py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                      rejectionReason === reason
                        ? "bg-rose-50 border-rose-300 text-[#DC2626] font-bold"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full h-24 p-3 border border-stone-200 rounded-xl text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none mb-6 font-sans"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectingPayment(null);
                  setRejectionReason("");
                }}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 font-semibold text-sm rounded-xl hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPaymentSubmit}
                disabled={rejectingLoading || !rejectionReason.trim()}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {rejectingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Reject Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
