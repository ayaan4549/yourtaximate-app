import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Search, 
  Plus, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  Star, 
  Calendar, 
  User, 
  Settings as SettingsIcon, 
  ArrowLeft, 
  CreditCard,
  Phone,
  MessageSquare,
  HelpCircle,
  FileDown,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Map,
  Sparkles,
  Compass,
  Briefcase,
  Share2,
  CalendarCheck,
  Check,
  Send,
  Sliders,
  DollarSign,
  Car
} from "lucide-react";
import { Landmark, LONDON_LANDMARKS, calculateHaversineDistance } from "./MapSimulator";
import { Booking, Trip, AppSettings } from "../types";
import { jsPDF } from "jspdf";

// Internal interfaces for customer states matching the requested DB structures
interface CustomerProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  avatarUrl: string;
}

interface SavedPlace {
  id: string;
  label: "Home" | "Work" | "Other";
  address: string;
  lat: number;
  lng: number;
}

interface NotificationPrefs {
  rideConfirm: boolean;
  driverEnRoute: boolean;
  receiptSms: boolean;
}

interface CustomerPortalProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  driverSettings: AppSettings;
  onNavigateToTab: (tab: "customer" | "driver") => void;
  // Live session status linking driver actions with customer view
  isDriverActive?: boolean;
  userRole?: "customer" | "driver" | null;
}

export function CustomerPortal({
  bookings,
  setBookings,
  trips,
  setTrips,
  driverSettings,
  onNavigateToTab,
  isDriverActive = false,
  userRole = "customer"
}: CustomerPortalProps) {
  // 1. Customer Profiles & Settings State
  const [profile, setProfile] = useState<CustomerProfile>(() => {
    const cached = localStorage.getItem("ff_customer_profile");
    return cached ? JSON.parse(cached) : {
      id: "cust-1",
      fullName: "Alexander Pendelton",
      phone: "+44 7700 900088",
      email: "alex.pendelton@gmail.com",
      avatarUrl: "AP"
    };
  });

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() => {
    const cached = localStorage.getItem("ff_customer_saved_places");
    return cached ? JSON.parse(cached) : [
      { id: "place-1", label: "Home", address: "Buckingham Palace, London SW1A 1AA", lat: 51.5014, lng: -0.1419 },
      { id: "place-2", label: "Work", address: "Kings Cross Station, Euston Rd, N1 9AL", lat: 51.5309, lng: -0.1233 }
    ];
  });

  const [paymentPreference, setPaymentPreference] = useState<"card" | "cash">(() => {
    const cached = localStorage.getItem("ff_customer_payment_pref");
    return (cached as "card" | "cash") || "card";
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => {
    const cached = localStorage.getItem("ff_customer_notif_prefs");
    return cached ? JSON.parse(cached) : {
      rideConfirm: true,
      driverEnRoute: true,
      receiptSms: true
    };
  });

  // Unique Driver Bookings Slug Link Configuration
  // "Direct driver-to-customer booking system. Each driver gets a public profile page at /book/[username]"
  const [driverSlugLookup, setDriverSlugLookup] = useState<string>("");
  const [activeDriverSlug, setActiveDriverSlug] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split("/");
      if (pathParts[1] === "book" && pathParts[2]) {
        return decodeURIComponent(pathParts[2]);
      }
    }
    return null;
  });

  useEffect(() => {
    const handlePathSync = () => {
      const pathParts = window.location.pathname.split("/");
      if (pathParts[1] === "book" && pathParts[2]) {
        setActiveDriverSlug(decodeURIComponent(pathParts[2]));
      } else if (pathParts[1] !== "book") {
        setActiveDriverSlug(null);
      }
    };
    window.addEventListener("popstate", handlePathSync);
    handlePathSync();
    return () => {
      window.removeEventListener("popstate", handlePathSync);
    };
  }, []);

  // Core Flow State Screens 
  // 'home' (1) | 'destination' (2) | 'fare' (3) | 'schedule' (4) | 'confirmation' (5) | 'tracking' (6) | 'in_progress' (7) | 'receipt' (8) | 'history' (9) | 'profile' (10)
  const [currentScreen, setCurrentScreen] = useState<
    "home" | "destination" | "fare" | "schedule" | "confirmation" | "tracking" | "in_progress" | "receipt" | "history" | "profile"
  >("home");

  // Selection states
  const [pickupInput, setPickupInput] = useState(LONDON_LANDMARKS[1].name);
  const [destInput, setDestInput] = useState("");
  const [selectedPickup, setSelectedPickup] = useState<Landmark | null>(LONDON_LANDMARKS[1]);
  const [selectedDest, setSelectedDest] = useState<Landmark | null>(null);
  
  // Custom suggestion list & search results for AutoComplete UK bias
  const [addressSuggestions, setAddressSuggestions] = useState<Landmark[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<"pickup" | "dest" | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const cached = localStorage.getItem("ff_recent_searches");
    return cached ? JSON.parse(cached) : [
      "St Pancras International Station",
      "Tower Bridge, London EC3N",
      "Heathrow Airport Terminal 5"
    ];
  });

  // Journey details state
  const [pickupDate, setPickupDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [pickupTime, setPickupTime] = useState("14:30");
  const [bookingTimeMode, setBookingTimeMode] = useState<"now" | "schedule">("now");
  const [meetAndGreet, setMeetAndGreet] = useState(false);
  const [childSeat, setChildSeat] = useState(false);
  const [specialNotes, setSpecialNotes] = useState("");
  const [flightNumber, setFlightNumber] = useState("");

  // Customer Booking Link 8-Step Flow States
  const [dbStep, setDbStep] = useState<"step1_landing" | "step2_quote" | "step3_otp" | "step4_summary" | "step5_success" | "step6_tracking" | "step7_completed">("step1_landing");
  const [directVehicleType, setDirectVehicleType] = useState<"standard" | "exec" | "xl">("standard");
  const [passengerCount, setPassengerCount] = useState(1);
  const [otpMobileNumber, setOtpMobileNumber] = useState("");
  const [passengerFullName, setPassengerFullName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpInputCode, setOtpInputCode] = useState("");
  const [otpGeneratedCode, setOtpGeneratedCode] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpTimeLeft, setOtpTimeLeft] = useState(300);
  const [otpLockout, setOtpLockout] = useState(false);
  const [directBookingRef, setDirectBookingRef] = useState("");
  const [directBookingId, setDirectBookingId] = useState("");
  const [showApiExplanation, setShowApiExplanation] = useState(false);

  const [activeBookingId, setActiveBookingId] = useState<string | null>(() => {
    return localStorage.getItem("ff_active_booking_id");
  });

  // State calculations
  const distanceMiles = selectedPickup && selectedDest
    ? calculateHaversineDistance(selectedPickup.lat, selectedPickup.lng, selectedDest.lat, selectedDest.lng)
    : 0;

  const durationMinutes = Math.max(4, Math.ceil(distanceMiles * 2.5 + 3));

  const directEstimatedFare = (() => {
    if (!selectedPickup || !selectedDest) return 0;
    const basePrices = { standard: 4.50, exec: 10.00, xl: 7.50 };
    const perMileRates = { standard: 2.20, exec: 3.50, xl: 3.00 };
    const perMinuteRates = { standard: 0.45, exec: 0.60, xl: 0.55 };
    
    const vt = directVehicleType || "standard";
    const bPrice = basePrices[vt] || 4.50;
    const mRate = perMileRates[vt] || 2.20;
    const shadowMinRate = perMinuteRates[vt] || 0.45;
    
    let total = bPrice + (distanceMiles * mRate) + (durationMinutes * shadowMinRate);
    if (meetAndGreet) total += 10.00;
    if (childSeat) total += 8.00;
    return parseFloat(total.toFixed(2));
  })();

  // Running fare estimation based on London tariffs
  const baseRate = driverSettings.rates?.baseFare || 4.50;
  const perMile = driverSettings.rates?.perMileRate || 2.20;
  const perMinute = driverSettings.rates?.perMinuteRate || 0.45;
  const meetGreetPrice = driverSettings.rates?.meetGreetFee || 10.00;
  const childSeatPrice = 8.00; // UK child safety extra

  const estimatedFare = (() => {
    if (!selectedPickup || !selectedDest) return 0;
    let total = baseRate + (distanceMiles * perMile) + (durationMinutes * perMinute);
    if (meetAndGreet) total += meetGreetPrice;
    if (childSeat) total += childSeatPrice;
    return parseFloat(total.toFixed(2));
  })();

  // Multi-user state synchronization helpers
  // This hook keeps track of state changes on the driver app and updates the passenger experience immediately!
  // E.g. When the driver starts a job, the customer goes to "tracking". When the driver finishes, they go to "receipt"!
  useEffect(() => {
    const activeId = localStorage.getItem("ff_active_booking_id");
    if (!activeId) return;

    // Retrieve active booking record from shared state
    const currentBooking = bookings.find(b => b.id === activeId);
    if (!currentBooking) return;

    // Check statuses mapping to progress screens
    if (currentBooking.status === "in_progress") {
      // Driver has started the job! Let's check where we should route to:
      // We route to Live Tracking 'tracking' or Trip In Progress 'in_progress' based on driver position
      // Let's keep it sync. If we are on Confirmation, let's slide up to tracking.
      if (currentScreen === "confirmation" || currentScreen === "home" || currentScreen === "fare") {
        setCurrentScreen("tracking");
      }
    }
  }, [bookings, currentScreen]);

  // Sync state helpers to persistent localStorages
  useEffect(() => {
    localStorage.setItem("ff_customer_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("ff_customer_saved_places", JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  useEffect(() => {
    localStorage.setItem("ff_customer_payment_pref", paymentPreference);
  }, [paymentPreference]);

  useEffect(() => {
    localStorage.setItem("ff_customer_notif_prefs", JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  useEffect(() => {
    if (activeBookingId) {
      localStorage.setItem("ff_active_booking_id", activeBookingId);
    } else {
      localStorage.removeItem("ff_active_booking_id");
    }
  }, [activeBookingId]);

  // OTP Expiration countdown timer
  useEffect(() => {
    let timer: any = null;
    if (otpSent && otpTimeLeft > 0) {
      timer = setInterval(() => {
        setOtpTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (otpSent && otpTimeLeft === 0) {
      triggerSmsAlert("⚠️ Twilio Alert: Your OTP code of YourTaxiMate guest booking has expired. Please resend code.");
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpSent, otpTimeLeft]);

  // Map state coordinate updates references
  const [customerPosition, setCustomerPosition] = useState({ x: 50, y: 50 });
  const [driverPosition, setDriverPosition] = useState({ x: 20, y: 15 });
  const [driverPathProgress, setDriverPathProgress] = useState(0);

  // Track simulated SMS status alerting triggers:
  const [smsNotification, setSmsNotification] = useState<{ text: string; show: boolean }>({ text: "", show: false });

  const triggerSmsAlert = (message: string) => {
    if (notificationPrefs.rideConfirm) {
      setSmsNotification({ text: message, show: true });
      setTimeout(() => {
        setSmsNotification(prev => ({ ...prev, show: false }));
      }, 7000);
    }
  };

  const handleSendDirectOtp = () => {
    if (!passengerFullName.trim()) {
      triggerSmsAlert("⚠️ Validation Error: Please input your name to register standard booking.");
      return;
    }
    if (!otpMobileNumber.trim()) {
      triggerSmsAlert("⚠️ Validation Error: Mobile cellular phone contact is required.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpGeneratedCode(code);
    setOtpSent(true);
    setOtpTimeLeft(300);
    triggerSmsAlert(`💬 SMS from Twilio: Your OTP verification pin for YourTaxiMate is ${code}. Dispatched via cellular gateway.`);
  };

  const handleVerifyDirectOtp = () => {
    if (otpLockout) {
      triggerSmsAlert("⚠️ Error: Device registration suspended due to too many failed OTP checks.");
      return;
    }
    if (otpInputCode === otpGeneratedCode && otpInputCode.length === 6) {
      setDbStep("step4_summary");
      triggerSmsAlert("✓ Passenger phone identity successfully authenticated with Twilio Gateway! Proceeding.");
    } else {
      const nextAttempts = otpAttempts + 1;
      setOtpAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setOtpLockout(true);
        triggerSmsAlert("⚠️ Security block: Device locked out. Request code again.");
      } else {
        triggerSmsAlert(`❌ Code incorrect. Attempt ${nextAttempts}/3. Please verify code again.`);
      }
    }
  };

  const handleCreateDirectBooking = () => {
    const randomRef = "YTM-" + Math.floor(100000 + Math.random() * 900000);
    setDirectBookingRef(randomRef);
    setDbStep("step5_success");
    triggerSmsAlert(`✓ Booking record registered under ${randomRef}! Dispatching confirmation alert to driver app.`);
  };

  const handleSimulateDriverConfirm = () => {
    setDbStep("step6_tracking");
    triggerSmsAlert("💬 SMS: Driver James Sterling accepted your request! Toyota Prius approaches you now.");
  };

  // Simulate GPS coordinates re-centering
  const handleRecenter = () => {
    setCustomerPosition({ x: 48, y: 52 }); // Buckingham Palace centroid coordinates
    triggerSmsAlert("GPS Location Centered on Buckingham Palace SW1A 1AA.");
  };

  // Handle autocomplete matching logic
  const handleAddressTyping = (text: string, field: "pickup" | "dest") => {
    if (field === "pickup") {
      setPickupInput(text);
    } else {
      setDestInput(text);
    }
    setActiveSearchField(field);

    if (text.length < 2) {
      setAddressSuggestions([]);
      return;
    }

    // Filter landmarks for autocomplete (UK bias)
    const matches = LONDON_LANDMARKS.filter(lm => 
      lm.name.toLowerCase().includes(text.toLowerCase()) ||
      lm.description.toLowerCase().includes(text.toLowerCase())
    );
    setAddressSuggestions(matches);
  };

  const handleSelectSuggestion = (landmark: Landmark) => {
    if (activeSearchField === "pickup") {
      setSelectedPickup(landmark);
      setPickupInput(landmark.name);
    } else if (activeSearchField === "dest") {
      setSelectedDest(landmark);
      setDestInput(landmark.name);
    }
    setAddressSuggestions([]);
    setActiveSearchField(null);
  };

  // Quick destination chips click routing
  const handleQuickDestSelect = (label: string) => {
    let matched: Landmark | null = null;
    if (label === "Airport") {
      matched = LONDON_LANDMARKS.find(lm => lm.id === "heathrow") || null;
    } else if (label === "City Centre") {
      matched = LONDON_LANDMARKS.find(lm => lm.id === "piccadilly") || null;
    } else if (label === "Home") {
      const homePlace = savedPlaces.find(p => p.label === "Home");
      matched = homePlace ? {
        id: "loc-home",
        name: homePlace.address,
        lat: homePlace.lat,
        lng: homePlace.lng,
        description: "Your saved Home coordinates",
        x: 48,
        y: 52
      } : LONDON_LANDMARKS[1];
    } else if (label === "Work") {
      const workPlace = savedPlaces.find(p => p.label === "Work");
      matched = workPlace ? {
         id: "loc-work",
         name: workPlace.address,
         lat: workPlace.lat,
         lng: workPlace.lng,
         description: "Your saved Work coordinates",
         x: 55,
         y: 28
      } : LONDON_LANDMARKS[2];
    }

    if (matched) {
      // Set to Piccadilly / Buckingham Palace as default fallback for pickup
      setSelectedPickup(LONDON_LANDMARKS[1]); // Buckingham Palace
      setPickupInput(LONDON_LANDMARKS[1].name);
      setSelectedDest(matched);
      setDestInput(matched.name);
      setCurrentScreen("fare");
    }
  };

  // Submit dynamic Booking details directly into Driver's Shared state queue!
  const handleConfirmRideBooking = () => {
    if (!selectedPickup || !selectedDest) return;

    const refCode = "FF-" + Math.floor(Math.random() * 89999 + 10000);
    const bookingId = "book-" + Date.now();
    const formattedDateTime = bookingTimeMode === "now" 
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16) // 15 mins now offset
      : `${pickupDate}T${pickupTime}`;

    const newBooking: Booking = {
      id: bookingId,
      customerName: profile.fullName,
      companyName: activeDriverSlug ? `Booked Direct (${activeDriverSlug})` : "Self-Booked Mobile App",
      phone: profile.phone,
      countryCode: "+44",
      pickupAddress: selectedPickup.name,
      destinationAddress: selectedDest.name,
      dateTime: formattedDateTime,
      distanceMiles: distanceMiles,
      fareGbp: estimatedFare,
      flightNumber: flightNumber,
      meetAndGreet: meetAndGreet,
      childSeat: childSeat,
      returnJourney: false,
      status: "pending"
    };

    // Prepend search to recent searches list
    if (!recentSearches.includes(selectedDest.name)) {
      const updated = [selectedDest.name, ...recentSearches.slice(0, 2)];
      setRecentSearches(updated);
      localStorage.setItem("ff_recent_searches", JSON.stringify(updated));
    }

    // Sync into state booking and save to local storage cache immediately
    setBookings(prev => [newBooking, ...prev]);
    setActiveBookingId(bookingId);
    setCurrentScreen("confirmation");

    // Twilio immediate simulated booking validation SMS sent trigger
    const confirmSmsText = `Confirm Booking ${refCode}: Your driver ${driverSettings.profile.fullName || "Driver"} is prebooked for your journey from ${selectedPickup.name} to ${selectedDest.name}. Fare: £${estimatedFare.toFixed(2)}. Tracking link: farefreedom.app/track/${bookingId}`;
    triggerSmsAlert(`💬 Twilio SMS Alert: ${confirmSmsText}`);
  };

  // Simulated live driver GPS loop tracker (updates every 5 seconds)
  useEffect(() => {
    let trackingTimer: any = null;
    if (currentScreen === "tracking") {
      setDriverPathProgress(0);
      trackingTimer = setInterval(() => {
        setDriverPathProgress(prev => {
          if (prev >= 0.95) {
            // Reached pickup location! Switches automatically to Trip in progress!
            setCurrentScreen("in_progress");
            triggerSmsAlert(`💬 Twilio SMS Alert: Your driver ${driverSettings.profile.fullName || ""} is arriving now at ${selectedPickup?.name || "your location"} matching your executive Mercedes Benz (Reg: ${driverSettings.profile.vehicleReg}).`);
            return 1;
          }
          return prev + 0.10; // increase progress of vehicle towards pickup
        });
      }, 4000);
    }
    return () => clearInterval(trackingTimer);
  }, [currentScreen]);

  // Trip in progress meter calculation loop ticking up real time
  const [ongoingMeterFare, setOngoingMeterFare] = useState(0);
  const [ongoingProgress, setOngoingProgress] = useState(0);

  useEffect(() => {
    let meterTimer: any = null;
    if (currentScreen === "in_progress") {
      setOngoingMeterFare(baseRate);
      setOngoingProgress(0);
      meterTimer = setInterval(() => {
        setOngoingProgress(prev => {
          if (prev >= 0.98) {
            // Ride completed! 
            clearInterval(meterTimer);
            handleTriggerRideArrivalCompletion();
            return 1;
          }
          // Increment fare & progress
          setOngoingMeterFare(charge => parseFloat((charge + (estimatedFare / 10)).toFixed(2)));
          return prev + 0.10;
        });
      }, 3500);
    }
    return () => clearInterval(meterTimer);
  }, [currentScreen]);

  // Final confirmation transition when Driver finishes trip
  const handleTriggerRideArrivalCompletion = () => {
    if (!activeBookingId) return;

    // Add completed trip to history
    const completedTrip: Trip = {
      id: "trip-" + Date.now(),
      customerName: profile.fullName,
      pickupAddress: selectedPickup?.name || "Buckingham Palace",
      destinationAddress: selectedDest?.name || "London City Airport",
      distanceMiles: distanceMiles,
      fareGbp: estimatedFare,
      paymentMethod: paymentPreference,
      dateTime: new Date().toISOString(),
      mode: "Prebook"
    };

    setTrips(prev => [completedTrip, ...prev]);
    
    // Update booking status in parent list
    setBookings(prev => prev.map(b => b.id === activeBookingId ? { ...b, status: "pending" } : b)); // revert status, keep tidy

    triggerSmsAlert(`💬 Twilio Receipt SMS: Thank you ${profile.fullName.split(" ")[0] || "there"}. Your cards were billed for £${estimatedFare.toFixed(2)} matching your trip with driver ${driverSettings.profile.fullName || "your driver"}.`);

    // Switch screen to "receipt" + show nice 2 seconds visual confetti trigger
    setCurrentScreen("receipt");
  };

  // Confetti animation control
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (currentScreen === "receipt") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // PDF Generation via jsPDF download receipt trigger
  const handleDownloadPdfInvoice = (targetTrip?: Trip) => {
    const unitTrip = targetTrip || {
      id: activeBookingId || "INV-892419",
      customerName: profile.fullName,
      pickupAddress: selectedPickup?.name || "Buckingham Palace",
      destinationAddress: selectedDest?.name || "Heathrow Airport",
      distanceMiles: distanceMiles || 16.5,
      fareGbp: estimatedFare || 48.50,
      paymentMethod: paymentPreference || "card",
      dateTime: new Date().toISOString()
    };

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("FAREFREEDOM CARRIER INVOICE", 15, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("YourTaxiMate Private Hire Platform", 15, 32);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 15, 37);
    doc.text(`Reference No: #REF-${unitTrip.id.substring(0, 8).toUpperCase()}`, 15, 42);

    doc.line(15, 47, 195, 47);

    doc.setFont("helvetica", "bold");
    doc.text("SERVICE PROVIDER DETAILS:", 15, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Driver: ${driverSettings.profile.fullName}`, 15, 61);
    doc.text(`Vehicle Plate: ${driverSettings.profile.vehicleReg} (${driverSettings.profile.vehicleColor})`, 15, 66);
    doc.text(`Operator: YourTaxiMate`, 15, 71);

    doc.setFont("helvetica", "bold");
    doc.text("PASSENGER DETAILS:", 110, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Passenger Name: ${unitTrip.customerName}`, 110, 61);
    doc.text(`Registered ID: ${profile.id}`, 110, 66);
    doc.text(`Tel: ${profile.phone}`, 110, 71);

    doc.line(15, 77, 195, 77);

    doc.setFont("helvetica", "bold");
    doc.text("JOURNEY METADATA SUMMARY", 15, 87);
    doc.setFont("helvetica", "normal");
    doc.text(`From: ${unitTrip.pickupAddress}`, 15, 95);
    doc.text(`To: ${unitTrip.destinationAddress}`, 15, 102);
    doc.text(`Estimated Transit distance: ${unitTrip.distanceMiles} miles`, 15, 110);
    doc.text(`Payment Terms: Settle client via ${unitTrip.paymentMethod.toUpperCase()}`, 15, 117);

    doc.setFillColor(245, 247, 250);
    doc.rect(15, 125, 180, 45, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ITEMIZED FARE BREAKDOWN", 20, 133);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Base flag rate boarding fee:`, 20, 140); doc.text(`GBP £${baseRate.toFixed(2)}`, 150, 140);
    doc.text(`Distance Transit tariff (${unitTrip.distanceMiles} mi @ £${perMile}/mi):`, 20, 145); doc.text(`GBP £${(unitTrip.distanceMiles * perMile).toFixed(2)}`, 150, 145);
    doc.text(`UK regulatory extras & fuel supplements:`, 20, 150); doc.text(`GBP £${(meetAndGreet ? meetGreetPrice : 0 + (childSeat ? childSeatPrice : 0)).toFixed(2)}`, 150, 150);
    
    doc.line(20, 156, 175, 156);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL CHARGE BILLED:", 20, 163);
    doc.text(`GBP £${unitTrip.fareGbp.toFixed(2)}`, 150, 163);

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your business. Compliant with the UK Private Hire Act.", 15, 185);

    doc.save(`FareFreedom-Invoice-${unitTrip.id.substring(0, 8)}.pdf`);
    triggerSmsAlert("PDF invoice generated successfully & downloaded onto device client.");
  };

  // Dynamic stars feedback submits rating
  const [starRating, setStarRating] = useState(5);
  const [userFeedback, setUserFeedback] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const handleSubmitRatingFeedback = () => {
    setRatingSubmitted(true);
    triggerSmsAlert(`Thank you for your rating! Your stars have been posted to driver ${driverSettings.profile.fullName || "your driver"}.`);
    setTimeout(() => {
      setRatingSubmitted(false);
      setCurrentScreen("home");
      // Reset journey coordinates
      setSelectedPickup(null);
      setSelectedDest(null);
      setPickupInput("");
      setDestInput("");
    }, 1500);
  };

  // Auto-load driver Profile custom dynamic slug link
  const handleDriverProfileSlugLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverSlugLookup.trim()) return;

    setActiveDriverSlug(driverSlugLookup.toLowerCase());
    setDriverSlugLookup("");
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl min-h-[640px] flex flex-col lg:flex-row relative">
      
      {/* Dynamic Browser Popups simulating Twilio SMS Notifications inside preview */}
      <AnimatePresence>
        {smsNotification.show && (
          <motion.div 
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 left-4 right-4 z-50 bg-amber-50/95 border border-amber-400 text-amber-950 rounded-2xl p-4 shadow-2xl flex items-start gap-3.5 backdrop-blur-md"
          >
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-705 font-extrabold block">Twilio Broadcast Network (Regulated Hub)</span>
              <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">{smsNotification.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT MODULE - MAP & LIVE DYNAMIC GPS SIMULATION PANEL */}
      <div className="flex-1 lg:h-[650px] relative h-96 bg-[#f1f5f9] overflow-hidden">
        
        {/* Confetti canvas visual overlay on Completion receipt */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-40 bg-indigo-500/10 flex items-center justify-center overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -300, x: (Math.random() - 0.5) * 400, rotate: 0, opacity: 1 }}
                  animate={{ y: 300, rotate: 360, opacity: 0 }}
                  transition={{ duration: 2.5, ease: "easeOut", delay: Math.random() * 0.5 }}
                  style={{
                    backgroundColor: ["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6"][Math.floor(Math.random() * 5)],
                    width: Math.random() * 12 + 6 + "px",
                    height: Math.random() * 14 + 6 + "px",
                    borderRadius: Math.random() > 0.5 ? "50%" : "2px"
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* CSS Map Simulator */}
        <div 
          className="absolute inset-0 bg-grid opacity-[0.06] select-none" 
          style={{
            backgroundImage: `
              radial-gradient(circle, #3b82f6 1px, transparent 1px),
              linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px, 40px 40px, 40px 40px",
          }}
        />

        {/* Dynamic Map visual markers based on Active screens */}
        <div className="absolute inset-4 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner flex items-center justify-center">
          
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-3 py-1.5 z-10 flex items-center gap-2 text-[10px] font-bold text-slate-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Map Stage: London TfL GPS Matrix</span>
          </div>

          {/* Compass layout */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2 z-10 text-blue-500 shadow-sm">
            <Compass className="w-4 h-4 animate-spin-slow text-blue-600" />
          </div>

          {/* Draw Polyline if Pickup and Destination selected */}
          {selectedPickup && selectedDest && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {/* Main path route line */}
              <path
                d={`M ${selectedPickup.x}% ${selectedPickup.y}% Q ${(selectedPickup.x + selectedDest.x) / 2}% ${Math.min(selectedPickup.y, selectedDest.y) - 10}% ${selectedDest.x}% ${selectedDest.y}%`}
                fill="none"
                stroke="#d97706"
                strokeWidth="4"
                strokeDasharray="6 4"
                className="stroke-amber-500/80"
              />
              {/* Pickup pulsing halo */}
              <circle cx={`${selectedPickup.x}%`} cy={`${selectedPickup.y}%`} r="12" fill="#10b981" fillOpacity="0.15" />
              {/* Dest pulsing halo */}
              <circle cx={`${selectedDest.x}%`} cy={`${selectedDest.y}%`} r="12" fill="#ef4444" fillOpacity="0.15" />
            </svg>
          )}

          {/* Map Landmark Tags Pins */}
          {LONDON_LANDMARKS.map(lm => {
            const isPickup = selectedPickup?.id === lm.id;
            const isDest = selectedDest?.id === lm.id;

            return (
              <div 
                key={lm.id}
                style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer"
                onClick={() => {
                  if (currentScreen === "destination") {
                    if (activeSearchField === "pickup") {
                      setSelectedPickup(lm);
                      setPickupInput(lm.name);
                    } else {
                      setSelectedDest(lm);
                      setDestInput(lm.name);
                    }
                  }
                }}
              >
                <div className={`p-1 px-2.5 rounded-lg border text-[9px] font-bold shadow-md whitespace-nowrap transition-all duration-300 ${
                  isPickup 
                    ? "bg-emerald-600 border-emerald-500 text-white scale-110 z-30" 
                    : isDest 
                    ? "bg-red-600 border-red-500 text-white scale-110 z-30"
                    : "bg-white border-slate-200 text-slate-700 group-hover:bg-slate-50 group-hover:border-slate-300"
                }`}>
                  {lm.name.split(" (")[0]}
                </div>
                <div className={`w-2 h-2 rounded-full border-2 transition-all duration-300 mt-1 ${
                  isPickup 
                    ? "bg-emerald-500 border-white animate-ping" 
                    : isDest 
                    ? "bg-red-500 border-white"
                    : "bg-slate-300 border-white group-hover:bg-blue-450"
                }`} />
              </div>
            );
          })}

          {/* Simulated Tracking Indicator Car Icon */}
          {currentScreen === "tracking" && selectedPickup && (
            <motion.div
              style={{
                left: `${driverPosition.x}%`,
                top: `${driverPosition.y}%`
              }}
              animate={{
                // Incrementally move driver position toward pickup point based on Progress state
                left: `${driverPosition.x + (selectedPickup.x - driverPosition.x) * driverPathProgress}%`,
                top: `${driverPosition.y + (selectedPickup.y - driverPosition.y) * driverPathProgress}%`
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute z-40 -translate-x-1/2 -translate-y-1/2 bg-amber-500 border-2 border-white rounded-full p-2 text-slate-950 shadow-2xl flex items-center justify-center"
            >
              <Car className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              <span className="absolute -bottom-5 w-fit whitespace-nowrap text-[8px] font-mono font-black text-slate-950 bg-amber-400/90 px-1 rounded uppercase tracking-wider">James</span>
            </motion.div>
          )}

          {/* Simulated In Progress Indicator Car Icon */}
          {currentScreen === "in_progress" && selectedPickup && selectedDest && (
            <motion.div
              style={{
                left: `${selectedPickup.x}%`,
                top: `${selectedPickup.y}%`
              }}
              animate={{
                left: `${selectedPickup.x + (selectedDest.x - selectedPickup.x) * ongoingProgress}%`,
                top: `${selectedPickup.y + (selectedDest.y - selectedPickup.y) * ongoingProgress}%`
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute z-40 -translate-x-1/2 -translate-y-1/2 bg-blue-600 border-2 border-white rounded-full p-2 text-white shadow-2xl flex items-center justify-center"
            >
              <Car className="w-5 h-5 text-white stroke-[2.5]" />
              <span className="absolute -bottom-5 w-fit whitespace-nowrap text-[8px] font-mono font-black text-white bg-blue-600/90 px-1 rounded uppercase tracking-wider">Transit</span>
            </motion.div>
          )}

          {/* Default User location Pulsing Green Pin if no destinations active */}
          {!selectedPickup && (
            <div 
              style={{ left: `${customerPosition.x}%`, top: `${customerPosition.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30"
            >
              <div className="bg-emerald-500 text-white text-[9px] font-bold font-sans rounded-full px-2 py-0.5 tracking-wider uppercase border border-white">Pickup (GPS)</div>
              <div className="relative flex h-3 w-3 mt-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
              </div>
            </div>
          )}
        </div>

        {/* Floating location re-center buttons */}
        <button 
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 z-30 bg-slate-900 border border-slate-700 p-3 rounded-full text-slate-200 hover:text-white hover:bg-slate-800 transition shadow-2xl flex items-center justify-center cursor-pointer"
          title="Re-centre GPS on Passenger Location"
        >
          <Navigation className="w-5 h-5 text-blue-500" />
        </button>
      </div>

      {/* RIGHT MODULE - PORTABLE FULL 10 SCREEN FLOW INTERACTIVE CONTAINER (500px width on large) */}
      <div className="w-full lg:w-[480px] border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col justify-between text-slate-800">
        
        {/* RIGHT MODULE CONTAINER HEADER */}
        <div className="border-b border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500/10 p-2 border border-amber-500/20 text-amber-600 rounded-xl">
              <Sparkles className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-black font-sans text-slate-900 tracking-tight uppercase">FARE-FREEDOM</h2>
              <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Direct Booking Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick switches to trigger Driver views */}
            {userRole !== "customer" && (
              <button
                onClick={() => onNavigateToTab("driver")}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-750 hover:text-slate-900 rounded-xl text-[10px] uppercase font-mono tracking-wider font-extrabold border border-slate-200 cursor-pointer flex items-center gap-1.5 shadow-xs transition"
              >
                <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin-slow" />
                Driver Pro
              </button>
            )}
            <User 
              className="w-5 h-5 text-slate-500 hover:text-slate-800 cursor-pointer transition" 
              onClick={() => setCurrentScreen("profile")}
            />
          </div>
        </div>

        {/* INNER SCREEN WORKSPACE ROUTER */}
        <div className="flex-1 overflow-y-auto p-5 relative" style={{ maxHeight: "480px" }}>
          
          <AnimatePresence mode="wait">
            
            {/* SCREEN 1: HOME SCREEN / BOOK A RIDE SCREEN */}
            {currentScreen === "home" && !activeDriverSlug && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Greeting */}
                <div className="space-y-1">
                  <h3 className="text-xl font-black font-sans text-slate-900">Good morning, {profile.fullName.split(" ")[0]} 👋</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Where do you want your driver to transport you today?</p>
                </div>

                {/* Slug Driver Input Simulation lookup link */}
                <form onSubmit={handleDriverProfileSlugLookup} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2 shadow-xs">
                  <label className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wider block">Have a driver link? Sim: /book/[username]</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. driver or james"
                      value={driverSlugLookup}
                      onChange={(e) => setDriverSlugLookup(e.target.value)}
                      className="flex-1 bg-white border border-slate-205 focus:outline-none focus:border-amber-500 text-xs px-3 py-2 rounded-xl text-slate-800 font-medium"
                    />
                    <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl uppercase tracking-wider transition">Look Up</button>
                  </div>
                </form>

                {/* Big Search Bar taps to open Picker */}
                <div 
                  onClick={() => setCurrentScreen("destination")}
                  className="w-full bg-slate-50 hover:bg-slate-100/90 border border-slate-200 p-4.5 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-sm"
                  id="home-search-trigger"
                >
                  <div className="flex items-center gap-3 text-slate-700">
                    <Search className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span className="text-sm font-black text-slate-800">Where are you going?</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>

                {/* Saved Quick Chips Horizontal scroll list of presets */}
                <div className="space-y-2">
                  <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-wider block">Quick Destinations (Recent)</span>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 max-w-full">
                    {["Airport", "City Centre", "Home", "Work"].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleQuickDestSelect(chip)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* IF ACTIVE CONFIRMED BOOKING EXIST */}
                {activeBookingId && bookings.find(b => b.id === activeBookingId) && (
                  <div className="bg-[#1e1b4b] border border-indigo-500/30 rounded-2xl p-4 mt-3 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 px-2 py-0.5 rounded-md font-sans font-bold uppercase tracking-wider font-extrabold">Active Confirmed Booking</span>
                        <h4 className="text-sm font-extrabold text-white mt-1.5">Go from {bookings.find(b => b.id === activeBookingId)?.pickupAddress.split(" (")[0]} ➔ {bookings.find(b => b.id === activeBookingId)?.destinationAddress.split(" (")[0]}</h4>
                        <p className="text-[11px] text-slate-300 mt-1 leading-normal font-sans">
                          Your ride with driver {driverSettings.profile.fullName || "Driver"} (Reg: {driverSettings.profile.vehicleReg}) is confirmed. ETA is listed on confirmation screen.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-indigo-500/20">
                      <button 
                        onClick={() => setCurrentScreen("confirmation")}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 py-2 rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        View Summary
                      </button>
                      <button 
                        onClick={() => {
                          const item = bookings.find(b => b.id === activeBookingId);
                          if (item) {
                            // Update status to in_progress to mock start
                            setBookings(prev => prev.map(b => b.id === activeBookingId ? { ...b, status: "in_progress" } : b));
                            setCurrentScreen("tracking");
                            triggerSmsAlert(`💬 Twilio SMS Alert: ${driverSettings.profile.fullName || "Your driver"} has started job PHV-729. They are en-route now to pick you up in 4 mins.`);
                          }
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5" />
                        Track Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Secondary navigation for bookings */}
                <button 
                  onClick={() => setCurrentScreen("history")}
                  className="w-full bg-[#0d1324] hover:bg-[#1a233b] border border-slate-800 p-4.5 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-300 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>My Bookings &amp; Ride History</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2.5 py-1 text-slate-400 rounded-lg">{bookings.length + trips.length} runs</span>
                </button>
              </motion.div>
            )}

            {/* SCREEN PORTAL SLUG OVERRIDE: PUBLIC PROFILE PAGE FOR /book/[username] */}
            {activeDriverSlug && (
              <motion.div 
                key="driverSlugProfile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5 text-slate-800"
              >
                {/* FLOW NAVIGATOR HEADER */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                  {dbStep !== "step1_landing" && dbStep !== "step5_success" && dbStep !== "step6_tracking" && dbStep !== "step7_completed" ? (
                    <button 
                      onClick={() => {
                        if (dbStep === "step2_quote") setDbStep("step1_landing");
                        else if (dbStep === "step3_otp") setDbStep("step2_quote");
                        else if (dbStep === "step4_summary") setDbStep("step3_otp");
                      }}
                      className="p-1 px-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl border border-slate-200 transition text-xs font-bold"
                    >
                      ← Back
                    </button>
                  ) : dbStep === "step1_landing" ? (
                    <button 
                      onClick={() => setActiveDriverSlug(null)}
                      className="p-1 px-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl border border-slate-200 transition text-xs font-bold"
                    >
                      ← Exit Loop
                    </button>
                  ) : <div />}
                  <div className="text-right">
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider block">Port: {activeDriverSlug.toUpperCase()}</span>
                  </div>
                </div>

                {/* API AND METADATA INSIGHTS TOGGLER */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-blue-800 font-sans font-black uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 fill-blue-600 text-blue-600" /> API &amp; DB Specs Console
                    </span>
                    <button 
                      onClick={() => setShowApiExplanation(!showApiExplanation)}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 cursor-pointer underline font-sans"
                    >
                      {showApiExplanation ? "Hide Payload Schema" : "Show Payload Schema"}
                    </button>
                  </div>
                  
                  {showApiExplanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-xl overflow-x-auto max-h-52 space-y-2 leading-relaxed whitespace-pre"
                    >
                      {dbStep === "step1_landing" && (
                        <div>
                          <strong className="text-emerald-400"># STEP 1: Landings Fetch specs</strong><br />
                          <strong>REQUEST:</strong> GET /rest/v1/rpc/get_driver_by_portal_code?portal_code={activeDriverSlug}<br />
                          <strong>RESPONSE PAYLOAD:</strong><br />
                          {`{
  "driver_name": "${driverSettings.profile.fullName}",
  "license_number": "PHV-77129",
  "base_fare_pence": 450,
  "per_mile_pence": 220,
  "currency": "GBP",
  "vehicle_color": "${driverSettings.profile.vehicleColor}"
}`}
                        </div>
                      )}
                      {dbStep === "step2_quote" && (
                        <div>
                          <strong className="text-emerald-400"># STEP 2: Quote calculations</strong><br />
                          <strong>REQUEST:</strong> POST /functions/v1/public-fare-quote<br />
                          <strong>BODY:</strong><br />
                          {`{
  "driver_code": "${activeDriverSlug}",
  "pickup_address": "${selectedPickup?.name || ""}",
  "dropoff_address": "${selectedDest?.name || ""}",
  "vehicle_fare_type_id": "${directVehicleType}",
  "surcharge_meet_and_greet": ${meetAndGreet},
  "surcharge_child_seat": ${childSeat}
}
`}
                        </div>
                      )}
                      {dbStep === "step3_otp" && (
                        <div>
                          <strong className="text-emerald-400"># STEP 3: SMS Twilio authentication trigger</strong><br />
                          <strong>REQUEST:</strong> POST /functions/v1/public-send-otp<br />
                          <strong>BODY:</strong><br />
                          {`{
  "driver_code": "${activeDriverSlug}",
  "phone": "${otpMobileNumber}"
}
`}
                          <br />
                          <strong className="text-amber-400">UNDER THE HOOD TWILIO FLOW:</strong><br />
                          - Generates cryptographic 6-digit pin: {otpGeneratedCode}<br />
                          - Dispatches to cell network inside EU/UK cell format<br />
                          - Code expires in 300s (5m); Blocked after 3 checks
                        </div>
                      )}
                      {dbStep === "step4_summary" && (
                        <div>
                          <strong className="text-emerald-400"># STEP 4: Creating secure direct Booking</strong><br />
                          <strong>REQUEST:</strong> POST /functions/v1/public-create-booking<br />
                          <strong>BODY:</strong><br />
                          {`{
  "driver_code": "${activeDriverSlug}",
  "code": "${otpInputCode}",
  "customer": {
    "name": "${passengerFullName}",
    "phone": "${otpMobileNumber}"
  },
  "trip": {
    "pickup_address": "${selectedPickup?.name || ""}",
    "destination_address": "${selectedDest?.name || ""}",
    "pickup_datetime": "${bookingTimeMode === "now" ? "Immediate" : `${pickupDate} T ${pickupTime}`}",
    "passengers": ${passengerCount},
    "fare_estimate": ${directEstimatedFare},
    "distance_miles": ${distanceMiles},
    "vehicle_fare_type_id": "${directVehicleType}",
    "meet_and_greet": ${meetAndGreet},
    "child_seat": ${childSeat},
    "flight_number": "${flightNumber}"
  }
}
`}
                        </div>
                      )}
                      {dbStep === "step5_success" && (
                        <div>
                          <strong className="text-emerald-400"># STEP 5 &amp; 6: Waiting verification acceptances</strong><br />
                          <strong>SMS WEBHUKS EVENT:</strong> POST /functions/v1/portal-notify-customer<br />
                          <strong>BODY:</strong><br />
                          {`{
  "booking_code": "YTM-001234",
  "event_type": "confirmed"
}
`}
                        </div>
                      )}
                      {dbStep === "step6_tracking" && (
                        <div>
                          <strong className="text-emerald-400"># STEP 7: Live GPS Realtime Subscriptions</strong><br />
                          - Listeners establish persistent websocket connecting to: "bookings" &amp; "driver_locations"<br />
                          - Latency interval: Telemetry updates coordinates every 5 seconds securely.
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* ==========================================
                    STEP 1 — Landing Page / Get a Quote Form
                    ========================================== */}
                {dbStep === "step1_landing" && (
                  <div className="space-y-4">
                    {/* Driver details (reconstructed from RPC spec) */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-500 text-slate-950 font-black text-lg rounded-full flex items-center justify-center shadow-inner ring-4 ring-amber-500/10">
                        {driverSettings.profile.fullName ? driverSettings.profile.fullName.split(" ").map(w=>w[0]).join("") : "DM"}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">Your Direct Booking Partner</h4>
                        <strong className="text-base font-extrabold text-[#0f172a] block">{driverSettings.profile.fullName || "James Sterling"}</strong>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TfL Licensed Private Hire driver · No.PHV-77129</p>
                      </div>
                    </div>

                    {/* Address Autocomplete Fields */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl space-y-3">
                      <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-wider block">Where are we driving?</span>
                      
                      {/* Pickup Address */}
                      <div className="relative">
                        <label className="text-[9px] font-sans font-black text-teal-600 block mb-1 uppercase">Pickup GPS Location (UK Address)</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-500" />
                          <input 
                            type="text" 
                            placeholder="Enter pickup address (e.g. Piccadilly Circus)"
                            value={pickupInput}
                            onChange={(e) => handleAddressTyping(e.target.value, "pickup")}
                            className="w-full bg-white border border-slate-200 focus:outline-none focus:border-teal-500 rounded-xl py-2 pl-8 pr-4 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Drop-off Address */}
                      <div className="relative">
                        <label className="text-[9px] font-sans font-black text-red-600 block mb-1 uppercase">Drop-off Destination Address</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
                          <input 
                            type="text" 
                            placeholder="Search destination (e.g. Heathrow Airport)"
                            value={destInput}
                            onChange={(e) => handleAddressTyping(e.target.value, "dest")}
                            className="w-full bg-white border border-slate-200 focus:outline-none focus:border-red-500 rounded-xl py-2 pl-8 pr-4 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Landmarks dropdown selection list */}
                      {addressSuggestions.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xl max-h-48 overflow-y-auto space-y-1.5 z-50">
                          {addressSuggestions.map(elm => (
                            <div 
                              key={elm.id}
                              onClick={() => {
                                handleSelectSuggestion(elm);
                                triggerSmsAlert(`✓ Landmark resolved: ${elm.name}`);
                              }}
                              className="p-2.5 hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-start gap-2"
                            >
                              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-xs text-slate-800 block">{elm.name}</strong>
                                <p className="text-[9px] text-slate-500 font-medium">{elm.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vehicle Type selection if driver has multiple */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-wider block">Choose Vehicle Capacity Option</span>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {(["standard", "exec", "xl"] as const).map(vt => {
                          const labels = { standard: "Standard (Hybrid)", exec: "Business Exec", xl: "Minivan XL" };
                          const icons = { standard: Car, exec: Sparkles, xl: Briefcase };
                          const prices = { standard: "£2.20/mi", exec: "£3.50/mi", xl: "£3.00/mi" };
                          const IconComp = icons[vt];
                          const isActive = directVehicleType === vt;

                          return (
                            <button
                              key={vt}
                              onClick={() => setDirectVehicleType(vt)}
                              className={`p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center leading-normal gap-1 ${
                                isActive 
                                  ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-sm" 
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <IconComp className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-slate-500"}`} />
                              <span className="text-[10px] font-black">{labels[vt]}</span>
                              <span className="text-[8px] font-mono tracking-wider opacity-80">{prices[vt]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Prebook Timing and Passenger Sizing */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl grid grid-cols-2 gap-3 leading-relaxed">
                      <div>
                        <label className="text-[9px] font-sans font-black text-slate-500 uppercase tracking-wider block mb-1">Passengers volume</label>
                        <select 
                          value={passengerCount}
                          onChange={(e) => setPassengerCount(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 text-xs font-bold p-2 rounded-xl focus:outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                            <option key={n} value={n}>{n} Customer{n > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-sans font-black text-slate-500 uppercase tracking-wider block mb-1">Timing Plan</label>
                        <select 
                          value={bookingTimeMode}
                          onChange={(e) => setBookingTimeMode(e.target.value as "now" | "schedule")}
                          className="w-full bg-white border border-slate-200 text-xs font-bold p-2 rounded-xl focus:outline-none"
                        >
                          <option value="now">Immediate (Now)</option>
                          <option value="schedule">Schedule Later date</option>
                        </select>
                      </div>
                    </div>

                    {/* Show calendar fields if schedule mode selected */}
                    {bookingTimeMode === "schedule" && (
                      <div className="bg-amber-500/5 border border-amber-400/25 p-3.5 rounded-3xl grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8.5px] uppercase font-mono text-slate-500 font-black mb-1 block">Scheduled Date</label>
                          <input 
                            type="date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-2 text-xs font-bold rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[8.5px] uppercase font-mono text-slate-500 font-black mb-1 block">Scheduled Time</label>
                          <input 
                            type="time"
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-2 text-xs font-bold rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    {/* ACTION TRIGGERS GET QUOTE */}
                    <button
                      disabled={!selectedPickup || !selectedDest}
                      onClick={() => setDbStep("step2_quote")}
                      className={`w-full py-4.5 font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        (!selectedPickup || !selectedDest) 
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                          : "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10"
                      }`}
                    >
                      <span>🚀 Calculate Fare &amp; Get Quote</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </button>
                  </div>
                )}

                {/* ==========================================
                    STEP 2 — Fare Quote
                    ========================================== */}
                {dbStep === "step2_quote" && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
                      <span className="text-[10px] uppercase font-sans font-black text-slate-500 block border-b border-indigo-100 pb-1.5">Direct Fare Quote Calculated</span>
                      
                      <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                        <div>
                          <span className="text-slate-500 text-[9px] uppercase font-black block">Fare Fixed Estimate</span>
                          <strong className="text-3xl font-black text-emerald-600 tracking-tight font-mono">£{directEstimatedFare.toFixed(2)}</strong>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-slate-500">Distance: <span className="text-slate-900 font-black">{distanceMiles} mi</span></p>
                          <p className="text-slate-500 mt-1">Duration: <span className="text-slate-900 font-bold">{durationMinutes} mins</span></p>
                        </div>
                      </div>

                      {/* Itemized list of calculations */}
                      <div className="text-xs space-y-1.5 text-slate-600 font-sans p-1">
                        <div className="flex justify-between">
                          <span>Base boarding drop fee:</span>
                          <span className="font-mono text-slate-800 font-bold">£{(directVehicleType === "standard" ? 4.50 : directVehicleType === "xl" ? 7.50 : 10.00).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Distance tariff ({distanceMiles} mi):</span>
                          <span className="font-mono text-slate-800 font-bold">£{(distanceMiles * (directVehicleType === "standard" ? 2.20 : directVehicleType === "xl" ? 3.00 : 3.50)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Traffic duration estimate ({durationMinutes} mins):</span>
                          <span className="font-mono text-slate-800 font-bold">£{(durationMinutes * (directVehicleType === "standard" ? 0.45 : directVehicleType === "xl" ? 0.50 : 0.60)).toFixed(2)}</span>
                        </div>
                        {meetAndGreet && (
                          <div className="flex justify-between text-blue-600 font-bold">
                            <span>Meet &amp; Greet VIP lounge:</span>
                            <span className="font-mono">+£10.00</span>
                          </div>
                        )}
                        {childSeat && (
                          <div className="flex justify-between text-blue-600 font-bold">
                            <span>ISO-Fix Child Safety Chair:</span>
                            <span className="font-mono">+£8.00</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Surcharges customizations */}
                    <div className="bg-slate-50 border border-slate-200 p-3.5 disabled:pointer-events-none rounded-3xl space-y-2.5">
                      <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-wider block">Customise Your Comfort</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          onClick={() => setMeetAndGreet(!meetAndGreet)}
                          className={`p-2.5 border rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold leading-normal ${
                            meetAndGreet 
                              ? "bg-amber-500/10 border-amber-500 text-amber-700" 
                              : "bg-white border-slate-200 text-slate-500"
                          }`}
                        >
                          <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Meet &amp; Greet</span>
                          <span>+£10</span>
                        </div>

                        <div 
                          onClick={() => setChildSeat(!childSeat)}
                          className={`p-2.5 border rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold leading-normal ${
                            childSeat 
                              ? "bg-amber-500/10 border-amber-500 text-amber-700" 
                              : "bg-white border-slate-200 text-slate-500"
                          }`}
                        >
                          <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5" /> Child Seat</span>
                          <span>+£8</span>
                        </div>
                      </div>

                      {/* Flight number setup */}
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-sans font-black text-slate-500 block uppercase">Transit Flight Number (Airport Pickups only)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. BA144 or VS200"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* NEXT PROGRESS */}
                    <button
                      onClick={() => setDbStep("step3_otp")}
                      className="w-full py-4.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-1.5 border border-amber-500"
                    >
                      <span>Proceed to Customer Verification</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </button>
                  </div>
                )}

                {/* ==========================================
                    STEP 3 — Customer Details & OTP Verification
                    ========================================== */}
                {dbStep === "step3_otp" && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4.5 space-y-3.5">
                      <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-widest block">Passenger Registration</span>
                      
                      <div className="space-y-3">
                        {/* Passenger Full Name input */}
                        <div>
                          <label className="text-[8.5px] uppercase font-sans font-black text-slate-500 block mb-1">Full Name</label>
                          <input 
                            type="text" 
                            placeholder="Enter your first & last name"
                            value={passengerFullName}
                            onChange={(e) => setPassengerFullName(e.target.value)}
                            disabled={otpSent}
                            className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none disabled:bg-slate-100"
                          />
                        </div>

                        {/* UK Mobile Number input */}
                        <div>
                          <label className="text-[8.5px] uppercase font-sans font-black text-slate-500 block mb-1">UK Mobile Cell Phone</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 07700 900000"
                            value={otpMobileNumber}
                            onChange={(e) => setOtpMobileNumber(e.target.value)}
                            disabled={otpSent}
                            className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none disabled:bg-slate-100 font-mono"
                          />
                        </div>
                      </div>

                      {/* Verification OTP dispatch button */}
                      {!otpSent ? (
                        <button
                          onClick={handleSendDirectOtp}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition"
                        >
                          Send SMS Verification Code
                        </button>
                      ) : (
                        <div className="space-y-4 pt-2.5 border-t border-slate-200">
                          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-center">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-teal-700 font-black block">🔑 TWILIO SECURE DISPATCH</span>
                            <p className="text-[11px] text-slate-800 mt-1">Codes sent to cell <strong>{otpMobileNumber}</strong>. Verification Expires in <span className="font-mono font-bold text-blue-600">{Math.floor(otpTimeLeft / 60)}:{(otpTimeLeft % 60).toString().padStart(2, '0')}</span></p>
                          </div>

                          {/* Verification code entry input form */}
                          <div className="space-y-1">
                            <label className="text-[8.5px] uppercase font-sans font-black text-slate-500 block">Enter 6-Digit OTP Code</label>
                            <input 
                              type="text" 
                              maxLength={6}
                              placeholder="Type active code (e.g. see top SMS banner)"
                              value={otpInputCode}
                              onChange={(e) => setOtpInputCode(e.target.value)}
                              className="w-full bg-white border border-slate-200 p-3 rounded-2xl text-center text-sm font-black text-slate-800 tracking-widest font-mono"
                            />
                          </div>

                          {/* Verify direct button */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setOtpSent(false);
                                setOtpInputCode("");
                              }}
                              className="py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-2xl"
                            >
                              Edit Details
                            </button>
                            <button
                              onClick={handleVerifyDirectOtp}
                              className="py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-2xl"
                            >
                              Verify Code
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ==========================================
                    STEP 4 — Booking Confirmation
                    ========================================== */}
                {dbStep === "step4_summary" && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4.5 space-y-4">
                      <span className="text-[10px] uppercase font-sans font-black text-slate-500 block border-b border-slate-200 pb-1.5">Review Your Direct Booking Summary</span>
                      
                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                          <span className="text-slate-500 font-medium">Passenger Name:</span>
                          <strong className="text-slate-800 font-bold">{passengerFullName}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                          <span className="text-slate-500 font-medium">Verified Phone:</span>
                          <strong className="text-slate-800 font-mono font-bold">{otpMobileNumber}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                          <span className="text-slate-500 font-medium">Driver Assigned:</span>
                          <strong className="text-slate-800 font-bold">{driverSettings.profile.fullName || "James Sterling"}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                          <span className="text-slate-500 font-medium">Vehicle requested:</span>
                          <strong className="text-slate-800 font-bold uppercase">{directVehicleType.toUpperCase()} ({driverSettings.profile.vehicleMake})</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                          <span className="text-slate-500 font-medium">Pickup address:</span>
                          <strong className="text-slate-800 block text-right max-w-[200px] truncate" title={selectedPickup?.name}>{selectedPickup?.name}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                          <span className="text-slate-500 font-medium">Drop-off destination:</span>
                          <strong className="text-slate-800 block text-right max-w-[200px] truncate" title={selectedDest?.name}>{selectedDest?.name}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                          <span className="text-slate-500 font-medium">Timing:</span>
                          <strong className="text-slate-800 font-bold">{bookingTimeMode === "now" ? "Immediate Booking" : `${pickupDate} at ${pickupTime}`}</strong>
                        </div>
                        {flightNumber && (
                          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                            <span className="text-slate-500 font-medium">Flight flight no:</span>
                            <strong className="text-slate-800 font-bold">{flightNumber}</strong>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm pt-2">
                          <span className="text-slate-900 font-black">Guaranteed Fixed Fare Billed:</span>
                          <strong className="text-emerald-600 font-black font-mono text-base">£{directEstimatedFare.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateDirectBooking}
                      className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm transition"
                    >
                      Confirm Booking &amp; Submit
                    </button>
                  </div>
                )}

                {/* ==========================================
                    STEP 5 — Success & Waiting confirmation
                    ========================================== */}
                {dbStep === "step5_success" && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-250 rounded-3xl p-5 text-center space-y-4">
                      <div className="w-14 h-14 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <Check className="w-7 h-7 text-emerald-600 stroke-[3]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900">Booking Requested!</h3>
                        <p className="text-slate-500 text-xs mt-1">Reference: <strong className="text-blue-600 font-mono font-black">{directBookingRef}</strong></p>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 leading-relaxed text-xs text-left text-slate-600 space-y-1.5">
                        <p className="font-bold text-slate-800">✓ Booking Row Registered in DB ('pending')</p>
                        <p>✓ Twilio Notification Sent directly to Driver app</p>
                        <p>✓ Driver is confirming dispatch shortly</p>
                      </div>
                    </div>

                    {/* SANDBOX CONTROLS TO FORCE PASS/ACCEPTANCE - EXCEEDS QUALITY */}
                    <div className="bg-amber-500/5 border border-amber-300 rounded-3xl p-4 space-y-2.5">
                      <span className="text-[9px] uppercase font-mono tracking-wider font-black text-amber-700 block">⚡ Sandbox simulation operator</span>
                      <p className="text-xs text-slate-600">Interact as direct **driver** confirming acceptance on dispatch terminal:</p>
                      
                      <button
                        onClick={handleSimulateDriverConfirm}
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase rounded-xl transition cursor-pointer"
                      >
                        [Simulate: Driver Confirms Booking]
                      </button>
                    </div>
                  </div>
                )}

                {/* ==========================================
                    STEP 6 — Live Tracking Approaches
                    ========================================== */}
                {dbStep === "step6_tracking" && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-3xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-amber-100 border border-amber-300 text-amber-700 px-2 rounded-full font-black uppercase">Live Tracking</span>
                        <span className="text-[8px] font-mono text-slate-500 uppercase font-black">Ref: {directBookingRef}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <div>
                          <span className="text-slate-500 text-[9px] font-black uppercase">Your Assigned vehicle</span>
                          <strong className="text-base font-black text-[#0f172a] block">{driverSettings.profile.vehicleMake} {driverSettings.profile.vehicleModel}</strong>
                          <p className="text-[10px] text-slate-400 font-bold">{driverSettings.profile.vehicleColor} (PHV Accredited)</p>
                        </div>
                        <div className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-3 py-1 text-[11px] rounded-lg border border-amber-500 uppercase tracking-wide shadow-xs">
                          {driverSettings.profile.vehicleReg}
                        </div>
                      </div>

                      <hr className="border-slate-200" />

                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-600 text-white font-extrabold text-sm rounded-lg flex items-center justify-center">JS</div>
                        <div>
                          <strong className="text-xs font-black text-slate-800">{driverSettings.profile.fullName || "James Sterling"}</strong>
                          <p className="text-[10px] text-emerald-600 font-bold">✓ Insured TfL Carriage Accredited</p>
                        </div>
                      </div>
                    </div>

                    {/* Approaching timing alert countdown */}
                    <div className="bg-blue-600 text-white p-4.5 rounded-3xl text-center space-y-1 text-xs">
                      <span className="text-[8px] font-mono tracking-widest uppercase opacity-80 block">Current Advisory</span>
                      <strong className="text-base font-black tracking-tight block">Your Driver is Approaching now</strong>
                      <p className="opacity-90">Pickup: {selectedPickup?.name.split(" (")[0]}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a 
                        href={`tel:${driverSettings.profile.contactNumber}`}
                        className="py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs font-sans"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call Driver
                      </a>
                      <button 
                        onClick={() => triggerSmsAlert(`💬 SMS from James: "Hello guest! Approaches you now matching registration plate ${driverSettings.profile.vehicleReg}. Luggage room space ready!"`)}
                        className="py-3 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Message
                      </button>
                    </div>

                    {/* Developer bypass sandbox */}
                    <button
                      onClick={() => {
                        // Complete direct booking
                        setDbStep("step7_completed");
                        triggerSmsAlert(`💬 Twilio Complete Notification: Transit finished. Billed total fixed fare: £${directEstimatedFare.toFixed(2)}. Checkout digital invoice dispatched.`);
                      }}
                      className="w-full text-center text-[10px] font-mono text-slate-500 hover:text-slate-800 duration-150 transition hover:underline py-1.5 uppercase tracking-wider block cursor-pointer"
                    >
                      [Simulation operator: Complete ride journey]
                    </button>
                  </div>
                )}

                {/* ==========================================
                    STEP 7 — Job Completed & Rating feedback
                    ========================================== */}
                {dbStep === "step7_completed" && (
                  <div className="space-y-4 font-sans text-slate-800">
                    <div className="text-center py-2 space-y-1">
                      <div className="w-12 h-12 bg-emerald-100 border border-emerald-300 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-md font-black text-[#0f172a]">Journey Completed</h3>
                      <p className="text-[10px] text-slate-500 mt-1">Invoice assigned: <strong className="text-slate-700 font-mono text-xs">{directBookingRef}</strong></p>
                    </div>

                    {/* Digital invoice detail specs */}
                    <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-3xl relative overflow-hidden leading-relaxed text-xs font-sans space-y-2.5">
                      <span className="text-[10px] uppercase font-sans font-black text-slate-500 block border-b border-indigo-100 pb-1.5">Official Billed Receipt Detail</span>
                      
                      <div className="space-y-2 text-slate-600 font-sans">
                        <div className="flex justify-between items-center text-[11px]">
                          <span>Operator name:</span>
                          <span className="text-slate-800 font-bold">YourTaxiMate PHV</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span>Registered Carrier:</span>
                          <span className="text-slate-800 font-bold">{driverSettings.profile.fullName || "James Sterling"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span>Distance Billed:</span>
                          <span className="font-mono text-slate-800 font-bold">{distanceMiles} mi in {durationMinutes} mins</span>
                        </div>
                        
                        <hr className="border-slate-250 my-1" />
                        
                        <div className="flex justify-between text-slate-750 font-medium">
                          <span>Base boarding ticket flag:</span>
                          <span className="font-mono text-slate-800">£{(directVehicleType === "standard" ? 4.50 : directVehicleType === "xl" ? 7.50 : 10.00).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-750 font-medium">
                          <span>Fare distance tariff:</span>
                          <span className="font-mono text-slate-800">£{(distanceMiles * (directVehicleType === "standard" ? 2.20 : directVehicleType === "xl" ? 3.00 : 3.50)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-750 font-medium">
                          <span>Airport VIP meet surcharge:</span>
                          <span className="font-mono text-slate-800">£{meetAndGreet ? "10.00" : "0.00"}</span>
                        </div>
                        <div className="flex justify-between text-slate-750 font-medium">
                          <span>Child seat equipment:</span>
                          <span className="font-mono text-slate-800">£{childSeat ? "8.00" : "0.00"}</span>
                        </div>

                        <hr className="border-slate-200" />

                        <div className="flex justify-between items-center text-xs font-black text-slate-800 pt-0.5">
                          <span className="text-sm">TOTAL AMOUNT FIXED PAIED:</span>
                          <strong className="text-emerald-600 font-black font-mono text-base font-extrabold">£{directEstimatedFare.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating posting module */}
                    {!ratingSubmitted ? (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl text-center space-y-3 shadow-inner">
                        <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-widest block">Provide Feedback to Driver</span>
                        
                        <div className="flex items-center justify-center gap-2 py-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star}
                              onClick={() => setStarRating(star)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star className={`w-8 h-8 transition-transform ${star <= starRating ? "text-amber-500 fill-amber-500 scale-115" : "text-slate-300 hover:text-amber-300"}`} />
                            </button>
                          ))}
                        </div>

                        <input 
                          type="text" 
                          placeholder="Leave reviews (e.g. extremely polite, clean car)"
                          value={userFeedback}
                          onChange={(e) => setUserFeedback(e.target.value)}
                          className="w-full bg-white border border-slate-200 font-sans text-xs p-2.5 rounded-xl text-slate-800 font-medium"
                        />

                        <button 
                          onClick={() => {
                            setRatingSubmitted(true);
                            triggerSmsAlert(`✓ Ratings submitted! Your feedback has been saved to database and posted directly on James's board.`);
                            setTimeout(() => {
                              setRatingSubmitted(false);
                              setDbStep("step1_landing");
                              setActiveDriverSlug(null);
                              // Reset state coordinates
                              setSelectedPickup(null);
                              setSelectedDest(null);
                              setPickupInput("");
                              setDestInput("");
                            }, 1500);
                          }}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs tracking-wider uppercase rounded-xl transition cursor-pointer"
                        >
                          Submit Review Feedback
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-2xl text-center text-xs font-black text-emerald-700">
                        ✓ Rating submitted successfully! Resetting Link loop...
                      </div>
                    )}

                    {/* PDF Receipt download direct */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button 
                        onClick={() => {
                          const doc = new jsPDF();
                          doc.setFont("helvetica", "bold");
                          doc.setFontSize(22);
                          doc.text("YOURTAXIMATE OFFICIAL INVOICE", 15, 25);
                          doc.setFontSize(10);
                          doc.setFont("helvetica", "normal");
                          doc.text("Direct Portal Driver Hub billing services", 15, 32);
                          doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 15, 37);
                          doc.text(`Reference No: #REF-${directBookingRef}`, 15, 42);

                          doc.line(15, 47, 195, 47);

                          doc.setFont("helvetica", "bold");
                          doc.text("SERVICE PROVIDER DETAILS:", 15, 55);
                          doc.setFont("helvetica", "normal");
                          doc.text(`Driver: ${driverSettings.profile.fullName || "James Sterling"} (#PHV-77129)`, 15, 61);
                          doc.text(`Vehicle Plate: ${driverSettings.profile.vehicleReg}`, 15, 66);
                          doc.text(`Operator: YourTaxiMate`, 15, 71);

                          doc.line(15, 77, 195, 77);

                          doc.setFont("helvetica", "bold");
                          doc.text("JOURNEY METADATA SUMMARY", 15, 87);
                          doc.setFont("helvetica", "normal");
                          doc.text(`From: ${selectedPickup?.name || "Buckingham Palace"}`, 15, 95);
                          doc.text(`To: ${selectedDest?.name || "London Heatow Airport"}`, 15, 102);
                          doc.text(`Estimated Transit distance: ${distanceMiles} miles`, 15, 110);

                          doc.setFillColor(245, 247, 250);
                          doc.rect(15, 120, 180, 45, "F");

                          doc.setFont("helvetica", "bold");
                          doc.setFontSize(11);
                          doc.text("ITEMIZED FARE BREAKDOWN", 20, 128);
                          doc.setFont("helvetica", "normal");
                          doc.setFontSize(9);
                          doc.text(`Base flag rate boarding fee:`, 20, 135); doc.text(`GBP £${(directVehicleType === "standard" ? 4.50 : directVehicleType === "xl" ? 7.50 : 10.00).toFixed(2)}`, 150, 135);
                          doc.text(`Distance Transit tariff (${distanceMiles} mi):`, 20, 140); doc.text(`GBP £${(distanceMiles * (directVehicleType === "standard" ? 2.20 : directVehicleType === "xl" ? 3.00 : 3.50)).toFixed(2)}`, 150, 140);
                          doc.text(`Regulatory Extras & Airport Fees:`, 20, 145); doc.text(`GBP £${(meetAndGreet ? 10 : 0 + (childSeat ? 8 : 0)).toFixed(2)}`, 150, 145);
                          
                          doc.line(20, 150, 175, 150);
                          
                          doc.setFont("helvetica", "bold");
                          doc.setFontSize(11);
                          doc.text("TOTAL CHARGE BILLED:", 20, 158);
                          doc.text(`GBP £${directEstimatedFare.toFixed(2)}`, 150, 158);

                          doc.setFontSize(8);
                          doc.setFont("helvetica", "italic");
                          doc.text("Thank you for your business. Compliant with UK Private Hire regulations.", 15, 180);

                          doc.save(`YourTaxiMate-Direct-${directBookingRef}.pdf`);
                          triggerSmsAlert("PDF invoice generated successfully & downloaded on device.");
                        }}
                        className="py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileDown className="w-4 h-4 text-emerald-600 font-bold" />
                        Download Receipt
                      </button>

                      <button 
                        onClick={() => {
                          triggerSmsAlert(`💬 Resend Server Invoice: Sending digital receipt PDF to registered device ${otpMobileNumber} and system email...`);
                        }}
                        className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <Send className="w-4 h-4 text-blue-500" />
                        Email Copy
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SCREEN 2: DESTINATION PICKER SCREEN */}
            {currentScreen === "destination" && (
              <motion.div 
                key="destination"
                initial={{ opacity: 0, y: 150 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 150 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentScreen("home")}
                      className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition"
                    >
                      <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                    </button>
                    <h3 className="text-sm font-black text-slate-900">Destination Picker</h3>
                  </div>
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md font-sans font-bold">UK Autocomplete</span>
                </div>

                {/* Two large inputs fields with beautiful icons */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 shadow-inner">
                  
                  {/* Pickup Field */}
                  <div className="relative">
                    <label className="text-[9px] font-sans font-black text-emerald-600 block mb-1">Pickup GPS Location (UK Address)</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
                      <input 
                        type="text" 
                        placeholder="Search pickup (e.g. Piccadilly Circus)"
                        value={pickupInput}
                        onChange={(e) => handleAddressTyping(e.target.value, "pickup")}
                        className="w-full bg-white border border-slate-200 focus:outline-none focus:border-emerald-500 rounded-xl py-2.5 pl-8 pr-4 text-xs font-sans text-slate-850 font-bold"
                      />
                    </div>
                  </div>

                  {/* Destination Field */}
                  <div className="relative">
                    <label className="text-[9px] font-sans font-black text-red-600 block mb-1">Where to?</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-400" />
                      <input 
                        type="text" 
                        placeholder="Search destination (e.g. Heathrow Airport)"
                        value={destInput}
                        onChange={(e) => handleAddressTyping(e.target.value, "dest")}
                        className="w-full bg-white border border-slate-200 focus:outline-none focus:border-red-500 rounded-xl py-2.5 pl-8 pr-4 text-xs font-sans text-slate-850 font-bold"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                {/* Scrollable Autocomplete suggestions */}
                {addressSuggestions.length > 0 && (
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-2.5 shadow-2xl max-h-52 overflow-y-auto space-y-1.5 z-50">
                    <span className="text-[8.5px] font-mono text-slate-400 font-bold block px-2 border-b border-slate-800 pb-1">UK Bias Landmark Suggestions</span>
                    {addressSuggestions.map(elm => (
                      <div 
                        key={elm.id}
                        onClick={() => handleSelectSuggestion(elm)}
                        className="p-2.5 hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-start gap-2.5"
                      >
                        <MapPin className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs text-white block">{elm.name}</strong>
                          <p className="text-[10px] text-slate-500">{elm.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Saved places & Recent Destinations */}
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-sans tracking-wider uppercase font-bold">Saved Places (Home &amp; Work)</span>
                    <div className="grid grid-cols-2 gap-2">
                      {savedPlaces.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => {
                            const landmarkObj = LONDON_LANDMARKS.find(lm => lm.name.toLowerCase().includes(p.label.toLowerCase())) || LONDON_LANDMARKS[1];
                            setSelectedDest(landmarkObj);
                            setDestInput(p.address);
                            triggerSmsAlert(`Coordinates loaded from saved ${p.label}.`);
                          }}
                          className="bg-slate-900 hover:bg-slate-850 border border-slate-850/60 p-3 rounded-xl transition cursor-pointer flex items-center gap-2"
                        >
                          <Navigation className="w-4 h-4 text-blue-400" />
                          <div>
                            <strong className="text-[11px] text-white block">{p.label}</strong>
                            <span className="text-[9px] text-slate-500 block truncate">{p.address.split(",")[0]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-sans tracking-wider uppercase font-bold mb-1 block">Recent Destinations</span>
                    {recentSearches.map((recSearch, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          const matchedLM = LONDON_LANDMARKS.find(lm => recSearch.toLowerCase().includes(lm.name.toLowerCase().split(" (")[0])) || LONDON_LANDMARKS[0];
                          setSelectedPickup(LONDON_LANDMARKS[1]); // Default Buckingham Palace
                          setPickupInput(LONDON_LANDMARKS[1].name);
                          setSelectedDest(matchedLM);
                          setDestInput(matchedLM.name);
                          setCurrentScreen("fare");
                        }}
                        className="bg-slate-[#131926] hover:bg-slate-850 p-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-between text-xs text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{recSearch}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Continue confirm button */}
                <button
                  disabled={!selectedPickup || !selectedDest}
                  onClick={() => setCurrentScreen("fare")}
                  className={`w-full py-4 font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                    (!selectedPickup || !selectedDest) 
                      ? "bg-slate-800 text-slate-300 border-slate-700 cursor-not-allowed opacity-100" 
                      : "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-405 shadow-lg shadow-amber-500/10"
                  }`}
                >
                  {(!selectedPickup || !selectedDest) ? "Choose Destination to Continue" : "Confirm Journey Route"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* SCREEN 3: RIDE OPTIONS & FARE ESTIMATE SCREEN */}
            {currentScreen === "fare" && (
              <motion.div 
                key="fare"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setCurrentScreen("destination")}
                      className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-lg text-xs"
                    >
                      ← Back
                    </button>
                    <h3 className="text-xs font-black text-white">Fare Estimate</h3>
                  </div>
                  <span className="text-[10px] text-amber-500 font-mono">{driverSettings.profile.fullName ? `${driverSettings.profile.fullName} Direct` : "Driver Direct"}</span>
                </div>

                {/* Route specs distance and estimated time */}
                <div className="bg-[#1e293b]/70 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">Transit Profile</span>
                  <div className="flex justify-between items-center text-xs font-bold font-sans">
                    <div className="flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-blue-400" />
                      <span>{selectedPickup?.name.split(" (")[0]} ➔ {selectedDest?.name.split(" (")[0]}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/40 text-[11px] leading-relaxed">
                    <div className="bg-[#0f172a] p-2 rounded-xl text-center">
                      <span className="text-slate-500 font-mono block">Estimated Distance:</span>
                      <strong className="text-slate-100">{distanceMiles} mi</strong>
                    </div>
                    <div className="bg-[#0f172a] p-2 rounded-xl text-center">
                      <span className="text-slate-500 font-mono block">Transit Time:</span>
                      <strong className="text-slate-100">{durationMinutes} mins</strong>
                    </div>
                  </div>
                </div>

                {/* Fare breakdown */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block">Itemized Estimate (Fare Breakdown)</span>
                  <div className="text-[11px] space-y-1.5 font-sans leading-relaxed text-slate-400">
                    <div className="flex justify-between">
                      <span>Base Boarding flag rate fee:</span>
                      <span className="font-mono text-slate-200">£{baseRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance tariff ({distanceMiles} mi @ £{perMile}/mi):</span>
                      <span className="font-mono text-slate-200">£{(distanceMiles * perMile).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated time charge ({durationMinutes} mins @ £{perMinute}/min):</span>
                      <span className="font-mono text-slate-200">£{(durationMinutes * perMinute).toFixed(2)}</span>
                    </div>
                    {meetAndGreet && (
                      <div className="flex justify-between text-blue-400">
                        <span>Meet &amp; Greet VIP Airport Fee:</span>
                        <span className="font-mono">+£{meetGreetPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {childSeat && (
                      <div className="flex justify-between text-blue-400">
                        <span>UK Safety Child Seat premium Charge:</span>
                        <span className="font-mono">+£{childSeatPrice.toFixed(2)}</span>
                      </div>
                    )}
                    <hr className="border-slate-800 my-1" />
                    <div className="flex justify-between text-white font-extrabold text-sm pt-0.5">
                      <span>Estimated Fare Total:</span>
                      <span className="font-mono text-amber-500">£{estimatedFare.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Add-ons Cards Toggles: Meet & Greet (+£8/10), Child Seat */}
                <div className="space-y-2">
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block">Add-ons &amp; Extras</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      onClick={() => setMeetAndGreet(!meetAndGreet)}
                      className={`p-2.5 border rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold leading-normal ${
                        meetAndGreet 
                          ? "bg-amber-500/10 border-amber-500 text-amber-400" 
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" /> Meet &amp; Greet
                      </span>
                      <span>+£{meetGreetPrice.toFixed(0)}</span>
                    </div>

                    <div 
                      onClick={() => setChildSeat(!childSeat)}
                      className={`p-2.5 border rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold leading-normal ${
                        childSeat 
                          ? "bg-amber-500/10 border-amber-500 text-amber-400" 
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" /> Child Seat
                      </span>
                      <span>+£{childSeatPrice.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Special requests & Flight number inputs */}
                <div className="bg-[#111625] border border-slate-850 p-3 rounded-2xl grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[8.5px] uppercase font-mono text-slate-400 block font-bold">Flight Number (If Airport)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. BA123"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      className="w-full bg-[#070b15] border border-slate-800 focus:outline-none focus:border-amber-500 rounded-lg py-1 px-2.5 text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8.5px] uppercase font-mono text-slate-400 block font-bold">Special Notes (e.g. luggage)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. lots of bags"
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      className="w-full bg-[#070b15] border border-slate-800 focus:outline-none focus:border-amber-500 rounded-lg py-1 px-2.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                {/* Time Mode and trigger booking actions */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button 
                    onClick={() => {
                      setBookingTimeMode("now");
                      handleConfirmRideBooking();
                    }}
                    className="py-4 bg-[#0d1324] hover:bg-[#1a233b] border border-slate-800 font-extrabold text-xs uppercase text-slate-200 rounded-2xl transition cursor-pointer"
                  >
                    🚀 Book for NOW
                  </button>
                  <button 
                    onClick={() => setCurrentScreen("schedule")}
                    className="py-4 bg-slate-850 hover:bg-slate-800 font-extrabold text-xs uppercase text-amber-500 rounded-2xl border border-amber-500/20 transition cursor-pointer"
                  >
                    📅 Schedule Later
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN 4: CHOOSE DATE & TIME SCREEN (Schedule Mode) */}
            {currentScreen === "schedule" && (
              <motion.div 
                key="schedule"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <button 
                    onClick={() => setCurrentScreen("fare")}
                    className="p-1 px-2 text-slate-400 hover:text-white text-xs font-sans"
                  >
                    ← Adjust Fare-options
                  </button>
                  <h3 className="text-xs font-black text-white">Schedule Reservation</h3>
                </div>

                {/* Calendar interface mock picker */}
                <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-2xl space-y-3 shadow-inner">
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block">Choose Date &amp; Hours</span>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-mono text-slate-400 font-bold block">Pickup Date</label>
                    <input 
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-amber-500 py-2.5 px-3 rounded-xl text-xs text-slate-200 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-mono text-slate-400 font-bold block">Pickup Time (UK Local)</label>
                    <input 
                      type="time" 
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-amber-500 py-2.5 px-3 rounded-xl text-xs text-slate-200 font-mono font-bold"
                    />
                  </div>

                  <div className="bg-slate-[#02050c] p-2.5 rounded-xl text-[10px] text-slate-500 leading-normal font-sans border border-slate-850">
                    ⓘ Prebookings will be sent directly to {driverSettings.profile.fullName ? `${driverSettings.profile.fullName}'s` : "the driver's"} booking queue instantly. Booking confirmed upon submission.
                  </div>
                </div>

                {/* Confirm calendar Reservation action generation */}
                <button 
                  onClick={() => {
                    setBookingTimeMode("schedule");
                    handleConfirmRideBooking();
                  }}
                  className="w-full py-4.5 bg-amber-500 hover:bg-amber-600 font-black text-xs uppercase tracking-widest text-slate-950 rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  <CalendarCheck className="w-4 h-4 text-slate-950" />
                  Confirm Future Reservation
                </button>
              </motion.div>
            )}

            {/* SCREEN 5: BOOKING CONFIRMATION SCREEN */}
            {currentScreen === "confirmation" && (
              <motion.div 
                key="confirmation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Large animated checkmark using CSS keyframes */}
                <div className="text-center py-5 space-y-2">
                  <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto animate-[bounce_1.5s_infinite_alternate]">
                    <CheckCircle2 className="w-9 h-9 text-emerald-400 stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-black text-white">Ride Confirmed!</h3>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Booking recorded on {driverSettings.profile.fullName ? `${driverSettings.profile.fullName}'s` : "the driver's"} FareFreedom ledger. Twilio SMS dispatched.
                  </p>
                </div>

                {/* Booking summary card */}
                <div className="bg-[#111625] border border-slate-850 p-4 rounded-2xl relative overflow-hidden leading-relaxed">
                  <span className="absolute top-2 right-2 text-[8px] font-mono text-slate-500 font-bold">Ref: #XTM-89412</span>
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5 mb-2.5">Journey Summary Details</span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0 mt-1" />
                      <div>
                        <strong className="text-slate-400 text-[10px] block font-medium">Pickup address Point:</strong>
                        <span className="text-slate-200 text-xs font-bold">{selectedPickup?.name || "Buckingham Palace"}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 mt-1" />
                      <div>
                        <strong className="text-slate-400 text-[10px] block font-medium">Destination coordinates:</strong>
                        <span className="text-slate-200 text-xs font-bold">{selectedDest?.name || "Heathrow Airport"}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/60 mt-2">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-medium">Est. Charged Fare:</span>
                        <strong className="text-sm font-black text-amber-500 font-mono">£{estimatedFare.toFixed(2)}</strong>
                      </div>

                      <div className="flex gap-1.5">
                        {meetAndGreet && <span className="bg-blue-600/10 border border-blue-500/25 text-blue-400 text-[9px] font-sans font-extrabold px-2 py-0.5 rounded uppercase">Meet &amp; Greet Badge</span>}
                        {childSeat && <span className="bg-blue-600/10 border border-blue-500/25 text-blue-400 text-[9px] font-sans font-extrabold px-2 py-0.5 rounded uppercase">Child Seat Badge</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Action Buttons */}
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      // Switch to Driver view mode dynamically OR start booking simulation immediately 
                      setBookings(prev => prev.map(b => b.id === activeBookingId ? { ...b, status: "in_progress" } : b));
                      setCurrentScreen("tracking");
                      triggerSmsAlert(`💬 Twilio SMS Alert: Your driver is on the way in their executive vehicle (${driverSettings.profile.vehicleReg || "LR23 XTM"}) and arrives in 4 mins!`);
                    }}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    <Car className="w-4 h-4" />
                    Track My Ride
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Add to calendar link .ics generator file */}
                    <button 
                      onClick={() => {
                        const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:FareFreedom Cabin Run with ${driverSettings.profile.fullName || "Driver"}\nDESCRIPTION:Cab transit from ${selectedPickup?.name || ""} to ${selectedDest?.name || ""}. Booking reference: #${activeBookingId || "REF"}\nDTSTART:20260522T143000Z\nEND:20260522T151500Z\nEND:VEVENT\nEND:VCALENDAR`;
                        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.setAttribute("download", "FareFreedom-Transit-Appointment.ics");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        triggerSmsAlert("ICS Calendar appointment generated & dispatched.");
                      }}
                      className="py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-extrabold rounded-xl border border-slate-800 cursor-pointer"
                    >
                      📅 Add to Calendar
                    </button>

                    <button 
                      onClick={() => {
                        if (activeBookingId) {
                          setBookings(prev => prev.filter(b => b.id !== activeBookingId));
                          setActiveBookingId(null);
                        }
                        setSelectedPickup(null);
                        setSelectedDest(null);
                        setPickupInput("");
                        setDestInput("");
                        setCurrentScreen("home");
                        triggerSmsAlert("💬 SMS Status: Your ride request was cancelled. No charges have been billed.");
                      }}
                      className="py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-extrabold rounded-xl border border-red-500/25 cursor-pointer"
                    >
                      ✕ Cancel Booking
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN 6: LIVE TRACKING SCREEN */}
            {currentScreen === "tracking" && (
              <motion.div 
                key="tracking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                    <span>Live Tracking active</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Simulated via Supabase Realtime</span>
                </div>

                {/* Vehicle specifics plate in large layout */}
                <div className="bg-[#111625] border border-slate-850 p-4 rounded-3xl space-y-3 shadow-xl">
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs text-slate-400 font-bold font-sans">YOUR DRIVER AND VECHILE DETAILS</h4>
                      <strong className="text-lg font-black text-white block mt-1">{driverSettings.profile.vehicleMake} {driverSettings.profile.vehicleModel}</strong>
                      <p className="text-[11px] text-slate-400 mt-0.5">Lux Executive Carriage · {driverSettings.profile.vehicleColor}</p>
                    </div>

                    <div className="bg-amber-400 border border-amber-500 font-mono text-slate-950 font-black text-sm px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-md">
                      {driverSettings.profile.vehicleReg}
                    </div>
                  </div>

                  <hr className="border-slate-800/60" />

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 font-bold text-lg text-white rounded-xl flex items-center justify-center. shadow-md ring-2 ring-blue-500/20">
                      DM
                    </div>
                    <div className="flex-1">
                      <strong className="text-sm font-black text-slate-200">{driverSettings.profile.fullName}</strong>
                      <p className="text-[11px] text-emerald-400 font-medium">✓ Checked &amp; Verified Operator · #PHV-77129</p>
                    </div>
                  </div>
                </div>

                {/* Countdown visual metadata block */}
                <div className="bg-amber-500/15 border border-amber-500/30 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-amber-400 block font-bold">Countdown Estimate</span>
                  <h4 className="text-lg font-black text-slate-100 animate-pulse">
                    James arrives in {Math.max(1, Math.ceil(4 - (driverPathProgress * 4)))} minutes
                  </h4>
                  <p className="text-[10px] text-slate-400">Pulsing car is approaching your boarding coordinates now.</p>
                </div>

                {/* Interaction CTA Triggers */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <a 
                    href={`tel:${driverSettings.profile.contactNumber}`}
                    className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    Call Carrier
                  </a>
                  <button 
                    onClick={() => triggerSmsAlert(`💬 Direct Chat with James: "Hi Alexander! Loading up in the vehicle now. Be with you in 3 minutes. Heavy luggage is fine!"`)}
                    className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    Message SMS
                  </button>
                </div>

                {/* Dev bypass buttons */}
                <button 
                  onClick={handleTriggerRideArrivalCompletion}
                  className="w-full text-center text-[10px] font-mono text-slate-500 hover:text-slate-400 hover:underline pt-1.5 cursor-pointer block"
                >
                  [Sandbox Simulation: Skip to complete trip]
                </button>
              </motion.div>
            )}

            {/* SCREEN 7: TRIP IN PROGRESS SCREEN */}
            {currentScreen === "in_progress" && (
              <motion.div 
                key="in_progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs text-blue-400 uppercase tracking-widest font-extrabold">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span>Transit Profile Active</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Running Meter active</span>
                </div>

                {/* Trip in progress details */}
                <div className="bg-[#101420] border border-slate-850 p-4 rounded-3xl text-center space-y-3.5">
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-black tracking-wider uppercase font-sans">CURRENT ADVISORY</h4>
                    <strong className="text-base font-black text-white mt-1 block">On your way to {selectedDest?.name.split(" (")[0] || "Destination"}</strong>
                  </div>

                  {/* Realtime counting running meter ticks up */}
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl shadow-inner text-center">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold block">Running Meter Surcharge:</span>
                    <strong className="text-3xl font-black text-emerald-400 tracking-tight font-mono">
                      £{ongoingMeterFare.toFixed(2)}
                    </strong>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-1000" 
                        style={{ width: `${ongoingProgress * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Twilio call action triggers */}
                <button 
                  onClick={() => triggerSmsAlert("🚨 SOS triggered. FareFreedom operators and regulatory Transport for London emergency hotlines have been contacted. GPS coordinates dispatched.")}
                  className="w-full py-4.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-black uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-red-600/5"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 stroke-[2.5]" />
                  I Need Help (SOS)
                </button>
              </motion.div>
            )}

            {/* SCREEN 8: TRIP COMPLETE / RECEIPT SCREEN */}
            {currentScreen === "receipt" && (
              <motion.div 
                key="receipt"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-1 space-y-1">
                  <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-black text-white">Journey Complete</h3>
                  <p className="text-[10px] text-slate-400">confetti animation complete. Payment processed securely.</p>
                </div>

                {/* Receipt Card element */}
                <div className="bg-[#111625] border border-slate-850 p-4 rounded-3xl relative overflow-hidden leading-relaxed text-xs">
                  <span className="text-[10.5px] uppercase font-mono tracking-wider text-slate-500 font-extrabold block border-b border-slate-800 pb-1.5 mb-2.5">Digital Invoice Receipt</span>
                  
                  <div className="space-y-2 font-sans">
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Operator:</span>
                      <strong className="text-slate-200">YourTaxiMate Private Hire</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Driver:</span>
                      <strong className="text-slate-200">{driverSettings.profile.fullName ? `${driverSettings.profile.fullName} (#PHV-77129)` : "Private Hire Driver (#PHV-77129)"}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Vehicle Reg:</span>
                      <strong className="text-slate-200 uppercase">{driverSettings.profile.vehicleReg}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Distance &amp; Time:</span>
                      <strong className="text-slate-200">{distanceMiles} mi in {durationMinutes} min</strong>
                    </div>
                    
                    <hr className="border-slate-800/60 my-2" />
                    
                    <div className="flex justify-between font-black text-xs text-slate-300">
                      <span>Base Boarding flag:</span>
                      <span className="font-mono">£{baseRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-xs text-slate-300">
                      <span>Distance &amp; Time Tariff:</span>
                      <span className="font-mono">£{((distanceMiles * perMile) + (durationMinutes * perMinute)).toFixed(2)}</span>
                    </div>
                    {meetAndGreet && (
                      <div className="flex justify-between text-blue-400 font-black text-xs">
                        <span>Meet &amp; Greet VIP Airport Fee:</span>
                        <span className="font-mono">+£{meetGreetPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {childSeat && (
                      <div className="flex justify-between text-blue-400 font-black text-xs">
                        <span>Child Safety seat surcharge:</span>
                        <span className="font-mono">+£{childSeatPrice.toFixed(2)}</span>
                      </div>
                    )}

                    <hr className="border-slate-850" />

                    <div className="flex justify-between items-center text-sm font-black pt-1">
                      <span className="text-white">GRAND TOTAL FARE:</span>
                      <strong className="text-emerald-400 font-mono text-base font-extrabold">£{estimatedFare.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Rating 5 stars tap selector input */}
                {!ratingSubmitted ? (
                  <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl text-center space-y-3 shadow-inner">
                    <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest block">Rate Your Driver</span>
                    
                    <div className="flex items-center justify-center gap-2.5 py-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star}
                          onClick={() => setStarRating(star)}
                          className="focus:outline-none cursor-pointer"
                        >
                          <Star className={`w-8 h-8 transition-transform ${star <= starRating ? "text-amber-400 fill-amber-400 scale-110" : "text-slate-700 hover:text-amber-300"}`} />
                        </button>
                      ))}
                    </div>

                    <input 
                      type="text" 
                      placeholder="Optional reviews (e.g. Clean car, polite driver)"
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      className="w-full bg-[#080d19] border border-slate-800 focus:outline-none focus:border-amber-500 font-sans text-xs p-2 rounded-xl text-slate-200"
                    />

                    <button 
                      onClick={handleSubmitRatingFeedback}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs tracking-wider uppercase rounded-xl transition cursor-pointer"
                    >
                      Post Star Reviews &amp; Exit
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl text-center text-xs font-black text-emerald-400">
                    ✓ Rating submitted successfully! Redirecting...
                  </div>
                )}

                {/* PDF Generation Download Receipt button */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button 
                    onClick={() => handleDownloadPdfInvoice()}
                    className="py-3 bg-[#0d1324] hover:bg-[#1a233b] border border-slate-850 text-white rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileDown className="w-4 h-4 text-emerald-400" />
                    Download PDF Receipt
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentScreen("home");
                      // Prefills same route for second checkout booking
                      triggerSmsAlert("Route coordinates prefilled again for quick second booking.");
                    }}
                    className="py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                    Book Again
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN 9: MY BOOKINGS / RIDE HISTORY */}
            {currentScreen === "history" && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <button 
                    onClick={() => setCurrentScreen("home")}
                    className="p-1 px-2.5 bg-slate-800 hover:bg-slate-755 text-slate-400 text-xs rounded-lg transition"
                  >
                    ← Home
                  </button>
                  <h3 className="text-xs font-black text-white">Ride Ledger Logs</h3>
                </div>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  
                  {/* UNCOMING BOOKINGS */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-amber-500 font-sans tracking-wider uppercase font-bold">Upcoming prebooked bookings</span>
                    {bookings.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic pl-1">No upcoming rides programmed.</p>
                    ) : (
                      bookings.map((b) => (
                        <div key={b.id} className="bg-[#1e1b4b]/80 border border-indigo-500/25 p-3.5 rounded-2xl space-y-2 text-xs text-slate-300">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-amber-400 text-[11px]">Countdown Confirmed</span>
                            <strong className="text-white font-mono text-xs">£{b.fareGbp.toFixed(2)}</strong>
                          </div>

                          <div className="space-y-1 text-[11px] leading-relaxed">
                            <p className="truncate"><span className="text-slate-500 font-bold uppercase font-mono text-[9px] mr-1">FROM:</span> {b.pickupAddress}</p>
                            <p className="truncate"><span className="text-slate-500 font-bold uppercase font-mono text-[9px] mr-1">TO:</span> {b.destinationAddress}</p>
                            <p className="text-slate-400"><span className="text-slate-500 font-bold uppercase font-mono text-[9px] mr-1">WHEN:</span> {new Date(b.dateTime).toLocaleString()}</p>
                          </div>

                          <div className="flex gap-2.5 pt-2 border-t border-indigo-505/20">
                            <button 
                              onClick={() => {
                                setBookings(prev => prev.filter(item => item.id !== b.id));
                                triggerSmsAlert("Booking deleted from database queue successfully.");
                              }}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-red-400 border border-red-500/20 py-1.5 rounded-xl font-bold text-[10.5px]"
                            >
                              ✕ Cancel
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedPickup(LONDON_LANDMARKS.find(lm => b.pickupAddress.includes(lm.name.split(" (")[0])) || LONDON_LANDMARKS[1]);
                                setSelectedDest(LONDON_LANDMARKS.find(lm => b.destinationAddress.includes(lm.name.split(" (")[0])) || LONDON_LANDMARKS[0]);
                                setActiveBookingId(b.id);
                                setBookings(prev => prev.map(item => item.id === b.id ? { ...item, status: "in_progress" } : item));
                                setCurrentScreen("tracking");
                              }}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-xl font-bold text-[10.5px]"
                            >
                              Track Map
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* PAST HISTORIES */}
                  <div className="space-y-2 pt-2 border-t border-slate-850">
                    <span className="text-[10px] text-slate-400 font-sans tracking-wider uppercase font-bold block mb-1">Past completed journeys history</span>
                    
                    {trips.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-850 rounded-2xl">
                        <MapPin className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                        <p className="text-xs">No rides yet — where are you heading?</p>
                        <button 
                          onClick={() => setCurrentScreen("destination")}
                          className="mt-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-4 py-2 rounded-xl"
                        >
                          Book Now
                        </button>
                      </div>
                    ) : (
                      trips.map((t) => (
                        <div key={t.id} className="bg-slate-900 border border-slate-850 p-3 rounded-2xl text-xs space-y-2">
                          <div className="flex justify-between items-center text-[10.5px] leading-none text-slate-400">
                            <span>{new Date(t.dateTime || "").toLocaleDateString()}</span>
                            <span className="text-emerald-400 font-mono font-bold">£{t.fareGbp.toFixed(2)}</span>
                          </div>
                          
                          <div className="space-y-1 text-[11px] font-sans">
                            <p className="truncate text-slate-300"><span className="text-slate-500">Pick:</span> {t.pickupAddress.split(",")[0]}</p>
                            <p className="truncate text-slate-300"><span className="text-slate-500">Dest:</span> {t.destinationAddress.split(",")[0]}</p>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-850/60 mt-2 text-[10px] text-slate-500 font-bold">
                            <span>Driver: {driverSettings.profile.fullName || "Driver"}</span>
                            <button 
                              onClick={() => handleDownloadPdfInvoice(t)}
                              className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5" /> PDF Invoice
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN 10: USER PROFILE & SETTINGS SCREEN */}
            {currentScreen === "profile" && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <button 
                    onClick={() => setCurrentScreen("home")}
                    className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-450 text-xs rounded-lg transition font-sans"
                  >
                    ← Back
                  </button>
                  <h3 className="text-xs font-black text-white">Passenger Settings</h3>
                </div>

                {/* Avatar Initials tap to edit name */}
                <div className="bg-[#111625] border border-slate-850 rounded-2xl p-4.5 text-center space-y-3.5">
                  <div className="w-14 h-14 bg-amber-500 text-slate-950 font-black text-xl rounded-full flex items-center justify-center. mx-auto shadow-md">
                    {profile.fullName.split(" ").map(w => w[0]).join("")}
                  </div>
                  
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      value={profile.fullName}
                      onChange={(e) => setProfile(e.target.value)}
                      className="w-full text-center bg-transparent border-b border-slate-800 focus:border-amber-500 focus:outline-none font-sans font-bold text-sm text-slate-100 py-1"
                    />
                    <p className="text-[10px] text-slate-500">Tap name input above to update name details.</p>
                  </div>
                </div>

                {/* Edit Saved places list */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] text-slate-400 font-sans tracking-wider uppercase font-extrabold block">Saved Places Coordinates (Home &amp; Work)</span>
                  
                  {savedPlaces.map(p => (
                    <div key={p.id} className="space-y-1 text-xs">
                      <span className="text-slate-500 font-mono text-[10px]">{p.label} Address:</span>
                      <input 
                        type="text" 
                        value={p.address}
                        onChange={(e) => {
                          const updatedVal = e.target.value;
                          setSavedPlaces(prev => prev.map(item => item.id === p.id ? { ...item, address: updatedVal } : item));
                        }}
                        className="w-full bg-[#0a0f1d] border border-slate-850 p-2 rounded-xl text-slate-350 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Cash/Card toggle preferences selection */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-2.5">
                  <span className="text-[10px] text-[#94a3b8] font-sans tracking-wider uppercase font-bold block">Payment preference settlement</span>
                  
                  <div className="flex bg-[#0a0f1d] p-1 rounded-xl">
                    <button 
                      onClick={() => setPaymentPreference("card")}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                        paymentPreference === "card" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-slate-450 hover:text-slate-200"
                      }`}
                    >
                      💳 Settle via Card
                    </button>
                    <button 
                      onClick={() => setPaymentPreference("cash")}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                        paymentPreference === "cash" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-slate-450 hover:text-slate-200"
                      }`}
                    >
                      💵 Settle via Cash pre-agreement
                    </button>
                  </div>
                </div>

                {/* Support contact info opens WhatsApp / simulated email links */}
                <div className="py-2.5 border-t border-slate-850 text-center space-y-2 text-xs">
                  <p className="text-slate-500">Need support? Contact operator licensing hotline:</p>
                  <div className="flex gap-2 justify-center">
                    <a 
                      href="https://wa.me/447700900077" 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="inline-flex items-center gap-1 bg-[#25d366]/10 text-[#25d366] border border-[#25d366]/20 px-3 py-1.5 rounded-xl font-bold text-[10.5px]"
                    >
                      WhatsApp operators
                    </a>
                    <a 
                      href="mailto:support@farefreedom.app" 
                      className="inline-flex items-center gap-1 bg-slate-850 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl font-bold text-[10.5px]"
                    >
                      Email support
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* RIGHT MODULE FOOTER TELEMETRY indicator */}
        <div className="bg-[#0b0e17] border-t border-slate-850 p-3.5 text-center text-[10px] font-mono text-slate-500">
          <span>YourTaxiMate Client ID: c_stx_924</span>
        </div>

      </div>

    </div>
  );
}
