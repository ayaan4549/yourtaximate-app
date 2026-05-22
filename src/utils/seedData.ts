import { AppSettings, Booking, Trip, Expense } from "../types";

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  country: "UK",
  currency: "GBP",
  notificationsEnabled: true,
  preferredMap: "google",
  profile: {
    fullName: "",
    contactNumber: "+447700900077",
    vehicleMake: "Mercedes-Benz",
    vehicleModel: "E-Class (E300de Premium)",
    vehicleReg: "LR23 XTM",
    vehicleColor: "Obsidian Metallic Black"
  },
  rates: {
    baseFare: 4.50,
    perMileRate: 2.20,
    perMinuteRate: 0.45,
    meetGreetFee: 12.00,
    airportTollCharge: 6.00
  },
  templates: {
    bookingConfirmation: "Hi {name}, thanks for booking with us. Confirmed trip {pickup} ➔ {destination} on {date} at {time}. Fare: {fare}. Ref: {reg}.",
    onMyWay: "Hi {name}, your driver is on the way in their {color} {model} ({reg}). Driver: {driver}. Tracking link: {link}",
    receiptThankYou: "Thank you {name}. Received {fare} ({payment}) for your ride from {pickup}. Digital Invoice: YourTaxiMate Operators.",
  },
  twilio: {
    enabled: false,
    accountSid: "",
    authToken: "",
    phoneNumber: ""
  },
  documents: [
    { id: "doc-dbs", type: "dbs", name: "Enhanced DBS Check / Disclosure Certificate", status: "Verified", expiryDate: "2027-05-18" },
    { id: "doc-pco", type: "pco", name: "TfL PHV Driver Badge / PCO Card", status: "Verified", expiryDate: "2026-11-20" },
    { id: "doc-licence", type: "licence", name: "UK DVLA Driving Licence", status: "Verified", expiryDate: "2029-08-14" },
    { id: "doc-insurance", type: "insurance", name: "Hire & Reward Private Hire Insurance", status: "Verified", expiryDate: "2026-12-15" },
    { id: "doc-mot", type: "mot", name: "MOT Compliance Certificate", status: "Verified", expiryDate: "2027-02-10" }
  ],
  vehicleTypes: [
    { id: "vt-exec", name: "Standard/ Saloon", baseFare: 20.00, perMileRate: 1.85, perMinuteRate: 0.35, enabled: true, icon: "🚗", maxPassengers: 4, maxLuggage: 3, description: "4 passengers - 3 luggage", meetGreetFee: 8.00, airportTollCharge: 7.00 },
    { id: "vt-mpv", name: "MPV / 4 luggage", baseFare: 20.00, perMileRate: 2.20, perMinuteRate: 0.45, enabled: true, icon: "🚙", maxPassengers: 4, maxLuggage: 4, description: "MPV / Estate Car 4 Luggage", meetGreetFee: 8.00, airportTollCharge: 7.00 },
    { id: "vt-minibus", name: "7 passengers - Minibus", baseFare: 20.00, perMileRate: 3.00, perMinuteRate: 0.60, enabled: true, icon: "🚐", maxPassengers: 7, maxLuggage: 7, description: "People carrier or minivan — up to 7 passengers", meetGreetFee: 8.00, airportTollCharge: 7.00 }
  ]
};

export const SEED_BOOKINGS: Booking[] = [
  {
    id: "book-1",
    customerName: "Arthur Pendragon",
    companyName: "Camelot Corp",
    phone: "7700900111",
    countryCode: "+44",
    pickupAddress: "Heathrow Airport Terminal 2 (LHR)",
    destinationAddress: "The Savoy Hotel, Strand, London WC2R 0EZ",
    dateTime: "2026-05-22T09:30",
    distanceMiles: 18.5,
    fareGbp: 65.00,
    flightNumber: "BA114",
    meetAndGreet: true,
    childSeat: false,
    returnJourney: false,
    status: "pending"
  },
  {
    id: "book-2",
    customerName: "Ginevra Weasley",
    companyName: "",
    phone: "7700900222",
    countryCode: "+44",
    pickupAddress: "Gatwick Airport South Terminal (LGW)",
    destinationAddress: "King's Cross Station, Euston Rd, N1 9AL",
    dateTime: "2026-05-24T14:15",
    distanceMiles: 31.2,
    fareGbp: 95.00,
    flightNumber: "VS102",
    meetAndGreet: true,
    childSeat: true,
    returnJourney: false,
    status: "pending"
  },
  {
    id: "book-3",
    customerName: "Oliver Twist",
    companyName: "Workhouse Ltd",
    phone: "7400100234",
    countryCode: "+44",
    pickupAddress: "London City Airport (LCY)",
    destinationAddress: "Hyde Park Corner, London W1J 7NT",
    dateTime: "2026-05-21T21:45",
    distanceMiles: 10.2,
    fareGbp: 38.00,
    flightNumber: "LH902",
    meetAndGreet: false,
    childSeat: false,
    returnJourney: false,
    status: "pending"
  }
];

export const SEED_TRIPS: Trip[] = [
  {
    id: "trip-1",
    customerName: "Harry Potter",
    pickupAddress: "Westminster Abbey, Broad Sanctuary, SW1P 3EE",
    destinationAddress: "Heathrow Airport Terminal 5 (LHR)",
    distanceMiles: 16.5,
    fareGbp: 55.00,
    paymentMethod: "card",
    dateTime: "2026-05-21T10:15",
    mode: "Prebook"
  },
  {
    id: "trip-2",
    customerName: "Hermione Granger",
    pickupAddress: "King's Cross Station, Euston Rd, N1 9AL",
    destinationAddress: "Tower of London, London EC3N 4AB",
    distanceMiles: 4.2,
    fareGbp: 18.20,
    paymentMethod: "cash",
    dateTime: "2026-05-20T15:30",
    mode: "Meter"
  },
  {
    id: "trip-3",
    customerName: "Ron Weasley",
    pickupAddress: "London City Airport (LCY)",
    destinationAddress: "Hyde Park Center, London W12",
    distanceMiles: 10.5,
    fareGbp: 38.00,
    paymentMethod: "card",
    dateTime: "2026-05-18T19:00",
    mode: "Prebook"
  },
  {
    id: "trip-4",
    customerName: "Luna Lovegood",
    pickupAddress: "Buckingham Palace, London SW1A 1AA",
    destinationAddress: "St Pancras International Station, NW1 2QP",
    distanceMiles: 3.5,
    fareGbp: 15.50,
    paymentMethod: "cash",
    dateTime: "2026-05-17T11:20",
    mode: "Meter"
  },
  {
    id: "trip-5",
    customerName: "Neville Longbottom",
    pickupAddress: "Heathrow Airport Terminal 4 (LHR)",
    destinationAddress: "Wembley Stadium, Wembley HA9 0WS",
    distanceMiles: 15.8,
    fareGbp: 52.00,
    paymentMethod: "card",
    dateTime: "2026-05-16T08:30",
    mode: "Prebook"
  }
];

export const SEED_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    type: "Fuel",
    amount: 45.00,
    description: "Shell Super Unleaded - Full tank",
    dateTime: "2026-05-20T17:40"
  },
  {
    id: "exp-2",
    type: "Airport Toll",
    amount: 6.00,
    description: "Heathrow T5 Drop-off charge fee",
    dateTime: "2026-05-21T10:15"
  },
  {
    id: "exp-3",
    type: "Car Wash",
    amount: 12.00,
    description: "In & Out Express Hand Polish",
    dateTime: "2026-05-19T09:00"
  },
  {
    id: "exp-4",
    type: "Insurance",
    amount: 35.00,
    description: "Hire & Reward Weekly Phv Pro-rata",
    dateTime: "2026-05-18T00:01"
  },
  {
    id: "exp-5",
    type: "Maintenance",
    amount: 120.00,
    description: "Front break pads visual replacement at kwikfit",
    dateTime: "2026-05-14T11:30"
  }
];
