import { createClient } from '@supabase/supabase-js';

export function sanitizeUrl(url: string): string {
  if (!url) return '';
  // Remove trailing slashes
  url = url.trim().replace(/\/+$/, '');
  // Remove /rest/v1 or any path
  url = url.replace(/\/rest\/v1.*$/, '');
  url = url.replace(/\/auth\/v1.*$/, '');
  // Ensure https://
  if (!url.startsWith('https://')) {
    url = 'https://' + url.replace(/^http:\/\//, '');
  }
  return url;
}

const SUPABASE_URL = sanitizeUrl(
  import.meta.env.VITE_SUPABASE_URL
  || 'https://wkbkcjbtvzfbjkbovpac.supabase.co'
);

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmtjamJ0dnpmYmprYm92cGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzIyMjQsImV4cCI6MjA5ODM0ODIyNH0.pxuck5s1lLwy0lVWpBOKZGvWGbFHtDZ1SUs96WuZWt0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'nestlist-auth',
  },
});

export const isSupabaseConfigured = true;
export const IS_MOCK_SUPABASE = false;
export const SUPABASE_PROJECT_URL = SUPABASE_URL;

export const getSupabaseConfig = () => {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isMock: false,
    isUsingStored: false,
  };
};

export const setSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("NESTLIST_SUPABASE_URL", url);
    localStorage.setItem("NESTLIST_SUPABASE_ANON_KEY", key);
  }
};

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    if (error && error.code !== 'PGRST116') {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

// Re-export INITIAL_PROPERTIES for pages like Browse.tsx
export const INITIAL_PROPERTIES = [
  {
    id: "prop-1",
    landlord_id: "landlord-1",
    title: "Charming Bedsitter in Roysambu",
    description: "Located near Thika Road Mall (TRM). Features continuous water supply, secure gate, tiled floors, instant hot shower installed, and highly accessible by public transport.",
    location: "Roysambu, off TRM Drive",
    county: "Nairobi",
    price: 13000,
    type: "bedsitter",
    amenities: ["Water 24/7", "Borehole", "Security Guard", "CCTV", "WiFi Ready", "Tiled Floors", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-2",
    landlord_id: "landlord-2",
    title: "Spacious 2 Bedroom Apartment in Ruiru",
    description: "Modern apartments with high-quality finishes. Close to Spur Mall. Master en-suite, spacious balcony, secure parking, backup generator for common areas, and high speed elevator.",
    location: "Ruiru, Bypass",
    county: "Kiambu",
    price: 28000,
    type: "2br",
    amenities: ["Water 24/7", "Parking", "Security Guard", "CCTV", "Electric Fence", "Backup Generator", "WiFi Ready", "Balcony", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-3",
    landlord_id: "landlord-1",
    title: "Cozy 1 Bedroom near Daystar University",
    description: "Perfect for students or young professionals. Fast fiber internet, serene study garden, electric fencing, laundry area, and tiled bathrooms.",
    location: "Kikuyu Town",
    county: "Kiambu",
    price: 16500,
    type: "1br",
    amenities: ["Water 24/7", "Borehole", "Parking", "Electric Fence", "WiFi Ready", "Tiled Floors", "Garden", "Near School"],
    images: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-4",
    landlord_id: "landlord-3",
    title: "Executive 3 Bedroom in Nyali",
    description: "Luxury beachfront apartment in Nyali. Fully air-conditioned, swimming pool access, ocean breeze balcony, modern kitchen setup, DSTV ready, and tight 24-hour security.",
    location: "Nyali, Links Road",
    county: "Mombasa",
    price: 65000,
    type: "3br",
    amenities: ["Water 24/7", "Parking", "Security Guard", "CCTV", "Backup Generator", "WiFi Ready", "DSTV Ready", "Balcony", "Near Tarmac", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-5",
    landlord_id: "landlord-4",
    title: "Affordable Single Room in Madaraka",
    description: "Close proximity to Strathmore University. Comes with shared cooking area, clean bathrooms, laundry yard, security lock, and token electricity meters.",
    location: "Madaraka Estate",
    county: "Nairobi",
    price: 8000,
    type: "single_room",
    amenities: ["Water 24/7", "Borehole", "Security Guard", "WiFi Ready", "Tiled Floors", "Near School", "Near Shopping Centre"],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-6",
    landlord_id: "landlord-2",
    title: "Studio Apartment in Kilimani",
    description: "Fully loaded studio apartment with high-end fixtures. Ideal for single professionals. Secure residential complex, fitted oven, high speed elevators, gym, and borehole water.",
    location: "Kilimani, Rose Avenue",
    county: "Nairobi",
    price: 25000,
    type: "studio",
    amenities: ["Water 24/7", "Borehole", "Parking", "Security Guard", "CCTV", "Electric Fence", "Backup Generator", "WiFi Ready", "Tiled Floors", "Balcony", "Near Tarmac"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    status: "available",
    is_active: true,
    expires_at: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export default supabase;
