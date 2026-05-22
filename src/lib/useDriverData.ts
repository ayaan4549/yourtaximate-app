import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import {
  dbRideToBooking,
  dbRideToTrip,
  bookingToDBInsert,
  dbExpenseToExpense,
  expenseToDBInsert,
  gbpToPence,
  DBExpense,
} from "./adapters";
import { Booking, Trip, Expense } from "../types";
import { SEED_BOOKINGS, SEED_TRIPS, SEED_EXPENSES } from "../utils/seedData";

// ── Main driver data hook — replaces all localStorage/seed data ───────────────
export function useDriverData(driverId: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips]       = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(false);
  const [ready, setReady]       = useState(false);

  // ── Fetch all data from Supabase ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!driverId) {
      // Not authenticated — fall back to seed data for preview
      setBookings(SEED_BOOKINGS);
      setTrips(SEED_TRIPS);
      setExpenses(SEED_EXPENSES);
      setReady(true);
      return;
    }

    setLoading(true);

    const [ridesRes, expensesRes] = await Promise.all([
      supabase
        .from("rides")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false }),
    ]);

    if (ridesRes.data) {
      const allRides = ridesRes.data;
      const activeStatuses = ["requested", "accepted", "en_route"];
      setBookings(
        allRides
          .filter(r => activeStatuses.includes(r.status))
          .map(dbRideToBooking)
      );
      setTrips(
        allRides
          .filter(r => r.status === "completed")
          .map(dbRideToTrip)
      );
    }

    if (expensesRes.data) {
      setExpenses((expensesRes.data as DBExpense[]).map(dbExpenseToExpense));
    }

    setLoading(false);
    setReady(true);
  }, [driverId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Bookings mutations ──────────────────────────────────────────────────────

  const addBooking = useCallback(async (booking: Booking) => {
    setBookings(prev => [booking, ...prev]);

    if (!driverId) return;
    const payload = bookingToDBInsert(
      { ...booking },
      driverId
    );
    payload.driver_id = driverId;
    const { error } = await supabase.from("rides").insert(payload);
    if (error) console.error("addBooking:", error.message);
  }, [driverId]);

  const deleteBooking = useCallback(async (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    if (!driverId) return;
    const { error } = await supabase.from("rides").delete().eq("id", id);
    if (error) console.error("deleteBooking:", error.message);
  }, [driverId]);

  const updateBooking = useCallback(async (updated: Booking) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (!driverId) return;
    const { error } = await supabase
      .from("rides")
      .update({
        customer_name:   updated.customerName,
        customer_phone:  updated.phone,
        company_name:    updated.companyName,
        flight_number:   updated.flightNumber,
        extra_meet_greet: updated.meetAndGreet,
        extra_child_seat: updated.childSeat,
        return_journey:  updated.returnJourney,
        pickup_address:  updated.pickupAddress,
        dropoff_address: updated.destinationAddress,
        distance_miles:  updated.distanceMiles,
        fare_estimate:   gbpToPence(updated.fareGbp),
      })
      .eq("id", updated.id);
    if (error) console.error("updateBooking:", error.message);
  }, [driverId]);

  // Complete booking → moves to trips in DB
  const completeBooking = useCallback(async (bookingId: string, paymentMethod: "cash" | "card") => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    // Optimistic local update
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    const newTrip: Trip = {
      id: "trip-settled-" + Date.now(),
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

    if (!driverId) return;
    const { error } = await supabase
      .from("rides")
      .update({
        status:         "completed",
        fare_final:     gbpToPence(target.fareGbp),
        payment_method: paymentMethod,
      })
      .eq("id", bookingId);
    if (error) console.error("completeBooking:", error.message);
  }, [bookings, driverId]);

  // ── Trips mutations ─────────────────────────────────────────────────────────

  const saveTrip = useCallback(async (trip: Trip) => {
    setTrips(prev => [trip, ...prev]);
    if (!driverId) return;
    const { error } = await supabase.from("rides").insert({
      driver_id:        driverId,
      passenger_id:     driverId, // meter trip — driver is effectively the operator
      pickup_address:   trip.pickupAddress,
      dropoff_address:  trip.destinationAddress,
      pickup_lat:       0,
      pickup_lng:       0,
      dropoff_lat:      0,
      dropoff_lng:      0,
      distance_miles:   trip.distanceMiles,
      duration_minutes: Math.ceil(trip.distanceMiles * 2.4 + 4),
      fare_estimate:    gbpToPence(trip.fareGbp),
      fare_final:       gbpToPence(trip.fareGbp),
      status:           "completed",
      extra_child_seat: false,
      extra_meet_greet: false,
      is_night_rate:    false,
      customer_name:    trip.customerName,
      payment_method:   trip.paymentMethod,
      trip_mode:        trip.mode,
    });
    if (error) console.error("saveTrip:", error.message);
  }, [driverId]);

  const deleteTrip = useCallback(async (tripId: string) => {
    setTrips(prev => prev.filter(t => t.id !== tripId));
    if (!driverId) return;
    const { error } = await supabase.from("rides").delete().eq("id", tripId);
    if (error) console.error("deleteTrip:", error.message);
  }, [driverId]);

  // ── Expenses mutations ──────────────────────────────────────────────────────

  const addExpense = useCallback(async (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    if (!driverId) return;
    const payload = expenseToDBInsert(
      { type: expense.type, amount: expense.amount, description: expense.description },
      driverId
    );
    const { error } = await supabase.from("expenses").insert(payload);
    if (error) console.error("addExpense:", error.message);
  }, [driverId]);

  const deleteExpense = useCallback(async (expId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expId));
    if (!driverId) return;
    const { error } = await supabase.from("expenses").delete().eq("id", expId);
    if (error) console.error("deleteExpense:", error.message);
  }, [driverId]);

  return {
    bookings, setBookings,
    trips, setTrips,
    expenses,
    loading,
    ready,
    addBooking, deleteBooking, updateBooking, completeBooking,
    saveTrip, deleteTrip,
    addExpense, deleteExpense,
    refetch: fetchAll,
  };
}
