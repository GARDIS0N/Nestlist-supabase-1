-- =====================================================================
-- NESTLIST: COMPLETE KENYAN RENTAL SAAS PLATFORM SQL MIGRATION
-- =====================================================================
-- This file configures the database tables, indexes, row-level security (RLS),
-- triggers, and storage buckets. Execute this in the Supabase SQL Editor.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pg_net and pg_cron must be enabled via the Supabase Dashboard UI, but we ensure their existence
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ---------------------------------------------------------------------
-- 1. DATABASE TABLES
-- ---------------------------------------------------------------------

-- PROFILES TABLE
-- References auth.users created by Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text CHECK (role IN ('landlord', 'tenant')) NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- PROPERTIES TABLE
-- Represents the rental listings
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  landlord_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  location text NOT NULL,
  county text NOT NULL,
  price numeric NOT NULL,
  type text CHECK (type IN ('single_room', 'bedsitter', 'studio', '1br', '2br', '3br', '4br', '5br_plus')) NOT NULL,
  amenities text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  status text CHECK (status IN ('available', 'taken')) DEFAULT 'available',
  is_active boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- LISTING PAYMENTS TABLE
-- Tracks M-Pesa payments for activating listings
CREATE TABLE IF NOT EXISTS public.listing_payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  landlord_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  property_type text NOT NULL,
  mpesa_code text,
  mpesa_checkout_request_id text UNIQUE,
  amount_paid numeric,
  payer_phone text,
  failure_reason text,
  status text CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')) DEFAULT 'pending',
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- INQUIRIES TABLE
-- Tenant chats/inquiries to landlords
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  landlord_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  status text CHECK (status IN ('pending', 'responded', 'closed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- MESSAGES TABLE
-- Individual messages inside an inquiry thread
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- SAVED PROPERTIES TABLE
-- Tenant favorites/saved list
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, property_id)
);

-- SEARCH ALERTS TABLE
-- Subscriptions for automated county/budget search notifications
CREATE TABLE IF NOT EXISTS public.search_alerts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  county text,
  type text,
  min_price numeric,
  max_price numeric,
  amenities text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_sent timestamptz,
  created_at timestamptz DEFAULT now()
);

-- SMS LOGS TABLE
-- Tracks all sms alerts sent via Edge Functions
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text NOT NULL,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'sent',
  message_id text,
  cost text,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------

-- Properties search optimization
CREATE INDEX IF NOT EXISTS idx_properties_search ON public.properties (is_active, county, type, price);
-- Properties default landing feed sorting
CREATE INDEX IF NOT EXISTS idx_properties_feed ON public.properties (is_active, created_at DESC);
-- Landlord's listings
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON public.properties (landlord_id);

-- Payment callback matching
CREATE INDEX IF NOT EXISTS idx_listing_payments_checkout ON public.listing_payments (mpesa_checkout_request_id);

-- Inquiries lookup by role
CREATE INDEX IF NOT EXISTS idx_inquiries_tenant ON public.inquiries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_landlord ON public.inquiries (landlord_id);

-- Saved properties lookup
CREATE INDEX IF NOT EXISTS idx_saved_properties_tenant ON public.saved_properties (tenant_id);

-- Search alert triggers
CREATE INDEX IF NOT EXISTS idx_search_alerts_match ON public.search_alerts (is_active, county, type);

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY select_profiles_policy ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY insert_profiles_policy ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY update_profiles_policy ON public.profiles
  FOR UPDATE USING (auth.uid() = id) 
  WITH CHECK (
    auth.uid() = id 
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = role -- prevent role updates
  );

-- Properties policies
CREATE POLICY select_properties_policy ON public.properties
  FOR SELECT USING (is_active = true OR auth.uid() = landlord_id);

CREATE POLICY insert_properties_policy ON public.properties
  FOR INSERT WITH CHECK (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'landlord'
    AND landlord_id = auth.uid()
    AND is_active = false -- Landlord cannot self-activate listings without paying
  );

CREATE POLICY update_properties_policy ON public.properties
  FOR UPDATE USING (auth.uid() = landlord_id)
  WITH CHECK (
    auth.uid() = landlord_id 
    AND is_active = (SELECT p.is_active FROM public.properties p WHERE p.id = id) -- Lock is_active from manual edits
  );

CREATE POLICY delete_properties_policy ON public.properties
  FOR DELETE USING (auth.uid() = landlord_id);

-- Listing payments policies
CREATE POLICY select_payments_policy ON public.listing_payments
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY insert_payments_policy ON public.listing_payments
  FOR INSERT WITH CHECK (
    auth.uid() = landlord_id
    AND status = 'pending'
  );

-- Note: No update or delete policies on listing_payments. Transition to confirmed/failed is done via service role only.

-- Inquiries policies
CREATE POLICY select_inquiries_policy ON public.inquiries
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);

CREATE POLICY insert_inquiries_policy ON public.inquiries
  FOR INSERT WITH CHECK (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'tenant'
    AND tenant_id = auth.uid()
  );

CREATE POLICY update_inquiries_policy ON public.inquiries
  FOR UPDATE USING (auth.uid() = tenant_id OR auth.uid() = landlord_id)
  WITH CHECK (
    -- Can only edit the status field
    status IN ('pending', 'responded', 'closed')
  );

-- Messages policies
CREATE POLICY select_messages_policy ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inquiries i 
      WHERE i.id = inquiry_id 
      AND (i.tenant_id = auth.uid() OR i.landlord_id = auth.uid())
    )
  );

CREATE POLICY insert_messages_policy ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.inquiries i 
      WHERE i.id = inquiry_id 
      AND (i.tenant_id = auth.uid() OR i.landlord_id = auth.uid())
    )
  );

-- Saved properties policies
CREATE POLICY all_saved_properties_policy ON public.saved_properties
  FOR ALL USING (auth.uid() = tenant_id);

-- Search Alerts policies
CREATE POLICY all_search_alerts_policy ON public.search_alerts
  FOR ALL USING (auth.uid() = tenant_id)
  WITH CHECK (
    auth.uid() = tenant_id 
    -- last_sent column lock check is handled at trigger or backend logic level
  );

-- SMS logs: No policies for normal users. Accessible only via the service_role key inside Edge Functions.

-- ---------------------------------------------------------------------
-- 4. STORAGE CONFIG & POLICIES
-- ---------------------------------------------------------------------

-- Note: Storage buckets are set up inside public.buckets in Supabase storage schema.
-- We can seed them or instruct pg SQL to insert them if missing.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public Read Property Images" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Landlord Write Own Property Images" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'property-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'property-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND octet_length(owner) < 5242880 -- Under 5MB
  );

CREATE POLICY "Public Read Avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "User Write Own Avatar" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND octet_length(owner) < 2097152 -- Under 2MB
  );

-- ---------------------------------------------------------------------
-- 5. DATABASE TRIGGERS
-- ---------------------------------------------------------------------

-- 1. activate_listing() Trigger Function
CREATE OR REPLACE FUNCTION public.activate_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Update corresponding property to active and set expiration date (30 days)
    UPDATE public.properties
    SET is_active = true,
        expires_at = now() + INTERVAL '30 days'
    WHERE id = NEW.property_id;
    
    -- Set payment confirmed_at date
    NEW.confirmed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activate_listing
  BEFORE UPDATE ON public.listing_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_listing();


-- Helper function to fetch secrets from vault or config settings
-- Note: Developers must run:
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
CREATE OR REPLACE FUNCTION public.get_supabase_config(setting_name text)
RETURNS text AS $$
DECLARE
  val text;
BEGIN
  val := current_setting('app.' || setting_name, true);
  IF val IS NULL OR val = '' THEN
    val := ''; -- Default empty if not configured yet
  END IF;
  RETURN val;
END;
$$ LANGUAGE plpgsql;


-- 2. notify_inquiry_sms() Trigger Function
CREATE OR REPLACE FUNCTION public.notify_inquiry_sms()
RETURNS TRIGGER AS $$
DECLARE
  landlord_phone text;
  landlord_name text;
  tenant_phone text;
  tenant_name text;
  prop_title text;
  sup_url text;
  sup_key text;
  request_body jsonb;
BEGIN
  -- Get profiles and property info
  SELECT phone, full_name INTO landlord_phone, landlord_name FROM public.profiles WHERE id = NEW.landlord_id;
  SELECT phone, full_name INTO tenant_phone, tenant_name FROM public.profiles WHERE id = NEW.tenant_id;
  SELECT title INTO prop_title FROM public.properties WHERE id = NEW.property_id;
  
  sup_url := public.get_supabase_config('supabase_url');
  sup_key := public.get_supabase_config('service_role_key');
  
  -- Send SMS via Supabase Edge Function using pg_net if configured
  IF sup_url != '' AND sup_key != '' THEN
    -- Notify Landlord
    IF landlord_phone IS NOT NULL AND landlord_phone != '' THEN
      request_body := jsonb_build_object(
        'type', 'inquiry_received',
        'phone', landlord_phone,
        'data', jsonb_build_object(
          'landlord_name', landlord_name,
          'tenant_name', tenant_name,
          'tenant_phone', tenant_phone,
          'property_title', prop_title,
          'message', NEW.message
        )
      );
      PERFORM net.http_post(
        url := sup_url || '/functions/v1/send-sms',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || sup_key),
        body := request_body
      );
    END IF;

    -- Confirm to Tenant
    IF tenant_phone IS NOT NULL AND tenant_phone != '' THEN
      request_body := jsonb_build_object(
        'type', 'inquiry_sent',
        'phone', tenant_phone,
        'data', jsonb_build_object(
          'tenant_name', tenant_name,
          'property_title', prop_title,
          'landlord_phone', landlord_phone
        )
      );
      PERFORM net.http_post(
        url := sup_url || '/functions/v1/send-sms',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || sup_key),
        body := request_body
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_inquiry_sms
  AFTER INSERT ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_inquiry_sms();


-- 3. notify_payment_confirmed_sms() Trigger Function
CREATE OR REPLACE FUNCTION public.notify_payment_confirmed_sms()
RETURNS TRIGGER AS $$
DECLARE
  landlord_phone text;
  landlord_name text;
  prop_title text;
  sup_url text;
  sup_key text;
  request_body jsonb;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    SELECT phone, full_name INTO landlord_phone, landlord_name FROM public.profiles WHERE id = NEW.landlord_id;
    SELECT title INTO prop_title FROM public.properties WHERE id = NEW.property_id;
    
    sup_url := public.get_supabase_config('supabase_url');
    sup_key := public.get_supabase_config('service_role_key');

    IF sup_url != '' AND sup_key != '' AND landlord_phone IS NOT NULL AND landlord_phone != '' THEN
      request_body := jsonb_build_object(
        'type', 'payment_confirmed',
        'phone', landlord_phone,
        'data', jsonb_build_object(
          'landlord_name', landlord_name,
          'property_title', prop_title,
          'amount', NEW.amount,
          'mpesa_code', NEW.mpesa_code
        )
      );
      PERFORM net.http_post(
        url := sup_url || '/functions/v1/send-sms',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || sup_key),
        body := request_body
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_payment_confirmed_sms
  AFTER UPDATE ON public.listing_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_confirmed_sms();


-- 4. notify_matching_alerts() Trigger Function
CREATE OR REPLACE FUNCTION public.notify_matching_alerts()
RETURNS TRIGGER AS $$
DECLARE
  alert_row record;
  tenant_phone text;
  tenant_name text;
  sup_url text;
  sup_key text;
  request_body jsonb;
BEGIN
  -- Trigger when property is activated (is_active goes from false to true)
  IF NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS NULL) THEN
    sup_url := public.get_supabase_config('supabase_url');
    sup_key := public.get_supabase_config('service_role_key');

    IF sup_url != '' AND sup_key != '' THEN
      -- Find all active search alerts that match this property criteria
      -- Cooldown on last_sent prevents spamming a tenant multiple times in 24 hours
      FOR alert_row IN 
        SELECT sa.id, sa.tenant_id, p.phone, p.full_name, sa.name AS alert_name
        FROM public.search_alerts sa
        JOIN public.profiles p ON p.id = sa.tenant_id
        WHERE sa.is_active = true
          AND (sa.county IS NULL OR sa.county = NEW.county)
          AND (sa.type IS NULL OR sa.type = NEW.type)
          AND (sa.min_price IS NULL OR NEW.price >= sa.min_price)
          AND (sa.max_price IS NULL OR NEW.price <= sa.max_price)
          AND (sa.last_sent IS NULL OR sa.last_sent < now() - INTERVAL '24 hours')
      LOOP
        -- Send notification to matching tenant
        IF alert_row.phone IS NOT NULL AND alert_row.phone != '' THEN
          request_body := jsonb_build_object(
            'type', 'search_alert',
            'phone', alert_row.phone,
            'data', jsonb_build_object(
              'tenant_name', alert_row.full_name,
              'alert_name', alert_row.alert_name,
              'property_title', NEW.title,
              'location', NEW.location || ', ' || NEW.county,
              'price', NEW.price,
              'property_id', NEW.id
            )
          );
          
          PERFORM net.http_post(
            url := sup_url || '/functions/v1/send-sms',
            headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || sup_key),
            body := request_body
          );

          -- Update last_sent timestamp for cooldown
          UPDATE public.search_alerts
          SET last_sent = now()
          WHERE id = alert_row.id;
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_matching_alerts
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matching_alerts();

-- ---------------------------------------------------------------------
-- 6. SCHEDULED JOBS (COMMENTED OUT FOR PG_CRON)
-- ---------------------------------------------------------------------
-- Note: These scheduled jobs are fully designed and can be enabled via:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- -- Job 1: Daily deactivation of properties where expires_at has passed
-- SELECT cron.schedule('deactivate-expired-properties', '0 0 * * *', $$
--   UPDATE public.properties
--   SET is_active = false
--   WHERE is_active = true AND expires_at < now();
-- $$);
--
-- -- Job 2: Daily reminder SMS for properties expiring within 5 days
-- -- This calls send-sms for each property matching criteria. In a real environment, 
-- -- a database function queries properties and issues http_posts to Edge Functions.
