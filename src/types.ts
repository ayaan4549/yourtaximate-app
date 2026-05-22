export interface DriverProfileSettings {
  fullName: string;
  contactNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleReg: string;
  vehicleColor: string;
}

export interface FareRates {
  baseFare: number;
  perMileRate: number;
  perMinuteRate: number;
  meetGreetFee: number;
  airportTollCharge: number;
}

export interface SmsTemplates {
  bookingConfirmation: string;
  onMyWay: string;
  receiptThankYou: string;
}

export interface TwilioConfig {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface ComplianceDocument {
  id: string;
  type: string;
  name: string;
  status: "Verified" | "Pending" | "Missing" | "Expired";
  expiryDate: string;
}

export interface VehicleTypeFare {
  id: string;
  name: string;
  baseFare: number;
  perMileRate: number;
  perMinuteRate: number;
  enabled: boolean;
  icon?: string;
  maxPassengers?: number;
  maxLuggage?: number;
  description?: string;
  meetGreetFee?: number;
  airportTollCharge?: number;
}

export interface AppSettings {
  darkMode: boolean;
  country: string;
  currency: string;
  notificationsEnabled: boolean;
  profile: DriverProfileSettings;
  rates: FareRates;
  templates: SmsTemplates;
  twilio?: TwilioConfig;
  documents?: ComplianceDocument[];
  vehicleTypes?: VehicleTypeFare[];
  preferredMap?: "google" | "apple" | "waze";
}

export interface Booking {
  id: string;
  customerName: string;
  companyName: string;
  phone: string;
  countryCode: string;
  pickupAddress: string;
  destinationAddress: string;
  dateTime: string;
  distanceMiles: number;
  fareGbp: number;
  flightNumber: string;
  meetAndGreet: boolean;
  childSeat: boolean;
  returnJourney: boolean;
  status: "pending" | "in_progress";
}

export interface Trip {
  id: string;
  customerName: string;
  pickupAddress: string;
  destinationAddress: string;
  distanceMiles: number;
  fareGbp: number;
  paymentMethod: "cash" | "card";
  dateTime: string;
  mode: "Prebook" | "Meter";
}

export interface Expense {
  id: string;
  type: "Fuel" | "Airport Toll" | "Insurance" | "Maintenance" | "Phone" | "Car Wash" | "Other";
  amount: number;
  description: string;
  dateTime: string;
}

export interface Customer {
  phone: string;
  name: string;
  notes: string;
  bookingCount: number;
  tripCount: number;
  totalSpent: number;
}
