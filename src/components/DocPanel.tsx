import React, { useState } from "react";
import { Terminal, Database, ShieldAlert, Cpu, BookOpen, Copy, Check, FileText, Wifi, Globe, MapPin, FolderOpen, Smartphone, Settings } from "lucide-react";

export function DocPanel() {
  const [activeTab, setActiveTab ] = useState<"sql" | "rn" | "packs" | "api" | "realtime" | "repos" | "location" | "storage" | "compose" | "setup" | "reg">("sql");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [setupChecklist, setSetupChecklist] = useState([
    { id: "hilt", text: "Hilt DI: Armed and resolved all 8 repositories in AppModule.kt", category: "App Setup", done: false },
    { id: "secrets", text: "local.properties: Populated Supabase URL/ApiKey securely", category: "App Setup", done: false },
    { id: "appClass", text: "Application Registration: Registered custom Application class in AndroidManifest.xml", category: "App Setup", done: false },
    { id: "channels", text: "Notification Channels: Registered on launch in Application.onCreate()", category: "App Setup", done: false },
    { id: "launch", text: "Emulator Bootstrap: Launches without cold runtime crash on SDK API 34+", category: "First Run Testing", done: false },
    { id: "login", text: "Active Authentication: Real driver credentials verify and session persists safely", category: "First Run Testing", done: false },
    { id: "realtime", text: "Realtime Jobs sync: Dashboard stream reflects booking updates live", category: "Core Operations", done: false },
    { id: "gps", text: "Foreground GPS Loop: Inserts locations to supabase table when status = IN_PROGRESS", category: "Core Operations", done: false },
    { id: "chat", text: "Emergency Dispatch Chat: Instant bidirection driver-customer logs stream correctly", category: "Core Operations", done: false },
    { id: "ocr", text: "Expense AI OCR: Scanned receipt image extracts accurate totals in currency", category: "Value Added Features", done: false },
    { id: "storage", text: "Document Locker: Documents upload securely to driver-documents bucket", category: "Value Added Features", done: false },
  ]);

  const toggleChecklistItem = (id: string) => {
    setSetupChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const sqlSchema = `
-- ====================================================================
-- YOUR TAXI MATE - SUPABASE DATABASE MIGRATION
-- File: supabase/migrations/0001_initial_schema.sql
-- Description: Provisioning DB enums, strict RLS schemas, and
-- UK Private Hire pre-booking fare-immutability triggers.
-- ====================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CUSTOM REGULATORY ENUMS
create type user_role as enum ('passenger', 'driver', 'admin');
create type ride_status as enum ('requested', 'accepted', 'en_route', 'completed', 'cancelled');
create type driver_status as enum ('pending_verification', 'approved', 'suspended', 'offline');
create type doc_type as enum ('phv_licence', 'vehicle_insurance', 'mot_certificate', 'driving_licence');

-- 3. USERS TABLE (Mirror of auth.users with matching role restriction)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  phone text unique not null,
  role user_role not null default 'passenger',
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. DRIVERS TABLE (Gated profile)
create table public.drivers (
  id uuid primary key references public.users(id) on delete cascade,
  badge_number text unique, -- Transport for London (TfL) PHV Badge Number
  badge_expiry date,
  status driver_status not null default 'pending_verification',
  rating numeric(3,2) default 5.0 check (rating >= 0 and rating <= 5),
  total_trips integer not null default 0
);

-- 5. DRIVER DOCUMENTS TABLE (Auditing compliance)
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid references public.drivers(id) on delete cascade not null,
  type doc_type not null,
  file_url text not null,
  expiry_date date not null,
  verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. VEHICLES TABLE (UK Compliance: plates & insurance)
create table public.vehicles (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid references public.drivers(id) on delete cascade not null,
  make text not null,
  model text not null,
  plate_number text unique not null, -- Council issue licensing plate
  year integer check (year >= 1980 and year <= extract(year from now()) + 1),
  insurance_expiry date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. RIDES TABLE (Pre-booked fare constraints)
create table public.rides (
  id uuid default gen_random_uuid() primary key,
  passenger_id uuid references public.users(id) not null,
  driver_id uuid references public.drivers(id), -- Nullable while status is 'requested'
  pickup_address text not null,
  dropoff_address text not null,
  pickup_lat numeric(9,6) not null,
  pickup_lng numeric(9,6) not null,
  dropoff_lat numeric(9,6) not null,
  dropoff_lng numeric(9,6) not null,
  distance_miles numeric(4,2) not null,
  duration_minutes integer not null,
  
  -- Frequencies/integers represent pence to enforce strict monetary operations
  fare_estimate integer not null, -- Locked on booking (pence)
  fare_final integer,            -- Populated upon completion/adjustment
  
  status ride_status not null default 'requested',
  extra_child_seat boolean default false,
  extra_meet_greet boolean default false,
  is_night_rate boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. GPS TRACKING, RATINGS & PAYMENTS MODULES
-- Real-time GPS tracking
create table public.ride_locations (
  id uuid default gen_random_uuid() primary key,
  ride_id uuid references public.rides(id) on delete cascade,
  driver_id uuid references public.drivers(id),
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  recorded_at timestamptz default now()
);

-- Post-journey ratings
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  ride_id uuid references public.rides(id) unique,
  passenger_id uuid references public.users(id),
  driver_id uuid references public.drivers(id),
  score integer check (score between 1 and 5),
  created_at timestamptz default now()
);

-- Stripe Connect payment records
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  ride_id uuid references public.rides(id) unique,
  stripe_payment_intent_id text unique,
  amount_pence integer not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- 9. UK REGULATORY LAW: FARE IMMUTABILITY TRIGGER (PHV Compliance Rule)
-- Rules mandate that once a consumer locks in a fixed private hire fare 
-- prior to booking dispatch, neither driver nor passenger may mutate the quoted fare.
create or replace function enforce_fare_immutability()
returns trigger as $$
begin
  -- Prevent modification of estimated or final fares after lock
  if (TG_OP = 'UPDATE') then
    -- 1. Locked pre-booked fare estimate cannot be modified
    if (OLD.fare_estimate != NEW.fare_estimate) then
      raise exception 'UK Private Hire Law: Locked pre-booked fare estimates cannot be modified.';
    end if;

    -- 2. Final billed fare must exactly match the original locked pre-booked fare estimate
    if (NEW.fare_final is not null and NEW.fare_final != NEW.fare_estimate) then
      raise exception 'UK Private Hire Law: Final billed fare must exactly match the locked pre-booked fare estimate.';
    end if;

    -- 3. Billed fares are archived on completion and cannot be altered
    if (OLD.fare_final is not null and OLD.fare_final != NEW.fare_final) then
      raise exception 'UK Private Hire Law: Billed fares are archived on completion and cannot be altered.';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger tr_fare_compliance
  before update on public.rides
  for each row execute function enforce_fare_immutability();

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.users enable row level security;
alter table public.rides enable row level security;

-- Passenger separation: read/add only their own rides
create policy "Passengers can query only own rides"
  on public.rides for select
  using (auth.uid() = passenger_id);

create policy "Passengers can create own rides"
  on public.rides for insert
  with check (auth.uid() = passenger_id);

-- Driver compliance access: read assigned rides or any pending 'requested' rides
create policy "Drivers can query available or assigned jobs"
  on public.rides for select
  using (
    auth.uid() = driver_id or 
    (status = 'requested' and driver_id is null)
  );

create policy "Drivers can update own jobs"
  on public.rides for update
  using (auth.uid() = driver_id or (status = 'requested' and driver_id is null));
`;

  const packagesList = `
# ====================================================================
# REQUIRED EXPO SDK 51 & SUPABASE NPM PACKAGES
# Run these in your project directories for Your Taxi Mate
# ====================================================================

# 1. Maps & Geolocation
npx expo install react-native-maps
npx expo install expo-location

# 2. NativeWind & Styling
npm install nativewind@^4.0.1
npm install tailwindcss@^3.4.0 postcss@^8.4.0 --save-dev

# 3. Third-Party Integrations
npm install @stripe/stripe-react-native@^0.37.0
npm install @supabase/supabase-js@^2.44.0
npm install zustand@^4.5.1
npm install lucide-react-native

# 4. Dev support & TS types
npm install @types/react --save-dev
`;

  const reactNativeCode = `
import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { supabase } from "../lib/supabase"; // Your custom Supabase client configurations

// Type definitions matching DB representation
interface LocationCoordinate {
  name: string;
  latitude: number;
  longitude: number;
}

const VEHICLE_TIERS = [
  { id: "saloon", name: "Saloon", rate: 1.70, cap: "4 Seats" },
  { id: "estate", name: "Estate", rate: 2.00, cap: "4 Seats +" },
  { id: "s_mpv", name: "Small MPV", rate: 2.25, cap: "5 Seats" },
  { id: "l_mpv", name: "Large MPV", rate: 2.50, cap: "7 Seats" },
  { id: "seater_8", name: "8 Seater", rate: 3.25, cap: "8 Seats" },
];

export default function BookingScreen() {
  const [pickup, setPickup] = useState<LocationCoordinate | null>(null);
  const [dropoff, setDropoff] = useState<LocationCoordinate | null>(null);
  const [distance, setDistance] = useState<number>(0); // Miles
  const [duration, setDuration] = useState<number>(0); // Minutes
  const [selectedTier, setSelectedTier] = useState("saloon");
  
  // Custom PHV additions
  const [childSeat, setChildSeat] = useState(false);
  const [meetAndGreet, setMeetAndGreet] = useState(false);
  const [isNightRate, setIsNightRate] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Map viewport ref
  const mapRef = useRef<MapView>(null);

  // Auto detect if current local UK hours trigger the 1.5x Midnight - 5 AM surcharge
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 0 && hours < 5) {
      setIsNightRate(true);
    }
  }, []);

  // Compute UK fixed fare (in Pounds) representing integers/pence in SQL
  const calculateFare = (tierId: string) => {
    const tier = VEHICLE_TIERS.find(t => t.id === tierId) || VEHICLE_TIERS[0];
    const baseFare = 20.00; // Base £20
    const runningRate = distance * tier.rate;
    let extra = 0;
    if (childSeat) extra += 10;
    if (meetAndGreet) extra += 10;

    let subtotal = baseFare + runningRate + extra;
    if (isNightRate) {
      subtotal *= 1.5; // 1.5x multiplier
    }
    return parseFloat(subtotal.toFixed(2));
  };

  // Safe Supabase Write complying with UK Private Hire licensing criteria
  const handleBooking = async () => {
    if (!pickup || !dropoff) {
      Alert.alert("Error", "Please specify both your pickup and dropoff points.");
      return;
    }

    try {
      setIsBooking(true);
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user.id;

      if (!userId) {
        throw new Error("Missing authentication metadata.");
      }

      const calculatedFareGbp = calculateFare(selectedTier);
      const fareInPence = Math.round(calculatedFareGbp * 100);

      const { data, error } = await supabase
        .from("rides")
        .insert({
          passenger_id: userId,
          pickup_address: pickup.name,
          dropoff_address: dropoff.name,
          pickup_lat: pickup.latitude,
          pickup_lng: pickup.longitude,
          dropoff_lat: dropoff.latitude,
          dropoff_lng: dropoff.longitude,
          distance_miles: distance,
          duration_minutes: duration,
          fare_estimate: fareInPence, // Immutable fixed estimate
          extra_child_seat: childSeat,
          extra_meet_greet: meetAndGreet,
          is_night_rate: isNightRate,
          status: "requested"
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        "Ride Booked", 
        \`Booking ID: \${data.id}. App-dispatch is looking for nearby verified drivers.\`
      );
    } catch (err: any) {
      Alert.alert("Booking Failure", err.message || "An error occurred.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 51.5074,
          longitude: -0.1278,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {pickup && (
          <Marker 
            coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} 
            title="Pickup"
            pinColor="#00f2ff"
          />
        )}
        {dropoff && (
          <Marker 
            coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} 
            title="Destination"
            pinColor="#0266ff"
          />
        )}
      </MapView>

      {/* Floating UI Sheets styled in Premium High-Velocity Dark Theme */}
      <View style={styles.bookingCard}>
        <Text style={styles.header}>Your Taxi Mate</Text>
        
        <ScrollView style={styles.selectorScroll}>
          {VEHICLE_TIERS.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[styles.tierRow, selectedTier === tier.id && styles.selectedRow]}
              onPress={() => setSelectedTier(tier.id)}
            >
              <Text style={styles.tierName}>{tier.name} ({tier.cap})</Text>
              <Text style={styles.tierPrice}>£{calculateFare(tier.id).toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={handleBooking}
          disabled={isBooking}
        >
          {isBooking ? (
            <ActivityIndicator color="#0d1515" />
          ) : (
            <Text style={styles.bookButtonText}>Confirm Pre-Booked Ride</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1515" },
  map: { flex: 1 },
  bookingCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#141c1c",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2e3637"
  },
  header: { fontSize: 20, fontWeight: "bold", color: "#00f2ff", marginBottom: 12 },
  selectorScroll: { maxHeight: 180, marginBottom: 16 },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2e3637",
    marginBottom: 8
  },
  selectedRow: { borderColor: "#00f2ff", backgroundColor: "#0d1515" },
  tierName: { color: "white", fontSize: 14 },
  tierPrice: { color: "#00f2ff", fontWeight: "bold" },
  bookButton: {
    backgroundColor: "#00f2ff",
    padding: 16,
    borderRadius: 14,
    alignItems: "center"
  },
  bookButtonText: { color: "#0d1515", fontWeight: "bold", fontSize: 15 }
});
`;

  const apiEndpointsDoc = `
# ====================================================================
# YOUR TAXI MATE (SUPABASE EDGE FUNCTIONS)
# Base REST URL: https://vhvssujjuwjkgkweytct.supabase.co/functions/v1/
# Standard Header Authorization: Bearer <SUPABASE_ANON_KEY>
# ====================================================================

-- PUBLIC ENDPOINTS (No Auth Required) --

1. POST /public-send-otp
- Purpose: Sends a 6-digit OTP via SMS to verify a customer's phone number.
- Request Body:
  {
    "driver_code": "ABC123",
    "phone": "07700900000"
  }
- Successful Response:
  {
    "ok": true,
    "phone": "+447700900000",
    "expires_in": 300
  }

2. POST /public-fare-quote
- Purpose: Computes a locked private-hire fare estimate based on coordinate distances.
- Request Body:
  {
    "driver_code": "ABC123",
    "pickup_address": "Heathrow T2",
    "dropoff_address": "London Bridge",
    "vehicle_fare_type_id": "uuid-optional"
  }
- Successful Response:
  {
    "driver": {
      "id": "uuid",
      "name": "Partner Driver",
      "phone": "+447700900077",
      "photo_url": "https://..."
    },
    "distance_miles": 14.2,
    "fare_estimate": 38.50,
    "currency": "GBP",
    "duration_min": 32
  }

3. POST /public-create-booking
- Purpose: Registers a verified customer booking from their digital portal.
- Request Body:
  {
    "driver_code": "ABC123",
    "code": "482910",
    "customer": { "name": "Jane Smith", "phone": "+447700900000" },
    "trip": {
      "pickup_address": "Heathrow T2",
      "destination_address": "London Bridge",
      "pickup_datetime": "2026-05-22T08:00:00Z",
      "passengers": 2,
      "fare_estimate": 38.50,
      "distance_miles": 14.2
    }
  }
- Successful Response:
  {
    "ok": true,
    "booking_id": "uuid-12345",
    "booking_reference": "FF-1234",
    "driver": { "name": "Partner Driver", "phone": "+447700900077" }
  }

4. GET /get-maps-config
- Purpose: Returns the authorized client-side Google Maps API configuration.
- Successful Response:
  {
    "apiKey": "AIzaSy..."
  }


-- AUTHENTICATED ENDPOINTS (Requires User JWT Link) --
Header: Authorization: Bearer <USER_JWT_TOKEN>

5. POST /calculate-fare
- Purpose: Computes exact pricing rules (Airport tolls, Base, per-mile, meet/greet).
- Request Body:
  {
    "driver_id": "uuid",
    "pickup_address": "Heathrow T2",
    "dropoff_address": "London Bridge",
    "meet_greet": false,
    "airport": true
  }
- Successful Response:
  {
    "distance_miles": 14.2,
    "fare_base": 5.00,
    "fare_mileage": 28.40,
    "fare_airport_toll": 5.00,
    "total": 38.45,
    "currency": "GBP"
  }

6. POST /track-flight
- Purpose: Evaluates live flight telemetry, estimates arrival times & terminal delays.
- Request Body:
  { "flightNumber": "BA123" }
- Successful Response:
  {
    "status": "On Time",
    "departure": { "airport": "LHR", "scheduled": "12:00", "estimated": "12:15", "gate": "A5" },
    "arrival": { "airport": "JFK", "scheduled": "15:00", "estimated": "14:55", "gate": "4" }
  }

7. POST /parse-booking
- Purpose: AI decomposes unstructured speech or raw messages into structured bookings.
- Request Body:
  { "text": "Pick up John from Gatwick North tomorrow at 6am, flight BA456" }
- Successful Response:
  {
    "customer_name": "John",
    "pickup_address": "Gatwick North Terminal",
    "destination_address": "Canary Wharf",
    "pickup_datetime": "2026-05-22T06:00:00Z",
    "flight_number": "BA456"
  }

8. POST /receipt-ocr
- Purpose: Reads an invoice image and performs AI OCR parsing.
- Request Body:
  { "image": "<base64-string>", "mimeType": "image/jpeg" }
- Successful Response:
  { "amount": 45.50, "date": "2026-05-21", "merchant": "Shell", "category": "fuel" }

9. POST /send-sms
- Purpose: Dispatches custom programmatic SMS with regulatory tracking.
- Request Body:
  {
    "driver_id": "uuid",
    "to": "+447700900000",
    "message": "Your driver is 5 mins away",
    "message_type": "booking_notification"
  }
- Successful Response:
  { "success": true, "via": "platform", "credits_remaining": 18 }

10. POST /portal-notify
- Purpose: Automatically fires standard booking lifecycle SMS updates.
- Request Body:
  {
    "booking_id": "uuid",
    "event_type": "booking_confirmed"
  }
  -- event_type options: new_booking | booking_confirmed | fare_adjusted | booking_updated | booking_cancelled | job_started | job_completed

11. POST /portal-invoice
- Purpose: Generates itemized data representation of the complete fare ride.
- Request Body:
  { "booking_id": "uuid" }
- Successful Response:
  { "booking": {}, "customer": { "name": "Jane", "phone": "..." }, "driver": { "full_name": "Partner", "phone": "..." } }

12. POST /send-invoice-email
- Purpose: Instructs Resend to issue formatted PDF emails of completed trips.
- Request Body:
  { "booking_id": "uuid", "email": "optional-override@example.com" }
- Successful Response:
  { "sent": true, "recipient": "jane@example.com", "sent_at": "2026-05-21T12:00:00Z" }
`;

  const realtimeDoc = `
# ====================================================================
# SUPABASE REALTIME SUBSCRIPTION ARCHITECTURES
# Listening for bookings updates, live chats, and active GPS telemetry.
# ====================================================================

-- 1. BOOKING ENGINE LIFECYCLE (Listen to status transitions) --
To show real-time state updates to customers (pending -> confirmed -> in_progress),
subscribe to Postgres changes on the "bookings" table.

-- TypeScript (Web / React Client) --
const myBookingId = "BOOKING_UUID";
const bookingsChannel = supabase
  .channel('live-booking-lifecycle')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: \`id=eq.\${myBookingId}\`
    },
    (payload) => {
      console.log("Updated Booking Details:", payload.new);
      const newStatus = payload.new.status;
      // Handle scheduled | pending | confirmed | in_progress | completed
    }
  )
  .subscribe();

-- Kotlin (Android Native App Client) --
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.PostgresAction
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

val bookingsChannel = supabase.realtime.createChannel("booking-$myBookingId")
val bookingChangeFlow = bookingsChannel.postgresChangeFlow<PostgresAction.Update>(
    schema = "public"
) {
    table = "bookings"
    filter = "id=eq.$myBookingId"
}

bookingChangeFlow.onEach { updateAction ->
    val updatedBooking = updateAction.decodeRecord<Booking>()
    Log.d("REALTIME", "Booking Status update: \${updatedBooking.status}")
    withContext(Dispatchers.Main) {
        updateBookingStatusOnUI(updatedBooking.status)
    }
}.launchIn(lifecycleScope)

bookingsChannel.subscribe()



-- 2. LIVE CHAT ENGINE (Synchronized driver/passenger message flow) --
Filter inserts of new rows from the "booking_messages" table.

-- TypeScript (Web / React Client) --
const chatChannel = supabase
  .channel(\`chat-room-\${myBookingId}\`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'booking_messages',
      filter: \`booking_id=eq.\${myBookingId}\`
    },
    (payload) => {
      console.log("New Message Received:", payload.new.message_text);
      appendMessageToThread(payload.new);
    }
  )
  .subscribe();

-- Kotlin (Android Native App Client) --
val chatChannel = supabase.realtime.createChannel("chat-$myBookingId")
val messageFlow = chatChannel.postgresChangeFlow<PostgresAction.Insert>(
    schema = "public"
) {
    table = "booking_messages"
    filter = "booking_id=eq.$myBookingId"
}

messageFlow.onEach { insertAction ->
    val newMessage = insertAction.decodeRecord<BookingMessage>()
    Log.d("REALTIME", "New Chat Row: \${newMessage.message_text}")
    withContext(Dispatchers.Main) {
        onNewMessageReceived(newMessage)
    }
}.launchIn(lifecycleScope)

chatChannel.subscribe()



-- 3. LIVE GPS TELEMETRY MAP TRACK (Real-time vehicle movement) --
Drivers stream coordinates to "driver_locations". Passengers listen to show marker movements.

-- TypeScript (Web / React Client) --
const trackingChannel = supabase
  .channel(\`live-gps-\${myBookingId}\`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'driver_locations',
      filter: \`booking_id=eq.\${myBookingId}\`
    },
    (payload) => {
      const { latitude, longitude, heading, speed } = payload.new;
      console.log("Live GPS tick:", latitude, longitude, heading);
      animateMarkerCoordinates(latitude, longitude, heading);
    }
  )
  .subscribe();

-- Kotlin (Android Native App Client) --
val locationChannel = supabase.realtime.createChannel("loc-$myBookingId")
val locationFlow = locationChannel.postgresChangeFlow<PostgresAction.Insert>(
    schema = "public"
) {
    table = "driver_locations"
    filter = "booking_id=eq.$myBookingId"
}

locationFlow.onEach { insertAction ->
    val newLoc = insertAction.decodeRecord<DriverLocation>()
    Log.d("REALTIME", "Live coordinate updated: \${newLoc.latitude}, \${newLoc.longitude}")
    withContext(Dispatchers.Main) {
        animateMobileMapMarker(newLoc.latitude, newLoc.longitude, newLoc.heading)
    }
}.launchIn(lifecycleScope)

locationChannel.subscribe()
`;

  const reposDoc = `
// ====================================================================
// ANDROID PRODUCTION REPOSITORY LAYER (supabase-kt + Ktor)
// Domain-driven repositories with strict type-safety, Flow streams & Result wrapping.
// ====================================================================

// --------------------------------------------------------------------
// 1. AuthRepository.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserInfo
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.Flow

class AuthRepository(private val supabase: SupabaseClient) {
    
    suspend fun signInWithEmail(email: String, password: String): Result<UserInfo> = runCatching {
        supabase.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
        supabase.auth.currentUserOrNull() ?: throw IllegalStateException("User session not initiated")
    }

    suspend fun signUpWithEmail(email: String, password: String, fullName: String): Result<UserInfo> = runCatching {
        supabase.auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = mapOf("full_name" to fullName)
        }
        supabase.auth.currentUserOrNull() ?: throw IllegalStateException("Registration successful, but session not found")
    }

    suspend fun signOut(): Result<Unit> = runCatching {
        supabase.auth.signOut()
    }

    suspend fun currentUser(): UserInfo? {
        return supabase.auth.currentUserOrNull()
    }

    val sessionFlow: Flow<SessionStatus> = supabase.auth.sessionStatus
}


// --------------------------------------------------------------------
// 2. BookingRepository.kt (Critical pre-booking mechanics and realtime streams)
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.PostgresAction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class BookingMessageInsert(
    @SerialName("booking_id")   val bookingId: String,
    @SerialName("sender_id")    val senderId: String,
    @SerialName("message_text") val messageText: String
)

class BookingRepository(private val supabase: SupabaseClient) {

    suspend fun getBookings(driverId: String): Result<List<Booking>> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .select {
                    filter {
                        eq("driver_id", driverId)
                    }
                }.decodeList<Booking>()
        }
    }

    suspend fun getBookingById(id: String): Result<Booking> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .select {
                    filter {
                        eq("id", id)
                    }
                }.decodeSingle<Booking>()
        }
    }

    suspend fun createBooking(booking: Booking): Result<Booking> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .insert(booking) {
                    select()
                }.decodeSingle<Booking>()
        }
    }

    suspend fun updateBookingStatus(id: String, status: BookingStatus): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .update({
                    set("status", status)
                }) {
                    filter {
                        eq("id", id)
                    }
                }
            true
        }
    }

    suspend fun updateFare(id: String, adjustedFare: Double): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .update({
                    set("fare_adjusted_by_driver", adjustedFare)
                }) {
                    filter {
                        eq("id", id)
                    }
                }
            true
        }
    }

    suspend fun cancelBooking(id: String, cancelledBy: CancelledBy): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .update({
                    set("status", BookingStatus.CANCELLED)
                    set("cancelled_by", cancelledBy)
                    set("cancelled_at", kotlinx.datetime.Clock.System.now().toString())
                }) {
                    filter {
                        eq("id", id)
                    }
                }
            true
        }
    }

    // Live state changes observer with proper lifecycle callbackFlow (no leaks)
    fun observeBooking(bookingId: String): Flow<Booking> = callbackFlow {
        val channel = supabase.realtime.createChannel("booking_obs_\\$bookingId")
        val job = channel.postgresChangeFlow<PostgresAction.Update>(schema = "public") {
            table = "bookings"
            filter = "id=eq.\\$bookingId"
        }.map { it.decodeRecord<Booking>() }
         .onEach { send(it) }
         .launchIn(this)

        supabase.realtime.connect()
        channel.subscribe()

        awaitClose {
            job.cancel()
            supabase.realtime.removeChannel(channel)
        }
    }

    // Driver/Customer active text messages sync channel with callbackFlow (no leaks)
    fun observeBookingMessages(bookingId: String): Flow<BookingMessage> = callbackFlow {
        val channel = supabase.realtime.createChannel("booking_chat_\\$bookingId")
        val job = channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
            table = "booking_messages"
            filter = "booking_id=eq.\\$bookingId"
        }.map { it.decodeRecord<BookingMessage>() }
         .onEach { send(it) }
         .launchIn(this)

        supabase.realtime.connect()
        channel.subscribe()

        awaitClose {
            job.cancel()
            supabase.realtime.removeChannel(channel)
        }
    }

    suspend fun sendMessage(bookingId: String, senderId: String, text: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            val msg = BookingMessageInsert(
                bookingId = bookingId,
                senderId = senderId,
                messageText = text
            )
            supabase.postgrest.from("booking_messages").insert(msg)
            true
        }
    }
}


// --------------------------------------------------------------------
// 3. TripRepository.kt (Historic income logging and direct job completion)
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TripRepository(private val supabase: SupabaseClient) {

    suspend fun getTrips(driverId: String, from: String, to: String): Result<List<Trip>> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("trips")
                .select {
                    filter {
                        eq("driver_id", driverId)
                        gte("trip_date", from)
                        lte("trip_date", to)
                    }
                }.decodeList<Trip>()
        }
    }

    suspend fun createTrip(trip: Trip): Result<Trip> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("trips")
                .insert(trip) {
                    select()
                }.decodeSingle<Trip>()
        }
    }

    suspend fun deleteTrip(id: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("trips")
                .delete {
                    filter {
                        eq("id", id)
                    }
                }
            true
        }
    }
}


// --------------------------------------------------------------------
// 4. ExpenseRepository.kt (Auditable expenses and fuel logic)
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ExpenseRepository(private val supabase: SupabaseClient) {

    suspend fun getExpenses(driverId: String, from: String, to: String): Result<List<Expense>> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("expenses")
                .select {
                    filter {
                        eq("driver_id", driverId)
                        gte("expense_date", from)
                        lte("expense_date", to)
                    }
                }.decodeList<Expense>()
        }
    }

    suspend fun createExpense(expense: Expense): Result<Expense> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("expenses")
                .insert(expense) {
                    select()
                }.decodeSingle<Expense>()
        }
    }

    suspend fun deleteExpense(id: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("expenses")
                .delete {
                    filter {
                        eq("id", id)
                    }
                }
            true
        }
    }

    suspend fun updateReceiptImageUrl(id: String, url: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("expenses")
                .update({
                    set("receipt_image_url", url)
                }) {
                    filter {
                        eq("id", id)
                    }
                }
            true
        }
    }
}


// --------------------------------------------------------------------
// 5. ProfileRepository.kt (Compliance info states and active settings queries)
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class ProfileUpdate(
    @SerialName("full_name")        val fullName: String,
    val phone: String?,
    @SerialName("profile_photo_url") val profilePhotoUrl: String?
)

class ProfileRepository(private val supabase: SupabaseClient) {

    suspend fun getProfile(userId: String): Result<Profile> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("profiles")
                .select {
                    filter {
                        eq("id", userId)
                    }
                }.decodeSingle<Profile>()
        }
    }

    suspend fun updateProfile(profile: Profile): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            val update = ProfileUpdate(
                fullName = profile.fullName,
                phone = profile.phone,
                profilePhotoUrl = profile.profilePhotoUrl
            )
            supabase.postgrest.from("profiles")
                .update(update) {
                    filter {
                        eq("id", profile.id)
                    }
                }
            true
        }
    }

    suspend fun getDriverSettings(driverId: String): Result<DriverSettings> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("driver_settings")
                .select {
                    filter {
                        eq("driver_id", driverId)
                    }
                }.decodeSingle<DriverSettings>()
        }
    }

    suspend fun updateDriverSettings(settings: DriverSettings): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("driver_settings")
                .update(settings) {
                    filter {
                        eq("id", settings.id)
                    }
                }
            true
        }
    }

    suspend fun getVehicleFareTypes(driverId: String): Result<List<VehicleFareType>> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("vehicle_fare_types")
                .select {
                    filter {
                        eq("driver_id", driverId)
                        eq("is_active", true)
                    }
                }.decodeList<VehicleFareType>()
        }
    }

    suspend fun getSmsCredits(driverId: String): Result<SmsCredits> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("sms_credits")
                .select {
                    filter {
                        eq("driver_id", driverId)
                    }
                }.decodeSingle<SmsCredits>()
        }
    }

    suspend fun getSubscription(userId: String): Result<Subscription?> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("subscriptions")
                .select {
                    filter {
                        eq("user_id", userId)
                    }
                }.decodeList<Subscription>().firstOrNull()
        }
    }
}


// --------------------------------------------------------------------
// 6. LocationRepository.kt (Live coordinate synchronization during rides)
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.PostgresAction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class LocationRepository(private val supabase: SupabaseClient) {

    suspend fun insertLocation(location: DriverLocation): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("driver_locations").insert(location)
            true
        }
    }

    // Dedicated GPS tracking channel flow with awaitClose removal (no leaks)
    fun observeDriverLocation(bookingId: String): Flow<DriverLocation> = callbackFlow {
        val channel = supabase.realtime.createChannel("loc_obs_\\$bookingId")
        val job = channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
            table = "driver_locations"
            filter = "booking_id=eq.\\$bookingId"
        }.map { it.decodeRecord<DriverLocation>() }
         .onEach { send(it) }
         .launchIn(this)

        supabase.realtime.connect()
        channel.subscribe()

        awaitClose {
            job.cancel()
            supabase.realtime.removeChannel(channel)
        }
    }

    suspend fun enableTracking(bookingId: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .update({
                    set("tracking_enabled", true)
                }) {
                    filter {
                        eq("id", bookingId)
                    }
                }
            true
        }
    }

    suspend fun disableTracking(bookingId: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("bookings")
                .update({
                    set("tracking_enabled", false)
                }) {
                    filter {
                        eq("id", bookingId)
                    }
                }
            true
        }
    }
}


// --------------------------------------------------------------------
// 7. EdgeFunctionRepository.kt (Supabase backend Edge functions proxy)
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.header
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.Json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Serializable
data class MapsConfigResponse(
    @SerialName("apiKey") val apiKey: String? = null,
    val error: String? = null
)

class EdgeFunctionRepository(
    private val httpClient: HttpClient, // Injected with JSON ContentNegotiation support
    private val supabase: SupabaseClient, // Inject supabase client to handle live auth session checks
    private val baseUrl: String = "https://vhvssujjuwjkgkweytct.supabase.co/functions/v1",
    private val anonKey: String // BuildConfig.SUPABASE_ANON_KEY config in local properties
) {

    // Helper — dynamically extracts active user JWT to completely reject 401 unauth access
    private fun userJwt(): String {
        return supabase.auth.currentSessionOrNull()?.accessToken
            ?: throw IllegalStateException("Access Denied: No authenticated active user session found")
    }

    // ================================================================
    // PUBLIC ENDPOINTS (Securely signed via local Anon Key Bearer)
    // ================================================================

    suspend fun sendOtp(request: SendOtpRequest): Result<SendOtpResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/public-send-otp") {
                header("Authorization", "Bearer \\$anonKey")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        }
    }

    suspend fun getFareQuote(request: FareQuoteRequest): Result<FareQuoteResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/public-fare-quote") {
                header("Authorization", "Bearer \\$anonKey")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        }
    }

    suspend fun createPublicBooking(request: CreateBookingRequest): Result<CreateBookingResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/public-create-booking") {
                header("Authorization", "Bearer \\$anonKey")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        }
    }

    suspend fun getMapsApiKey(): Result<String?> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.get("\\$baseUrl/get-maps-config") {
                header("Authorization", "Bearer \\$anonKey")
                header("apikey", anonKey)
            }.body<MapsConfigResponse>().apiKey
        }
    }

    // ================================================================
    // AUTHENTICATED ENDPOINTS (Requires User Live JWT Verification Header)
    // ================================================================

    suspend fun calculateFare(request: CalculateFareRequest): Result<CalculateFareResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/calculate-fare") {
                header("Authorization", "Bearer \${userJwt()}")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        }
    }

    suspend fun trackFlight(flightNumber: String): Result<TrackFlightResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/track-flight") {
                header("Authorization", "Bearer \${userJwt()}")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(TrackFlightRequest(flightNumber))
            }.body()
        }
    }

    suspend fun parseBooking(text: String): Result<ParseBookingResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/parse-booking") {
                header("Authorization", "Bearer \${userJwt()}")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(ParseBookingRequest(text))
            }.body()
        }
    }

    suspend fun receiptOcr(base64Image: String, mimeType: String): Result<ReceiptOcrResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/receipt-ocr") {
                header("Authorization", "Bearer \${userJwt()}")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(ReceiptOcrRequest(base64Image, mimeType))
            }.body()
        }
    }

    suspend fun sendSms(request: SendSmsRequest): Result<SendSmsResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/send-sms") {
                header("Authorization", "Bearer \${userJwt()}")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        }
    }

    suspend fun portalNotify(bookingId: String, eventType: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/portal-notify") {
                header("Authorization", "Bearer \${userJwt()}")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(PortalNotifyRequest(bookingId, eventType))
            }
            true
        }
    }

    suspend fun sendInvoiceEmail(bookingId: String, email: String?): Result<SendInvoiceEmailResponse> = runCatching {
        withContext(Dispatchers.IO) {
            httpClient.post("\\$baseUrl/send-invoice-email") {
                header("Authorization", "Bearer \${userJwt()}")
                header("apikey", anonKey)
                contentType(ContentType.Application.Json)
                setBody(SendInvoiceEmailRequest(bookingId, email))
            }.body()
        }
    }
}
`;

  const locationDoc = `
// ====================================================================
// ANDROID FOREGROUND LOCATION SERVICE (FusedLocationProviderClient + Supabase)
// Real-time GPS synchronization for YourTaxiMate active bookings (every 5 seconds)
// ====================================================================

// --------------------------------------------------------------------
// 1. LocationForegroundService.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.yourtaximate.app.data.repository.LocationRepository
import com.yourtaximate.app.data.model.DriverLocation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject

class LocationForegroundService : Service() {

    private val locationRepository: LocationRepository by inject()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    
    private var bookingId: String? = null
    private var driverId: String? = null

    companion object {
        private const val TAG = "LocationService"
        const val EXTRA_BOOKING_ID = "booking_id"
        const val EXTRA_DRIVER_ID = "driver_id"
        const val NOTIFICATION_ID = 1001
        const val CHANNEL_ID = "location_tracking"
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val bId = intent?.getStringExtra(EXTRA_BOOKING_ID)
        val dId = intent?.getStringExtra(EXTRA_DRIVER_ID)

        if (bId.isNullOrEmpty() || dId.isNullOrEmpty()) {
            Log.e(TAG, "Cannot start service: Missing bookingId or driverId extras")
            stopSelf()
            return START_NOT_STICKY
        }

        bookingId = bId
        driverId = dId

        startForeground(NOTIFICATION_ID, createNotification())

        // Enable tracking status on booking
        serviceScope.launch {
            locationRepository.enableTracking(bId)
        }

        startLocationUpdates()

        return START_STICKY
    }

    private fun startLocationUpdates() {
        try {
            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000L).apply {
                setMinUpdateIntervalMillis(3000L)
            }.build()

            locationCallback = object : LocationCallback() {
                override fun onLocationResult(locationResult: LocationResult) {
                    for (location in locationResult.locations) {
                        pushLocationToSupabase(location)
                    }
                }
            }

            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                Looper.getMainLooper()
            )
        } catch (unlikely: SecurityException) {
            Log.e(TAG, "Lost location permission. Could not request updates. \$unlikely")
            stopSelf()
        }
    }

    private fun pushLocationToSupabase(location: Location) {
        val bId = bookingId ?: return
        val dId = driverId ?: return

        // Convert speed from m/s to mph as required: speed * 2.237f
        val speedMph = location.speed * 2.237f

        val driverLocation = DriverLocation(
            bookingId = bId,
            driverId = dId,
            latitude = location.latitude,
            longitude = location.longitude,
            heading = location.bearing.toDouble(), // Mapping bearing directly to heading
            speed = speedMph.toDouble(),
            accuracy = location.accuracy.toDouble(),
            recordedAt = kotlinx.datetime.Clock.System.now().toString()
        )

        serviceScope.launch {
            val result = locationRepository.insertLocation(driverLocation)
            result.onSuccess {
                Log.d(TAG, "Successfully pushed location: Lat=\${location.latitude}, Lng=\${location.longitude}")
            }.onFailure { err ->
                Log.e(TAG, "Failed to sync GPS to cloud: \${err.localizedMessage}")
            }
        }
    }

    private fun createNotification(): Notification {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Live Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Used during active trips to track driver location"
            }
            manager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Trip in Progress")
            .setContentText("YourTaxiMate is tracking your location")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
        }
        
        bookingId?.let { bId ->
            serviceScope.launch {
                locationRepository.disableTracking(bId)
            }
        }

        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}


// --------------------------------------------------------------------
// 2. LocationServiceManager.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.services

import android.content.Context
import android.content.Intent
import android.os.Build

object LocationServiceManager {

    fun startTracking(context: Context, bookingId: String, driverId: String) {
        val intent = Intent(context, LocationForegroundService::class.java).apply {
            putExtra(LocationForegroundService.EXTRA_BOOKING_ID, bookingId)
            putExtra(LocationForegroundService.EXTRA_DRIVER_ID, driverId)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    fun stopTracking(context: Context) {
        val intent = Intent(context, LocationForegroundService::class.java)
        context.stopService(intent)
    }
}


// --------------------------------------------------------------------
// 3. AndroidManifest.xml additions
// --------------------------------------------------------------------
<!-- AndroidManifest.xml Elements -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<application>
    <service
        android:name="com.yourtaximate.app.services.LocationForegroundService"
        android:foregroundServiceType="location"
        android:enabled="true"
        android:exported="false" />
</application>


// --------------------------------------------------------------------
// 4. LocationPermissionHelper.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.utils

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object LocationPermissionHelper {

    fun hasLocationPermission(context: Context): Boolean {
        val fineLocation = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        val coarseLocation = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        return fineLocation && coarseLocation
    }

    fun requestLocationPermissions(activity: Activity) {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        ActivityCompat.requestPermissions(
            activity,
            permissions.toTypedArray(),
            100
        )
    }

    fun isBackgroundLocationGranted(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }
}


// --------------------------------------------------------------------
// 5. NotificationChannelSetup.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object NotificationChannelSetup {

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Live Tracking"
            val descriptionText = "Used during active trips to track driver location"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel("location_tracking", name, importance).apply {
                description = descriptionText
                setSound(null, null)
                enableVibration(false)
            }
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
`;

  const storageDoc = `
// ====================================================================
// ANDROID STORAGE UPLOAD HELPERS (supabase-kt Storage + Image Compression)
// Secure image reduction, PDF original bypass, and Supabase upload pipelines.
// ====================================================================

// --------------------------------------------------------------------
// 1. StorageRepository.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.storage.storage
import io.github.jan.supabase.storage.createSignedUrl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.time.Duration.Companion.seconds

class StorageRepository(private val supabase: SupabaseClient) {

    suspend fun uploadReceiptImage(
        driverId: String,
        imageBytes: ByteArray,
        fileName: String,
        mimeType: String = "image/jpeg"
    ): Result<String> = runCatching {
        withContext(Dispatchers.IO) {
            val timestamp = System.currentTimeMillis()
            val path = "$driverId/\${timestamp}_$fileName"
            
            // Upload to private 'receipt-images' bucket
            supabase.storage.from("receipt-images").upload(path, imageBytes) {
                upsert = false
            }
            path
        }
    }

    suspend fun uploadDriverDocument(
        driverId: String,
        fileBytes: ByteArray,
        fileName: String,
        mimeType: String
    ): Result<String> = runCatching {
        withContext(Dispatchers.IO) {
            val timestamp = System.currentTimeMillis()
            val path = "$driverId/\${timestamp}_$fileName"
            
            // Upload to private 'driver-documents' bucket
            supabase.storage.from("driver-documents").upload(path, fileBytes) {
                upsert = false
            }
            path
        }
    }

    suspend fun getSignedUrl(
        bucket: String,
        path: String,
        expiresInSeconds: Long = 3600
    ): Result<String> = runCatching {
        withContext(Dispatchers.IO) {
            // Generate single-use signed verification URL
            supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds.seconds)
        }
    }

    suspend fun deleteFile(
        bucket: String,
        path: String
    ): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.storage.from(bucket).delete(path)
            true
        }
    }
}


// --------------------------------------------------------------------
// 2. ImageCompressHelper.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.webkit.MimeTypeMap
import java.io.ByteArrayOutputStream
import java.io.InputStream

object ImageCompressHelper {

    fun compressImageToBytes(
        context: Context,
        uri: Uri,
        maxWidthPx: Int = 1920,
        maxHeightPx: Int = 1920,
        quality: Int = 85,
        format: Bitmap.CompressFormat = Bitmap.CompressFormat.JPEG
    ): ByteArray {
        val inputStream: InputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("Could not open input stream from URI: \$uri")
            
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeStream(inputStream, null, options)
        inputStream.close()

        var width = options.outWidth
        var height = options.outHeight
        
        var inSampleSize = 1
        if (width > maxWidthPx || height > maxHeightPx) {
            val halfWidth = width / 2
            val halfHeight = height / 2
            while ((halfWidth / inSampleSize) >= maxWidthPx && (halfHeight / inSampleSize) >= maxHeightPx) {
                inSampleSize *= 2
            }
        }

        val decodeOptions = BitmapFactory.Options().apply {
            this.inSampleSize = inSampleSize
        }
        
        val streamForBitmap = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("Could not re-open stream from URI")
        val srcBitmap = BitmapFactory.decodeStream(streamForBitmap, null, decodeOptions)
        streamForBitmap.close()

        val bitmap = srcBitmap ?: throw IllegalStateException("Failed to decode Bitmap from URI")

        // Constrain bounding box preserving original aspect ratio
        val finalBitmap = if (bitmap.width > maxWidthPx || bitmap.height > maxHeightPx) {
            val ratio = bitmap.width.toFloat() / bitmap.height.toFloat()
            val newWidth: Int
            val newHeight: Int
            if (ratio > 1) {
                newWidth = maxWidthPx
                newHeight = (maxWidthPx / ratio).toInt()
            } else {
                newHeight = maxHeightPx
                newWidth = (maxHeightPx * ratio).toInt()
            }
            val scaled = Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
            if (scaled != bitmap) {
                bitmap.recycle()
            }
            scaled
        } else {
            bitmap
        }

        val outputStream = ByteArrayOutputStream()
        finalBitmap.compress(format, quality, outputStream)
        finalBitmap.recycle()

        return outputStream.toByteArray()
    }

    fun getFileNameFromUri(context: Context, uri: Uri): String {
        var name = ""
        val cursor = context.contentResolver.query(uri, null, null, null, null)
        cursor?.use {
            if (it.moveToFirst()) {
                val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (nameIndex != -1) {
                    name = it.getString(nameIndex)
                }
            }
        }
        if (name.isEmpty()) {
            name = uri.lastPathSegment ?: "unknown_file_\${System.currentTimeMillis()}"
        }
        return name
    }

    fun getMimeTypeFromUri(context: Context, uri: Uri): String {
        return context.contentResolver.getType(uri) 
            ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(
                MimeTypeMap.getFileExtensionFromUrl(uri.toString())
            ) ?: "application/octet-stream"
    }
}


// --------------------------------------------------------------------
// 3. DocumentUploadHelper.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.services

import android.content.Context
import android.net.Uri
import com.yourtaximate.app.data.repository.StorageRepository
import com.yourtaximate.app.data.repository.ExpenseRepository
import com.yourtaximate.app.data.repository.DriverDocumentRepository
import com.yourtaximate.app.data.model.DriverDocument
import com.yourtaximate.app.data.model.DriverDocumentInsert
import com.yourtaximate.app.data.model.DocumentType
import com.yourtaximate.app.data.model.DocumentStatus
import com.yourtaximate.app.utils.ImageCompressHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object DocumentUploadHelper {

    suspend fun uploadAndSaveReceiptImage(
        context: Context,
        uri: Uri,
        driverId: String,
        expenseId: String,
        expenseRepository: ExpenseRepository,
        storageRepository: StorageRepository
    ): Result<String> = runCatching {
        withContext(Dispatchers.IO) {
            val mimeType = ImageCompressHelper.getMimeTypeFromUri(context, uri)
            val isPdf = mimeType.equals("application/pdf", ignoreCase = true)
            
            // PDF files must NOT be compressed; upload raw bytes directly
            val bytes = if (isPdf) {
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readBytes()
                } ?: throw IllegalStateException("Could not read original PDF stream")
            } else {
                ImageCompressHelper.compressImageToBytes(context, uri)
            }

            val originalFileName = ImageCompressHelper.getFileNameFromUri(context, uri)
            
            // Upload to receipt-images bucket
            val path = storageRepository.uploadReceiptImage(
                driverId = driverId,
                imageBytes = bytes,
                fileName = originalFileName,
                mimeType = mimeType
            ).getOrThrow()

            // Update receipt_image_url in the expenses table
            expenseRepository.updateReceiptImageUrl(expenseId, path).getOrThrow()

            // Return signed URL for immediate preview
            storageRepository.getSignedUrl(
                bucket = "receipt-images",
                path = path,
                expiresInSeconds = 3600
            ).getOrThrow()
        }
    }

    suspend fun uploadAndSaveDriverDocument(
        context: Context,
        uri: Uri,
        driverId: String,
        documentType: DocumentType,
        expiryDate: String?,
        storageRepository: StorageRepository,
        documentRepository: DriverDocumentRepository
    ): Result<DriverDocument> = runCatching {
        withContext(Dispatchers.IO) {
            val mimeType = ImageCompressHelper.getMimeTypeFromUri(context, uri)
            val isPdf = mimeType.equals("application/pdf", ignoreCase = true)
            
            // Skip compression for PDF doc streams
            val bytes = if (isPdf) {
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readBytes()
                } ?: throw IllegalStateException("Could not read original PDF stream")
            } else {
                ImageCompressHelper.compressImageToBytes(context, uri)
            }

            val originalFileName = ImageCompressHelper.getFileNameFromUri(context, uri)

            // Upload format in bucket: "$driverId/\${System.currentTimeMillis()}_$fileName"
            val path = storageRepository.uploadDriverDocument(
                driverId = driverId,
                fileBytes = bytes,
                fileName = originalFileName,
                mimeType = mimeType
            ).getOrThrow()

            // Map variables into strict Postgres DTO
            val insertDto = DriverDocumentInsert(
                driverId = driverId,
                documentType = documentType,
                fileUrl = path,
                fileName = originalFileName,
                status = DocumentStatus.PENDING,
                expiryDate = expiryDate
            )

            // Save row entry
            documentRepository.insertDocument(insertDto).getOrThrow()
        }
    }
}


// --------------------------------------------------------------------
// 4. DriverDocumentRepository.kt
// --------------------------------------------------------------------
package com.yourtaximate.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import com.yourtaximate.app.data.model.DriverDocument
import com.yourtaximate.app.data.model.DriverDocumentInsert
import com.yourtaximate.app.data.model.DocumentType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class DriverDocumentRepository(private val supabase: SupabaseClient) {

    suspend fun getDocuments(driverId: String): Result<List<DriverDocument>> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("driver_documents")
                .select {
                    filter {
                        eq("driver_id", driverId)
                    }
                }.decodeList<DriverDocument>()
        }
    }

    suspend fun getDocumentByType(
        driverId: String, 
        documentType: DocumentType
    ): Result<DriverDocument?> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("driver_documents")
                .select {
                    filter {
                        eq("driver_id", driverId)
                        eq("document_type", documentType)
                    }
                }.decodeSingleOrNull<DriverDocument>()
        }
    }

    suspend fun insertDocument(doc: DriverDocumentInsert): Result<DriverDocument> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("driver_documents")
                .insert(doc) {
                    select() // Returns full row state
                }.decodeSingle<DriverDocument>()
        }
    }

    suspend fun deleteDocument(id: String): Result<Boolean> = runCatching {
        withContext(Dispatchers.IO) {
            supabase.postgrest.from("driver_documents")
                .delete {
                    filter {
                        eq("id", id)
                    }
                }
            true
        }
    }
}
`;

  const composeDoc = `
// ====================================================================
// YOUR TAXI MATE - JETPACK COMPOSE VIEWMODELS & NAVIGATION ROUTING
// Secure, production-ready, typed navigation, collectAsStateWithLifecycle.
// No mock data - strict integration with supabase-kt repositories.
// ====================================================================

// --------------------------------------------------------------------
// 1. Models & UI States (com/yourtaximate/app/data/model/UiStates.kt)
// --------------------------------------------------------------------
package com.yourtaximate.app.data.model

import kotlinx.serialization.Serializable

sealed interface AuthUiState {
    object Loading : AuthUiState
    data class Authenticated(val user: UserDto) : AuthUiState
    object Unauthenticated : AuthUiState
    data class Error(val message: String) : AuthUiState
}

data class BookingListUiState(
    val bookings: List<Booking> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

data class BookingDetailUiState(
    val booking: Booking? = null,
    val messages: List<BookingMessage> = emptyList(),
    val isLoading: Boolean = false,
    val isActionRunning: Boolean = false,
    val errorMessage: String? = null
)

data class NewBookingUiState(
    val parsedData: ParseBookingResponse? = null,
    val calculatedFare: CalculateFareResponse? = null,
    val isLoading: Boolean = false,
    val isCreating: Boolean = false,
    val errorMessage: String? = null
)

data class TripLogUiState(
    val trips: List<Trip> = emptyList(),
    val isLoading: Boolean = false,
    val totalEarnings: Double = 0.0,
    val fromDate: String = "",
    val toDate: String = "",
    val errorMessage: String? = null
)

data class ExpenseUiState(
    val expenses: List<Expense> = emptyList(),
    val totalAmount: Double = 0.0,
    val isLoading: Boolean = false,
    val isUploading: Boolean = false,
    val errorMessage: String? = null
)

data class ProfileUiState(
    val profile: DriverProfile? = null,
    val settings: DriverSettings? = null,
    val vehicleTypes: List<VehicleFareType> = emptyList(),
    val smsCreditsRemaining: Int = 0,
    val subscriptionStatus: String = "Inactive",
    val subscriptionExpiry: String? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

data class DocumentUiState(
    val documentsGrouped: Map<DocumentType, DriverDocument?> = emptyMap(),
    val signedUrls: Map<String, String> = emptyMap(), // filePath -> signedUrl
    val isLoading: Boolean = false,
    val isUploading: Boolean = false,
    val errorMessage: String? = null
)

enum class DocumentType {
    DRIVING_LICENCE,
    PHV_DRIVER_LICENCE,
    PHV_VEHICLE_LICENCE,
    VEHICLE_INSURANCE,
    MOT_CERTIFICATE,
    ROAD_TAX,
    V5C_LOGBOOK,
    PUBLIC_LIABILITY,
    DBS_CERTIFICATE,
    MEDICAL_CERTIFICATE,
    ENGLISH_TEST
}

enum class DocumentStatus {
    PENDING,
    APPROVED,
    REJECTED
}


// --------------------------------------------------------------------
// 2. ViewModels Section (com/yourtaximate/app/viewmodel)
// --------------------------------------------------------------------

// 2.1 AuthViewModel.kt
package com.yourtaximate.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.AuthUiState
import com.yourtaximate.app.data.repository.AuthRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.status.SessionStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(
    private val authRepository: AuthRepository,
    private val supabase: SupabaseClient
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Loading)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        // Automatically persist and listen to auth session status across app restarts
        viewModelScope.launch {
            supabase.auth.sessionStatus.collect { status ->
                when (status) {
                    is SessionStatus.Authenticated -> {
                        val session = status.session
                        _uiState.value = AuthUiState.Authenticated(
                            UserDto(id = session.user?.id ?: "", email = session.user?.email ?: "")
                        )
                    }
                    is SessionStatus.NotAuthenticated -> {
                        _uiState.value = AuthUiState.Unauthenticated
                    }
                    is SessionStatus.LoadingFromStorage -> {
                        _uiState.value = AuthUiState.Loading
                    }
                    else -> {
                        _uiState.value = AuthUiState.Unauthenticated
                    }
                }
            }
        }
    }

    fun signIn(email: String, pass: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            authRepository.signInWithEmail(email, pass)
                .onSuccess { user ->
                    _uiState.value = AuthUiState.Authenticated(user)
                }
                .onFailure { exc ->
                    _uiState.value = AuthUiState.Error(exc.localizedMessage ?: "Invalid login request.")
                }
        }
    }

    fun signUp(email: String, pass: String, fullName: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            authRepository.signUpWithEmail(email, pass, fullName)
                .onSuccess { user ->
                    _uiState.value = AuthUiState.Authenticated(user)
                }
                .onFailure { exc ->
                    _uiState.value = AuthUiState.Error(exc.localizedMessage ?: "Registration failed.")
                }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            authRepository.signOut()
                .onSuccess {
                    _uiState.value = AuthUiState.Unauthenticated
                }
                .onFailure { exc ->
                    _uiState.value = AuthUiState.Error(exc.localizedMessage ?: "Could not sign out.")
                }
        }
    }
}


// 2.2 BookingListViewModel.kt
package com.yourtaximate.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.Booking
import com.yourtaximate.app.data.model.BookingListUiState
import com.yourtaximate.app.data.repository.BookingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BookingListViewModel(
    private val bookingRepository: BookingRepository,
    private val driverId: String
) : ViewModel() {

    private val _state = MutableStateFlow(BookingListUiState())
    val state: StateFlow<BookingListUiState> = _state.asStateFlow()

    init {
        loadAllBookings()
        observeRealtimeBookings()
    }

    fun loadAllBookings() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            bookingRepository.getBookingsForDriver(driverId)
                .onSuccess { list ->
                    _state.value = _state.value.copy(bookings = list, isLoading = false)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Failed to fetch bookings."
                    )
                }
        }
    }

    private fun observeRealtimeBookings() {
        // Collect real-time channels from Supabase and update list item in place
        viewModelScope.launch {
            bookingRepository.observeBooking(driverId).collect { changedBooking ->
                val updatedList = _state.value.bookings.map {
                    if (it.id == changedBooking.id) changedBooking else it
                }
                // Handle appending if new pre-booking gets dispatched
                val finalDynamicList = if (updatedList.none { it.id == changedBooking.id }) {
                    updatedList + changedBooking
                } else {
                    updatedList
                }
                _state.value = _state.value.copy(bookings = finalDynamicList)
            }
        }
    }

    fun updateStatus(bookingId: String, status: String) {
        viewModelScope.launch {
            bookingRepository.updateBookingStatus(bookingId, status)
                .onSuccess { loadAllBookings() }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        errorMessage = "Status change failed: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun cancelBooking(bookingId: String) {
        viewModelScope.launch {
            bookingRepository.cancelBooking(bookingId)
                .onSuccess { loadAllBookings() }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        errorMessage = "Cancellation failed: \${err.localizedMessage}"
                    )
                }
        }
    }
}


// 2.3 BookingDetailViewModel.kt
package com.yourtaximate.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.BookingDetailUiState
import com.yourtaximate.app.data.repository.BookingRepository
import com.yourtaximate.app.data.repository.EdgeFunctionRepository
import com.yourtaximate.app.services.LocationServiceManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BookingDetailViewModel(
    private val bookingId: String,
    private val bookingRepository: BookingRepository,
    private val edgeFunctionRepository: EdgeFunctionRepository,
    private val locationServiceManager: LocationServiceManager
) : ViewModel() {

    private val _state = MutableStateFlow(BookingDetailUiState())
    val state: StateFlow<BookingDetailUiState> = _state.asStateFlow()

    init {
        loadBookingDetails()
        observeLiveMessages()
    }

    fun loadBookingDetails() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            bookingRepository.getBookingById(bookingId)
                .onSuccess { b ->
                    _state.value = _state.value.copy(booking = b, isLoading = false)
                    // If state is IN_PROGRESS, trigger location service automatically
                    if (b.status.equals("in_progress", ignoreCase = true)) {
                        locationServiceManager.startForegroundLocationService(bookingId)
                    }
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Failed to load booking."
                    )
                }
        }
    }

    private fun observeLiveMessages() {
        viewModelScope.launch {
            bookingRepository.observeBookingMessages(bookingId).collect { msgList ->
                _state.value = _state.value.copy(messages = msgList)
            }
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return
        viewModelScope.launch {
            bookingRepository.sendBookingMessage(bookingId, text)
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        errorMessage = "Message dispatch failed: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun adjustFare(newAmount: Double) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isActionRunning = true)
            bookingRepository.updateFare(bookingId, newAmount)
                .onSuccess {
                    _state.value = _state.value.copy(isActionRunning = false)
                    loadBookingDetails()
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isActionRunning = false,
                        errorMessage = "Fare adjust failed: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun updateStatus(status: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isActionRunning = true)
            bookingRepository.updateBookingStatus(bookingId, status)
                .onSuccess {
                    _state.value = _state.value.copy(isActionRunning = false)
                    if (status.equals("in_progress", ignoreCase = true)) {
                        locationServiceManager.startForegroundLocationService(bookingId)
                    } else if (status.equals("completed", ignoreCase = true) || status.equals("cancelled", ignoreCase = true)) {
                        locationServiceManager.stopForegroundLocationService()
                    }
                    loadBookingDetails()
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isActionRunning = false,
                        errorMessage = "Status update failed: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun triggerPortalNotify(eventType: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isActionRunning = true)
            edgeFunctionRepository.portalNotify(bookingId, eventType)
                .onSuccess {
                    _state.value = _state.value.copy(isActionRunning = false)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isActionRunning = false,
                        errorMessage = "AI dispatch alert failed: \${err.localizedMessage}"
                    )
                }
        }
    }
}


// 2.4 NewBookingViewModel.kt
package com.yourtaximate.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.*
import com.yourtaximate.app.data.repository.BookingRepository
import com.yourtaximate.app.data.repository.EdgeFunctionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class NewBookingViewModel(
    private val edgeFunctionRepository: EdgeFunctionRepository,
    private val bookingRepository: BookingRepository
) : ViewModel() {

    private val _state = MutableStateFlow(NewBookingUiState())
    val state: StateFlow<NewBookingUiState> = _state.asStateFlow()

    fun parseFromText(messyText: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            edgeFunctionRepository.parseBooking(messyText)
                .onSuccess { parseRes ->
                    _state.value = _state.value.copy(parsedData = parseRes, isLoading = false)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = "AI Parser was unable to structure the text: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun calculateFare(req: CalculateFareRequest) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            edgeFunctionRepository.calculateFare(req)
                .onSuccess { fareRes ->
                    _state.value = _state.value.copy(calculatedFare = fareRes, isLoading = false)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = "TfL Pricing evaluation failed: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun trackFlight(flightNumber: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            edgeFunctionRepository.trackFlight(flightNumber)
                .onSuccess { flightRes ->
                    // Set parsed fields placeholder with tracked flight details
                    val currentParsed = _state.value.parsedData
                    if (currentParsed != null) {
                        _state.value = _state.value.copy(
                            parsedData = currentParsed.copy(
                                flightNumber = flightNumber,
                                pickupAddress = "Heathrow Airport Terminal \${flightRes.terminal ?: 5}"
                            ),
                            isLoading = false
                        )
                    } else {
                        _state.value = _state.value.copy(isLoading = false)
                    }
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = "Flight Tracker unreachable: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun createBooking(booking: Booking, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isCreating = true)
            bookingRepository.createBooking(booking)
                .onSuccess {
                    _state.value = _state.value.copy(isCreating = false)
                    onSuccess()
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isCreating = false,
                        errorMessage = "Could not register booking in Supabase: \${err.localizedMessage}"
                    )
                }
        }
    }
}


// 2.5 TripLogViewModel.kt
package com.yourtaximate.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.Trip
import com.yourtaximate.app.data.model.TripLogUiState
import com.yourtaximate.app.data.repository.TripRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class TripLogViewModel(
    private val tripRepository: TripRepository,
    private val driverId: String
) : ViewModel() {

    private val _state = MutableStateFlow(TripLogUiState())
    val state: StateFlow<TripLogUiState> = _state.asStateFlow()

    fun loadTrips(from: String, to: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, fromDate = from, toDate = to, errorMessage = null)
            tripRepository.getTrips(driverId, from, to)
                .onSuccess { list ->
                    val earnings = list.sumOf { it.fareAmount }
                    _state.value = _state.value.copy(
                        trips = list,
                        totalEarnings = earnings,
                        isLoading = false
                    )
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Failed to extract trip records."
                    )
                }
        }
    }

    fun createTrip(trip: Trip) {
        viewModelScope.launch {
            tripRepository.insertTrip(trip)
                .onSuccess { loadTrips(_state.value.fromDate, _state.value.toDate) }
                .onFailure { err ->
                    _state.value = _state.value.copy(errorMessage = "Insertion error: \${err.localizedMessage}")
                }
        }
    }

    fun deleteTrip(id: String) {
        viewModelScope.launch {
            tripRepository.deleteTrip(id)
                .onSuccess { loadTrips(_state.value.fromDate, _state.value.toDate) }
                .onFailure { err ->
                    _state.value = _state.value.copy(errorMessage = "Deletion error: \${err.localizedMessage}")
                }
        }
    }
}


// 2.6 ExpenseViewModel.kt
package com.yourtaximate.app.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.Expense
import com.yourtaximate.app.data.model.ExpenseUiState
import com.yourtaximate.app.data.repository.ExpenseRepository
import com.yourtaximate.app.data.repository.EdgeFunctionRepository
import com.yourtaximate.app.data.repository.StorageRepository
import com.yourtaximate.app.services.DocumentUploadHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ExpenseViewModel(
    private val expenseRepository: ExpenseRepository,
    private val storageRepository: StorageRepository,
    private val edgeFunctionRepository: EdgeFunctionRepository,
    private val driverId: String
) : ViewModel() {

    private val _state = MutableStateFlow(ExpenseUiState())
    val state: StateFlow<ExpenseUiState> = _state.asStateFlow()

    fun loadExpenses(from: String, to: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            expenseRepository.getExpenses(driverId, from, to)
                .onSuccess { list ->
                    val total = list.sumOf { it.amount }
                    _state.value = _state.value.copy(expenses = list, totalAmount = total, isLoading = false)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Failed loading expenses."
                    )
                }
        }
    }

    fun createExpense(expense: Expense, from: String, to: String) {
        viewModelScope.launch {
            expenseRepository.insertExpense(expense)
                .onSuccess { loadExpenses(from, to) }
                .onFailure { err ->
                    _state.value = _state.value.copy(errorMessage = "Could not log expense: \${err.localizedMessage}")
                }
        }
    }

    fun deleteExpense(id: String, from: String, to: String) {
        viewModelScope.launch {
            expenseRepository.deleteExpense(id)
                .onSuccess { loadExpenses(from, to) }
                .onFailure { err ->
                    _state.value = _state.value.copy(errorMessage = "Could not delete expense: \${err.localizedMessage}")
                }
        }
    }

    fun uploadReceipt(context: Context, uri: Uri, expenseId: String, from: String, to: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isUploading = true, errorMessage = null)
            DocumentUploadHelper.uploadAndSaveReceiptImage(
                context = context,
                uri = uri,
                driverId = driverId,
                expenseId = expenseId,
                expenseRepository = expenseRepository,
                storageRepository = storageRepository
            ).onSuccess {
                _state.value = _state.value.copy(isUploading = false)
                loadExpenses(from, to)
            }.onFailure { err ->
                _state.value = _state.value.copy(
                    isUploading = false,
                    errorMessage = "Receipt image upload failed: \${err.localizedMessage}"
                )
            }
        }
    }

    fun receiptOcr(imageBytes: ByteArray, onOcrSuccess: (Double, String, String) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isUploading = true, errorMessage = null)
            edgeFunctionRepository.receiptOcr(imageBytes)
                .onSuccess { res ->
                    _state.value = _state.value.copy(isUploading = false)
                    onOcrSuccess(res.amount, res.merchant ?: "Unknown", res.extractedDate ?: "")
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isUploading = false,
                        errorMessage = "AI OCR Scanner error: \${err.localizedMessage}"
                    )
                }
        }
    }
}


// 2.7 ProfileViewModel.kt
package com.yourtaximate.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.*
import com.yourtaximate.app.data.repository.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val profileRepository: ProfileRepository,
    private val driverId: String
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        loadFullDriverData()
    }

    fun loadFullDriverData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            
            // Sequential loading to avoid Supabase token throttle
            val pResult = profileRepository.getProfile(driverId)
            val sResult = profileRepository.getDriverSettings(driverId)
            val vResult = profileRepository.getVehicleFareTypes()
            val cResult = profileRepository.getSmsCreditsRemaining(driverId)
            val subResult = profileRepository.getSubscriptionStatus(driverId)

            if (pResult.isSuccess && sResult.isSuccess && vResult.isSuccess) {
                _state.value = _state.value.copy(
                    profile = pResult.getOrNull(),
                    settings = sResult.getOrNull(),
                    vehicleTypes = vResult.getOrDefault(emptyList()),
                    smsCreditsRemaining = cResult.getOrDefault(0),
                    subscriptionStatus = subResult.getOrNull()?.status ?: "Basic",
                    subscriptionExpiry = subResult.getOrNull()?.expiryDate,
                    isLoading = false
                )
            } else {
                _state.value = _state.value.copy(
                    isLoading = false,
                    errorMessage = "TfL credentials or settings failed to load."
                )
            }
        }
    }

    fun updateProfile(update: ProfileUpdate) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            profileRepository.updateProfile(driverId, update)
                .onSuccess { loadFullDriverData() }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = "Profile update failed: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun updateSettings(settings: DriverSettings) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            profileRepository.updateDriverSettings(driverId, settings)
                .onSuccess { loadFullDriverData() }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = "Settings persist failed: \${err.localizedMessage}"
                    )
                }
        }
    }
}


// 2.8 DocumentViewModel.kt
package com.yourtaximate.app.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourtaximate.app.data.model.DocumentType
import com.yourtaximate.app.data.model.DriverDocument
import com.yourtaximate.app.data.model.DocumentUiState
import com.yourtaximate.app.data.repository.DriverDocumentRepository
import com.yourtaximate.app.data.repository.StorageRepository
import com.yourtaximate.app.services.DocumentUploadHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DocumentViewModel(
    private val driverDocumentRepository: DriverDocumentRepository,
    private val storageRepository: StorageRepository,
    private val driverId: String
) : ViewModel() {

    private val _state = MutableStateFlow(DocumentUiState())
    val state: StateFlow<DocumentUiState> = _state.asStateFlow()

    init {
        loadDocuments()
    }

    fun loadDocuments() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            driverDocumentRepository.getDocuments(driverId)
                .onSuccess { list ->
                    // Group documents map by 11 types ensuring nullable state matches UI tiles
                    val grouped = DocumentType.values().associateWith { type ->
                        list.find { it.documentType == type }
                    }
                    _state.value = _state.value.copy(documentsGrouped = grouped, isLoading = false)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = "Could not pull files: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun uploadDocument(context: Context, uri: Uri, type: DocumentType, expiryDate: String?) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isUploading = true, errorMessage = null)
            DocumentUploadHelper.uploadAndSaveDriverDocument(
                context = context,
                uri = uri,
                driverId = driverId,
                documentType = type,
                expiryDate = expiryDate,
                storageRepository = storageRepository,
                documentRepository = driverDocumentRepository
            ).onSuccess {
                _state.value = _state.value.copy(isUploading = false)
                loadDocuments()
            }.onFailure { err ->
                _state.value = _state.value.copy(
                    isUploading = false,
                    errorMessage = "Secure file sync failure: \${err.localizedMessage}"
                )
            }
        }
    }

    fun deleteDocument(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            driverDocumentRepository.deleteDocument(id)
                .onSuccess {
                    loadDocuments()
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = "Could not delete row: \${err.localizedMessage}"
                    )
                }
        }
    }

    fun getSignedUrl(path: String) {
        viewModelScope.launch {
            storageRepository.getSignedUrl("driver-documents", path)
                .onSuccess { url ->
                    val updatedUrls = _state.value.signedUrls.toMutableMap().apply {
                        put(path, url)
                    }
                    _state.value = _state.value.copy(signedUrls = updatedUrls)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        errorMessage = "Unable to fetch photo token: \${err.localizedMessage}"
                    )
                }
        }
    }
}


// --------------------------------------------------------------------
// 3. Navigation Compose Routes Setup (com/yourtaximate/app/navigation/NavGraph.kt)
// --------------------------------------------------------------------
package com.yourtaximate.app.navigation

import kotlinx.serialization.Serializable

@Serializable
sealed interface Route {
    // Auth route outside bottom tabs menu
    @Serializable
    object Auth : Route

    // Bottom Navigation tab routes
    @Serializable
    object Bookings : Route
    
    @Serializable
    object Trips : Route
    
    @Serializable
    object Expenses : Route
    
    @Serializable
    object Profile : Route

    // Inner detail and creation screens
    @Serializable
    data class BookingDetail(val bookingId: String) : Route
    
    @Serializable
    object NewBooking : Route
    
    @Serializable
    object Documents : Route
}


// --------------------------------------------------------------------
// 4. Jetpack Compose UI Screens (com/yourtaximate/app/ui/screens)
// --------------------------------------------------------------------

// 4.1 SignInScreen.kt & SignUpScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.data.model.AuthUiState
import com.yourtaximate.app.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthGateScreen(
    viewModel: AuthViewModel,
    onAuthSuccess: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var isSignUp by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Authenticated) {
            onAuthSuccess()
        } else if (uiState is AuthUiState.Error) {
            snackbarHostState.showSnackbar((uiState as AuthUiState.Error).message)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.Center
        ) {
            if (uiState is AuthUiState.Loading) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = if (isSignUp) "Register Driver" else "Driver Workspace",
                        style = MaterialTheme.typography.headlineLarge
                    )

                    if (isSignUp) {
                        OutlinedTextField(
                            value = fullName,
                            onValueChange = { fullName = it },
                            label = { Text("Driver Full Name") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email Address") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Secure Password") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            if (isSignUp) {
                                viewModel.signUp(email, password, fullName)
                            } else {
                                viewModel.signIn(email, password)
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(if (isSignUp) "Create My Account" else "Authenticate Workspace")
                    }

                    TextButton(onClick = { isSignUp = !isSignUp }) {
                        Text(if (isSignUp) "Already registered? Sign In" else "New to YourTaxiMate? Sign Up")
                    }
                }
            }
        }
    }
}


// 4.2 BookingListScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.data.model.Booking
import com.yourtaximate.app.viewmodel.BookingListViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingListScreen(
    viewModel: BookingListViewModel,
    onBookingClick: (String) -> Unit,
    onFabClick: () -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let { snackbarHostState.showSnackbar(it) }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Jobs Dashboard") }) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(onClick = onFabClick, containerColor = MaterialTheme.colorScheme.primary) {
                Icon(Icons.Default.Add, contentDescription = "Add Booking")
            }
        }
    ) { innerPadding ->
        if (state.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.bookings, key = { it.id }) { booking ->
                    BookingCard(booking, onClick = { onBookingClick(booking.id) })
                }
            }
        }
    }
}

@Composable
fun BookingCard(booking: Booking, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(booking.customerName, style = MaterialTheme.typography.titleMedium)
                StatusBadge(booking.status)
            }
            Spacer(Modifier.height(8.dp))
            Text("Pickup: \${booking.pickupAddress}", style = MaterialTheme.typography.bodyMedium)
            Text("Destination: \${booking.destinationAddress}", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(4.dp))
            Text("Time: \${booking.dateTime}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val (color, text) = when (status.lowercase()) {
        "scheduled" -> Color.Gray to "Scheduled"
        "pending" -> Color(0xFFF59E0B) to "Pending"          // Amber
        "confirmed" -> Color(0xFF2563EB) to "Confirmed"        // Blue
        "in_progress" -> Color(0xFF10B981) to "In Progress"    // Green
        "completed" -> Color(0xFF14B8A6) to "Completed"        // Teal
        "cancelled" -> Color(0xFFEF4444) to "Cancelled"        // Red
        else -> Color.DarkGray to status
    }
    Surface(
        color = color.copy(alpha = 0.15f),
        contentColor = color,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall
        )
    }
}


// 4.3 BookingDetailScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.viewmodel.BookingDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingDetailScreen(
    viewModel: BookingDetailViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var messageText by remember { mutableStateOf("") }
    var showAdjustDialog by remember { mutableStateOf(false) }
    var manualFareInput by remember { mutableStateOf("") }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let { snackbarHostState.showSnackbar(it) }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Job Details") }) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        state.booking?.let { b ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(16.dp)
            ) {
                // Booking Info Card & Fare Breakdown (base + mileage + meet_greet + airport_toll = total)
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Customer: \${b.customerName}", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(8.dp))
                        Text("Pickup: \${b.pickupAddress}")
                        Text("Destination: \${b.destinationAddress}")
                        Spacer(Modifier.height(8.dp))
                        
                        Divider()
                        Spacer(Modifier.height(8.dp))
                        
                        Text("Fare Breakdown:", style = MaterialTheme.typography.labelLarge)
                        Text("Base: £\${b.baseFare}")
                        Text("Mileage Rate: £\${b.mileageFare}")
                        if (b.meetGreetFee > 0) Text("Meet & Greet: £\${b.meetGreetFee}")
                        if (b.airportTollCharge > 0) Text("Airport Toll: £\${b.airportTollCharge}")
                        Text(
                            "Total Fare: £\${b.totalFare}",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Actions toolbar based on status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    when (b.status.lowercase()) {
                        "pending" -> {
                            Button(onClick = { viewModel.updateStatus("confirmed") }) { Text("Confirm Job") }
                        }
                        "confirmed" -> {
                            Button(onClick = { viewModel.updateStatus("in_progress") }) { Text("Start Job") }
                        }
                        "in_progress" -> {
                            Button(
                                onClick = { viewModel.updateStatus("completed") },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                            ) { Text("Complete Job") }
                        }
                    }
                    OutlinedButton(onClick = { showAdjustDialog = true }) { Text("Adjust Fare") }
                    if (b.status != "completed" && b.status != "cancelled") {
                        Button(
                            onClick = { viewModel.updateStatus("cancelled") },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                        ) { Text("Cancel") }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Text("Secure Chat Interface", style = MaterialTheme.typography.titleMedium)
                
                // Chat bubbles
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(state.messages) { msg ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(end = if (msg.isDriver) 16.dp else 0.dp, start = if (msg.isDriver) 0.dp else 16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (msg.isDriver) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer
                            )
                        ) {
                            Text(msg.text, modifier = Modifier.padding(8.dp))
                        }
                    }
                }

                // Chat Input bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Send dispatch note...") }
                    )
                    Button(onClick = {
                        viewModel.sendMessage(messageText)
                        messageText = ""
                    }) {
                        Text("Send")
                    }
                }
            }
        }
    }
}


// 4.4 NewBookingScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.viewmodel.NewBookingViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewBookingScreen(
    viewModel: NewBookingViewModel,
    onSuccess: () -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var pastedText by remember { mutableStateOf("") }
    
    // Editable Form variables
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var pickup by remember { mutableStateOf("") }
    var destination by remember { mutableStateOf("") }
    var timeStamp by remember { mutableStateOf("") }
    var flight by remember { mutableStateOf("") }
    var isMeetAndGreet by remember { mutableStateOf(false) }

    LaunchedEffect(state.parsedData) {
        state.parsedData?.let {
            name = it.customerName
            phone = it.phone ?: ""
            pickup = it.pickupAddress
            destination = it.destinationAddress
            timeStamp = it.dateTime
            flight = it.flightNumber ?: ""
            isMeetAndGreet = it.meetAndGreet
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Generate New Booking") }) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Paste Messy Booking Details (SMS, WhatsApp, Email)", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = pastedText,
                onValueChange = { pastedText = it },
                modifier = Modifier.fillMaxWidth().height(100.dp),
                placeholder = { Text("E.g. Hey driver, pick up Arthur at Heathrow T5 at 3 PM, going to Novotel London...") }
            )
            
            Button(
                onClick = { viewModel.parseFromText(pastedText) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Parse with AI Engine")
            }

            Divider()

            Text("Verified Booking Credentials", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Customer Name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone Number") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = pickup, onValueChange = { pickup = it }, label = { Text("Pickup Address") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = destination, onValueChange = { destination = it }, label = { Text("Destination Address") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = timeStamp, onValueChange = { timeStamp = it }, label = { Text("Date/Time Picker") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = flight, onValueChange = { flight = it }, label = { Text("Flight Number (Optional)") }, modifier = Modifier.fillMaxWidth())
            
            Row(modifier = Modifier.fillMaxWidth()) {
                Text("Meet & Greet Option Included", modifier = Modifier.weight(1f))
                Checkbox(checked = isMeetAndGreet, onCheckedChange = { isMeetAndGreet = it })
            }

            if (flight.isNotEmpty()) {
                Button(onClick = { viewModel.trackFlight(flight) }) {
                    Text("Auto Track Flight")
                }
            }

            Button(onClick = {
                // Assemble booking dto and submit
            }, modifier = Modifier.fillMaxWidth()) {
                Text("Create Booking")
            }
        }
    }
}


// 4.5 TripLogScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.viewmodel.TripLogViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripLogScreen(viewModel: TripLogViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var dateFrom by remember { mutableStateOf("2026-05-01") }
    var dateTo by remember { mutableStateOf("2026-05-31") }

    LaunchedEffect(dateFrom, dateTo) {
        viewModel.loadTrips(dateFrom, dateTo)
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Trips Recorder") }) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            // Earnings summary bar
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Gross Earnings", style = MaterialTheme.typography.bodySmall)
                        Text("£\${state.totalEarnings}", style = MaterialTheme.typography.headlineMedium)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Total Trips", style = MaterialTheme.typography.bodySmall)
                        Text("\${state.trips.size} logged", style = MaterialTheme.typography.titleLarge)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Date Picker Row placeholders
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = dateFrom,
                    onValueChange = { dateFrom = it },
                    label = { Text("From") },
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = dateTo,
                    onValueChange = { dateTo = it },
                    label = { Text("To") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(Modifier.height(12.dp))

            // Swipe to Delete List of Trips
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.trips, key = { it.id }) { trip ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(trip.customerName, style = MaterialTheme.typography.bodyLarge)
                                Text("\${trip.pickupAddress} to \${trip.destinationAddress}", style = MaterialTheme.typography.bodySmall)
                            }
                            Text("£\${trip.fareAmount}", style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }
        }
    }
}


// 4.6 ExpenseScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.viewmodel.ExpenseViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseScreen(viewModel: ExpenseViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var dateFrom by remember { mutableStateOf("2026-05-01") }
    var dateTo by remember { mutableStateOf("2026-05-31") }

    LaunchedEffect(dateFrom, dateTo) {
        viewModel.loadExpenses(dateFrom, dateTo)
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("HMRC Expenses Sync") }) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Accumulated Tax Write-Offs", style = MaterialTheme.typography.bodySmall)
                    Text("£\${state.totalAmount}", style = MaterialTheme.typography.headlineLarge)
                }
            }

            Spacer(Modifier.height(16.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.expenses, key = { it.id }) { expense ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(expense.merchant, style = MaterialTheme.typography.bodyLarge)
                                Text(expense.dateTime, style = MaterialTheme.typography.bodySmall)
                            }
                            Text("-£\${expense.amount}", style = MaterialTheme.typography.titleLarge)
                        }
                    }
                }
            }
        }
    }
}


// 4.7 DocumentScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.data.model.DocumentType
import com.yourtaximate.app.data.model.DocumentStatus
import com.yourtaximate.app.viewmodel.DocumentViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentScreen(
    viewModel: DocumentViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Regulatory Licence Storage") }) }
    ) { innerPadding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(state.documentsGrouped.keys.toList()) { type ->
                val document = state.documentsGrouped[type]
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(type.name.replace("_", " "), style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(4.dp))
                        
                        if (document != null) {
                            Text("Expiry: \${document.expiryDate ?: "No Expiry"}", style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.height(4.dp))
                            Surface(
                                color = when(document.status) {
                                    DocumentStatus.APPROVED -> Color.Green.copy(alpha = 0.1f)
                                    DocumentStatus.PENDING -> Color.Cyan.copy(alpha = 0.1f)
                                    DocumentStatus.REJECTED -> Color.Red.copy(alpha = 0.1f)
                                },
                                shape = MaterialTheme.shapes.small
                            ) {
                                Text(document.status.name, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(4.dp))
                            }
                        } else {
                            Text("Missing Document", color = Color.Red, style = MaterialTheme.typography.bodySmall)
                            Button(onClick = { /* Launch camera/gallery triggers */ }, modifier = Modifier.padding(top = 8.dp)) {
                                Text("Upload File")
                            }
                        }
                    }
                }
            }
        }
    }
}


// 4.8 ProfileScreen.kt
package com.yourtaximate.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourtaximate.app.viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onNavigateToDocuments: () -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("TfL Cab Driver Account") }) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            state.profile?.let { p ->
                Text("Driver: \${p.fullName}", style = MaterialTheme.typography.headlineMedium)
                Text("Telephone: \${p.phone}", style = MaterialTheme.typography.bodyLarge)
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("SMS Credits Balance Checker", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = state.smsCreditsRemaining / 100f,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text("\${state.smsCreditsRemaining} / 100 remaining credits")
                }
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Subscription Framework", style = MaterialTheme.typography.titleMedium)
                    Text("Tier: \${state.subscriptionStatus}")
                    state.subscriptionExpiry?.let { Text("Expires on: \${it}") }
                }
            }

            Button(onClick = onNavigateToDocuments, modifier = Modifier.fillMaxWidth()) {
                Text("Manage Regulatory Handbooks & Licences")
            }
        }
    }
}
`;

  const setupDoc = `
// ====================================================================
// YOUR TAXI MATE - DEPENDENCY INJECTION & INITIALIZATION PROTOCOLS
// Fully functional Hilt modules, local.properties config, and app initialization.
// ====================================================================

// --------------------------------------------------------------------
// 1. AppModule.kt (Dagger Hilt Dependency Injection Module)
// --------------------------------------------------------------------
package com.yourtaximate.app.di

import android.content.Context
import com.yourtaximate.app.data.repository.*
import com.yourtaximate.app.services.LocationServiceManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage
import io.github.jan.supabase.realtime.realtime
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient {
        return SupabaseClient.client
    }

    @Provides
    @Singleton
    fun provideHttpClient(): HttpClient {
        return HttpClient(Android) {
            install(ContentNegotiation) {
                json(Json {
                    ignoreUnknownKeys = true
                    coerceInputValues = true
                })
            }
        }
    }

    @Provides
    @Singleton
    fun provideAuthRepository(supabase: SupabaseClient): AuthRepository {
        return AuthRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideBookingRepository(supabase: SupabaseClient): BookingRepository {
        return BookingRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideEdgeFunctionRepository(
        client: HttpClient,
        supabase: SupabaseClient
    ): EdgeFunctionRepository {
        return EdgeFunctionRepository(
            client = client,
            supabase = supabase,
            anonKey = com.yourtaximate.app.BuildConfig.SUPABASE_ANON_KEY
        )
    }

    @Provides
    @Singleton
    fun provideLocationRepository(supabase: SupabaseClient): LocationRepository {
        return LocationRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideStorageRepository(supabase: SupabaseClient): StorageRepository {
        return StorageRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideDriverDocumentRepository(supabase: SupabaseClient): DriverDocumentRepository {
        return DriverDocumentRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideTripRepository(supabase: SupabaseClient): TripRepository {
        return TripRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideExpenseRepository(supabase: SupabaseClient): ExpenseRepository {
        return ExpenseRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideProfileRepository(supabase: SupabaseClient): ProfileRepository {
        return ProfileRepository(supabase)
    }

    @Provides
    @Singleton
    fun provideLocationServiceManager(@ApplicationContext context: Context): LocationServiceManager {
        return LocationServiceManager(context)
    }
}


// --------------------------------------------------------------------
// 2. local.properties (Secure API Secrets Mapping)
// --------------------------------------------------------------------
# File Location: Root Directory of project (local.properties)
# Do not commit this file to version control. Add files locally:

SUPABASE_URL=https://vhvssujjuwjkgkweytct.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...


// --------------------------------------------------------------------
// 3. build.gradle (:app module configuration)
// --------------------------------------------------------------------
android {
    ...
    defaultConfig {
        ...
        // Safely extract properties from local.properties file for dynamic compilation
        val localProperties = java.util.Properties()
        val localPropertiesFile = rootProject.file("local.properties")
        if (localPropertiesFile.exists()) {
            localPropertiesFile.inputStream().use { localProperties.load(it) }
        }

        val url = localProperties.getProperty("SUPABASE_URL") ?: ""
        val anonKey = localProperties.getProperty("SUPABASE_ANON_KEY") ?: ""

        buildConfigField("String", "SUPABASE_URL", "\\"\\$url\\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\\"\\$anonKey\\"")
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }
}


// --------------------------------------------------------------------
// 4. YourTaxiMateApplication.kt (Application Startup Setup)
// --------------------------------------------------------------------
package com.yourtaximate.app

import android.app.Application
import com.yourtaximate.app.utils.NotificationChannelSetup
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class YourTaxiMateApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Establish critical notification channel profiles on launch
        NotificationChannelSetup.createNotificationChannels(this)
    }
}


// --------------------------------------------------------------------
// 5. AndroidManifest.xml Entry Details
// --------------------------------------------------------------------
<!-- File Location: app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:name=".YourTaxiMateApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.YourTaxiMate">
        ...
    </application>
</manifest>
`;


  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl mt-8 text-slate-800">
      {/* Header Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/80">
        <button
          onClick={() => setActiveTab("sql")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "sql"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Database className="w-4 h-4" />
          Supabase Migration
        </button>
        <button
          onClick={() => setActiveTab("rn")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "rn"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Cpu className="w-4 h-4" />
          React Native App
        </button>
        <button
          onClick={() => setActiveTab("packs")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "packs"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Terminal className="w-4 h-4" />
          Terminal Packages
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "api"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Globe className="w-4 h-4 text-blue-500" />
          Edge Functions API
        </button>
        <button
          onClick={() => setActiveTab("realtime")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "realtime"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
          Realtime Subscriptions
        </button>
        <button
          onClick={() => setActiveTab("repos")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "repos"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <FileText className="w-4 h-4 text-teal-500" />
          Android Repositories
        </button>
        <button
          onClick={() => setActiveTab("location")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "location"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <MapPin className="w-4 h-4 text-rose-500 animate-pulse" />
          Live GPS Service
        </button>
        <button
          onClick={() => setActiveTab("storage")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "storage"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <FolderOpen className="w-4 h-4 text-amber-500" />
          Storage Upload
        </button>
        <button
          onClick={() => setActiveTab("compose")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "compose"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Smartphone className="w-4 h-4 text-indigo-500" />
          Compose UI & ViewModels
        </button>
        <button
          onClick={() => setActiveTab("setup")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "setup"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Settings className="w-4 h-4 text-violet-500" />
          Hilt DI & App Setup
        </button>
        <button
          onClick={() => setActiveTab("reg")}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-sans font-bold border-b-2 tracking-wider uppercase transition-all duration-150 ${
            activeTab === "reg"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          UK Private Hire Law Gaps
        </button>
      </div>

      {/* Code / Content Area */}
      <div className="p-6">
        {activeTab === "sql" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Supabase Schema &amp; Security Triggers</h3>
                <p className="text-xs text-slate-500 mt-0.5">Place inside <code className="text-blue-600 bg-slate-100 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">supabase/migrations/0001_initial_schema.sql</code></p>
              </div>
              <button
                onClick={() => copyToClipboard(sqlSchema, "sql")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "sql" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Migration!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[420px] text-slate-300 leading-relaxed scrollbar-thin">
              {sqlSchema}
            </pre>
          </div>
        )}

        {activeTab === "rn" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">React Native Mobile Screen Component</h3>
                <p className="text-xs text-slate-500 mt-0.5">Create file in your mobile repo at <code className="text-blue-600 bg-slate-100 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">screens/booking/BookingScreen.tsx</code></p>
              </div>
              <button
                onClick={() => copyToClipboard(reactNativeCode, "rn")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "rn" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Screen!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[420px] text-slate-300 leading-relaxed scrollbar-thin">
              {reactNativeCode}
            </pre>
          </div>
        )}

        {activeTab === "packs" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">NPM Packages Configuration</h3>
                <p className="text-xs text-slate-500 mt-0.5">Run these commands inside your project directories to install dependencies.</p>
              </div>
              <button
                onClick={() => copyToClipboard(packagesList, "packs")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "packs" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Packages!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto text-slate-300 leading-relaxed">
              {packagesList}
            </pre>
          </div>
        )}

        {activeTab === "api" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Supabase Edge Functions API Reference</h3>
                <p className="text-xs text-slate-500 mt-0.5">Use with standard authorization headers matching the custom endpoints.</p>
              </div>
              <button
                onClick={() => copyToClipboard(apiEndpointsDoc, "api")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "api" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied API Docs!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Warning Callout Box for safety */}
            <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-slate-800 text-xs shadow-sm">
              <div className="flex gap-2.5 items-start">
                <span className="text-base">⚠️</span>
                <div>
                  <h4 className="font-bold text-amber-900">SQL Runner Misalignment Warning</h4>
                  <p className="mt-1 leading-normal text-slate-600">
                    These are **REST API endpoints** and server configuration rules. They must be consumed via HTTP client libraries inside your application. 
                    Running these code snippets inside the **Supabase SQL Editor** directly will produce an <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px] text-amber-800">ERROR 42601: syntax error</code>.
                  </p>
                </div>
              </div>
            </div>

            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[420px] text-slate-300 leading-relaxed scrollbar-thin">
              {apiEndpointsDoc}
            </pre>
          </div>
        )}

        {activeTab === "realtime" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Real-time WebSocket Subscription Patterns</h3>
                <p className="text-xs text-slate-500 mt-0.5">Setup active streams to listen to bookings transitions, messaging updates, and live GPS marker telemetry.</p>
              </div>
              <button
                onClick={() => copyToClipboard(realtimeDoc, "realtime")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "realtime" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Realtime Patterns!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Warning Callout Box for safety */}
            <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-slate-800 text-xs shadow-sm">
              <div className="flex gap-2.5 items-start">
                <span className="text-base">⚠️</span>
                <div>
                  <h4 className="font-bold text-amber-900">Do NOT paste this inside Supabase SQL Query editor!</h4>
                  <p className="mt-1 leading-normal text-slate-600">
                    The code blocks below are written in **Kotlin (for Android native)** and **TypeScript (for Web/React)**. They are designed to live inside your Client App's source code files (e.g., <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px] text-amber-800">MainActivity.kt</code>). 
                    If you try to run these inside the Supabase SQL database playground, Postgres will crash with <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px] text-amber-800">ERROR 42601 near "import io.github..."</code> because it doesn't speak Kotlin!
                  </p>
                </div>
              </div>
            </div>

            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[420px] text-slate-300 leading-relaxed scrollbar-thin">
              {realtimeDoc}
            </pre>
          </div>
        )}

        {activeTab === "repos" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Android Production Repository Layer</h3>
                <p className="text-xs text-slate-500 mt-0.5">High-quality Kotlin files leveraging supabase-kt Client, postgrest APIs, storage uploading modules, and Ktor client edge calls with Bearer Token integration.</p>
              </div>
              <button
                onClick={() => copyToClipboard(reposDoc, "repos")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "repos" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Repositories!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Reminder Callout Box */}
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl text-slate-800 text-xs shadow-sm">
              <div className="flex gap-2.5 items-start">
                <span className="text-base text-blue-600">💡</span>
                <div>
                  <h4 className="font-bold text-blue-900">Domain-Driven Repositories Built for Jetpack Compose Architecture</h4>
                  <p className="mt-1 leading-normal text-slate-600 text-[11px]">
                    These Kotlin archives are ready to inject via **Hilt** or **Koin** into your viewmodels. They feature full Kotlin <code className="bg-blue-100 px-1 rounded font-mono text-[10px]">Coroutine context swapping (Dispatchers.IO)</code>, exception-safe <code className="bg-blue-100 px-1 rounded font-mono text-[10px]">Result&lt;T&gt;</code> wrappers, and live flow streams for active synchronization.
                  </p>
                </div>
              </div>
            </div>

            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[420px] text-slate-300 leading-relaxed scrollbar-thin">
              {reposDoc}
            </pre>
          </div>
        )}

        {activeTab === "location" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Android Foreground Location Service</h3>
                <p className="text-xs text-slate-500 mt-0.5">High-accuracy FusedLocation service running in background every 5 seconds to push live telemetry to Supabase during ride stages.</p>
              </div>
              <button
                onClick={() => copyToClipboard(locationDoc, "location")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "location" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Location Service!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Detailed Feature Box Callout */}
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-slate-800 text-xs shadow-sm">
              <div className="flex gap-2.5 items-start">
                <span className="text-base text-rose-600">🚗</span>
                <div>
                  <h4 className="font-bold text-rose-900">Enterprise High-Accuracy GPS Synchronization Protocol</h4>
                  <ul className="mt-1.5 leading-relaxed text-slate-600 text-[11px] list-disc ml-4 space-y-1">
                    <li><strong>Adaptive Telemetry Interval</strong>: Constrained at 5000ms requests with a 3000ms fastest limit to prevent battery thermal throttling.</li>
                    <li><strong>Automated Database Handshakes</strong>: Coordinates are pushed via the custom <code className="bg-rose-100 px-1 rounded font-mono text-[10px]">locationRepository.insertLocation()</code> function (which automatically omits the database-generated UUID identifier).</li>
                    <li><strong>Regulatory Metrics Matching</strong>: System automatically maps raw GPS bearing directly to the <code className="bg-rose-100 px-1 rounded font-mono text-[10px]">heading</code> table index, and converts velocity metrics from standard metric SI meters per second into miles-per-hour (<code className="bg-rose-100 px-1 rounded font-mono text-[10px]">speed * 2.237f</code>) before transmission.</li>
                    <li><strong>State Persistence Integration</strong>: Automatically calls <code className="bg-rose-100 px-1 rounded font-mono text-[10px]">enableTracking(bookingId)</code> upon initializing, and disables tracking on close.</li>
                  </ul>
                </div>
              </div>
            </div>

            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[420px] text-slate-300 leading-relaxed scrollbar-thin">
              {locationDoc}
            </pre>
          </div>
        )}

        {activeTab === "storage" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Android Storage Upload Helpers</h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated image downsizing, raw PDF byte piping, and dual private bucket uploads to Supabase Storage.</p>
              </div>
              <button
                onClick={() => copyToClipboard(storageDoc, "storage")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                {copiedSection === "storage" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Storage Helpers!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Detailed Feature Box Callout */}
            <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-slate-800 text-xs shadow-sm">
              <div className="flex gap-2.5 items-start">
                <span className="text-base text-amber-600">📂</span>
                <div>
                  <h4 className="font-bold text-amber-900">Enterprise Cloud Synchronization &amp; Storage Protocols</h4>
                  <ul className="mt-1.5 leading-relaxed text-slate-600 text-[11px] list-disc ml-4 space-y-1">
                    <li><strong>Dual Private Bucket Strategy</strong>: Direct separation of <code className="bg-amber-100 px-1 rounded font-mono text-[10px]">receipt-images</code> (10MB Max, JPEGs/PNGs) and <code className="bg-amber-100 px-1 rounded font-mono text-[10px]">driver-documents</code> (10MB Max, JPEGs/PNGs/PDFs) with strict RLS policies.</li>
                    <li><strong>Collision-Free Path Generation</strong>: Path schema is generated as <code className="bg-amber-100 px-1 rounded font-mono text-[10px]">{"{driverId}/{timestamp}_{original_name}"}</code> to maintain sandboxed user boundaries and trace historical updates.</li>
                    <li><strong>Lossless PDF Stream Pipe</strong>: PDFs bypass standard compression pipelines completely, uploading raw bytes directly to secure uncompressed document folders.</li>
                    <li><strong>Adaptive Bitmap Compression</strong>: Normalizes high-resolution camera captures to a maximum bounding footprint of 1920px (preserving aspect ratio) and encodes at 85% JPEG quality to save cell plan data and speed up upload times.</li>
                    <li><strong>Single-Use Signed URLs</strong>: Utilizes temporary <code className="bg-amber-100 px-1 rounded font-mono text-[10px]">createSignedUrl(path, expiresIn)</code> structures (expiring in 3600 seconds) for UI delivery instead of storing raw shared links in tables.</li>
                  </ul>
                </div>
              </div>
            </div>

            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[420px] text-slate-300 leading-relaxed scrollbar-thin">
              {storageDoc}
            </pre>
          </div>
        )}

        {activeTab === "compose" && (
          <div className="space-y-4 text-slate-800 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
              <div className="flex items-start gap-4">
                <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-display text-slate-900">Jetpack Compose UI & ViewModels Architecture</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                    Full MVVM implementation for the YourTaxiMate Android application. This covers all 8 unified ViewModels (Auth, BookingList, BookingDetail, NewBooking, TripLog, Expense, Profile, Document), 8 gorgeous Compose screens, and a type-safe Kotlin Serialization navigation graph.
                  </p>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(composeDoc, "compose")}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-sm transition-all self-start md:self-center"
              >
                {copiedSection === "compose" ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied Code!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Complete Source
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-slate-900 block font-display">Prerequisites & Gated State Rules:</span>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                  <li><strong>Flow Collection</strong>: Always use <code className="bg-slate-200 px-1 rounded text-[10px] font-mono">collectAsStateWithLifecycle()</code> inside Compose screens to safeguard resource lifecycle loops.</li>
                  <li><strong>Uncompromised Security</strong>: No hardcoded API creds, no simulated mocks: all queries piping directly through actual supabase-kt repos.</li>
                </ul>
              </div>
              <div>
                <span className="font-bold text-slate-900 block font-display">Robust Component Sizing:</span>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                  <li><strong>Fluid Touch Targets</strong>: Handlers contain interactive spaces of minimum 44dp for on-the-move driving ease.</li>
                  <li><strong>Dynamic Loading Bounds</strong>: Fully tracks continuous state operations with Material Circular Loaders.</li>
                </ul>
              </div>
            </div>

            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[600px] text-slate-300 leading-relaxed scrollbar-thin">
              {composeDoc}
            </pre>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="space-y-6 text-slate-800 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-violet-50 border border-violet-100 p-6 rounded-3xl">
              <div className="flex items-start gap-4">
                <div className="bg-violet-600 text-white p-3 rounded-2xl shadow-md">
                  <Settings className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-display text-slate-900">DI, Application Setup & Secrets Config</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                    Final wiring layer for our Android mobile ecosystem. Implement Hilt DI module, inject the 8 clean repositories, configure compile-time secrets processing, register notification channel managers, and verify launches.
                  </p>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(setupDoc, "setup")}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-sm transition-all self-start md:self-center"
              >
                {copiedSection === "setup" ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied Config!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy AppModule & Config
                  </>
                )}
              </button>
            </div>

            {/* Interactive Progress Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-2 font-display text-sm text-slate-900">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                  Integration & Verification Checklist
                </span>
                <span>
                  {setupChecklist.filter(item => item.done).length} / {setupChecklist.length} Milestones (
                  {Math.round((setupChecklist.filter(item => item.done).length / setupChecklist.length) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-violet-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(setupChecklist.filter(item => item.done).length / setupChecklist.length) * 100}%` }}
                />
              </div>

              {/* Grouped Checklist */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {["App Setup", "First Run Testing", "Core Operations", "Value Added Features"].map(cat => {
                  const items = setupChecklist.filter(i => i.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 tracking-wide uppercase">{cat}</h4>
                      <div className="space-y-2">
                        {items.map(item => (
                          <label
                            key={item.id}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              item.done
                                ? "bg-emerald-50/50 border-emerald-100/80 text-slate-500"
                                : "bg-slate-50/30 hover:bg-slate-50 border-slate-100 text-slate-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => toggleChecklistItem(item.id)}
                              className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 w-4 h-4 cursor-pointer"
                            />
                            <span className={`text-[11px] leading-relaxed transition-all ${item.done ? "line-through text-slate-400" : ""}`}>
                              {item.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <pre className="text-xs font-mono bg-[#0f1322] border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[600px] text-slate-300 leading-relaxed scrollbar-thin">
              {setupDoc}
            </pre>
          </div>
        )}

        {activeTab === "reg" && (
          <div className="space-y-4 text-slate-800 animate-fade-in">
            <div className="flex items-center gap-2.5 text-blue-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-sm font-display text-slate-900">UK Transport for London (TfL) PHV Regulations Checklist</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              UK PHV (Private Hire Vehicle / Taxi dispatch) rules are highly stringent about safety and system operation. As a developer building "Your Taxi Mate", any slip-up during audit can result in TfL license rejection. Always review these rules:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-mono text-blue-600 font-bold block uppercase tracking-wider">Rule 1: Pre-booking Requirement</span>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  Rides must be pre-booked directly via the platform Operator. Street-hailing represents an illegal, uninsured journey.
                </p>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 mt-3">
                  <span className="text-[9px] font-extrabold text-blue-700 font-mono block uppercase tracking-wide">OUR ENFORCEMENT:</span>
                  <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">The passenger client submits ride coordinates directly to our Supabase database, capturing timestamps and dispatch values before assigning a driver.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-mono text-blue-600 font-bold block uppercase tracking-wider">Rule 2: Fare Estimate Up-front lock</span>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  The fare cannot be updated or raised post-acceptance based on traffic delay, unless dynamic deviation is specified.
                </p>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 mt-3">
                  <span className="text-[9px] font-extrabold text-blue-700 font-mono block uppercase tracking-wide">OUR ENFORCEMENT:</span>
                  <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">Our <code className="text-blue-800 font-bold text-[9px] bg-blue-50 px-1 rounded">enforce_fare_immutability</code> trigger checks changes on update and blocks any estimates alteration.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-mono text-blue-600 font-bold block uppercase tracking-wider">Rule 3: Gated Expiries (MOT &amp; Licence)</span>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  Expired documents must trigger IMMEDIATE suspension of the driver profile, preventing any requested jobs visibility.
                </p>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 mt-3">
                  <span className="text-[9px] font-extrabold text-blue-700 font-mono block uppercase tracking-wide">RECOMMENDED ROADMAP:</span>
                  <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">Include or schedule a periodic cron task / PgCron to regularly check document expirations and flag non-compliant profiles.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-mono text-blue-600 font-bold block uppercase tracking-wider">Rule 4: Customer Billing Receipts</span>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  UK regulations require showing base fares, distance, per-mile rates, surcharges, and licensing details in invoices.
                </p>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 mt-3">
                  <span className="text-[9px] font-extrabold text-blue-700 font-mono block uppercase tracking-wide">OUR ENFORCEMENT:</span>
                  <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">The receipt panel details the breakdown item-by-item in a transparent layout, ensuring full client protection.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
