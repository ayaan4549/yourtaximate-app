import { Booking, Trip, Expense, AppSettings } from "../types";

// ── bookings table → Booking ──────────────────────────────────────────────────
export function dbBookingToBooking(row: Record<string, any>): Booking {
  return {
    id:                 row.id,
    customerName:       row.customer_name   || "",
    companyName:        row.company_name    || "",
    phone:              row.customer_phone  || "",
    countryCode:        "+44",
    pickupAddress:      row.pickup_address,
    destinationAddress: row.destination_address,
    dateTime:           row.pickup_datetime,
    distanceMiles:      parseFloat(row.distance_miles) || 0,
    fareGbp:            parseFloat(row.estimated_fare) || 0,
    flightNumber:       row.flight_number   || "",
    meetAndGreet:       row.meet_and_greet  || false,
    childSeat:          row.child_seat      || false,
    returnJourney:      false,
    status:             row.status === "in_progress" ? "in_progress" : "pending",
  };
}

// ── Booking → bookings insert payload ────────────────────────────────────────
export function bookingToDBInsert(
  booking: Omit<Booking, "id">,
  driverId: string
): Record<string, any> {
  return {
    driver_id:           driverId,
    customer_name:       booking.customerName,
    customer_phone:      booking.phone,
    company_name:        booking.companyName,
    pickup_address:      booking.pickupAddress,
    destination_address: booking.destinationAddress,
    pickup_datetime:     booking.dateTime,
    distance_miles:      booking.distanceMiles,
    estimated_fare:      booking.fareGbp,
    flight_number:       booking.flightNumber,
    meet_and_greet:      booking.meetAndGreet,
    child_seat:          booking.childSeat,
    status:              "pending",
  };
}

// ── Booking → bookings update payload ────────────────────────────────────────
export function bookingToDBUpdate(booking: Booking): Record<string, any> {
  return {
    customer_name:       booking.customerName,
    customer_phone:      booking.phone,
    company_name:        booking.companyName,
    pickup_address:      booking.pickupAddress,
    destination_address: booking.destinationAddress,
    pickup_datetime:     booking.dateTime,
    distance_miles:      booking.distanceMiles,
    estimated_fare:      booking.fareGbp,
    flight_number:       booking.flightNumber,
    meet_and_greet:      booking.meetAndGreet,
    child_seat:          booking.childSeat,
    updated_at:          new Date().toISOString(),
  };
}

// ── trips table → Trip ────────────────────────────────────────────────────────
export function dbTripToTrip(row: Record<string, any>): Trip {
  return {
    id:                 row.id,
    customerName:       row.customer_name       || "",
    pickupAddress:      row.pickup_address,
    destinationAddress: row.destination_address,
    distanceMiles:      parseFloat(row.distance_miles) || 0,
    fareGbp:            parseFloat(row.fare_amount)    || 0,
    paymentMethod:      row.payment_method      || "cash",
    dateTime:           row.trip_date,
    mode:               row.trip_type === "meter" ? "Meter" : "Prebook",
  };
}

// ── Trip → trips insert payload ───────────────────────────────────────────────
export function tripToDBInsert(
  trip: Trip,
  driverId: string,
  bookingId?: string
): Record<string, any> {
  return {
    driver_id:           driverId,
    booking_id:          bookingId || null,
    trip_type:           trip.mode === "Meter" ? "meter" : "prebook",
    customer_name:       trip.customerName,
    pickup_address:      trip.pickupAddress,
    destination_address: trip.destinationAddress,
    distance_miles:      trip.distanceMiles,
    fare_amount:         trip.fareGbp,
    payment_method:      trip.paymentMethod,
    trip_date:           trip.dateTime,
  };
}

// ── expenses table → Expense ──────────────────────────────────────────────────
export function dbExpenseToExpense(row: Record<string, any>): Expense {
  return {
    id:          row.id,
    type:        row.expense_type as Expense["type"],
    amount:      parseFloat(row.amount) || 0,
    description: row.description || row.expense_type,
    dateTime:    row.expense_date,
  };
}

// ── Expense → expenses insert payload ────────────────────────────────────────
export function expenseToDBInsert(
  expense: Omit<Expense, "id" | "dateTime">,
  driverId: string
): Record<string, any> {
  return {
    driver_id:    driverId,
    expense_type: expense.type,
    amount:       expense.amount,
    description:  expense.description,
    expense_date: new Date().toISOString(),
  };
}

// ── profiles + driver_settings + vehicle_health → AppSettings ────────────────
export function dbRowsToSettings(
  profile: Record<string, any> | null,
  settings: Record<string, any> | null,
  vehicle: Record<string, any> | null,
  current: AppSettings
): AppSettings {
  return {
    ...current,
    profile: {
      fullName:      profile?.full_name     || current.profile.fullName,
      contactNumber: profile?.phone         || current.profile.contactNumber,
      vehicleMake:   vehicle?.vehicle_make  || current.profile.vehicleMake,
      vehicleModel:  vehicle?.vehicle_model || current.profile.vehicleModel,
      vehicleReg:    vehicle?.vehicle_registration || current.profile.vehicleReg,
      vehicleColor:  vehicle?.vehicle_color || current.profile.vehicleColor,
    },
    rates: {
      baseFare:          parseFloat(settings?.base_fare)           || current.rates.baseFare,
      perMileRate:       parseFloat(settings?.per_mile_rate)       || current.rates.perMileRate,
      perMinuteRate:     parseFloat(settings?.per_minute_rate)     || current.rates.perMinuteRate,
      meetGreetFee:      parseFloat(settings?.meet_and_greet_fee)  || current.rates.meetGreetFee,
      airportTollCharge: parseFloat(settings?.airport_toll_charge) || current.rates.airportTollCharge,
    },
  };
}
