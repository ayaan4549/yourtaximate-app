import { Booking, Trip, Expense } from "../types";
import { DBRide } from "./supabase";

// ── Pence ↔ GBP ───────────────────────────────────────────────────────────────
export const penceToGbp = (pence: number) => parseFloat((pence / 100).toFixed(2));
export const gbpToPence = (gbp: number) => Math.round(gbp * 100);

// ── DB Ride → Booking (pending / active rides) ────────────────────────────────
export function dbRideToBooking(ride: DBRide & Record<string, any>): Booking {
  return {
    id: ride.id,
    customerName: ride.customer_name || "Unknown Passenger",
    companyName:  ride.company_name  || "",
    phone:        ride.customer_phone || "",
    countryCode:  "+44",
    pickupAddress:       ride.pickup_address,
    destinationAddress:  ride.dropoff_address,
    dateTime:     ride.created_at,
    distanceMiles: ride.distance_miles,
    fareGbp:      penceToGbp(ride.fare_estimate),
    flightNumber:  ride.flight_number || "",
    meetAndGreet:  ride.extra_meet_greet,
    childSeat:     ride.extra_child_seat,
    returnJourney: ride.return_journey || false,
    status: (ride.status === "requested" || ride.status === "accepted") ? "pending" : "in_progress",
  };
}

// ── DB Ride → Trip (completed rides) ─────────────────────────────────────────
export function dbRideToTrip(ride: DBRide & Record<string, any>): Trip {
  return {
    id: ride.id,
    customerName:       ride.customer_name || "Unknown Passenger",
    pickupAddress:      ride.pickup_address,
    destinationAddress: ride.dropoff_address,
    distanceMiles:      ride.distance_miles,
    fareGbp:            penceToGbp(ride.fare_final ?? ride.fare_estimate),
    paymentMethod:      ride.payment_method || "cash",
    dateTime:           ride.created_at,
    mode:               ride.trip_mode || "Prebook",
  };
}

// ── Booking → DB ride insert payload ─────────────────────────────────────────
export function bookingToDBInsert(
  booking: Omit<Booking, "id">,
  passengerId: string
): Omit<DBRide, "id" | "created_at" | "fare_final" | "driver_id"> & Record<string, any> {
  return {
    passenger_id:     passengerId,
    pickup_address:   booking.pickupAddress,
    dropoff_address:  booking.destinationAddress,
    pickup_lat:       0,
    pickup_lng:       0,
    dropoff_lat:      0,
    dropoff_lng:      0,
    distance_miles:   booking.distanceMiles,
    duration_minutes: Math.ceil(booking.distanceMiles * 2.4 + 4),
    fare_estimate:    gbpToPence(booking.fareGbp),
    status:           "requested" as const,
    extra_child_seat: booking.childSeat,
    extra_meet_greet: booking.meetAndGreet,
    is_night_rate:    false,
    customer_name:    booking.customerName,
    customer_phone:   booking.phone,
    company_name:     booking.companyName,
    flight_number:    booking.flightNumber,
    return_journey:   booking.returnJourney,
    trip_mode:        "Prebook",
  };
}

// ── DB Expense type ───────────────────────────────────────────────────────────
export interface DBExpense {
  id: string;
  driver_id: string;
  type: Expense["type"];
  amount_pence: number;
  description: string | null;
  created_at: string;
}

// ── DB Expense → App Expense ──────────────────────────────────────────────────
export function dbExpenseToExpense(e: DBExpense): Expense {
  return {
    id:          e.id,
    type:        e.type,
    amount:      penceToGbp(e.amount_pence),
    description: e.description || e.type,
    dateTime:    e.created_at,
  };
}

// ── App Expense → DB insert payload ──────────────────────────────────────────
export function expenseToDBInsert(
  expense: Omit<Expense, "id" | "dateTime">,
  driverId: string
): Omit<DBExpense, "id" | "created_at"> {
  return {
    driver_id:    driverId,
    type:         expense.type,
    amount_pence: gbpToPence(expense.amount),
    description:  expense.description,
  };
}
