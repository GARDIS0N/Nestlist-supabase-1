// ── Boost Pricing ────────────────────────────────
export const BOOST_TIERS = {
  '3day':  {
    label: '3 Day Boost',
    badge: '⚡ Featured',
    price: 50,
    days: 3,
    color: '#4B5E54',
  },
  '7day':  {
    label: '7 Day Boost',
    badge: '⭐ Featured',
    price: 100,
    days: 7,
    color: '#1E6B4A',
    popular: true,
  },
  '14day': {
    label: '14 Day Boost',
    badge: '🔥 Hot Property',
    price: 200,
    days: 14,
    color: '#D97706',
  },
  '30day': {
    label: '30 Day Premium',
    badge: '👑 Premium',
    price: 350,
    days: 30,
    color: '#7C3AED',
    bestValue: true,
  },
};

// ── Pay-Per-Lead Pricing ─────────────────────────
export const LEAD_PRICES: Record<string, number> = {
  single_room: 25,
  bedsitter:   50,
  studio:      60,
  '1br':       120,
  '2br':       160,
  '3br':       220,
  '4br':       260,
  '5br_plus':  300,
};

// ── Lead Bundle Pricing ──────────────────────────
export const LEAD_BUNDLES: Record<string, {
  count: number;
  price: number;
  saving: number;
}> = {
  single_room: { count: 5, price: 100,   saving: 20 },
  bedsitter:   { count: 5, price: 200,   saving: 20 },
  studio:      { count: 5, price: 250,   saving: 17 },
  '1br':       { count: 5, price: 500,   saving: 17 },
  '2br':       { count: 5, price: 700,   saving: 13 },
  '3br':       { count: 5, price: 1000,  saving: 9  },
  '4br':       { count: 5, price: 1200,  saving: 8  },
  '5br_plus':  { count: 5, price: 1500,  saving: 0  },
};
