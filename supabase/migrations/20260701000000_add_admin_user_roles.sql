-- Migration: Expand profiles table role check constraint to support 'user' and 'admin'
-- This satisfies the role requirements for 'user' and 'admin' while maintaining backward compatibility with 'landlord' and 'tenant'.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('landlord', 'tenant', 'user', 'admin'));
