-- Migration: Promote the specific developer user to the 'admin' role
-- 1. Check if a profiles row exists for the user ID and promote or insert it

INSERT INTO public.profiles (id, role, full_name, phone, created_at)
VALUES (
  '42eca9a0-c070-4898-b830-46c3247ea71d', 
  'admin', 
  'Developer Admin', 
  '0722000000', 
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';
