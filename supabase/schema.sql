-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────
create table if not exists profiles (
  id                  text primary key,
  full_name           text,
  phone               text,
  email               text,
  role                text check (role in (
    'landlord','caretaker','agent',
    'tenant','admin','superadmin'
  )) default 'tenant',
  avatar_url          text,
  is_active           boolean default true,
  email_notifications  boolean default true,
  sms_notifications    boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── PROPERTIES ───────────────────────────────────
create table if not exists properties (
  id              uuid primary key default uuid_generate_v4(),
  landlord_id     text references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  location        text,
  county          text,
  type            text check (type in (
    'single_room','bedsitter','studio',
    '1br','2br','3br','4br','5br_plus'
  )),
  price           integer,
  amenities       text[] default '{}',
  images          text[] default '{}',
  is_active       boolean default false,
  is_featured     boolean default false,
  expires_at      timestamptz,
  view_count      integer default 0,
  inquiry_count   integer default 0,
  payment_status  text default 'unpaid' check (
    payment_status in (
      'unpaid',
      'pending_verification',
      'verified',
      'rejected'
    )
  ),
  rejection_reason text,
  expiry_sms_sent  boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── LISTING PAYMENTS ─────────────────────────────
create table if not exists listing_payments (
  id                uuid primary key default uuid_generate_v4(),
  property_id       uuid references properties(id) on delete cascade,
  landlord_id       text references profiles(id),
  amount            integer not null,
  amount_paid       numeric,
  property_type     text,
  mpesa_code        text unique,
  payer_phone       text,
  status            text default 'pending' check (
    status in (
      'pending',
      'confirmed',
      'failed',
      'cancelled'
    )
  ),
  rejection_reason  text,
  verified_at       timestamptz,
  verified_by       text,
  created_at        timestamptz default now()
);

-- ── INQUIRIES ────────────────────────────────────
create table if not exists inquiries (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid references properties(id) on delete cascade,
  tenant_id     text references profiles(id),
  landlord_id   text references profiles(id),
  message       text not null,
  tenant_name   text,
  tenant_phone  text,
  tenant_email  text,
  status        text default 'pending' check (
    status in ('pending','responded','closed')
  ),
  reply         text,
  replied_at    timestamptz,
  created_at    timestamptz default now()
);

-- ── SAVED PROPERTIES ─────────────────────────────
create table if not exists saved_properties (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  property_id  uuid references properties(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(tenant_id, property_id)
);

-- ── SEARCH ALERTS ────────────────────────────────
create table if not exists search_alerts (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  county       text,
  type         text,
  max_price    integer,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ── SMS LOGS ─────────────────────────────────────
create table if not exists sms_logs (
  id               uuid primary key default uuid_generate_v4(),
  recipient_phone  text not null,
  message          text not null,
  type             text,
  status           text default 'sent',
  at_response      jsonb,
  created_at       timestamptz default now()
);

-- ── INDEXES ──────────────────────────────────────
create index if not exists idx_properties_active
  on properties(is_active);
create index if not exists idx_properties_county
  on properties(county);
create index if not exists idx_properties_type
  on properties(type);
create index if not exists idx_properties_landlord
  on properties(landlord_id);
create index if not exists idx_properties_payment
  on properties(payment_status);
create index if not exists idx_properties_expires
  on properties(expires_at) where is_active = true;
create index if not exists idx_payments_status
  on listing_payments(status);
create index if not exists idx_payments_landlord
  on listing_payments(landlord_id);
create index if not exists idx_payments_mpesa_code
  on listing_payments(mpesa_code);
create index if not exists idx_inquiries_landlord
  on inquiries(landlord_id);
create index if not exists idx_inquiries_tenant
  on inquiries(tenant_id);
create index if not exists idx_saved_tenant
  on saved_properties(tenant_id);

-- ── ROW LEVEL SECURITY ───────────────────────────
alter table profiles          enable row level security;
alter table properties        enable row level security;
alter table listing_payments  enable row level security;
alter table inquiries         enable row level security;
alter table saved_properties  enable row level security;
alter table search_alerts     enable row level security;
alter table sms_logs          enable row level security;

-- PROFILES: public read, anyone can insert/update
create policy "profiles_public_read" on profiles
  for select using (true);
create policy "profiles_insert" on profiles
  for insert with check (true);
create policy "profiles_update" on profiles
  for update using (true);

-- PROPERTIES: public read active, full access for all
create policy "properties_public_read" on properties
  for select using (is_active = true);
create policy "properties_full_access" on properties
  for all using (true);

-- PAYMENTS: full access (server handles auth)
create policy "payments_full_access" on listing_payments
  for all using (true);

-- INQUIRIES: full access
create policy "inquiries_full_access" on inquiries
  for all using (true);

-- SAVED: full access
create policy "saved_full_access" on saved_properties
  for all using (true);

-- ALERTS: full access
create policy "alerts_full_access" on search_alerts
  for all using (true);

-- SMS LOGS: full access
create policy "sms_full_access" on sms_logs
  for all using (true);

-- ── TRIGGERS ─────────────────────────────────────

-- Auto update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

-- Auto activate listing when payment confirmed
create or replace function handle_payment_status_change()
returns trigger language plpgsql as $$
begin
  -- Payment confirmed → activate listing
  if NEW.status = 'confirmed'
     and OLD.status != 'confirmed'
     and NEW.property_id is not null
  then
    update properties
    set
      is_active      = true,
      payment_status = 'verified',
      expires_at     = now() + interval '30 days'
    where id = NEW.property_id;
  end if;

  -- Payment failed → mark as rejected
  if NEW.status = 'failed'
     and OLD.status = 'pending'
     and NEW.property_id is not null
  then
    update properties
    set
      payment_status   = 'rejected',
      rejection_reason = NEW.rejection_reason
    where id = NEW.property_id;
  end if;

  return NEW;
end;
$$;

create trigger on_payment_status_change
  after update on listing_payments
  for each row execute function handle_payment_status_change();

-- Auto increment inquiry count
create or replace function increment_inquiry_count()
returns trigger language plpgsql as $$
begin
  update properties
  set inquiry_count = inquiry_count + 1
  where id = NEW.property_id;
  return NEW;
end;
$$;

create trigger on_inquiry_created
  after insert on inquiries
  for each row execute function increment_inquiry_count();

-- Auto increment view count function
create or replace function increment_view_count(p_id uuid)
returns void language sql as $$
  update properties
  set view_count = view_count + 1
  where id = p_id;
$$;

-- Google OAuth new user profile handler
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    new.email,
    new.raw_user_meta_data->>'role'
  )
  on conflict (id) do update
  set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    email = coalesce(public.profiles.email, excluded.email);
  return new;
end;
$$;

-- Trigger to run this automatically on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

