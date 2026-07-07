-- Migration: Add email_notifications and sms_notifications columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;
