import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Info, AlertTriangle, ShieldCheck, Check } from "lucide-react";

const COUNTIES = ["Nairobi", "Kiambu", "Mombasa", "Kisumu", "Nakuru"];

const TYPES = [
  { value: "single_room", label: "Single Room" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "studio", label: "Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedroom" },
  { value: "3br", label: "3 Bedroom" },
  { value: "4br", label: "4 Bedroom" },
  { value: "5br_plus", label: "5 Bedroom+" }
];

const AMENITIES_LIST = [
  "Water 24/7", "Borehole", "Parking", "Security Guard", "CCTV",
  "Electric Fence", "Backup Generator", "WiFi Ready"
];

export const SearchAlerts: React.FC = () => {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Alert Creation Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchAlerts = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("search_alerts")
        .select("*")
        .eq("tenant_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error("Failed to load search alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [profile]);

  const handleToggleAlert = async (alertId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("search_alerts")
        .update({ is_active: !currentActive })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(item => (item.id === alertId ? { ...item, is_active: !currentActive } : item))
      );
    } catch (err) {
      console.error("Failed to toggle alert status:", err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("Are you sure you want to delete this search alert?")) return;

    try {
      const { error } = await supabase
        .from("search_alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(item => item.id !== alertId));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !alertName.trim()) return;

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from("search_alerts")
        .insert({
          tenant_id: profile.id,
          name: alertName,
          county: selectedCounty || null,
          type: selectedType || null,
          min_price: minPrice ? parseFloat(minPrice) : null,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          amenities: selectedAmenities,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to alert list
      setAlerts(prev => [data, ...prev]);

      // Reset Form and Close
      setAlertName("");
      setSelectedCounty("");
      setSelectedType("");
      setMinPrice("");
      setMaxPrice("");
      setSelectedAmenities([]);
      setModalOpen(false);
    } catch (err: any) {
      console.error("Failed to create alert:", err);
      alert(`Could not create alert: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const getPropertyTypeLabel = (typeKey: string) => {
    return TYPES.find(t => t.value === typeKey)?.label || typeKey;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-sans flex items-center space-x-2">
            <Bell className="h-6 w-6 text-primary-600 animate-swing" />
            <span>SMS Search Alerts</span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm font-medium">
            Get instant SMS notifications when listings matching your criteria are published!
          </p>
        </div>
        
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-1.5 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md transition self-start"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Alert</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 flex items-start space-x-3 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
        <Info className="h-5 w-5 text-[#92400E] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">How Search Alerts Work:</p>
          <p>
            When a landlord publishes a verified listing in your selected county and price range, our automated triggers execute matching alerts. You'll receive a custom SMS to your registered phone number <span className="text-stone-900 font-bold">({profile?.phone})</span> with the property details.
          </p>
        </div>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
            <p className="text-stone-400 text-xs font-medium">Fetching alerts...</p>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-stone-200 py-16 px-4 text-center shadow-sm">
          <div className="text-4xl mb-3">🔔</div>
          <h3 className="font-bold text-lg text-stone-900">No active alerts</h3>
          <p className="text-stone-500 text-sm mt-1 leading-relaxed max-w-xs mx-auto">
            You haven't configured any SMS search alerts yet. Let us do the searching for you!
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex items-center space-x-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow transition"
          >
            <span>Create First Alert</span>
          </button>
        </div>
      ) : (
        /* Alerts List */
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-sm ${
                alert.is_active ? "border-primary-200" : "border-stone-200 bg-stone-50/50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${alert.is_active ? "bg-emerald-500 animate-pulse" : "bg-stone-300"}`}></span>
                  <h3 className="font-bold text-stone-900 text-base leading-none">
                    {alert.name}
                  </h3>
                </div>

                {/* Tags Metadata */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {alert.county && (
                    <span className="bg-gold-50 text-gold-800 border border-gold-200/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {alert.county}
                    </span>
                  )}
                  {alert.type && (
                    <span className="bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {getPropertyTypeLabel(alert.type)}
                    </span>
                  )}
                  {(alert.min_price || alert.max_price) && (
                    <span className="bg-stone-900 text-gold-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {alert.min_price ? `KSh ${parseFloat(alert.min_price).toLocaleString()}` : "0"}{" - "}
                      {alert.max_price ? `KSh ${parseFloat(alert.max_price).toLocaleString()}` : "Any"}
                    </span>
                  )}
                  {alert.amenities && alert.amenities.map((amenity: string, idx: number) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-800 text-[10px] font-medium px-2 py-0.5 rounded">
                      ✓ {amenity}
                    </span>
                  ))}
                </div>

                {alert.last_sent ? (
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Last alert sent: {new Date(alert.last_sent).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Pending first match
                  </p>
                )}
              </div>

              {/* Status Toggle & Delete Actions */}
              <div className="flex items-center space-x-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 justify-end">
                <button
                  onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                  className="flex items-center text-stone-500 hover:text-stone-900 transition"
                  title={alert.is_active ? "Pause alerts" : "Resume alerts"}
                >
                  {alert.is_active ? (
                    <div className="flex items-center space-x-1.5 text-emerald-600">
                      <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                      <ToggleRight className="h-7 w-7" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-stone-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Paused</span>
                      <ToggleLeft className="h-7 w-7" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete alert"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE ALERT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-stone-200 overflow-hidden shadow-2xl relative">
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-sans font-bold text-base flex items-center space-x-1.5">
                <Bell className="h-5 w-5 text-gold-500" />
                <span>Create SMS Search Alert</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="p-6 space-y-4">
              {/* Alert Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Alert Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roysambu Bedsitters, Kilimani Studios"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-4.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              {/* County & Type Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    County (Optional)
                  </label>
                  <select
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Any County</option>
                    {COUNTIES.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Rental Type (Optional)
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Any Type</option>
                    {TYPES.map((t, i) => (
                      <option key={i} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget Bounds */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Price Budget Bounds (KSh)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Min Price (Optional)"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <input
                    type="number"
                    placeholder="Max Price (Optional)"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Amenities tags checklist */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Mandatory Amenities (Optional)
                </label>
                <div className="flex flex-wrap gap-2 p-2 border border-stone-200 rounded-xl max-h-24 overflow-y-auto">
                  {AMENITIES_LIST.map((amenity, idx) => {
                    const isChecked = selectedAmenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                          isChecked
                            ? "bg-gold-100 border border-gold-300/40 text-gold-900"
                            : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                        }`}
                      >
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-4 text-xs font-semibold border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center space-x-1.5 py-2.5 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Activate Alert</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
