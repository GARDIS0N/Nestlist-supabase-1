export type ProfileRole = "landlord" | "tenant" | "caretaker" | "agent" | "admin" | "superadmin";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: ProfileRole | null;
  avatar_url: string | null;
  created_at: string;
}

export type PropertyType =
  | "single_room"
  | "bedsitter"
  | "studio"
  | "1br"
  | "2br"
  | "3br"
  | "4br"
  | "5br_plus";

export type PropertyStatus = "available" | "taken";

export interface Property {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  location: string;
  county: string;
  price: number;
  type: PropertyType;
  amenities: string[];
  images: string[];
  status: PropertyStatus;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export type PaymentStatus = "pending" | "confirmed" | "failed" | "cancelled";

export interface ListingPayment {
  id: string;
  property_id: string | null;
  landlord_id: string;
  amount: number;
  property_type: string | null;
  mpesa_code: string | null;
  mpesa_checkout_request_id: string | null;
  amount_paid: number | null;
  payer_phone: string | null;
  failure_reason: string | null;
  status: PaymentStatus;
  confirmed_at: string | null;
  created_at: string;
}

export type InquiryStatus = "pending" | "responded" | "closed";

export interface Inquiry {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
}

export interface Message {
  id: string;
  inquiry_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface SavedProperty {
  id: string;
  tenant_id: string;
  property_id: string;
  created_at: string;
}

export interface SearchAlert {
  id: string;
  tenant_id: string;
  name: string;
  county: string | null;
  type: string | null;
  min_price: number | null;
  max_price: number | null;
  amenities: string[] | null;
  is_active: boolean;
  last_sent: string | null;
  created_at: string;
}

export interface SmsLog {
  id: string;
  type: string | null;
  recipient_phone: string | null;
  message: string | null;
  status: string | null;
  message_id: string | null;
  cost: string | null;
  created_at: string;
}

// Supabase Database Helper representation
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      properties: {
        Row: Property;
        Insert: Omit<Property, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Property, "id" | "created_at">>;
      };
      listing_payments: {
        Row: ListingPayment;
        Insert: Omit<ListingPayment, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ListingPayment, "id" | "created_at">>;
      };
      inquiries: {
        Row: Inquiry;
        Insert: Omit<Inquiry, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Inquiry, "id" | "created_at">>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Message, "id" | "created_at">>;
      };
      saved_properties: {
        Row: SavedProperty;
        Insert: Omit<SavedProperty, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<SavedProperty, "id" | "created_at">>;
      };
      search_alerts: {
        Row: SearchAlert;
        Insert: Omit<SearchAlert, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<SearchAlert, "id" | "created_at">>;
      };
      sms_logs: {
        Row: SmsLog;
        Insert: Omit<SmsLog, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<SmsLog, "id" | "created_at">>;
      };
    };
  };
}
