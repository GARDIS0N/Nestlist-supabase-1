import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useListings(filters: any = {}) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, [JSON.stringify(filters)]);

  async function fetchListings() {
    setLoading(true);
    setError(null);
    try {
      // 1. Try standard implicit join (highly reliable)
      let query = supabase
        .from("properties")
        .select(`
          *,
          profiles (
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filters.county && filters.county !== "all") {
        query = query.eq("county", filters.county);
      }
      if (filters.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,` +
          `location.ilike.%${filters.search}%,` +
          `county.ilike.%${filters.search}%`
        );
      }

      const { data, error: fetchErr } = await query;
      
      if (fetchErr) {
        console.warn("useListings standard join failed, trying explicit modifier:", fetchErr);
        
        // 2. Try explicit modifier
        let fallbackQuery = supabase
          .from("properties")
          .select(`
            *,
            profiles!landlord_id (
              full_name,
              phone,
              avatar_url
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (filters.county && filters.county !== "all") {
          fallbackQuery = fallbackQuery.eq("county", filters.county);
        }
        if (filters.type && filters.type !== "all") {
          fallbackQuery = fallbackQuery.eq("type", filters.type);
        }
        if (filters.maxPrice) {
          fallbackQuery = fallbackQuery.lte("price", filters.maxPrice);
        }
        if (filters.search) {
          fallbackQuery = fallbackQuery.or(
            `title.ilike.%${filters.search}%,` +
            `location.ilike.%${filters.search}%,` +
            `county.ilike.%${filters.search}%`
          );
        }

        const { data: data2, error: fetchErr2 } = await fallbackQuery;
        
        if (fetchErr2) {
          console.warn("useListings explicit modifier failed, trying manual resolution:", fetchErr2);
          
          // 3. Try selecting properties alone and resolve profiles manually
          let simpleQuery = supabase
            .from("properties")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (filters.county && filters.county !== "all") {
            simpleQuery = simpleQuery.eq("county", filters.county);
          }
          if (filters.type && filters.type !== "all") {
            simpleQuery = simpleQuery.eq("type", filters.type);
          }
          if (filters.maxPrice) {
            simpleQuery = simpleQuery.lte("price", filters.maxPrice);
          }
          if (filters.search) {
            simpleQuery = simpleQuery.or(
              `title.ilike.%${filters.search}%,` +
              `location.ilike.%${filters.search}%,` +
              `county.ilike.%${filters.search}%`
            );
          }

          const { data: rawProperties, error: fetchErr3 } = await simpleQuery;
          if (fetchErr3) throw fetchErr3;

          const listingsList = rawProperties || [];
          if (listingsList.length === 0) {
            setListings([]);
            return;
          }

          const landlordIds = Array.from(new Set(listingsList.map((p: any) => p.landlord_id).filter(Boolean)));
          if (landlordIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, phone, avatar_url')
              .in('id', landlordIds);

            if (!profilesError && profilesData) {
              const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
              const merged = listingsList.map((p: any) => ({
                ...p,
                profiles: profilesMap.get(p.landlord_id) || null
              }));
              setListings(merged);
              return;
            }
          }
          setListings(listingsList.map((p: any) => ({ ...p, profiles: null })));
        } else {
          setListings(data2 || []);
        }
      } else {
        setListings(data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { listings, loading, error, refetch: fetchListings };
}
