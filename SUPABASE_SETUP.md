# Connect NestList to Supabase

## Step 1 — Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Choose a name: nestlist
4. Choose a region: closest to Kenya (e.g., eu-west-2 London or af-south-1 Cape Town)
5. Set a database password (save it!)
6. Wait for project to initialize (~2 minutes)

## Step 2 — Run the Database Schema
1. In your Supabase project go to: **SQL Editor** → **New Query**
2. Copy the database schema from your migrations or schema files (typically `supabase/schema.sql`).
3. Paste and click **Run**.
4. You should see "Success. No rows returned".

## Step 3 — Set Up Storage
1. Go to **Storage** in your Supabase project.
2. Click **New bucket**.
3. Name: `nestlist-images`
4. Make it **PUBLIC** (toggle on).
5. Click **Create bucket**.
6. Go to **Policies** tab.
7. Click **New Policy** → **For full customization** or run this SQL in the **SQL Editor**:

```sql
insert into storage.buckets
(id, name, public, file_size_limit, allowed_mime_types)
values (
  'nestlist-images', 'nestlist-images', true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/jpg']
) on conflict (id) do nothing;

create policy "Public read" on storage.objects
  for select using (bucket_id = 'nestlist-images');

create policy "Auth upload" on storage.objects
  for insert with check (bucket_id = 'nestlist-images');

create policy "Auth delete" on storage.objects
  for delete using (bucket_id = 'nestlist-images');
```

## Step 4 — Enable Google OAuth (optional)
1. Go to **Authentication** → **Providers**.
2. Find Google and enable it.
3. Go to https://console.cloud.google.com
4. Create OAuth 2.0 credentials.
5. Add authorized redirect URI:
   `https://[your-project-ref].supabase.co/auth/v1/callback`
6. Copy Client ID and Secret to Supabase.

## Step 5 — Get Your API Keys
1. Go to **Settings** → **API**.
2. Copy **Project URL**  → `VITE_SUPABASE_URL`
3. Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`

## Step 6 — Add Keys to .env
Create `.env` or `.env.local` file in the project root:
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

## Step 7 — Test Locally
```bash
npm run dev
```
The "Simulator Mode" banner should disappear.

## Step 8 — Add Keys to Vercel (or deployment platforms)
1. Go to your deployment project settings.
2. Add both variables under Environment Variables.
3. Redeploy the app.

## Step 9 — Create Your Admin Account
1. Register on the NestList app at `/signup` with your email (e.g., `gardisonkirui11@gmail.com`).
2. Then run this SQL query in your Supabase SQL Editor:
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'gardisonkirui11@gmail.com';
```
3. Log out and log back in.
4. You now have admin access at `/admin`.
