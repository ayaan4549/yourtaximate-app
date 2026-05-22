import React, { useState } from "react";
import { Booking, AppSettings } from "../../types";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Smartphone, 
  Check, 
  Plane, 
  ChevronRight, 
  X,
  RefreshCw,
  Clock,
  MapPin,
  Eye,
  Pencil,
  Phone,
  MessageCircle,
  Download,
  CalendarCheck,
  CheckCircle2,
  Navigation
} from "lucide-react";

interface BookingsTabProps {
  bookings: Booking[];
  settings: AppSettings;
  onAddBooking: (booking: Booking) => void;
  onDeleteBooking: (id: string) => void;
  onUpdateBooking: (booking: Booking) => void;
  onCompleteBooking: (id: string, paymentMethod: "cash" | "card") => void;
}

// Sample mock portal/broker bookings that drivers can click to claim
const INITIAL_PORTAL_BOOKINGS: Booking[] = [
  {
    id: "portal-book-1",
    customerName: "Tatyana Imas",
    companyName: "Wellcome pick up",
    phone: "+1 2019572803",
    countryCode: "+1",
    pickupAddress: "Glasgow International Airport (GLA)",
    destinationAddress: "Radisson Blu Hotel, Glasgow, 301 Argyle St, Glasgow G2 8DL, UK",
    dateTime: "2026-05-18T10:40",
    distanceMiles: 9.3,
    fareGbp: 33.21,
    flightNumber: "UA920",
    meetAndGreet: true,
    childSeat: false,
    returnJourney: false,
    status: "pending"
  },
  {
    id: "portal-book-2",
    customerName: "Angela Tait",
    companyName: "46196-1",
    phone: "+44 7912 046183",
    countryCode: "+44",
    pickupAddress: "Glasgow Airport, Glasgow Airport (GLA), Paisley, UK",
    destinationAddress: "Golden Jubilee Conference Hotel, Beardmore Street, Clydebank, G81 4SA",
    dateTime: "2026-05-18T18:50",
    distanceMiles: 5.2,
    fareGbp: 22.62,
    flightNumber: "BA1472",
    meetAndGreet: false,
    childSeat: false,
    returnJourney: false,
    status: "pending"
  },
  {
    id: "portal-book-3",
    customerName: "Wendy Wilson",
    companyName: "A-Team Transport",
    phone: "+44 7700 900299",
    countryCode: "+44",
    pickupAddress: "Glasgow Airport, Glasgow Airport (GLA), Paisley, UK",
    destinationAddress: "Mercure Glasgow City Hotel, 201 Ingram St, Glasgow G1 1DQ",
    dateTime: "2026-05-23T14:10",
    distanceMiles: 11.2,
    fareGbp: 39.48,
    flightNumber: "BA1478",
    meetAndGreet: true,
    childSeat: false,
    returnJourney: false,
    status: "pending"
  }
];

// Helper to open map applications based on setting provider (Google vs. Apple vs. Waze)
const triggerMapDirections = (address: string, provider?: "google" | "apple" | "waze") => {
  if (!address) return;
  const encodedAddress = encodeURIComponent(address);
  let url = "";
  if (provider === "apple") {
    url = `https://maps.apple.com/?daddr=${encodedAddress}`;
  } else if (provider === "waze") {
    url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
  } else {
    // google maps by default
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

export function BookingsTab({ 
  bookings, 
  settings, 
  onAddBooking, 
  onDeleteBooking, 
  onUpdateBooking, 
  onCompleteBooking 
}: BookingsTabProps) {
  // Primary Tabs
  const [subTab, setSubTab] = useState<"my" | "portal">("my");
  // Sub View Settings
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"today" | "week" | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("2026-05-23");

  // Portal available bookings locally tracked
  const [portalBookings, setPortalBookings] = useState<Booking[]>(() => {
    const cached = localStorage.getItem("farefreedom_portal_bookings_cache");
    return cached ? JSON.parse(cached) : INITIAL_PORTAL_BOOKINGS;
  });

  // Modals & Panels Active Controls
  const [showForm, setShowForm] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);

  // Flight Tracking state
  const [activeFlightInfo, setActiveFlightInfo] = useState<{ number: string; status: string; dep: string; eta: string; gate: string; belt: string } | null>(null);

  // Simulated Twilio SMS session link tracking
  const [trackingSessionId, setTrackingSessionId] = useState<string | null>(null);

  // Copy notification banner state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Form State variables
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCountryCode, setFormCountryCode] = useState("+44");
  const [formPickup, setFormPickup] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formDateTime, setFormDateTime] = useState("");
  const [formDistance, setFormDistance] = useState(10);
  const [formFlightNo, setFormFlightNo] = useState("");
  const [formMeetCheck, setFormMeetCheck] = useState(false);
  const [formChildCheck, setFormChildCheck] = useState(false);
  const [formReturnCheck, setFormReturnCheck] = useState(false);

  // Address lookup helpers for Glasgow (fitting pictures) & UK
  const HOTSPOTS_LIST = [
    { name: "Glasgow International Airport (GLA)", dist: 9.3 },
    { name: "Glasgow Airport, Glasgow Airport (GLA), Paisley, UK", dist: 11.2 },
    { name: "Heathrow Airport Terminal 2 (LHR)", dist: 18.5 },
    { name: "Gatwick Airport South Terminal (LGW)", dist: 31.2 },
    { name: "The Savoy Hotel, Strand, London WC2R 0EZ", dist: 2.1 },
    { name: "Radisson Blu Hotel, Glasgow, 301 Argyle St, Glasgow G2 8DL, UK", dist: 9.3 },
    { name: "Golden Jubilee Conference Hotel, Beardmore Street, Clydebank, G81 4SA", dist: 5.2 },
    { name: "Mercure Glasgow City Hotel, 201 Ingram St, Glasgow G1 1DQ", dist: 11.2 }
  ];

  const handleAutoCalculate = () => {
    let pickedDist = 8.5;
    const lowerP = formPickup.toLowerCase();
    const lowerD = formDestination.toLowerCase();

    const pMatch = HOTSPOTS_LIST.find(h => lowerP.includes(h.name.toLowerCase().split(" (")[0]));
    const dMatch = HOTSPOTS_LIST.find(h => lowerD.includes(h.name.toLowerCase().split(" (")[0]));

    if (pMatch && dMatch) {
      pickedDist = Math.abs(pMatch.dist - dMatch.dist) + 3;
    } else if (pMatch) {
      pickedDist = pMatch.dist;
    } else if (dMatch) {
      pickedDist = dMatch.dist;
    }
    
    setFormDistance(parseFloat(Math.max(2, pickedDist).toFixed(1)));
  };

  const calculateProposedFare = (distParam: number, meetParam: boolean, childParam: boolean) => {
    const base = settings.rates.baseFare;
    const running = distParam * settings.rates.perMileRate;
    let extras = 0;
    if (meetParam) extras += settings.rates.meetGreetFee;
    if (childParam) extras += 10.00; // child seat standard fee

    return parseFloat((base + running + extras).toFixed(2));
  };

  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPickup || !formDestination || !formDateTime) return;

    const proposedFare = calculateProposedFare(formDistance, formMeetCheck, formChildCheck);
    const bookingId = "book-" + Date.now();

    const mainBooking: Booking = {
      id: bookingId,
      customerName: formName,
      companyName: formCompany,
      phone: formPhone,
      countryCode: formCountryCode,
      pickupAddress: formPickup,
      destinationAddress: formDestination,
      dateTime: formDateTime,
      distanceMiles: formDistance,
      fareGbp: proposedFare,
      flightNumber: formFlightNo,
      meetAndGreet: formMeetCheck,
      childSeat: formChildCheck,
      returnJourney: formReturnCheck,
      status: "pending"
    };

    onAddBooking(mainBooking);

    // Swap addresses for Return Journey mirror booking
    if (formReturnCheck) {
      const returnDate = new Date(formDateTime);
      returnDate.setHours(returnDate.getHours() + 4); // Default 4 hr return gap
      const returnDateStr = returnDate.toISOString().slice(0, 16);

      const returnedBooking: Booking = {
        id: "book-ret-" + Date.now(),
        customerName: formName,
        companyName: formCompany,
        phone: formPhone,
        countryCode: formCountryCode,
        pickupAddress: formDestination,
        destinationAddress: formPickup,
        dateTime: returnDateStr,
        distanceMiles: formDistance,
        fareGbp: calculateProposedFare(formDistance, formMeetCheck, formChildCheck),
        flightNumber: "",
        meetAndGreet: formMeetCheck,
        childSeat: formChildCheck,
        returnJourney: false,
        status: "pending"
      };

      setTimeout(() => {
        onAddBooking(returnedBooking);
      }, 100);
    }

    // Reset Form fields
    setFormName("");
    setFormCompany("");
    setFormPhone("");
    setFormPickup("");
    setFormDestination("");
    setFormDateTime("");
    setFormFlightNo("");
    setFormMeetCheck(false);
    setFormChildCheck(false);
    setFormReturnCheck(false);
    setShowForm(false);
  };

  // Claim portal booking to my prebookings
  const handleClaimPortalBooking = (b: Booking) => {
    const updated = { ...b, id: "book-" + Date.now() };
    onAddBooking(updated);
    // Remove from portal options
    const leftover = portalBookings.filter(pb => pb.id !== b.id);
    setPortalBookings(leftover);
    localStorage.setItem("farefreedom_portal_bookings_cache", JSON.stringify(leftover));
    alert(`Successfully claimed booking for ${b.customerName}. Dispatched onto your Duty Run Sheet!`);
  };

  // Save edits of prebooking modal
  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForEdit) return;
    onUpdateBooking(selectedBookingForEdit);
    // Sync with details viewer if open
    if (selectedBookingForDetails?.id === selectedBookingForEdit.id) {
      setSelectedBookingForDetails(selectedBookingForEdit);
    }
    setSelectedBookingForEdit(null);
  };

  const handleCopySms = (b: Booking) => {
    let text = settings.templates.bookingConfirmation;
    const dateFormatted = b.dateTime.split("T")[0];
    const timeFormatted = b.dateTime.split("T")[1] || "";
    
    text = text
      .replace(/{name}/g, b.customerName)
      .replace(/{date}/g, dateFormatted)
      .replace(/{time}/g, timeFormatted)
      .replace(/{pickup}/g, b.pickupAddress)
      .replace(/{destination}/g, b.destinationAddress)
      .replace(/{fare}/g, "£" + b.fareGbp.toFixed(2))
      .replace(/{reg}/g, settings.profile.vehicleReg)
      .replace(/{driver}/g, settings.profile.fullName)
      .replace(/{model}/g, settings.profile.vehicleModel);

    navigator.clipboard.writeText(text);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Simulating tracking link dispatch
  const handleStartJob = (b: Booking) => {
    const updated = { ...b, status: "in_progress" as const };
    onUpdateBooking(updated);

    const checkSessId = "sess_" + Math.floor(Math.random() * 89999 + 10000);
    setTrackingSessionId(checkSessId);
  };

  const handleCompletePayment = (b: Booking, payMethod: "cash" | "card") => {
    onCompleteBooking(b.id, payMethod);
    setTrackingSessionId(null);
    if (selectedBookingForDetails?.id === b.id) {
      setSelectedBookingForDetails(null);
    }
  };

  const triggerFlightTrack = (flightCode: string) => {
    if (!flightCode) return;
    const statsMock = [
      { status: "Landed", dep: "JFK New York", eta: "Landed 14:10", gate: "B22", belt: "Belt 4" },
      { status: "On Time", dep: "CDG Paris", eta: "ETA 19:40", gate: "A15", belt: "Belt 1" },
      { status: "Delayed", dep: "DXB Dubai", eta: "ETA 21:05 (Was 20:15)", gate: "C12", belt: "TBC" }
    ];
    const pickStats = statsMock[Math.floor(Math.random() * statsMock.length)];
    setActiveFlightInfo({
      number: flightCode,
      ...pickStats
    });
  };

  // Export dynamically loaded bookings to CSV
  const handleExportCSV = () => {
    const listToExport = subTab === "my" ? bookings : portalBookings;
    if (listToExport.length === 0) {
      alert("No prebookings available to export.");
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Customer Name,Company,Phone,Pickup,Destination,DateTime,Distance(mi),Fare(£),Flight,Meet&Greet,ChildSeat,Status\n";
    
    listToExport.forEach(b => {
      const row = [
        b.id,
        `"${b.customerName}"`,
        `"${b.companyName || ""}"`,
        `"${b.countryCode || ""}${b.phone}"`,
        `"${b.pickupAddress}"`,
        `"${b.destinationAddress}"`,
        b.dateTime,
        b.distanceMiles,
        b.fareGbp,
        b.flightNumber || "",
        b.meetAndGreet ? "Yes" : "No",
        b.childSeat ? "Yes" : "No",
        b.status
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `farefreedom_duty_manifest_${subTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering calculations
  const todayStr = "2026-05-18"; // Set fixed baseline focal date fitting slides (e.g., May 18, 2026)
  const focalDate = new Date(todayStr);
  const weekLaterDate = new Date(focalDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const filterListings = (listToFilter: Booking[]) => {
    return listToFilter.filter(b => {
      // Search Box filter
      const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (viewMode === "calendar") {
        // Only show matching date
        return b.dateTime.startsWith(selectedDateFilter);
      }

      // If viewMode === "list", apply segmented dates toggles
      const bDateStr = b.dateTime.split("T")[0];
      const bDate = new Date(b.dateTime);

      if (filter === "today") {
        return bDateStr === todayStr;
      } else if (filter === "week") {
        return bDate >= focalDate && bDate <= weekLaterDate;
      }
      return true;
    });
  };

  const activeDisplayListings = filterListings(subTab === "my" ? bookings : portalBookings);

  // Calendar dates mapping for May 2026
  // Starts on Friday (Blank offset: 4 days)
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  // Quick WhatsApp link generator
  const triggerWhatsAppMsg = (b: Booking) => {
    const textEncoded = encodeURIComponent(`Hi ${b.customerName}, this is ${settings.profile.fullName || "your driver"} confirming your booked transfer Glasgow Airport GLA ➔ ${b.destinationAddress}. Ref ${settings.profile.vehicleReg}.`);
    const link = `https://wa.me/${b.phone.replace(/\D/g, "")}?text=${textEncoded}`;
    window.open(link, "_blank");
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* 1. Header Board matching screenshots */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black font-display text-slate-950 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            Bookings - Manage your prebookings
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
            Schedule duty listings, track sky progress, and coordinate Twilio customer dispatch links.
          </p>
        </div>

        <div className="flex gap-2.5 items-center w-full sm:w-auto">
          <button 
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-1.5 bg-white cursor-pointer hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              // reset edit modals if open
              setSelectedBookingForEdit(null);
            }}
            className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/15"
          >
            <Plus className="w-3.5 h-3.5" />
            + New Booking
          </button>
        </div>
      </div>

      {/* 2. Create Prebooked Duty Form Collapsible panel */}
      {showForm && (
        <form onSubmit={handleSaveBooking} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in relative z-10">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">Create New booking Duty entry</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Customer Name</label>
              <input 
                type="text" 
                required 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
                placeholder="Tatyana Imas" 
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Company Name / Note (Optional)</label>
              <input 
                type="text" 
                value={formCompany} 
                onChange={(e) => setFormCompany(e.target.value)} 
                placeholder="Wellcome pick up" 
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Mobile Contact Phone</label>
              <div className="flex gap-1">
                <select 
                  value={formCountryCode} 
                  onChange={(e) => setFormCountryCode(e.target.value)} 
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 font-bold focus:outline-none text-slate-700"
                >
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+61">🇦🇺 +61</option>
                </select>
                <input 
                  type="tel" 
                  value={formPhone} 
                  onChange={(e) => setFormPhone(e.target.value)} 
                  placeholder="201 957 2803" 
                  className="flex-1 bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-lg p-2.5 text-xs font-mono text-slate-800" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Pickup Coordinates</label>
              <input 
                type="text" 
                required 
                value={formPickup} 
                onChange={(e) => setFormPickup(e.target.value)} 
                placeholder="e.g. Glasgow International Airport (GLA)" 
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800" 
              />
              <span className="text-[9px] text-slate-400 mt-1 block">Matches local landmarks for distance calculators</span>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Destination Location Address</label>
              <input 
                type="text" 
                required 
                value={formDestination} 
                onChange={(e) => setFormDestination(e.target.value)} 
                placeholder="e.g. Radisson Blu Hotel, Glasgow" 
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Date &amp; Time Dispatch</label>
              <input 
                type="datetime-local" 
                required 
                value={formDateTime} 
                onChange={(e) => setFormDateTime(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2.5 text-xs font-mono text-slate-800" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Distance (miles)</label>
              <div className="flex gap-1.5">
                <input 
                  type="number" 
                  step="0.1" 
                  required 
                  value={formDistance} 
                  onChange={(e) => setFormDistance(parseFloat(e.target.value) || 0)} 
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2.5 text-xs font-mono text-slate-800" 
                />
                <button 
                  type="button" 
                  onClick={handleAutoCalculate}
                  className="px-2.5 bg-slate-900 border border-slate-900 text-white rounded-lg text-[10px] hover:bg-slate-800 font-bold transition flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  Maps Calc
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Flight Code (Optional)</label>
              <input 
                type="text" 
                value={formFlightNo} 
                onChange={(e) => setFormFlightNo(e.target.value)} 
                placeholder="e.g. VS102" 
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2.5 text-xs font-mono uppercase text-slate-800" 
              />
            </div>
            <div className="text-right py-2 bg-slate-900 p-3 rounded-lg text-white">
              <span className="text-[9px] text-slate-400 block font-bold uppercase font-mono">ESTIMATED FARE</span>
              <span className="text-sm font-black text-cyan-400">£{calculateProposedFare(formDistance, formMeetCheck, formChildCheck).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1 text-slate-600 font-sans text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formMeetCheck} 
                onChange={(e) => setFormMeetCheck(e.target.checked)} 
                className="rounded text-blue-600 w-4 h-4 cursor-pointer" 
              />
              <span>Meet &amp; Greet VIP (+£{settings.rates.meetGreetFee})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formChildCheck} 
                onChange={(e) => setFormChildCheck(e.target.checked)} 
                className="rounded text-blue-600 w-4 h-4 cursor-pointer" 
              />
              <span>Provide Child Booster Seat (+£10)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formReturnCheck} 
                onChange={(e) => setFormReturnCheck(e.target.checked)} 
                className="rounded text-blue-600 w-4 h-4 cursor-pointer" 
              />
              <span className="font-bold text-indigo-600">Swap Return Journey Mirror (Swaps AB)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold cursor-pointer hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer shadow"
            >
              Build Prebook Schedule
            </button>
          </div>
        </form>
      )}

      {/* 3. Tab Segment Selector (My Bookings vs Portal Bookings) */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-sm select-none border border-slate-200/50">
        <button
          type="button"
          onClick={() => {
            setSubTab("my");
            setSelectedBookingForDetails(null);
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center transition cursor-pointer ${
            subTab === "my" ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:text-slate-700"
          }`}
        >
          My Bookings
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab("portal");
            setSelectedBookingForDetails(null);
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center transition cursor-pointer ${
            subTab === "portal" ? "bg-white text-slate-900 shadow animate-pulse" : "text-slate-400 hover:text-slate-700"
          }`}
        >
          Portal Bookings
        </button>
      </div>

      {/* 4. Sub Filter Bar: Date togglers, Search Input, List/Calendar View Buttons */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
        {/* Today | This Week | All Future tabs */}
        <div className="flex divide-x divide-slate-200 text-xs font-bold shrink-0">
          <button 
            type="button"
            onClick={() => setFilter("today")} 
            className={`px-3.5 transition cursor-pointer ${filter === "today" ? "text-blue-600 font-black" : "text-slate-400 hover:text-slate-700"}`}
          >
            Today
          </button>
          <button 
            type="button"
            onClick={() => setFilter("week")} 
            className={`px-3.5 transition cursor-pointer ${filter === "week" ? "text-blue-600 font-black" : "text-slate-400 hover:text-slate-700"}`}
          >
            This Week
          </button>
          <button 
            type="button"
            onClick={() => setFilter("all")} 
            className={`px-3.5 transition cursor-pointer ${filter === "all" ? "text-blue-600 font-black" : "text-slate-400 hover:text-slate-700"}`}
          >
            All Future
          </button>
        </div>

        {/* Local Search Input Area */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl py-2 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        {/* View Mode Switcher: List vs Calendar */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-end lg:self-auto select-none border border-slate-200/40">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              viewMode === "calendar" ? "bg-white text-slate-900 shadow-sm animate-pulse" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* 5. Main content render box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar layout mode split view on the left */}
        {viewMode === "calendar" && (
          <div className="lg:col-span-5 bg-white border border-slate-150 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wide font-display flex items-center gap-1">
                <CalendarIcon className="w-4 h-4 text-blue-500" /> Select Date Grid
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">May 2026</span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-sans">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="text-slate-400 font-bold font-mono">{d}</span>
              ))}
              {/* Offset offset pad for May 2026 starts on Friday -> 4 blanks */}
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} />
              ))}
              {calendarDays.map((day) => {
                const dayStr = `2026-05-${day < 10 ? "0" + day : day}`;
                
                // Assess if day matches bookings date
                const hasBooking = (subTab === "my" ? bookings : portalBookings).some(b => b.dateTime.startsWith(dayStr));
                const isSelected = selectedDateFilter === dayStr;
                const isToday = day === 22; // Slide base anchor is May 22, 2026
                
                return (
                  <button 
                    key={day} 
                    type="button"
                    onClick={() => setSelectedDateFilter(dayStr)}
                    className={`py-2 rounded-xl border relative flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                      isSelected 
                        ? "border-blue-600 bg-blue-600 text-white font-extrabold shadow-sm" 
                        : isToday 
                          ? "border-emerald-600 bg-emerald-50 text-emerald-850 font-extrabold" 
                          : "border-slate-100 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50"
                    }`}
                  >
                    <span className="text-[11px] font-mono">{day}</span>
                    {hasBooking && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? "bg-white" : "bg-amber-500"}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100 text-[10px] font-sans leading-relaxed text-slate-500">
              <div className="flex justify-between">
                <span>🟢 Today: May 22</span>
                <span className="font-bold">🔵 Selected Date: Day {selectedDateFilter.split("-")[2] || "23"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Listings column rendering on the right or full block depending on view mode */}
        <div className={`${viewMode === "calendar" ? "lg:col-span-7" : "lg:col-span-12"} space-y-4`}>
          
          {/* Header of Listings panel if calendar mode active */}
          {viewMode === "calendar" && (
            <div className="flex justify-between items-center text-xs font-black uppercase text-slate-800 tracking-wide pb-1 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
              <span>Runs schedule: {selectedDateFilter}</span>
              <span className="bg-slate-205 border px-2 py-0.5 rounded font-mono text-[10px] text-slate-600 normal-case bg-white">
                {activeDisplayListings.length} {activeDisplayListings.length === 1 ? 'duty' : 'duties'}
              </span>
            </div>
          )}

          {/* Cards Loop layout */}
          <div className={`grid gap-4 ${viewMode === "calendar" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
            
            {activeDisplayListings.length === 0 ? (
              <div className="col-span-full py-16 bg-white border border-slate-150 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-slate-300" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 tracking-tight">No Prebookings Found</h4>
                  {viewMode === "calendar" ? (
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-normal">
                      Relax! No duties scheduled for <strong className="text-slate-500 font-mono font-bold">{selectedDateFilter}</strong> under "{subTab === "my" ? "My Bookings" : "Portal Bookings"}".
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-normal">
                      No customer bookings fit safety filters or query parameters for this category selection.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              activeDisplayListings.map((b) => {
                const bDateStr = b.dateTime.split("T")[0];
                const bTimeStr = b.dateTime.split("T")[1] || "";
                
                // Formulate date nicely for displays matching May 18 10:40 format
                const dateObj = new Date(b.dateTime);
                const monthStr = dateObj.toLocaleDateString("en", { month: "short" });
                const dayNum = dateObj.getDate();
                const displayFormattedDate = `${monthStr} ${dayNum} ${bTimeStr}`;

                const isMyBookMyTab = subTab === "my";
                const isPending = b.status === "pending";
                const isCopied = copiedId === b.id;

                return (
                  <div 
                    key={b.id} 
                    className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-sm transition-all duration-150 ${
                      !isPending ? "border-emerald-300 ring-2 ring-emerald-500/5 bg-emerald-50/5" : "border-slate-150"
                    }`}
                  >
                    {/* Upper Line segment */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {/* Circle initial or status indicator */}
                          <div className="relative">
                            <div className="w-8 h-8 bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center rounded-full border border-blue-50">
                              {b.customerName.charAt(0)}
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white absolute -bottom-0.5 -right-0.5 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 leading-tight block">{b.customerName}</span>
                            {b.companyName ? (
                              <span className="text-[9.5px] font-bold text-indigo-600 tracking-wide font-mono block mt-0.5">{b.companyName}</span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-medium block">Private transfer</span>
                            )}
                          </div>
                        </div>

                        {/* Visual view/edit list icon selectors */}
                        <div className="flex gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForDetails(b)}
                            className="p-1.5 border border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg transition"
                            title="Quick view coordinates"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                          
                          {isMyBookMyTab && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBookingForEdit(b);
                                  setShowForm(false);
                                }}
                                className="p-1.5 border border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg transition"
                                title="Edit booking details"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => onDeleteBooking(b.id)}
                                className="p-1.5 border border-slate-100 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                title="Deallocate prebooking"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Airport and Meet&Greet tags row */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {b.flightNumber ? (
                          <span className="bg-amber-50 border border-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                            <Plane className="w-2.5 h-2.5 text-amber-600" />
                            Airport Transfer
                          </span>
                        ) : (
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md">
                            Standard Cabin
                          </span>
                        )}
                        {b.meetAndGreet && (
                          <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                            Meet &amp; Greet
                          </span>
                        )}
                        {b.childSeat && (
                          <span className="bg-blue-50 border border-blue-100 text-blue-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md">
                            Child Booster
                          </span>
                        )}
                      </div>

                      {/* Contact row with WhatsApp, Call and Message buttons */}
                      <div className="flex items-center justify-between bg-slate-50/60 p-2 rounded-xl text-xs font-sans text-slate-700">
                        <span className="font-mono text-[10.5px] font-semibold tracking-wide">{b.phone}</span>
                        <div className="flex gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`tel:${b.phone}`, "_self");
                            }}
                            className="bg-white border rounded-lg p-1 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition"
                            title="Call customer via phone"
                          >
                            <Phone className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerWhatsAppMsg(b)}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 rounded-lg p-1 transition"
                            title="Launch Chat on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Pickup Destination Visual map routes segment */}
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="flex items-start gap-1.5 font-sans justify-between">
                          <div className="flex items-start gap-1.5 min-w-0 flex-1">
                            <span className="text-[10px] leading-tight font-black uppercase text-emerald-600 shrink-0 w-12 pt-0.5">Pickup</span>
                            <span className="text-slate-705 font-medium flex-1 overflow-hidden text-ellipsis line-clamp-1 break-all" title={b.pickupAddress}>{b.pickupAddress}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => triggerMapDirections(b.pickupAddress, settings.preferredMap)}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition ml-1 shrink-0 bg-slate-50 border border-slate-100"
                            title={`Navigate pickup via ${settings.preferredMap || "Google"} Maps`}
                          >
                            <Navigation className="w-3.5 h-3.5 transform rotate-45" />
                          </button>
                        </div>
                        <div className="flex items-start gap-1.5 font-sans justify-between pt-1 border-t border-slate-50">
                          <div className="flex items-start gap-1.5 min-w-0 flex-1">
                            <span className="text-[10px] leading-tight font-black uppercase text-rose-600 shrink-0 w-12 pt-0.5">Dropoff</span>
                            <span className="text-slate-705 font-medium flex-1 overflow-hidden text-ellipsis line-clamp-1 break-all" title={b.destinationAddress}>{b.destinationAddress}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => triggerMapDirections(b.destinationAddress, settings.preferredMap)}
                            className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition ml-1 shrink-0 bg-slate-50 border border-slate-100"
                            title={`Navigate destination via ${settings.preferredMap || "Google"} Maps`}
                          >
                            <Navigation className="w-3.5 h-3.5 transform rotate-45" />
                          </button>
                        </div>
                      </div>

                      {/* Metrics 3-column Grid Footer inside card */}
                      <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-50 text-[10px] font-sans">
                        <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2 font-mono flex flex-col justify-between items-center text-center">
                          <span className="text-[8.5px] font-bold text-slate-400 block uppercase">DATE &amp; TIME</span>
                          <span className="text-slate-800 font-bold block mt-1 leading-snug">{displayFormattedDate}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2 font-mono flex flex-col justify-between items-center text-center">
                          <span className="text-[8.5px] font-bold text-slate-400 block uppercase">DISTANCE</span>
                          <span className="text-slate-800 font-bold block mt-1 leading-snug">{b.distanceMiles} miles</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2 font-mono flex flex-col justify-between items-center text-center">
                          <span className="text-[8.5px] font-bold text-slate-400 block uppercase">FARE PRICE</span>
                          <span className="text-indigo-600 font-bold text-[11px] block mt-1 leading-snug">£{b.fareGbp.toFixed(2)}</span>
                        </div>
                      </div>

                    </div>

                    {/* Operational Actions section */}
                    <div className="pt-2">
                      {isMyBookMyTab ? (
                        /* PERSONAL BOOKINGS */
                        isPending ? (
                          <button
                            type="button"
                            onClick={() => handleStartJob(b)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-600/10"
                          >
                            <Play className="w-3.5 h-3.5 animate-pulse" />
                            ▷ Start Job
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleCompletePayment(b, "card")}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans text-[10.5px] font-extrabold rounded-xl cursor-pointer shadow-xs"
                            >
                              Visa/Card Pay
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCompletePayment(b, "cash")}
                              className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 text-white font-sans text-[10.5px] font-extrabold rounded-xl cursor-pointer shadow-xs"
                            >
                              Cash Pay
                            </button>
                          </div>
                        )
                      ) : (
                        /* PORTAL PUBLIC POOL BOOKINGS (CLAIM ABILITY) */
                        <button
                          type="button"
                          onClick={() => handleClaimPortalBooking(b)}
                          className="w-full py-2 border border-blue-600 hover:bg-blue-50 text-blue-700 font-sans text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-xs bg-white bg-opacity-80"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                          Accept &amp; Claim Run
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

          </div>
        </div>

      </div>

      {/* 6. Dynamic Edit Booking Modal Overlay */}
      {selectedBookingForEdit && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleEditSave}
            className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] text-xs font-sans text-slate-700"
          >
            <div className="flex justify-between items-center border-b border-indigo-50 pb-3">
              <span className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-indigo-600" /> Edit Duty Prebooking
              </span>
              <button 
                type="button" 
                onClick={() => setSelectedBookingForEdit(null)} 
                className="p-1 hover:bg-slate-50 rounded-full"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={selectedBookingForEdit.customerName}
                  onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, customerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2.5 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Company / Note</label>
                <input
                  type="text"
                  value={selectedBookingForEdit.companyName || ""}
                  onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Mobile Contact Phone</label>
                <div className="flex gap-1.5">
                  <select
                    value={selectedBookingForEdit.countryCode || "+44"}
                    onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, countryCode: e.target.value })}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-bold focus:outline-none text-slate-700"
                  >
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+61">🇦🇺 +61</option>
                  </select>
                  <input
                    type="tel"
                    required
                    value={selectedBookingForEdit.phone}
                    onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, phone: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-mono text-slate-850"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Flight Number</label>
                <input
                  type="text"
                  value={selectedBookingForEdit.flightNumber || ""}
                  onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, flightNumber: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono uppercase text-slate-800"
                  placeholder="BA1478"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Pickup Coordinates</label>
              <input
                type="text"
                required
                value={selectedBookingForEdit.pickupAddress}
                onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, pickupAddress: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2.5 text-xs text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Destination Address Coordinates</label>
              <input
                type="text"
                required
                value={selectedBookingForEdit.destinationAddress}
                onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, destinationAddress: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2.5 text-xs text-slate-800 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Date &amp; Time Dispatch</label>
                <input
                  type="datetime-local"
                  required
                  value={selectedBookingForEdit.dateTime}
                  onChange={(e) => setSelectedBookingForEdit({ ...selectedBookingForEdit, dateTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Distance &amp; Fare recalculator</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={selectedBookingForEdit.distanceMiles}
                    onChange={(e) => {
                      const miles = parseFloat(e.target.value) || 0;
                      const newF = calculateProposedFare(miles, selectedBookingForEdit.meetAndGreet, selectedBookingForEdit.childSeat);
                      setSelectedBookingForEdit({ ...selectedBookingForEdit, distanceMiles: miles, fareGbp: newF });
                    }}
                    className="w-16 bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono font-bold text-slate-800 text-center"
                  />
                  
                  <div className="flex-1 bg-slate-900 px-3 py-1.5 rounded-lg text-white flex flex-col justify-center items-center font-mono">
                    <span className="text-[8px] text-slate-400 leading-tight">FARE CALCULATED</span>
                    <strong className="text-blue-400 text-xs">£{(selectedBookingForEdit.fareGbp || 0).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1 font-sans text-[11px] text-slate-505">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedBookingForEdit.meetAndGreet} 
                  onChange={(e) => {
                    const check = e.target.checked;
                    const newF = calculateProposedFare(selectedBookingForEdit.distanceMiles, check, selectedBookingForEdit.childSeat);
                    setSelectedBookingForEdit({ ...selectedBookingForEdit, meetAndGreet: check, fareGbp: newF });
                  }} 
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer" 
                />
                <span>Meet &amp; Greet VIP (+£{settings.rates.meetGreetFee})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedBookingForEdit.childSeat} 
                  onChange={(e) => {
                    const check = e.target.checked;
                    const newF = calculateProposedFare(selectedBookingForEdit.distanceMiles, selectedBookingForEdit.meetAndGreet, check);
                    setSelectedBookingForEdit({ ...selectedBookingForEdit, childSeat: check, fareGbp: newF });
                  }} 
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer" 
                />
                <span>Provide Booster Seat (+£10)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button 
                type="button" 
                onClick={() => setSelectedBookingForEdit(null)} 
                className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-xs text-slate-500 cursor-pointer hover:bg-slate-50"
              >
                Close
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. Right Slider Drawer Booking Details Coordinate Panel (replicates 2nd slide) */}
      {selectedBookingForDetails && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-3xs flex justify-end z-50 animate-fade-in">
          {/* Closer background backdrop click */}
          <div className="flex-1" onClick={() => setSelectedBookingForDetails(null)} />
          
          <div className="bg-white border-l border-slate-200/80 w-full max-w-sm h-full p-6 flex flex-col justify-between shadow-2xl animate-slide-left relative z-10 text-slate-800">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="text-xs font-black uppercase text-indigo-700 tracking-wider">Ride Details Data Sheet</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Reference: {selectedBookingForDetails.id}</span>
                </div>
                <button 
                  onClick={() => setSelectedBookingForDetails(null)} 
                  className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-xl"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Data fields of detailed coordinate drawer */}
              <div className="space-y-4 text-xs">
                
                {/* Visual Header Initials and status dot */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-800 font-black text-lg flex items-center justify-center rounded-3xl border border-indigo-100">
                    {selectedBookingForDetails.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">{selectedBookingForDetails.customerName}</h4>
                    {selectedBookingForDetails.companyName && (
                      <span className="text-[10px] bg-slate-100 font-bold text-slate-650 px-2 py-0.5 rounded-md mt-1 inline-block">Corp: {selectedBookingForDetails.companyName}</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3.5 leading-relaxed font-sans text-slate-705">
                  <div className="flex items-start gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Phone No:</span>
                    <strong className="text-slate-800 font-mono">{selectedBookingForDetails.phone}</strong>
                  </div>

                  {/* Stunning graphical PICKUP matching screenshot */}
                  <div className="bg-[#f2fdf7] border border-emerald-100 p-4 rounded-2xl flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-650 shrink-0">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">Pickup</span>
                        <p className="text-slate-900 font-bold text-xs mt-0.5 truncate" title={selectedBookingForDetails.pickupAddress}>
                          {selectedBookingForDetails.pickupAddress}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerMapDirections(selectedBookingForDetails.pickupAddress, settings.preferredMap)}
                      className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center shadow-xs"
                      title={`Open in ${settings.preferredMap || "Google"} Maps`}
                    >
                      <Navigation className="w-4 h-4 transform rotate-45" />
                    </button>
                  </div>

                  {/* Stunning graphical DESTINATION matching screenshot */}
                  <div className="bg-[#fff5f5] border border-rose-100 p-4 rounded-2xl flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-650 shrink-0">
                        <MapPin className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider block font-black text-rose-700">Destination</span>
                        <p className="text-slate-900 font-bold text-xs mt-0.5 truncate" title={selectedBookingForDetails.destinationAddress}>
                          {selectedBookingForDetails.destinationAddress}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerMapDirections(selectedBookingForDetails.destinationAddress, settings.preferredMap)}
                      className="p-2 bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-rose-600 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center shadow-xs"
                      title={`Open in ${settings.preferredMap || "Google"} Maps`}
                    >
                      <Navigation className="w-4 h-4 transform rotate-45" />
                    </button>
                  </div>

                  <div className="flex items-start gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Dispatch Time:</span>
                    <strong className="text-indigo-800">{selectedBookingForDetails.dateTime.replace("T", " ")}</strong>
                  </div>

                  <div className="flex items-start gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Distance:</span>
                    <strong className="text-slate-800 font-mono">{selectedBookingForDetails.distanceMiles} miles</strong>
                  </div>

                  <div className="flex items-start gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Fare offering:</span>
                    <strong className="text-emerald-700 text-sm font-black">£{selectedBookingForDetails.fareGbp.toFixed(2)}</strong>
                  </div>

                  <div className="flex items-start gap-1 border-t border-slate-200/50 pt-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Ride Status:</span>
                    <span className="font-mono text-[10px] uppercase font-extrabold text-blue-600 tracking-wider">
                      {selectedBookingForDetails.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Additional VIP checkmarks details */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider font-mono">Duty Extras Included</span>
                  <div className="space-y-1 text-[11.5px] font-medium text-slate-600 leading-normal">
                    {selectedBookingForDetails.meetAndGreet ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg font-bold">
                        <Check className="w-4 h-4" /> Meet &amp; Greet VIP (£{settings.rates.meetGreetFee})
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 p-1.5 border border-dashed rounded-lg">
                        ✗ No Meet &amp; Greet
                      </div>
                    )}
                    
                    {selectedBookingForDetails.childSeat ? (
                      <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-100 p-1.5 rounded-lg font-bold">
                        <Check className="w-4 h-4" /> Booster child Seat provided (£10.00)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 p-1.5 border border-dashed rounded-lg">
                        ✗ No child seat required
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100">
              {selectedBookingForDetails.status === "pending" ? (
                <button
                  onClick={() => {
                    handleStartJob(selectedBookingForDetails);
                  }}
                  className="w-full bg-slate-900 text-white font-sans text-xs py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400" /> Dispatch &amp; Start Job
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCompletePayment(selectedBookingForDetails, "card")}
                    className="bg-blue-600 text-white font-sans text-xs py-3 rounded-xl font-bold hover:bg-blue-700 transition cursor-pointer"
                  >
                    Card Payment
                  </button>
                  <button
                    onClick={() => handleCompletePayment(selectedBookingForDetails, "cash")}
                    className="bg-slate-950 text-white font-sans text-xs py-3 rounded-xl font-bold hover:bg-slate-900 transition cursor-pointer"
                  >
                    Cash Payment
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setSelectedBookingForDetails(null)}
                className="w-full bg-slate-100 text-slate-500 font-sans text-xs py-2.5 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Close Data Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Dynamic Flight Tracker Modal Detail Box */}
      {activeFlightInfo && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in animate-scale-up">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl text-slate-700 text-xs">
            <div className="flex justify-between items-center border-b border-indigo-50 pb-3">
              <span className="text-[11px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                <Plane className="w-4 h-4 text-indigo-600" /> Airport SkyTracker Radar
              </span>
              <button onClick={() => setActiveFlightInfo(null)} className="p-1 hover:bg-slate-50 rounded-full">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-black text-slate-950 tracking-tight font-mono">{activeFlightInfo.number}</span>
                <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded">
                  {activeFlightInfo.status}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Departure Port:</span>
                  <strong className="text-slate-800 font-medium">{activeFlightInfo.dep}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Landing Scheduled:</span>
                  <strong className="text-indigo-700 font-black font-semibold">{activeFlightInfo.eta}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Gate Terminal:</span>
                  <strong className="text-slate-800 font-mono font-bold">{activeFlightInfo.gate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Luggage Belt No:</span>
                  <strong className="text-slate-850 font-mono font-bold">{activeFlightInfo.belt}</strong>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setActiveFlightInfo(null)}
              className="w-full bg-slate-900 text-white font-sans text-xs py-3 rounded-xl font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Close flight monitor
            </button>
          </div>
        </div>
      )}

      {/* 9. Twilio SMS simulator Popup */}
      {trackingSessionId && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-500" /> Twilio Dispatch SMS Dispatched
              </span>
              <button onClick={() => setTrackingSessionId(null)} className="p-1 hover:bg-slate-800 rounded-full">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <p className="text-slate-350 leading-relaxed">
                {settings.profile.fullName || "The driver"} has started this prebooked job! FareFreedom has securely processed and transmitted your localized private hire SMS:
              </p>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-blue-300 font-mono text-[10px] break-all leading-relaxed">
                {`https://yourtaximate.dev/track/${trackingSessionId}`}
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-slate-400 leading-relaxed space-y-1.5">
                <span className="text-[9px] text-slate-500 uppercase font-bold font-mono">SMS Message Content:</span>
                <p className="font-mono text-[10px] text-slate-300">
                  {`“Your driver is on the way in their ${settings.profile.vehicleColor} ${settings.profile.vehicleMake} ${settings.profile.vehicleModel} (${settings.profile.vehicleReg}). Tracking link: https://yourtaximate.dev/track/${trackingSessionId}”`}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setTrackingSessionId(null)}
              className="w-full bg-blue-600 text-white font-sans text-xs py-3 rounded-xl font-bold hover:bg-blue-700 transition cursor-pointer text-center"
            >
              Dismiss Dispatch Tracker
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
