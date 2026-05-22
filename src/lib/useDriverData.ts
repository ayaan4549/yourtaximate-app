import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import {
  dbBookingToBooking,
  bookingToDBInsert,
  bookingToDBUpdate,
  dbTripToTrip,
  tripToDBInsert,
  dbExpenseToExpense,
  expenseToDBInsert,
  dbRowsToSettings,
} from "./adapters";
import { Booking, Trip, Expense, AppSettings } from "../types";
import { SEED_BOOKINGS, SEED_TRIPS, SEED_EXPENSES, DEFAULT_SETTINGS } from "../utils/seedData";

export function useDriverData(userId: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips]       = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(false);
  const [ready, setReady]       = useState(false);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!userId) {
      setBookings(SEED_BOOKINGS);
      setTrips(SEED_TRIPS);
      setExpenses(SEED_EXPENSES);
      setReady(true);
      return;
    }

    setLoading(true);

    const [bookingsRes, tripsRes, expensesRes, profileRes, settingsRes, vehicleRes] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .eq("driver_id", userId)
          .not("status", "in", '("completed","cancelled")')
          .order("pickup_datetime", { ascending: true }),

        supabase
          .from("trips")
          .select("*")
          .eq("driver_id", userId)
          .order("trip_date", { ascending: false }),

        supabase
          .from("expenses")
          .select("*")
          .eq("driver_id", userId)
          .order("expense_date", { ascending: false }),

        supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", userId)
          .single(),

        supabase
          .from("driver_settings")
          .select("*")
          .eq("driver_id", userId)
          .single(),

        supabase
          .from("vehicle_health")
          .select("vehicle_make, vehicle_model, vehicle_registration, vehicle_color")
          .eq("driver_id", userId)
          .single(),
      ]);

    if (bookingsRes.data)  setBookings(bookingsRes.data.map(dbBookingToBooking));
    if (tripsRes.data)     setTrips(tripsRes.data.map(dbTripToTrip));
    if (expensesRes.data)  setExpenses(expensesRes.data.map(dbExpenseToExpense));

    // Merge DB profile/settings/vehicle into local settings
    const cachedSettings = localStorage.getItem("farefreedom_settings_cache");
    const baseSettings = cachedSettings ? JSON.parse(cachedSettings) : DEFAULT_SETTINGS;
    const merged = dbRowsToSettings(
      profileRes.data  || null,
      settingsRes.data || null,
      vehicleRes.data  || null,
      baseSettings
    );
    setSettings(merged);
    localStorage.setItem("farefreedom_settings_cache", JSON.stringify(merged));

    setLoading(false);
    setReady(true);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Bookings mutations ──────────────────────────────────────────────────────

  const addBooking = useCallback(async (booking: Booking) => {
    setBookings(prev => [booking, ...prev]);
    if (!userId) return;
    const { error } = await supabase
      .from("bookings")
      .insert(bookingToDBInsert(booking, userId));
    if (error) console.error("addBooking:", error.message);
  }, [userId]);

  const deleteBooking = useCallback(async (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    if (!userId) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) console.error("deleteBooking:", error.message);
  }, [userId]);

  const updateBooking = useCallback(async (updated: Booking) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (!userId) return;
    const { error } = await supabase
      .from("bookings")
      .update(bookingToDBUpdate(updated))
      .eq("id", updated.id);
    if (error) console.error("updateBooking:", error.message);
  }, [userId]);

  // Mark booking completed → insert into trips table
  const completeBooking = useCallback(async (bookingId: string, paymentMethod: "cash" | "card") => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    // Optimistic UI update
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    const newTrip: Trip = {
      id:                 "trip-" + Date.now(),
      customerName:       target.customerName,
      pickupAddress:      target.pickupAddress,
      destinationAddress: target.destinationAddress,
      distanceMiles:      target.distanceMiles,
      fareGbp:            target.fareGbp,
      paymentMethod,
      dateTime:           new Date().toISOString(),
      mode:               "Prebook",
    };
    setTrips(prev => [newTrip, ...prev]);

    if (!userId) return;

    // Update booking status
    await supabase
      .from("bookings")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    // Insert into trips
    const { error } = await supabase
      .from("trips")
      .insert(tripToDBInsert(newTrip, userId, bookingId));
    if (error) console.error("completeBooking (trips insert):", error.message);
  }, [bookings, userId]);

  // ── Trips mutations ─────────────────────────────────────────────────────────

  const saveTrip = useCallback(async (trip: Trip) => {
    setTrips(prev => [trip, ...prev]);
    if (!userId) return;
    const { error } = await supabase
      .from("trips")
      .insert(tripToDBInsert(trip, userId));
    if (error) console.error("saveTrip:", error.message);
  }, [userId]);

  const deleteTrip = useCallback(async (tripId: string) => {
    setTrips(prev => prev.filter(t => t.id !== tripId));
    if (!userId) return;
    const { error } = await supabase.from("trips").delete().eq("id", tripId);
    if (error) console.error("deleteTrip:", error.message);
  }, [userId]);

  // ── Expenses mutations ──────────────────────────────────────────────────────

  const addExpense = useCallback(async (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    if (!userId) return;
    const { error } = await supabase
      .from("expenses")
      .insert(expenseToDBInsert(
        { type: expense.type, amount: expense.amount, description: expense.description },
        userId
      ));
    if (error) console.error("addExpense:", error.message);
  }, [userId]);

  const deleteExpense = useCallback(async (expId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expId));
    if (!userId) return;
    const { error } = await supabase.from("expenses").delete().eq("id", expId);
    if (error) console.error("deleteExpense:", error.message);
  }, [userId]);

  return {
    bookings,  setBookings,
    trips,     setTrips,
    expenses,
    settings,  setSettings,
    loading,
    ready,
    addBooking, deleteBooking, updateBooking, completeBooking,
    saveTrip,   deleteTrip,
    addExpense, deleteExpense,
    refetch: fetchAll,
  };
}
