import React, { useState, useEffect } from "react";
import {
  Car,
  MapPin,
  Navigation,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  HeartHandshake,
  Briefcase,
  Smartphone,
  KeyRound,
  LogOut,
  Star,
  BookOpen,
  ShieldCheck,
  Link,
  FileText,
  Coins,
  Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MapSimulator, LONDON_LANDMARKS, Landmark, calculateHaversineDistance } from "./components/MapSimulator";
import { DocPanel } from "./components/DocPanel";
import { DriverPortal } from "./components/DriverPortal";
import { CustomerPortal } from "./components/CustomerPortal";
import { supabase } from "./lib/supabase";
import { useSupabaseSession, useUserProfile, signOut } from "./lib/hooks";
import { useDriverData } from "./lib/useDriverData";
import { AppSettings } from "./types";
import { DEFAULT_SETTINGS } from "./utils/seedData";

// Pricing and regulatory structural constraints 
const VEHICLE_TIERS = [
  { id: "saloon", name: "Saloon Class", baseRate: 1.70, baseText: "Standard UK Cab (Toyota Prius, Hyundai Ioniq)", cap: "4 Seats", bags: 2, icon: Car },
  { id: "estate", name: "Premium Estate", baseRate: 2.00, baseText: "Extra trunk volume (Skoda Superb, VW Passat)", cap: "4 Seats +", bags: 4, icon: Car },
  { id: "s_mpv", name: "Small MPV", baseRate: 2.25, baseText: "Perfect for family pickups (Ford Galaxy, VW Sharan)", cap: "5 Seats", bags: 3, icon: Car },
  { id: "l_mpv", name: "Large MPV", baseRate: 2.50, baseText: "Executive group transit (Mercedes V-Class)", cap: "7 Seats", bags: 5, icon: Car },
  { id: "seater_8", name: "8 Seater Transit", baseRate: 3.25, baseText: "Ultra capacity minibus (Ford Tourneo)", cap: "8 Seats", bags: 8, icon: Car },
];

export default function App() {
  // Basic routing state matching UK driver/customer specifications
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  // ── Real Supabase auth ────────────────────────────────────────────────────────
  const { session, loading: sessionLoading } = useSupabaseSession();
  const isAuthenticated = !!session;
  const { profile } = useUserProfile(session?.user?.id ?? null);

  // Derive role from DB profile; fall back to driver for the main workspace
  const [userRoleChoice, setUserRoleChoice] = useState<"customer" | "driver" | null>(null);

  useEffect(() => {
    if (profile) {
      setUserRoleChoice(profile.role === "passenger" ? "customer" : "driver");
    } else if (currentPath.startsWith("/book")) {
      setUserRoleChoice("customer");
    }
  }, [profile, currentPath]);

  // Auto-redirect unauthenticated dashboard visits to auth, and logged-in to dashboard
  useEffect(() => {
    if (!sessionLoading) {
      if (!isAuthenticated && currentPath === "/dashboard") {
        navigate("/auth");
      } else if (isAuthenticated && currentPath === "/auth") {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, sessionLoading, currentPath]);

  const isBookPath = currentPath.startsWith("/book");
  const isDashboardPath = currentPath === "/dashboard";

  const [driverBadgeInput, setDriverBadgeInput] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+44 ");
  const [otpCode, setOtpCode] = useState("");
  const [authStage, setAuthStage] = useState<"phone" | "otp">("phone");
  const [authError, setAuthError] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // YourTaxiMate Driver login/signup dedicated states matching user screenshots
  const [driverEmailInput, setDriverEmailInput] = useState("driver@example.com");
  const [driverPasswordInput, setDriverPasswordInput] = useState("");
  const [driverMobileInput, setDriverMobileInput] = useState("+447911123456");
  const [driverFullNameInput, setDriverFullNameInput] = useState("John Driver");
  const [driverAuthTab, setDriverAuthTab] = useState<"signin" | "signup">("signin");

  // ── Real Supabase data (replaces localStorage / seed data) ──────────────────
  const {
    bookings: globalBookings,
    setBookings: setGlobalBookings,
    trips: globalTrips,
    setTrips: setGlobalTrips,
    expenses: globalExpenses,
    addBooking: handleAddBookingDB,
    deleteBooking: handleDeleteBookingDB,
    updateBooking: handleUpdateBookingDB,
    completeBooking: handleCompleteBookingDB,
    saveTrip: handleSaveTripDB,
    deleteTrip: handleDeleteTripDB,
    addExpense: handleAddExpenseDB,
    deleteExpense: handleDeleteExpenseDB,
  } = useDriverData(session?.user?.id ?? null);

  // Settings stored locally (preferences, not operational data)
  const [globalSettings, setGlobalSettings] = useState<AppSettings>(() => {
    const cached = localStorage.getItem("farefreedom_settings_cache");
    return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("farefreedom_settings_cache", JSON.stringify(globalSettings));
  }, [globalSettings]);

  // Booking states
  const [pickup, setPickup] = useState<Landmark | null>(null);
  const [dropoff, setDropoff] = useState<Landmark | null>(null);
  const [selectedTier, setSelectedTier] = useState("saloon");
  
  // Extra UK PHV criteria
  const [childSeat, setChildSeat] = useState(false);
  const [meetAndGreet, setMeetAndGreet] = useState(false);
  const [isNightRate, setIsNightRate] = useState(false);

  // Active Dispatch State Machine
  // 'idle' -> 'requesting' -> 'accepted' -> 'en_route' -> 'completed'
  const [bookingStatus, setBookingStatus] = useState<"idle" | "requesting" | "accepted" | "en_route" | "completed">("idle");
  const [dispatchMessage, setDispatchMessage] = useState("");
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Selector value to toggle between Passenger self-service and Driver Pro workspace
  const [activeTab, setActiveTab] = useState<"customer" | "driver">("customer");

  const handleTaxiMateParsedUpdate = (booking: { pickup: string; dropoff: string; time: string; fare: number }) => {
    // Cross reference target name in landmark hotspot arrays to load correctly on visual stage
    const matchedPickup = LONDON_LANDMARKS.find(l => booking.pickup.toLowerCase().includes(l.name.toLowerCase().split(" (")[0])) || LONDON_LANDMARKS[0];
    const matchedDropoff = LONDON_LANDMARKS.find(l => booking.dropoff.toLowerCase().includes(l.name.toLowerCase().split(" (")[0])) || LONDON_LANDMARKS[1];
    
    setPickup(matchedPickup);
    setDropoff(matchedDropoff);
    setBookingStatus("idle");
    setActiveTab("customer"); // Auto-route to the live interactive routes mapper
  };

  // Auto detect Night Surcharge based on local system time or let Thuan toggle manually
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 0 && hours < 5) {
      setIsNightRate(true);
    }
  }, []);

  // Distance calculation (miles)
  const distanceMiles = pickup && dropoff 
    ? calculateHaversineDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
    : 0;

  // Approximate duration based on 25 mph average London city transit speed plus fixed buffer
  const durationMinutes = Math.max(5, Math.ceil(distanceMiles * 2.4 + 4));

  // Compute UK fixed fare (in Pounds) matching integers/pence values
  const calculateFareGbp = (tierId: string) => {
    const tier = VEHICLE_TIERS.find(t => t.id === tierId) || VEHICLE_TIERS[0];
    const baseFare = 20.00; // Base £20
    const runningRate = distanceMiles * tier.baseRate;
    let extra = 0;
    if (childSeat) extra += 10.00;
    if (meetAndGreet) extra += 10.00;

    let subtotal = baseFare + runningRate + extra;
    if (isNightRate) {
      subtotal *= 1.5; // 1.5x Multiplier Midnight - 5 AM
    }
    return parseFloat(subtotal.toFixed(2));
  };

  const activeFare = calculateFareGbp(selectedTier);

  // ── Real Supabase phone OTP auth ─────────────────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/\s/g, "");
    if (!cleaned.match(/^\+44\d{10}$/)) {
      setAuthError("Please input a valid UK phone number (+44 followed by 10 digits)");
      return;
    }
    setAuthError("");
    setIsLoadingAuth(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });
    setIsLoadingAuth(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthStage("otp");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setAuthError("OTP must be 6 digits.");
      return;
    }
    setAuthError("");
    setIsLoadingAuth(true);
    const cleaned = phoneNumber.replace(/\s/g, "");
    const { error } = await supabase.auth.verifyOtp({
      phone: cleaned,
      token: otpCode,
      type: "sms",
    });
    setIsLoadingAuth(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setActiveTab("customer");
      setPickup(LONDON_LANDMARKS[0]);
      setDropoff(LONDON_LANDMARKS[1]);
    }
  };

  // Dispatch live simulation state flow
  const handleRequestRide = () => {
    if (!pickup || !dropoff) return;

    // Contacting driver operators
    setBookingStatus("requesting");
    setDispatchMessage("Pinging nearby Transport for London (TfL) Private Hire licensed vehicles...");

    // Stage 2: Driver Accepted after 2 seconds
    setTimeout(() => {
      setBookingStatus("accepted");
      setDispatchMessage("Job Accepted! Your driver (No. #8391) is preparing their Toyota Prius Plus.");
      
      // Stage 3: Driver En Route after 3.5 seconds
      setTimeout(() => {
        setBookingStatus("en_route");
        setDispatchMessage("Your driver is en route. Dynamic telemetry updates active.");

        // Stage 4: Completed after 8.5 seconds
        setTimeout(() => {
          setBookingStatus("completed");
          setDispatchMessage("Ride safely completed. Payment charged of TfL fixed quote.");
        }, 8000);

      }, 3500);

    }, 2500);
  };

  const handleResetSimulator = () => {
    setBookingStatus("idle");
    setDispatchMessage("");
    setReviewSubmitted(false);
    setPickup(null);
    setDropoff(null);
  };

  // Sync real profile name into local settings when profile loads
  useEffect(() => {
    if (profile?.full_name) {
      setGlobalSettings(prev => ({
        ...prev,
        profile: { ...prev.profile, fullName: profile.full_name! },
      }));
    }
  }, [profile]);

  const isDarkTheme = false;

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading YourTaxiMate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDarkTheme ? "bg-slate-950 text-slate-200" : "bg-[#f8fafc] text-slate-800"
    }`}>
      {/* Top Sticky Header */}
      {isAuthenticated && currentPath !== "/" && !currentPath.startsWith("/book") && (
        <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/10 px-3.5 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-display font-extrabold tracking-tight text-white text-sm sm:text-base">YourTaxiMate</span>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 tracking-wider bg-slate-800/80 px-2.5 py-0.5 rounded-md font-bold">UK PRIVATE HIRE PLATFORM</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="hidden md:inline-block text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">STATUS: VERIFIED</span>
                <button
                  onClick={async () => {
                    await signOut();
                    setUserRoleChoice(null);
                    setPhoneNumber("+44 ");
                    setOtpCode("");
                    setAuthStage("phone");
                    setAuthError("");
                    navigate("/");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-xs font-sans font-bold text-slate-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      {/* Main Body Containers */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        {isBookPath ? (
          <div className="space-y-8 animate-fade-in">
            <CustomerPortal 
              bookings={globalBookings}
              setBookings={setGlobalBookings}
              trips={globalTrips}
              setTrips={setGlobalTrips}
              driverSettings={globalSettings}
              userRole="customer"
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
              }}
            />
          </div>
        ) : !isAuthenticated ? (
          <div>
            {currentPath === "/" || currentPath === "" || currentPath === "/index.html" ? (
              /* Marketing Landing Page: Path "/" */
              <div className="max-w-4xl w-full mx-auto my-16 text-center space-y-12 animate-fade-in relative z-10 px-4">
                {/* Header logo & UK Private Hire Badge */}
                <div className="space-y-6 flex flex-col items-center">
                  <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-105 font-mono text-[10px] text-blue-600 font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    UK PRIVATE HIRE PLATFORM
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                      <Car className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-slate-900 m-0">
                      Your<span className="text-blue-600">TaxiMate</span>
                    </h1>
                  </div>
                </div>

                {/* Big tagline */}
                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-slate-900 max-w-2xl mx-auto leading-snug whitespace-pre-line">
                    {"Your Customers.\nYour Bookings.\nYour Business."}
                  </h2>
                  <p className="text-sm text-slate-600 max-w-[520px] mx-auto leading-relaxed">
                    The all-in-one platform for UK private hire drivers. Build a loyal customer base, stay compliant, and know your real take-home — all for £9.99/month.
                  </p>
                </div>

                {/* Two CTA Buttons */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto">
                  <button
                    onClick={() => navigate("/auth")}
                    className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-3xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Log In
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate("/auth")}
                    className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-widest rounded-3xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-slate-900/10"
                  >
                    Start Free Trial
                    <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </button>
                </div>

                {/* Visual Card Row mimicking high fidelity platform features */}
                {/* Visual Card Row mimicking high fidelity platform features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 text-left max-w-4xl mx-auto">
                  {/* Card 1: Customer Portal */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Link className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 text-xs font-extrabold uppercase tracking-wider font-sans">Customer Portal</h3>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Your Personal Booking Link</p>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                      Share your unique link. Customers book directly with you every time.
                    </p>
                  </div>

                  {/* Card 2: Bookings */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 text-xs font-extrabold uppercase tracking-wider font-sans">Bookings</h3>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Smart Bookings &amp; Dispatch</p>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                      Calendar views, AI booking from WhatsApp paste, flight tracking, GPS customer links.
                    </p>
                  </div>

                  {/* Card 3: Compliance */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 text-xs font-extrabold uppercase tracking-wider font-sans">Compliance</h3>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">UK Compliance Made Easy</p>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                      24 document templates, expiry countdowns, auto-alerts.
                    </p>
                  </div>

                  {/* Card 4: Earnings */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Coins className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 text-xs font-extrabold uppercase tracking-wider font-sans">Earnings</h3>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Know Your Real Take-Home</p>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                      Log trips and expenses. Daily goals, weekly charts, real earnings.
                    </p>
                  </div>

                  {/* Card 5: Tax */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Receipt className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 text-xs font-extrabold uppercase tracking-wider font-sans">Tax</h3>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">UK Tax Estimator</p>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                      Income tax, NI Class 2 &amp; 4, mileage allowance. No surprises.
                    </p>
                  </div>

                  {/* Card 6: Vehicle */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                        <Car className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 text-xs font-extrabold uppercase tracking-wider font-sans">Vehicle</h3>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Vehicle Health Tracker</p>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
                      MOT, service, insurance countdowns. Fuel log, MPG, tyre tracker.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Dedicated YourTaxiMate Driver Login / Sign Up Page matching screenshots */
              <div className="max-w-md w-full mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden text-slate-800">
                
                {/* Visual Brand Logo Section */}
                <div className="flex flex-col items-center mb-6">
                  <div className="flex items-center justify-center w-16 h-16 mb-2 relative">
                    <svg className="w-14 h-14 text-blue-600 drop-shadow-sm" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z" stroke="#2563eb" strokeWidth="6" fill="#ffffff" />
                      <text x="50" y="62" fill="#2563eb" fontSize="36" fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">T</text>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center justify-center font-sans">
                    Your<span className="text-blue-600">TaxiMate</span>
                  </h1>
                  <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-0.5 font-sans">
                    UK Private Hire Platform
                  </p>
                  <p className="text-slate-500 text-xs mt-3 text-center leading-normal font-sans">
                    Manage your rides and earnings
                  </p>
                </div>

                {/* Pill Tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-sm mx-auto mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setDriverAuthTab("signin");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all text-center cursor-pointer ${
                      driverAuthTab === "signin"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDriverAuthTab("signup");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all text-center cursor-pointer ${
                      driverAuthTab === "signup"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {driverAuthTab === "signin" ? (
                  /* SIGN IN FORM BLOCK */
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!driverEmailInput.trim()) {
                      setAuthError("Email address is required.");
                      return;
                    }
                    if (!driverPasswordInput.trim()) {
                      setAuthError("Password is required.");
                      return;
                    }
                    setIsLoadingAuth(true);
                    setAuthError("");
                    const { error } = await supabase.auth.signInWithPassword({
                      email: driverEmailInput,
                      password: driverPasswordInput,
                    });
                    setIsLoadingAuth(false);
                    if (error) {
                      setAuthError(error.message);
                    } else {
                      setUserRoleChoice("driver");
                      setActiveTab("driver");
                    }
                  }} className="space-y-4">
                    
                    <div>
                      <label className="block text-xs font-sans text-slate-700 font-bold mb-1.5 align-left">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="driver@example.com"
                        value={driverEmailInput}
                        onChange={(e) => setDriverEmailInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 px-4 text-slate-900 font-sans text-xs transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs text-slate-700 font-bold">Password</label>
                        <button type="button" onClick={() => setAuthError("Password reset instructions have been mock-sent to: " + driverEmailInput)} className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer">
                          Forgot password?
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={driverPasswordInput}
                        onChange={(e) => setDriverPasswordInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 px-4 text-slate-900 font-sans text-xs transition-all"
                      />
                    </div>

                    {authError && (
                      <div className={`rounded-xl p-3 flex items-center gap-2.5 text-xs border ${
                        authError.includes("mock-sent") 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-red-50 border-red-200 text-red-650"
                      }`}>
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                        <p>{authError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoadingAuth}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer text-center"
                    >
                      {isLoadingAuth ? (
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        "Sign In"
                      )}
                    </button>
                  </form>
                ) : (
                  /* SIGN UP FORM BLOCK */
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!driverFullNameInput.trim()) {
                      setAuthError("Full Name is required.");
                      return;
                    }
                    if (!driverEmailInput.trim()) {
                      setAuthError("Email is required.");
                      return;
                    }
                    if (!driverPasswordInput.trim()) {
                      setAuthError("Password is required.");
                      return;
                    }
                    if (!driverMobileInput.trim()) {
                      setAuthError("Mobile Number is required.");
                      return;
                    }
                    setIsLoadingAuth(true);
                    setAuthError("");
                    const { data, error } = await supabase.auth.signUp({
                      email: driverEmailInput,
                      password: driverPasswordInput,
                      options: {
                        data: {
                          full_name: driverFullNameInput,
                          phone: driverMobileInput,
                          role: "driver",
                        },
                      },
                    });
                    if (!error && data.user) {
                      // Insert into public.users
                      await supabase.from("users").upsert({
                        id: data.user.id,
                        phone: driverMobileInput,
                        full_name: driverFullNameInput,
                        role: "driver",
                      });
                    }
                    setIsLoadingAuth(false);
                    if (error) {
                      setAuthError(error.message);
                    } else {
                      setUserRoleChoice("driver");
                      setActiveTab("driver");
                      setGlobalSettings(prev => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          fullName: driverFullNameInput,
                          contactNumber: driverMobileInput,
                        },
                      }));
                    }
                  }} className="space-y-4">
                    
                    <div>
                      <label className="block text-xs font-sans text-slate-700 font-bold mb-1.5 text-left">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Driver"
                        value={driverFullNameInput}
                        onChange={(e) => setDriverFullNameInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 px-4 text-slate-900 font-sans text-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-sans text-slate-700 font-bold mb-1.5 text-left">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="driver@example.com"
                        value={driverEmailInput}
                        onChange={(e) => setDriverEmailInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 px-4 text-slate-900 font-sans text-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-sans text-slate-700 font-bold mb-1.5 text-left font-sans">Mobile Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="+447911123456"
                        value={driverMobileInput}
                        onChange={(e) => setDriverMobileInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 px-4 text-slate-900 font-mono text-xs transition-all"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1 leading-normal">UK format: +447911123456 or 07911123456</span>
                    </div>

                    <div>
                      <label className="block text-xs font-sans text-slate-700 font-bold mb-1.5 text-left">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={driverPasswordInput}
                        onChange={(e) => setDriverPasswordInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 px-4 text-slate-900 font-sans text-xs transition-all"
                      />
                    </div>

                    {authError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-red-650 leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <p>{authError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoadingAuth}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer"
                    >
                      {isLoadingAuth ? (
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        "Sign Up"
                      )}
                    </button>
                  </form>
                )}

                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2.5 text-[10px] text-slate-400 font-mono justify-between font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setUserRoleChoice(null);
                      setAuthError("");
                    }}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    ← Back to Roles
                  </button>
                  <span className="flex items-center gap-1 font-bold text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> TfL Encrypted
                  </span>
                </div>

                {/* Developer Quick-bypass — use real sign-in in production */}
                <button
                  type="button"
                  onClick={async () => {
                    setDriverEmailInput("driver@example.com");
                    setDriverPasswordInput("password");
                    setAuthError("Use the Sign In form above with your real credentials.");
                  }}
                  className="mt-4 w-full text-center text-[10px] font-sans font-bold text-blue-600 hover:bg-blue-50/50 cursor-pointer bg-slate-50 rounded-xl py-2 px-3 border border-slate-100 transition"
                >
                  [Bypass: Partner Driver Workspace Sandbox]
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {userRoleChoice === "driver" ? (
              <DriverPortal
                onAddParsedBooking={handleTaxiMateParsedUpdate}
                bookings={globalBookings}
                setBookings={setGlobalBookings}
                trips={globalTrips}
                setTrips={setGlobalTrips}
                expenses={globalExpenses}
                onAddBooking={handleAddBookingDB}
                onDeleteBooking={handleDeleteBookingDB}
                onUpdateBooking={handleUpdateBookingDB}
                onCompleteBooking={handleCompleteBookingDB}
                onSaveTrip={handleSaveTripDB}
                onDeleteTrip={handleDeleteTripDB}
                onAddExpense={handleAddExpenseDB}
                onDeleteExpense={handleDeleteExpenseDB}
                settings={globalSettings}
                setSettings={setGlobalSettings}
              />
            ) : (
              <CustomerPortal 
                bookings={globalBookings}
                setBookings={setGlobalBookings}
                trips={globalTrips}
                setTrips={setGlobalTrips}
                driverSettings={globalSettings}
                userRole={userRoleChoice}
                onNavigateToTab={(tab) => {
                  setActiveTab(tab);
                }}
              />
            )}
            {false && (
              /* Split Panel: Left: Visual Map & Details. Right: Pricing Sheet & Dispatcher Controls */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Map Simulator Module & Landmarks Sheet (8 Cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-black font-display text-slate-950">Live Route Tracker</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Drag indices or select landmarks below to render path vectors.</p>
                    </div>
                    {isNightRate && (
                      <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-sans font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        1.5x Midnight Surge Active
                      </span>
                    )}
                  </div>

                  <MapSimulator
                    pickup={pickup}
                    dropoff={dropoff}
                    setPickup={setPickup}
                    setDropoff={setDropoff}
                    bookingStatus={bookingStatus}
                  />

                  {/* London Landmark Quick Select Buttons */}
                  <div className="mt-5">
                    <label className="block text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider mb-2.5">London Licensing Hotspots (Click to assign)</label>
                    <div className="flex flex-wrap gap-2">
                      {LONDON_LANDMARKS.map((landmark) => {
                        const isPickup = pickup?.id === landmark.id;
                        const isDropoff = dropoff?.id === landmark.id;
                        return (
                          <button
                            key={landmark.id}
                            onClick={() => {
                              if (bookingStatus !== "idle") return;
                              if (!pickup) setPickup(landmark);
                              else if (pickup.id === landmark.id) {
                                // @ts-ignore
                                setPickup(null);
                              } else setDropoff(landmark);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 border flex items-center gap-1.5 cursor-pointer ${
                              isPickup
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                                : isDropoff
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            {landmark.name.split(" (")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dispatch Status Progress Tracker */}
                {bookingStatus !== "idle" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 blur-2xl rounded-full" />
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                          </span>
                          <span className="text-xs font-sans font-extrabold uppercase text-blue-600 tracking-wider">LIVE TELEMETRY STREAM</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">PROVIDER: UK_DISPATCH_MATE</span>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600">
                          <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: "3s" }} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">CURRENT OPERATION:</h4>
                          <p className="text-base font-black text-slate-950 mt-0.5 capitalize">{bookingStatus.replace("_", " ")}</p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{dispatchMessage}</p>
                        </div>
                      </div>

                      {/* Custom dispatch flow chart */}
                      <div className="grid grid-cols-4 gap-2 text-center mt-2 pt-3 border-t border-slate-100 text-[9px] font-sans font-bold uppercase tracking-wider">
                        <div className={`py-2 rounded-xl border transition-all ${bookingStatus === "requesting" ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-50 border-transparent text-slate-400"}`}>
                          1. PINGING
                        </div>
                        <div className={`py-2 rounded-xl border transition-all ${bookingStatus === "accepted" ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-50 border-transparent text-slate-400"}`}>
                          2. ACCEPTED
                        </div>
                        <div className={`py-2 rounded-xl border transition-all ${bookingStatus === "en_route" ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-50 border-transparent text-slate-400"}`}>
                          3. EN_ROUTE
                        </div>
                        <div className={`py-2 rounded-xl border transition-all ${bookingStatus === "completed" ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-50 border-transparent text-slate-400"}`}>
                          4. ARRIVED
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Specifications & Vehicle Options (5 Cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Location Inputs (Always clear & intuitive) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4 backdrop-blur-md">
                  <h3 className="text-sm font-bold font-sans text-slate-900">Route Coordinates</h3>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center text-blue-600 text-[10px] font-bold">A</div>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-sans text-slate-700 font-bold">
                        {pickup ? pickup.name : <span className="text-slate-400 font-normal">Click Map or landmark list to load pickup</span>}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-bold">B</div>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-sans text-slate-700 font-bold">
                        {dropoff ? dropoff.name : <span className="text-slate-400 font-normal">Set Destination location</span>}
                      </div>
                    </div>
                  </div>

                  {pickup && dropoff && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between text-xs font-sans text-slate-500 font-bold">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span>Distance: <strong className="text-slate-900">{distanceMiles} mi</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>Est: <strong className="text-slate-900">{durationMinutes} mins</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fare & Vehicle Selection Gating */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4">
                  <h3 className="text-sm font-black font-sans text-slate-950">Vehicle Premium Tiers</h3>

                  <div className="space-y-2.5">
                    {VEHICLE_TIERS.map((tier) => {
                      const calculatedFare = calculateFareGbp(tier.id);
                      const isSelected = selectedTier === tier.id;
                      const Icon = tier.icon;
                      
                      return (
                        <button
                          key={tier.id}
                          disabled={!pickup || !dropoff || bookingStatus !== "idle"}
                          onClick={() => setSelectedTier(tier.id)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                            !pickup || !dropoff 
                              ? "opacity-40 cursor-not-allowed border-slate-100 bg-slate-50"
                              : isSelected
                              ? "bg-slate-950 border-slate-900 text-white shadow-lg"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-extrabold ${isSelected ? "text-white" : "text-slate-900"}`}>{tier.name}</span>
                                <span className={`text-[9px] font-sans font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase ${isSelected ? "bg-white/15 text-white" : "bg-slate-200 text-slate-600"}`}>{tier.cap}</span>
                              </div>
                              <p className={`text-[11px] mt-0.5 leading-tight ${isSelected ? "text-slate-300" : "text-slate-500"}`}>{tier.baseText}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className={`text-[10px] font-mono block font-bold ${isSelected ? "text-slate-400" : "text-slate-400"}`}>£{tier.baseRate}/mi</span>
                            <span className={`text-base font-extrabold font-sans ${isSelected ? "text-white" : "text-slate-950"}`}>
                              {pickup && dropoff ? `£${calculatedFare.toFixed(2)}` : `£0.00`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* UK PHV Regulatory Extra Surcharges & Services */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <label className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">PHV Surcharges &amp; Extras</label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={bookingStatus !== "idle"}
                        onClick={() => setChildSeat(!childSeat)}
                        className={`p-3 rounded-xl border text-xs font-sans font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          childSeat 
                            ? "bg-blue-50 border-blue-300 text-blue-700" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-blue-600" />
                          Child Seat
                        </span>
                        <span className="font-extrabold text-blue-600">+£10</span>
                      </button>

                      <button
                        disabled={bookingStatus !== "idle"}
                        onClick={() => setMeetAndGreet(!meetAndGreet)}
                        className={`p-3 rounded-xl border text-xs font-sans font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          meetAndGreet 
                            ? "bg-blue-50 border-blue-300 text-blue-700" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          Meet &amp; Greet
                        </span>
                        <span className="font-extrabold text-blue-600">+£10</span>
                      </button>
                    </div>

                    {/* Artificial Surge Override Trigger to demonstrate calculation logic */}
                    <button
                      disabled={bookingStatus !== "idle"}
                      onClick={() => setIsNightRate(!isNightRate)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-sans font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                        isNightRate 
                          ? "bg-amber-100 border-amber-300 text-amber-800" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                        Simulate Night Hours (Midnight - 5am)
                      </span>
                      <span className="font-extrabold text-amber-600">x1.5 Surge</span>
                    </button>
                  </div>

                  {/* Booking Trigger Actions */}
                  <div className="pt-2">
                    {bookingStatus === "idle" ? (
                      <button
                        onClick={handleRequestRide}
                        disabled={!pickup || !dropoff}
                        className={`w-full py-4.5 rounded-2xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 flex items-center justify-center gap-2 transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/10 cursor-pointer ${
                          (!pickup || !dropoff) ? "opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 shadow-none" : ""
                        }`}
                      >
                        <Car className="w-4 h-4" />
                        Pre-Book Fixed Quote: £{activeFare.toFixed(2)}
                      </button>
                    ) : bookingStatus === "completed" ? (
                      /* Job Ended Review Modal */
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3.5 text-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-950 font-sans">Share Your Experience</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md font-sans font-bold">PAID: £{activeFare.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">Your card was successfully billed. Please review your driver's service:</p>
                        
                        {!reviewSubmitted ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-2xl">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setRatingInput(star)}
                                  className="focus:outline-none cursor-pointer"
                                >
                                  <Star className={`w-6 h-6 ${star <= ratingInput ? "fill-amber-400 text-amber-400" : "text-slate-200 hover:text-amber-200"}`} />
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setReviewSubmitted(true);
                              }}
                              className="w-full py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-blue-700 transition cursor-pointer"
                            >
                              Submit Rating
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-xs font-bold text-emerald-600">Rating Submitted! Thank you.</p>
                            <button
                              onClick={handleResetSimulator}
                              className="mt-3.5 text-xs text-slate-500 font-bold underline hover:text-slate-800 cursor-pointer"
                            >
                              Reset Booking Screen
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Block changes during ride operations */
                      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-center text-xs font-sans font-bold text-slate-500 animate-pulse">
                        Pre-booked Job Dispatch Active (Actions Locked)
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
            )}

            {/* Developer Setup Vault Side panel (Highly valuable interactive tab section) */}
            <div className="border-t border-slate-800 pt-8 mt-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400 border border-blue-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-white border-b-0">YourTaxiMate Integration Workspace</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Below contains full step-by-step guidelines, packages, and code vectors Thuan needs to build the mobile platform.</p>
                </div>
              </div>
              <DocPanel />
            </div>

          </div>
        )}
      </main>

      {/* Footer Branding of regulation safe dispatch */}
      <footer className="bg-slate-900 border-t border-slate-800 text-center py-6 text-xs text-slate-500 font-sans font-medium mt-12 w-full">
        <div className="max-w-7xl mx-auto px-4 leading-relaxed">
          <p className="text-slate-400">© 2026 YourTaxiMate. Powered by GNEI AI Labs Ltd.</p>
        </div>
      </footer>
    </div>
  );
}
