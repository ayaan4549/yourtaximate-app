import { useState, useEffect, useCallback } from "react";
import { supabase, DBRide, DBDocument, DBVehicle, DBUser, DBDriver } from "./supabase";

// ── Auth ──────────────────────────────────────────────────────────────────────

export function useSupabaseSession() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

// ── Current user profile ──────────────────────────────────────────────────────

export function useUserProfile(userId: string | null) {
  const [profile, setProfile] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    // Real schema uses "profiles" table (created by Lovable)
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            id: data.id,
            phone: data.phone || "",
            role: "driver",
            full_name: data.full_name,
            created_at: "",
          });
        }
        setLoading(false);
      });
  }, [userId]);

  return { profile, loading };
}

// ── Driver profile ────────────────────────────────────────────────────────────

export function useDriverProfile(userId: string | null) {
  const [driver, setDriver] = useState<DBDriver | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from("drivers")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setDriver(data);
        setLoading(false);
      });
  }, [userId]);

  return { driver, loading };
}

// ── Rides (as driver — all assigned + available) ──────────────────────────────

export function useDriverRides(driverId: string | null) {
  const [rides, setRides] = useState<DBRide[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    const { data } = await supabase
      .from("rides")
      .select("*")
      .or(`driver_id.eq.${driverId},and(status.eq.requested,driver_id.is.null)`)
      .order("created_at", { ascending: false });
    setRides(data || []);
    setLoading(false);
  }, [driverId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { rides, loading, refetch: fetch };
}

// ── Rides (as passenger — own rides only) ─────────────────────────────────────

export function usePassengerRides(passengerId: string | null) {
  const [rides, setRides] = useState<DBRide[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!passengerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("rides")
      .select("*")
      .eq("passenger_id", passengerId)
      .order("created_at", { ascending: false });
    setRides(data || []);
    setLoading(false);
  }, [passengerId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { rides, loading, refetch: fetch };
}

// ── Create a new ride booking ─────────────────────────────────────────────────

export async function createRide(payload: Omit<DBRide, "id" | "created_at" | "fare_final" | "driver_id">) {
  const { data, error } = await supabase
    .from("rides")
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

// ── Accept a ride (driver) ────────────────────────────────────────────────────

export async function acceptRide(rideId: string, driverId: string) {
  const { data, error } = await supabase
    .from("rides")
    .update({ driver_id: driverId, status: "accepted" })
    .eq("id", rideId)
    .eq("status", "requested")
    .select()
    .single();
  return { data, error };
}

// ── Update ride status ────────────────────────────────────────────────────────

export async function updateRideStatus(rideId: string, status: DBRide["status"]) {
  const { data, error } = await supabase
    .from("rides")
    .update({ status })
    .eq("id", rideId)
    .select()
    .single();
  return { data, error };
}

// ── Driver documents ──────────────────────────────────────────────────────────

export function useDriverDocuments(driverId: string | null) {
  const [documents, setDocuments] = useState<DBDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("driver_id", driverId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }, [driverId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { documents, loading, refetch: fetch };
}

// ── Driver vehicle ────────────────────────────────────────────────────────────

export function useDriverVehicle(driverId: string | null) {
  const [vehicle, setVehicle] = useState<DBVehicle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    supabase
      .from("vehicles")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setVehicle(data);
        setLoading(false);
      });
  }, [driverId]);

  return { vehicle, loading };
}

// ── Submit a rating ───────────────────────────────────────────────────────────

export async function submitRating(rideId: string, passengerId: string, driverId: string, score: number) {
  const { data, error } = await supabase
    .from("ratings")
    .insert({ ride_id: rideId, passenger_id: passengerId, driver_id: driverId, score });
  return { data, error };
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function signOut() {
  await supabase.auth.signOut();
}
