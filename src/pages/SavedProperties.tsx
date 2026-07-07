import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { PropertySkeleton } from "../components/PropertySkeleton";
import { Heart, MapPin, Loader2, ArrowLeft } from "lucide-react";

export const SavedProperties: React.FC = () => {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedProperties = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // 1. Get saved list links
      const { data: savedList, error: savedError } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("tenant_id", profile.id);

      if (savedError) throw savedError;

      if (savedList && savedList.length > 0) {
        const ids = savedList.map(item => item.property_id);

        // 2. Fetch properties matching ids
        const { data: propsData, error: propsError } = await supabase
          .from("properties")
          .select("*")
          .in("id", ids);

        if (propsError) throw propsError;
        setProperties(propsData || []);
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.error("Failed to load saved properties:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("tenant_id", profile.id)
        .eq("property_id", propertyId);

      if (error) throw error;

      // Filter out of local list
      setProperties(prev => prev.filter(p => p.id !== propertyId));
    } catch (err) {
      console.error("Failed to remove saved property:", err);
    }
  };

  useEffect(() => {
    fetchSavedProperties();
  }, [profile]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Title */}
      <div className="space-y-1.5">
        <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-sans flex items-center space-x-2">
          <Heart className="h-6 w-6 text-rose-500 fill-current" />
          <span>My Saved Rentals</span>
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm font-medium">
          Manage your saved rental properties across Kenya. We notify you if pricing updates!
        </p>
      </div>

      {loading ? (
        <PropertySkeleton count={3} showActions={false} />
      ) : properties.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-stone-200 py-16 px-4 text-center max-w-lg mx-auto shadow-sm">
          <div className="text-4xl mb-3">💖</div>
          <h3 className="font-bold text-lg text-stone-900">Your saved list is empty</h3>
          <p className="text-stone-500 text-sm mt-1 leading-relaxed max-w-xs mx-auto">
            Heart properties in the Browse catalog to save them here for quick access later!
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center space-x-1.5 py-2.5 px-4 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 shadow transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Browse</span>
          </Link>
        </div>
      ) : (
        /* Properties Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Link
              key={property.id}
              to={`/property/${property.id}`}
              className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full"
            >
              {/* Media */}
              <div className="relative aspect-video w-full overflow-hidden bg-stone-100">
                <img
                  src={property.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";
                  }}
                />

                <span className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-sm text-gold-400 text-[10px] font-bold uppercase px-2 py-1 rounded-full border border-stone-700">
                  {property.type.replace("_", " ")}
                </span>

                <button
                  onClick={(e) => handleRemoveSaved(e, property.id)}
                  className="absolute bottom-3 right-3 p-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-500 shadow-md transition scale-110"
                  title="Remove from saved"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>

              {/* Details */}
              <div className="p-5 flex flex-col flex-1 space-y-2">
                <div className="flex items-center space-x-1 text-stone-400 text-xs font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                  <span className="truncate">{property.location}, {property.county}</span>
                </div>

                <h3 className="font-sans font-bold text-stone-950 text-base line-clamp-1 group-hover:text-primary-800 transition-colors">
                  {property.title}
                </h3>

                <div className="pt-3 border-t border-stone-100 mt-auto flex items-baseline justify-between">
                  <div>
                    <span className="text-lg font-extrabold text-stone-950">
                      KSh {parseFloat(property.price).toLocaleString()}
                    </span>
                    <span className="text-xs text-stone-500"> / Month</span>
                  </div>
                  <span className="text-xs font-bold text-primary-600 group-hover:underline">
                    View →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
};
