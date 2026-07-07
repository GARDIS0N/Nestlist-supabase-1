import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase, INITIAL_PROPERTIES, getSupabaseConfig } from "../lib/supabase";
import { PropertySkeleton } from "../components/PropertySkeleton";
import { Search, MapPin, Heart, ListFilter, SlidersHorizontal, Grid, X, Info, AlertTriangle, Database } from "lucide-react";

const COUNTIES = ["All Counties", "Nairobi", "Kiambu", "Mombasa", "Kisumu", "Nakuru"];

const TYPES = [
  { value: "all", label: "All Types" },
  { value: "single_room", label: "Single Room" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "studio", label: "Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedroom" },
  { value: "3br", label: "3 Bedroom" },
  { value: "4br", label: "4 Bedroom" },
  { value: "5br_plus", label: "5 Bedroom+" }
];

const TYPE_BADGE_CLASSES: Record<string, { bg: string; text: string }> = {
  single_room:  { bg: "#ECFDF5", text: "#065F46" },
  bedsitter:    { bg: "#D1FAE5", text: "#065F46" },
  studio:       { bg: "#A7F3D0", text: "#065F46" },
  "1br":        { bg: "#F0FDF4", text: "#1E6B4A" },
  "2br":        { bg: "#DCFCE7", text: "#166534" },
  "3br":        { bg: "#FEF3C7", text: "#92400E" },
  "4br":        { bg: "#FDE68A", text: "#78350F" },
  "5br_plus":   { bg: "#FEF9C3", text: "#713F12" },
};

const AMENITIES_LIST = [
  "Water 24/7", "Borehole", "Parking", "Security Guard", "CCTV",
  "Electric Fence", "Backup Generator", "WiFi Ready", "DSTV Ready",
  "Tiled Floors", "Servant Quarter", "Garden", "Balcony",
  "Near Tarmac", "Near School", "Near Shopping Centre"
];

export const Browse: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<any[]>([]);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setPageHasMore] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("All Counties");
  const [selectedType, setSelectedType] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const ITEMS_PER_PAGE = 20;

  // Fetch properties
  const fetchProperties = async (pageNum: number = 0, isAppend: boolean = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      setDbError(null);
      setUsingFallback(false);

      let query = supabase
        .from("properties")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      // Apply Filters
      if (selectedCounty !== "All Counties") {
        query = query.eq("county", selectedCounty);
      }
      if (selectedType !== "all") {
        query = query.eq("type", selectedType);
      }
      if (minPrice) {
        query = query.gte("price", parseFloat(minPrice));
      }
      if (maxPrice) {
        query = query.lte("price", parseFloat(maxPrice));
      }

      // Order and Paginate
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      let filteredData = data || [];

      // Filter by text search (done client-side or with search query for maximum precision)
      if (search.trim()) {
        const keyword = search.toLowerCase();
        filteredData = filteredData.filter(
          (p: any) =>
            p.title.toLowerCase().includes(keyword) ||
            p.location.toLowerCase().includes(keyword) ||
            (p.description && p.description.toLowerCase().includes(keyword))
        );
      }

      // Filter by selected amenities (ensure all selected amenities are in property amenities list)
      if (selectedAmenities.length > 0) {
        filteredData = filteredData.filter((p: any) =>
          selectedAmenities.every((amenity) => p.amenities?.includes(amenity))
        );
      }

      if (isAppend) {
        setProperties(prev => [...prev, ...filteredData]);
      } else {
        setProperties(filteredData);
      }

      // Check if there are more items to fetch
      if (count) {
        setPageHasMore(from + filteredData.length < count);
      } else {
        setPageHasMore(filteredData.length === ITEMS_PER_PAGE);
      }
    } catch (error: any) {
      console.warn("Error fetching properties from Supabase (using mock fallback):", error);
      
      // Mark fallback state and describe error
      setUsingFallback(true);
      if (error.message && (error.message.includes("relation") || error.message.includes("does not exist") || error.code === "PGRST116")) {
        setDbError("Database tables are not initialized on your Supabase backend yet. Please run the SQL migration script (available on the Login page/Supabase panel) in your Supabase SQL Editor to activate live listings!");
      } else {
        setDbError(error.message || "Failed to fetch from live database.");
      }

      // Filter on local/mock INITIAL_PROPERTIES for visual persistence
      let filteredData = [...INITIAL_PROPERTIES];

      if (selectedCounty !== "All Counties") {
        filteredData = filteredData.filter(p => p.county === selectedCounty);
      }
      if (selectedType !== "all") {
        filteredData = filteredData.filter(p => p.type === selectedType);
      }
      if (minPrice) {
        filteredData = filteredData.filter(p => p.price >= parseFloat(minPrice));
      }
      if (maxPrice) {
        filteredData = filteredData.filter(p => p.price <= parseFloat(maxPrice));
      }
      if (search.trim()) {
        const keyword = search.toLowerCase();
        filteredData = filteredData.filter(
          p => p.title.toLowerCase().includes(keyword) ||
               p.location.toLowerCase().includes(keyword) ||
               p.description?.toLowerCase().includes(keyword)
        );
      }
      if (selectedAmenities.length > 0) {
        filteredData = filteredData.filter(p =>
          selectedAmenities.every(amenity => p.amenities?.includes(amenity))
        );
      }

      const from = pageNum * ITEMS_PER_PAGE;
      const sliced = filteredData.slice(from, from + ITEMS_PER_PAGE);

      if (isAppend) {
        setProperties(prev => [...prev, ...sliced]);
      } else {
        setProperties(sliced);
      }
      setPageHasMore(from + sliced.length < filteredData.length);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch saved property IDs for current tenant
  const fetchSavedPropertyIds = async () => {
    if (!profile || profile.role !== "tenant") return;

    try {
      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("tenant_id", profile.id);

      if (error) throw error;

      const ids = new Set(data.map((row: any) => row.property_id));
      setSavedPropertyIds(ids);
    } catch (err) {
      console.warn("Error loading saved property IDs (skipping):", err);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchProperties(0, false);
  }, [search, selectedCounty, selectedType, minPrice, maxPrice, selectedAmenities]);

  useEffect(() => {
    fetchSavedPropertyIds();
  }, [profile]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProperties(nextPage, true);
  };

  const toggleSaveProperty = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!profile) {
      navigate("/login");
      return;
    }

    if (profile.role !== "tenant") {
      alert("Only registered tenants can save properties to favorites.");
      return;
    }

    const isSaved = savedPropertyIds.has(propertyId);
    const updatedIds = new Set(savedPropertyIds);

    try {
      if (isSaved) {
        // Delete from saved_properties
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("tenant_id", profile.id)
          .eq("property_id", propertyId);

        if (error) throw error;
        updatedIds.delete(propertyId);
      } else {
        // Insert into saved_properties
        const { error } = await supabase
          .from("saved_properties")
          .insert({
            tenant_id: profile.id,
            property_id: propertyId,
          });

        if (error) throw error;
        updatedIds.add(propertyId);
      }

      setSavedPropertyIds(updatedIds);
    } catch (err: any) {
      console.error("Failed to toggle saved status:", err);
      alert(`Operation failed: ${err.message}`);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCounty("All Counties");
    setSelectedType("all");
    setMinPrice("");
    setMaxPrice("");
    setSelectedAmenities([]);
  };

  const getPropertyTypeLabel = (typeKey: string) => {
    return TYPES.find(t => t.value === typeKey)?.label || typeKey;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Search Header Banner */}
      <div className="bg-gradient-hero bg-gradient-to-br from-[#0A4D2E] to-[#1E6B4A] text-white rounded-2xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#34D399]/5 rounded-full blur-xl"></div>
        <div className="absolute top-10 left-1/3 w-32 h-32 bg-gold-500/5 rounded-full blur-xl"></div>

        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="bg-gold-500/20 text-[#FFFBEB] border border-gold-400/30 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Nyumba Popote Kenya
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-sans">
            Find Your Next Perfect Home
          </h1>
          <p className="text-xs sm:text-base text-stone-300 leading-relaxed max-w-xl">
            Browse active rentals in Nairobi, Kiambu, Mombasa, Kisumu, and Nakuru. Landlords are fully verified with M-Pesa.
          </p>
        </div>

        {/* Floating Fast Search Panel */}
        <div className="mt-8 bg-white text-stone-800 p-3 rounded-xl border border-[#E2EAE6] shadow-xl flex flex-col md:flex-row gap-2 relative z-10 max-w-4xl">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search estates, keywords e.g. TRM, Kilimani..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/10 text-sm"
            />
          </div>
          
          <div className="h-px md:h-10 w-full md:w-px bg-stone-200"></div>

          {/* County Selector */}
          <div className="w-full md:w-48 relative">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border-0 rounded-lg text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer appearance-none"
            >
              {COUNTIES.map((county, i) => (
                <option key={i} value={county}>{county}</option>
              ))}
            </select>
          </div>

          <div className="h-px md:h-10 w-full md:w-px bg-stone-200"></div>

          {/* Type Selector */}
          <div className="w-full md:w-48 relative">
            <Grid className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border-0 rounded-lg text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer appearance-none"
            >
              {TYPES.map((type, i) => (
                <option key={i} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="py-2.5 px-4 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition flex items-center justify-center space-x-1.5 text-sm"
              title="Advanced Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Drawer (Collapse view) */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-xl border border-[#E2EAE6] p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-semibold text-stone-900 text-base flex items-center space-x-2">
              <ListFilter className="h-5 w-5 text-primary-600" />
              <span>Filter Specifications</span>
            </h3>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price Filter range */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Budget (KSh / Month)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  placeholder="Min KSh"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full border border-[#E2EAE6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/10"
                />
                <span className="text-stone-400 font-bold">to</span>
                <input
                  type="number"
                  placeholder="Max KSh"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full border border-[#E2EAE6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B4A]/10"
                />
              </div>
            </div>

            {/* Quick Amenities summary */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Must-Have Amenities
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-[#E2EAE6] rounded-xl">
                {AMENITIES_LIST.map((amenity, idx) => {
                  const isChecked = selectedAmenities.includes(amenity);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                        isChecked
                          ? "bg-primary-50 border-primary-200 text-primary-800"
                          : "bg-white border-[#E2EAE6] text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      {amenity}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-sm font-semibold text-stone-500">
            Showing <span className="text-stone-900">{properties.length}</span> verified listings
          </p>
          
          {usingFallback && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-100 text-gold-800 border border-gold-200">
              <AlertTriangle className="h-3.5 w-3.5 text-gold-600 animate-pulse" />
              <span>Database Connection Notice</span>
            </span>
          )}
        </div>

        {usingFallback && (
          <div className="p-5 rounded-2xl bg-gold-50 border border-gold-200/80 text-gold-950 text-xs sm:text-sm flex flex-col md:flex-row items-start gap-4 shadow-sm font-medium animate-fade-in">
            <div className="p-2.5 bg-gold-100 rounded-xl text-gold-700 shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                Supabase Tables Missing / Uninitialized
              </h4>
              <p className="text-[#4B5E54] leading-relaxed text-xs">
                Nestlist is pointed to your real live Supabase instance (<span className="font-mono bg-white px-1 py-0.5 rounded text-gold-800 break-all">{getSupabaseConfig().url}</span>). However, required tables (e.g. <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-red-700">properties</code>) were not found on this project.
              </p>
              <p className="text-[#4B5E54] leading-relaxed text-xs">
                We have gracefully loaded our high-fidelity local listings so you can continue exploring the application features immediately! To activate live database entries, please go to the <strong className="text-stone-900">Sign In</strong> or <strong className="text-stone-900">Sign Up</strong> page, expand the <strong className="text-gold-900">Supabase Database Connection</strong> panel, copy the table creation script, and run it in your <strong className="text-stone-900">Supabase SQL Editor</strong>.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          /* LOADING PLACEHOLDERS */
          <PropertySkeleton count={6} showActions={false} />
        ) : properties.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-2xl border border-[#E2EAE6] py-16 px-4 text-center max-w-xl mx-auto">
            <div className="text-4xl mb-3">🏡</div>
            <h3 className="font-bold text-lg text-[#0F1A14]">No properties match your filters</h3>
            <p className="text-[#4B5E54] text-sm mt-1 max-w-md mx-auto leading-relaxed">
              We couldn't find any active rental listings in this range. Try clearing your search keyword, adjusting your budget bounds, or subscribing for search alerts to get notified by SMS when matches are listed!
            </p>
            {profile?.role === "tenant" && (
              <Link
                to="/alerts"
                className="mt-6 inline-flex items-center space-x-1.5 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
              >
                <span>Setup Search Alert</span>
              </Link>
            )}
          </div>
        ) : (
          /* REAL PROPERTIES GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => {
              const isSaved = savedPropertyIds.has(property.id);
              const coverImage = property.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";
              const typeColors = TYPE_BADGE_CLASSES[property.type as keyof typeof TYPE_BADGE_CLASSES] || { bg: "#F3F4F6", text: "#374151" };

              return (
                <Link
                  key={property.id}
                  to={`/property/${property.id}`}
                  className="group bg-white rounded-2xl border border-[#E2EAE6] overflow-hidden hover:shadow-xl hover:border-primary-300 hover:ring-2 hover:ring-primary-500/5 transition-all duration-300 flex flex-col h-full"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-stone-100">
                    <img
                      src={coverImage}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";
                      }}
                    />

                    {/* Badge: Rent Type */}
                    <span 
                      style={{ backgroundColor: typeColors.bg, color: typeColors.text }} 
                      className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm"
                    >
                      {getPropertyTypeLabel(property.type)}
                    </span>

                    {/* Badge: Verification Status */}
                    <span className="absolute top-3 right-3 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                      <span>Verified</span>
                    </span>

                    {/* Heart button for tenants */}
                    {(!profile || profile.role === "tenant") && (
                      <button
                        onClick={(e) => toggleSaveProperty(e, property.id)}
                        className={`absolute bottom-3 right-3 p-2.5 rounded-full backdrop-blur-md border shadow-md transition-all duration-200 ${
                          isSaved
                            ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 scale-110"
                            : "bg-white/80 border-[#E2EAE6] text-stone-500 hover:text-rose-500 hover:bg-white"
                        }`}
                        title={isSaved ? "Remove from saved" : "Save property"}
                      >
                        <Heart className={`h-4.5 w-4.5 ${isSaved ? "fill-current" : ""}`} />
                      </button>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    <div className="flex items-center space-x-1.5 text-[#4B5E54] text-xs font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                      <span className="truncate">{property.location}, {property.county}</span>
                    </div>

                    <h3 className="font-sans font-bold text-[#0F1A14] text-base line-clamp-1 group-hover:text-primary-800 transition-colors">
                      {property.title}
                    </h3>

                    <p className="text-xs text-[#4B5E54] line-clamp-2 leading-relaxed">
                      {property.description}
                    </p>

                    {/* Key Amenities tags */}
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {property.amenities.slice(0, 3).map((amenity: string, i: number) => (
                          <span
                            key={i}
                            className="bg-[#DCFCE7] text-[#065F46] text-[10px] font-semibold px-2 py-0.5 rounded border border-[#A7F3D0]/30"
                          >
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 3 && (
                          <span className="bg-stone-50 text-[#8A9E94] text-[9px] font-bold px-1.5 py-0.5 rounded border border-stone-200">
                            +{property.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price and Action Footer */}
                    <div className="pt-3 border-t border-[#E2EAE6] mt-auto flex items-baseline justify-between">
                      <div>
                        <span className="text-lg font-extrabold text-[#D97706]">
                          KSh {parseFloat(property.price).toLocaleString()}
                        </span>
                        <span className="text-xs text-[#4B5E54] font-medium"> / Month</span>
                      </div>
                      <span className="text-xs font-bold text-primary-600 group-hover:underline flex items-center space-x-0.5">
                        <span>View Details</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* PAGINATION LOAD MORE */}
        {hasMore && !loading && (
          <div className="flex justify-center pt-8">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center space-x-2 py-3 px-6 rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50 shadow-sm transition disabled:opacity-50"
            >
              {loadingMore ? (
                <div className="h-5 w-5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Load More Rentals</span>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
