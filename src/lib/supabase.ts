import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Type helpers matching your DB schema ──────────────────────────────────────

export type UserRole = "passenger" | "driver" | "admin";
export type RideStatus = "requested" | "accepted" | "en_route" | "completed" | "cancelled";
export type DriverStatus = "pending_verification" | "approved" | "suspended" | "offline";
export type DocType = "phv_licence" | "vehicle_insurance" | "mot_certificate" | "driving_licence";

export interface DBUser {
  id: string;
  phone: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export interface DBDriver {
  id: string;
  badge_number: string | null;
  badge_expiry: string | null;
  status: DriverStatus;
  rating: number;
  total_trips: number;
}

export interface DBRide {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_miles: number;
  duration_minutes: number;
  fare_estimate: number; // pence
  fare_final: number | null; // pence
  status: RideStatus;
  extra_child_seat: boolean;
  extra_meet_greet: boolean;
  is_night_rate: boolean;
  created_at: string;
}

export interface DBDocument {
  id: string;
  driver_id: string;
  type: DocType;
  file_url: string;
  expiry_date: string;
  verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DBVehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  plate_number: string;
  year: number;
  insurance_expiry: string;
  created_at: string;
}

export interface DBPayment {
  id: string;
  ride_id: string;
  stripe_payment_intent_id: string | null;
  amount_pence: number;
  status: string;
  created_at: string;
}

export interface DBRating {
  id: string;
  ride_id: string;
  passenger_id: string;
  driver_id: string;
  score: number;
  created_at: string;
}
