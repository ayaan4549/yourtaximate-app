import React, { useState, useEffect } from "react";
import { Booking, Trip, Expense, Customer, AppSettings } from "../types";
import { DEFAULT_SETTINGS, SEED_BOOKINGS, SEED_TRIPS, SEED_EXPENSES } from "../utils/seedData";

// Tab Sub-Components Imports
import { DashboardTab } from "./farefreedom/DashboardTab";
import { BookingsTab } from "./farefreedom/BookingsTab";
import { MeterTab } from "./farefreedom/MeterTab";
import { TripHistoryTab } from "./farefreedom/TripHistoryTab";
import { ExpensesTab } from "./farefreedom/ExpensesTab";
import { CustomersTab } from "./farefreedom/CustomersTab";
import { TaxSummaryTab } from "./farefreedom/TaxSummaryTab";
import { SettingsTab } from "./farefreedom/SettingsTab";
import { DocumentsTab } from "./farefreedom/DocumentsTab";
import { VehicleTab } from "./farefreedom/VehicleTab";

// Navigation Icon Imports
import { 
  Building2, 
  CalendarRange, 
  Compass, 
  History, 
  Receipt, 
  Users, 
  Scale, 
  Settings as SettingsIcon,
  Bell,
  AlertTriangle,
  Award,
  LogOut,
  ShieldCheck,
  Car
} from "lucide-react";

interface DriverPortalProps {
  onAddParsedBooking: (booking: { pickup: string; dropoff: string; time: string; fare: number }) => void;
  bookings?: Booking[];
  setBookings?: React.Dispatch<React.SetStateAction<Booking[]>>;
  trips?: Trip[];
  setTrips?: React.Dispatch<React.SetStateAction<Trip[]>>;
  expenses?: Expense[];
  settings?: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  // DB-backed mutation handlers passed from App
  onAddBooking?: (b: Booking) => void;
  onDeleteBooking?: (id: string) => void;
  onUpdateBooking?: (b: Booking) => void;
  onCompleteBooking?: (id: string, method: "cash" | "card") => void;
  onSaveTrip?: (t: Trip) => void;
  onDeleteTrip?: (id: string) => void;
  onAddExpense?: (e: Expense) => void;
  onDeleteExpense?: (id: string) => void;
}

export function DriverPortal({
  onAddParsedBooking,
  bookings: propBookings,
  setBookings: propSetBookings,
  trips: propTrips,
  setTrips: propSetTrips,
  expenses: propExpenses,
  settings: propSettings,
  setSettings: propSetSettings,
  onAddBooking,
  onDeleteBooking,
  onUpdateBooking,
  onCompleteBooking,
  onSaveTrip,
  onDeleteTrip,
  onAddExpense,
  onDeleteExpense,
}: DriverPortalProps) {
  // Fall back to local state when props not provided (standalone usage)
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => {
    const cached = localStorage.getItem("farefreedom_settings_cache");
    return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
  });
  const settings = propSettings || localSettings;
  const setSettings = propSetSettings || setLocalSettings;

  const [localBookings, setLocalBookings] = useState<Booking[]>(() => {
    const cached = localStorage.getItem("farefreedom_bookings_cache");
    return cached ? JSON.parse(cached) : SEED_BOOKINGS;
  });
  const bookings = propBookings || localBookings;
  const setBookings = propSetBookings || setLocalBookings;

  const [localTrips, setLocalTrips] = useState<Trip[]>(() => {
    const cached = localStorage.getItem("farefreedom_trips_cache");
    return cached ? JSON.parse(cached) : SEED_TRIPS;
  });
  const trips = propTrips || localTrips;
  const setTrips = propSetTrips || setLocalTrips;

  const [localExpenses, setLocalExpenses] = useState<Expense[]>(() => {
    const cached = localStorage.getItem("farefreedom_expenses_cache");
    return cached ? JSON.parse(cached) : SEED_EXPENSES;
  });
  const expenses = propExpenses || localExpenses;

  const [manualCustomers, setManualCustomers] = useState<Customer[]>(() => {
    const cached = localStorage.getItem("farefreedom_manual_customers_cache");
    return cached ? JSON.parse(cached) : [];
  });

  // 2. Active Tab Router Engine for FareFreedom's 8 pages
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Sync to physical browser storage
  useEffect(() => {
    localStorage.setItem("farefreedom_settings_cache", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("farefreedom_bookings_cache", JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem("farefreedom_trips_cache", JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem("farefreedom_expenses_cache", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("farefreedom_manual_customers_cache", JSON.stringify(manualCustomers));
  }, [manualCustomers]);

  // Apply dark mode theme if configured in settings
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  // Integrated 1-hour booking background alert triggers checked sequentially
  useEffect(() => {
    if (!settings.notificationsEnabled) return;

    const runBookingAlertNotificationChecker = () => {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

      bookings.forEach(b => {
        if (b.status === "pending") {
          const bTime = new Date(b.dateTime);
          if (bTime >= now && bTime <= inOneHour) {
            // Trigger local native browser alert notify if allowed
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`FareFreedom Upcoming Run!`, {
                body: `Job starting soon: ${b.customerName} @ ${b.dateTime.split("T")[1] || ""}`
              });
            }
          }
        }
      });
    };

    // run checklist on mount & schedule every 5 minutes (300000ms)
    runBookingAlertNotificationChecker();
    const alertTimer = setInterval(runBookingAlertNotificationChecker, 300000);

    return () => clearInterval(alertTimer);
  }, [bookings, settings.notificationsEnabled]);

  // 3. Automated Synthesis of Contacts directory (Contact Book)
  // Merges phone details dynamically aggregated from Bookings and settled Trips
  const synthesizedCustomersList: Customer[] = React.useMemo(() => {
    const baseMap = new Map<string, Customer>();

    // Initial base manual contacts
    manualCustomers.forEach(mc => {
      baseMap.set(mc.phone.replace(/\D/g, ""), { ...mc });
    });

    // Merge phone codes from Bookings list
    bookings.forEach(b => {
      if (!b.phone) return;
      const key = b.phone.replace(/\D/g, "");
      if (baseMap.has(key)) {
        const exist = baseMap.get(key)!;
        exist.bookingCount += 1;
        exist.totalSpent += b.fareGbp;
      } else {
        baseMap.set(key, {
          phone: b.phone,
          name: b.customerName,
          notes: b.companyName ? `Linked to ${b.companyName}` : "Prebook client",
          bookingCount: 1,
          tripCount: 0,
          totalSpent: b.fareGbp
        });
      }
    });

    // Merge phone codes from Completed Trips logs
    trips.forEach(t => {
      // Find matching customer reference via search names
      const matchedKey = Array.from(baseMap.keys()).find(k => {
        const item = baseMap.get(k)!;
        return item.name.toLowerCase() === t.customerName.toLowerCase();
      });

      if (matchedKey) {
        const exist = baseMap.get(matchedKey)!;
        exist.tripCount += 1;
        exist.totalSpent += t.fareGbp;
      } else {
        // synthesize clean record
        const simulatedPhone = `+44 7700 ${Math.floor(Math.random() * 89999 + 10000)}`;
        const key = simulatedPhone.replace(/\D/g, "");
        baseMap.set(key, {
          phone: simulatedPhone,
          name: t.customerName,
          notes: "Metred Street Hail Client",
          bookingCount: 0,
          tripCount: 1,
          totalSpent: t.fareGbp
        });
      }
    });

    return Array.from(baseMap.values());
  }, [bookings, trips, manualCustomers]);

  // 4. Action Handlers — use DB-backed props when available, local state as fallback
  const handleAddNewBooking = (newB: Booking) => {
    if (onAddBooking) { onAddBooking(newB); }
    else { setBookings(prev => [newB, ...prev]); }
  };

  const handleDeleteBooking = (id: string) => {
    if (onDeleteBooking) { onDeleteBooking(id); }
    else { setBookings(prev => prev.filter(b => b.id !== id)); }
  };

  const handleUpdateBooking = (updatedB: Booking) => {
    if (onUpdateBooking) { onUpdateBooking(updatedB); }
    else { setBookings(prev => prev.map(b => b.id === updatedB.id ? updatedB : b)); }
  };

  const handleMoveBookingToTripHistory = (bookingId: string, paymentMethod: "cash" | "card") => {
    if (onCompleteBooking) {
      onCompleteBooking(bookingId, paymentMethod);
    } else {
      const target = bookings.find(b => b.id === bookingId);
      if (!target) return;
      const settledTrip: Trip = {
        id: "trip-settled-" + Date.now(),
        customerName: target.customerName,
        pickupAddress: target.pickupAddress,
        destinationAddress: target.destinationAddress,
        distanceMiles: target.distanceMiles,
        fareGbp: target.fareGbp,
        paymentMethod,
        dateTime: new Date().toISOString(),
        mode: "Prebook",
      };
      setTrips(prev => [settledTrip, ...prev]);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
    }
  };

  const handleSaveMeterTrip = (meterTrip: Trip) => {
    if (onSaveTrip) { onSaveTrip(meterTrip); }
    else { setTrips(prev => [meterTrip, ...prev]); }
  };

  const handleDeleteTrip = (tripId: string) => {
    if (onDeleteTrip) { onDeleteTrip(tripId); }
    else { setTrips(prev => prev.filter(t => t.id !== tripId)); }
  };

  const handleCreateNewExpense = (newExp: Expense) => {
    if (onAddExpense) { onAddExpense(newExp); }
    else { setLocalExpenses(prev => [newExp, ...prev]); }
  };

  const handleDeleteExpense = (expId: string) => {
    if (onDeleteExpense) { onDeleteExpense(expId); }
    else { setLocalExpenses(prev => prev.filter(e => e.id !== expId)); }
  };

  const handleCreateManualCustomer = (newCust: Customer) => {
    setManualCustomers(prev => [newCust, ...prev]);
  };

  const handleDeleteManualCustomer = (phoneStr: string) => {
    setManualCustomers(prev => prev.filter(c => c.phone.replace(/\D/g, "") !== phoneStr.replace(/\D/g, "")));
  };

  const handleUpdateManualCustomer = (updatedCust: Customer) => {
    setManualCustomers(prev => prev.map(c => c.phone === updatedCust.phone ? updatedCust : c));
  };

  // 10 Tab Navigation menu configurations
  const TABS_LIST = [
    { id: "dashboard", label: "Dashboard", icon: Building2 },
    { id: "bookings", label: "Bookings", icon: CalendarRange },
    { id: "meter", label: "Fare Meter", icon: Compass },
    { id: "trips", label: "Trip History", icon: History },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "customers", label: "Contacts", icon: Users },
    { id: "documents", label: "Documents", icon: ShieldCheck },
    { id: "vehicle", label: "Vehicle", icon: Car },
    { id: "tax", label: "Tax Summary", icon: Scale },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className={`space-y-6 ${settings.darkMode ? "dark text-slate-200" : "text-slate-800"}`}>
      
      {/* Dynamic Workspace Brand Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-white relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-600/20 blur-3xl rounded-full" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-md tracking-widest font-mono">
              FARE FREEDOM ERP
            </span>
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
              OFFLINE SECURED
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight">FareFreedom Workspace Suite</h2>
          <p className="text-xs text-slate-300">
            Welcome back, <strong className="text-white">{settings.profile.fullName}</strong> · Managing dispatch, private hire fares, and self-employed HMRC mileage allowance logs.
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 border border-slate-800 bg-slate-950 p-3 rounded-2xl">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            GPS Engine Ready ({settings.profile.vehicleReg})
          </span>
        </div>
      </div>

      {/* HORIZONTAL SCROLLABLE TOP NAV ON DESKTOP & FIXED BOTTOM NAV ON MOBILE */}
      {/* 1. Desktop Horizontal Slider Nav */}
      <div className="hidden md:block bg-white border border-slate-100 rounded-2xl shadow-sm p-1.5 overflow-x-auto select-none">
        <div className="flex gap-1 min-w-max">
          {TABS_LIST.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-slate-950 text-white shadow"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Content Display Module */}
      <div className="bg-white border border-slate-100/10 p-5 rounded-3xl shadow-xs transition-colors animate-fade-in">
        {activeTab === "dashboard" && (
          <DashboardTab 
            bookings={bookings} 
            trips={trips} 
            expenses={expenses} 
            onNavigateToTab={(target) => setActiveTab(target)}
            driverName={settings.profile.fullName}
          />
        )}
        {activeTab === "bookings" && (
          <BookingsTab 
            bookings={bookings} 
            settings={settings} 
            onAddBooking={handleAddNewBooking} 
            onDeleteBooking={handleDeleteBooking}
            onUpdateBooking={handleUpdateBooking}
            onCompleteBooking={handleMoveBookingToTripHistory}
          />
        )}
        {activeTab === "meter" && (
          <MeterTab 
            settings={settings} 
            onSaveTrip={handleSaveMeterTrip} 
          />
        )}
        {activeTab === "trips" && (
          <TripHistoryTab 
            trips={trips} 
            onDeleteTrip={handleDeleteTrip} 
          />
        )}
        {activeTab === "expenses" && (
          <ExpensesTab 
            expenses={expenses} 
            onAddExpense={handleCreateNewExpense} 
            onDeleteExpense={handleDeleteExpense} 
          />
        )}
        {activeTab === "customers" && (
          <CustomersTab 
            customers={synthesizedCustomersList}
            onAddCustomer={handleCreateManualCustomer}
            onDeleteCustomer={handleDeleteManualCustomer}
            onUpdateCustomer={handleUpdateManualCustomer}
          />
        )}
        {activeTab === "tax" && (
          <TaxSummaryTab 
            trips={trips} 
            expenses={expenses} 
          />
        )}
        {activeTab === "documents" && (
          <DocumentsTab 
            documents={settings.documents || []} 
            onUpdateDocuments={(updatedDocs) => {
              setSettings(prev => ({ ...prev, documents: updatedDocs }));
            }} 
          />
        )}
        {activeTab === "vehicle" && (
          <VehicleTab 
            settings={settings} 
            onUpdateSettings={setSettings} 
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab 
            settings={settings} 
            onUpdateSettings={setSettings} 
          />
        )}
      </div>

      {/* 2. Fixed Bottom Mobile Navigation Bar (Always Locked to lower viewports on small screens) */}
      <div className="md:hidden fixed bottom-1.5 left-1.5 right-1.5 bg-slate-950 text-white px-2 py-1.5 border border-slate-800 rounded-2xl flex justify-between items-center z-50 shadow-2xl backdrop-blur-md bg-opacity-95">
        {TABS_LIST.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center p-1.5 transition-all text-center cursor-pointer"
            >
              <Icon className={`w-4 h-4 transition-transform ${isActive ? "scale-115 text-blue-400" : "text-slate-400 hover:text-slate-200"}`} />
              <span className={`text-[8.5px] mt-0.5 tracking-tighter ${isActive ? "text-blue-400 font-extrabold" : "text-slate-400"}`}>
                {tab.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Small Spacer at bottom when running mobile bottom menu so lists aren't blocked */}
      <div className="h-16 md:hidden" />

    </div>
  );
}
