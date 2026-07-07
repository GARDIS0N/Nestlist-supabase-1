-- Migration: Add Manual M-Pesa Payment Verification Columns to Properties table
-- This allows tracking payment state, M-Pesa reference codes, and admin actions directly on property listings.

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS payment_status text CHECK (payment_status IN ('unpaid', 'pending_verification', 'verified', 'rejected')) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS mpesa_code text,
ADD COLUMN IF NOT EXISTS mpesa_phone text,
ADD COLUMN IF NOT EXISTS amount_paid numeric,
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Index to optimize querying listings by payment verification status (e.g. for Admin reviews)
CREATE INDEX IF NOT EXISTS idx_properties_payment_status ON public.properties (payment_status);
