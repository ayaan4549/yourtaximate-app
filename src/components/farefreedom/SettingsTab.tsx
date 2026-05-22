import React, { useState, useEffect } from "react";
import { AppSettings, ComplianceDocument, VehicleTypeFare } from "../../types";
import { 
  Settings, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Bell, 
  Car, 
  DollarSign, 
  Send, 
  MessageSquare,
  Link,
  Copy,
  ExternalLink,
  Check,
  Smartphone,
  Sliders,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  X,
  Map
} from "lucide-react";

const defaultDocs: ComplianceDocument[] = [
  { id: "doc-dbs", type: "dbs", name: "Enhanced DBS Check / Disclosure Certificate", status: "Verified", expiryDate: "2027-05-18" },
  { id: "doc-pco", type: "pco", name: "TfL PHV Driver Badge / PCO Card", status: "Verified", expiryDate: "2026-11-20" },
  { id: "doc-licence", type: "licence", name: "UK DVLA Driving Licence", status: "Verified", expiryDate: "2029-08-14" },
  { id: "doc-insurance", type: "insurance", name: "Hire & Reward Private Hire Insurance", status: "Verified", expiryDate: "2026-12-15" },
  { id: "doc-mot", type: "mot", name: "MOT Compliance Certificate", status: "Verified", expiryDate: "2027-02-10" }
];

const defaultVehicleTypes: VehicleTypeFare[] = [
  { id: "vt-exec", name: "Executive Sedan/Saloon (e.g., E-Class)", baseFare: 4.50, perMileRate: 2.20, perMinuteRate: 0.45, enabled: true },
  { id: "vt-mpv", name: "Multi-Passenger MPV (e.g., Sharan/Prius+)", baseFare: 6.00, perMileRate: 2.80, perMinuteRate: 0.55, enabled: true },
  { id: "vt-vip", name: "VIP Chauffeur (e.g., S-Class/V-Class)", baseFare: 12.00, perMileRate: 4.50, perMinuteRate: 0.85, enabled: false }
];

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export function SettingsTab({ settings, onUpdateSettings }: SettingsTabProps) {
  // Temporary local states to allow saving via "Save Settings" button
  const [fullName, setFullName] = useState(settings.profile.fullName);
  const [contactNumber, setContactNumber] = useState(settings.profile.contactNumber);
  const [vehicleMake, setVehicleMake] = useState(settings.profile.vehicleMake);
  const [vehicleModel, setVehicleModel] = useState(settings.profile.vehicleModel);
  const [vehicleReg, setVehicleReg] = useState(settings.profile.vehicleReg);
  const [vehicleColor, setVehicleColor] = useState(settings.profile.vehicleColor);

  const [baseFare, setBaseFare] = useState(settings.rates.baseFare);
  const [perMileRate, setPerMileRate] = useState(settings.rates.perMileRate);
  const [perMinuteRate, setPerMinuteRate] = useState(settings.rates.perMinuteRate);
  const [meetGreetFee, setMeetGreetFee] = useState(settings.rates.meetGreetFee);
  const [airportTollCharge, setAirportTollCharge] = useState(settings.rates.airportTollCharge);

  const [smsConf, setSmsConf] = useState(settings.templates.bookingConfirmation);
  const [smsWay, setSmsWay] = useState(settings.templates.onMyWay);
  const [smsReceipt, setSmsReceipt] = useState(settings.templates.receiptThankYou);

  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [currency, setCurrency] = useState(settings.currency);
  const [notifications, setNotifications] = useState(settings.notificationsEnabled);
  const [preferredMap, setPreferredMap] = useState(settings.preferredMap ?? "google");

  // Twilio configured integrations states
  const [twilioEnabled, setTwilioEnabled] = useState(settings.twilio?.enabled ?? false);
  const [twilioAccountSid, setTwilioAccountSid] = useState(settings.twilio?.accountSid ?? "");
  const [twilioAuthToken, setTwilioAuthToken] = useState(settings.twilio?.authToken ?? "");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState(settings.twilio?.phoneNumber ?? "");

  // Compliance state tracker
  const [documents, setDocuments] = useState<ComplianceDocument[]>(settings.documents ?? defaultDocs);

  // Vehicle type configure list
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeFare[]>(settings.vehicleTypes ?? defaultVehicleTypes);

  // Modal State Controllers
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  
  // Modal Fields
  const [modalVehicleName, setModalVehicleName] = useState("");
  const [modalIcon, setModalIcon] = useState("🚗");
  const [modalMaxPassengers, setModalMaxPassengers] = useState(4);
  const [modalMaxLuggage, setModalMaxLuggage] = useState(3);
  const [modalDescription, setModalDescription] = useState("");
  const [modalBaseFare, setModalBaseFare] = useState(20.00);
  const [modalPerMileRate, setModalPerMileRate] = useState(1.85);
  const [modalPerMinuteRate, setModalPerMinuteRate] = useState(0.35);
  const [modalMeetGreetFee, setModalMeetGreetFee] = useState(8.00);
  const [modalAirportToll, setModalAirportToll] = useState(7.00);

  const openAddVehicleModal = () => {
    setEditingVehicleId(null);
    setModalVehicleName("");
    setModalIcon("🚗");
    setModalMaxPassengers(4);
    setModalMaxLuggage(3);
    setModalDescription("");
    setModalBaseFare(20.00);
    setModalPerMileRate(1.85);
    setModalPerMinuteRate(0.35);
    setModalMeetGreetFee(8.00);
    setModalAirportToll(7.00);
    setIsVehicleModalOpen(true);
  };

  const openEditVehicleModal = (vt: VehicleTypeFare) => {
    setEditingVehicleId(vt.id);
    setModalVehicleName(vt.name);
    setModalIcon(vt.icon || "🚗");
    setModalMaxPassengers(vt.maxPassengers ?? 4);
    setModalMaxLuggage(vt.maxLuggage ?? 3);
    setModalDescription(vt.description ?? "");
    setModalBaseFare(vt.baseFare);
    setModalPerMileRate(vt.perMileRate);
    setModalPerMinuteRate(vt.perMinuteRate ?? 0.35);
    setModalMeetGreetFee(vt.meetGreetFee ?? 8.00);
    setModalAirportToll(vt.airportTollCharge ?? 7.00);
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicleModal = () => {
    if (!modalVehicleName.trim()) {
      alert("Please enter a vehicle classification name");
      return;
    }

    if (editingVehicleId) {
      // Edit mode
      setVehicleTypes(prev => prev.map(vt => vt.id === editingVehicleId ? {
        ...vt,
        name: modalVehicleName,
        icon: modalIcon,
        maxPassengers: modalMaxPassengers,
        maxLuggage: modalMaxLuggage,
        description: modalDescription,
        baseFare: modalBaseFare,
        perMileRate: modalPerMileRate,
        perMinuteRate: modalPerMinuteRate,
        meetGreetFee: modalMeetGreetFee,
        airportTollCharge: modalAirportToll,
      } : vt));
    } else {
      // Add mode
      const newVt: VehicleTypeFare = {
        id: "vt-" + Date.now(),
        name: modalVehicleName,
        icon: modalIcon,
        maxPassengers: modalMaxPassengers,
        maxLuggage: modalMaxLuggage,
        description: modalDescription,
        baseFare: modalBaseFare,
        perMileRate: modalPerMileRate,
        perMinuteRate: modalPerMinuteRate,
        meetGreetFee: modalMeetGreetFee,
        airportTollCharge: modalAirportToll,
        enabled: true
      };
      setVehicleTypes(prev => [...prev, newVt]);
    }
    setIsVehicleModalOpen(false);
  };

  const handleDeleteVehicleType = (id: string) => {
    setVehicleTypes(prev => prev.filter(vt => vt.id !== id));
  };

  const handleToggleVehicleEnabled = (id: string) => {
    setVehicleTypes(prev => prev.map(vt => vt.id === id ? { ...vt, enabled: !vt.enabled } : vt));
  };

  // Copy booking slug URL dynamic variables helper
  const [copied, setCopied] = useState(false);
  const bookingSlug = fullName ? fullName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "driver";
  const [bookingUrl, setBookingUrl] = useState(`https://yourtaximate.dev/book/${bookingSlug}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBookingUrl(`${window.location.origin}/book/${bookingSlug}`);
    }
  }, [bookingSlug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Success indicator
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveWholeSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: AppSettings = {
      darkMode,
      country: currency === "GBP" ? "UK" : currency === "EUR" ? "EU" : "US",
      currency,
      notificationsEnabled: notifications,
      preferredMap,
      profile: {
        fullName,
        contactNumber,
        vehicleMake,
        vehicleModel,
        vehicleReg,
        vehicleColor
      },
      rates: {
        baseFare,
        perMileRate,
        perMinuteRate,
        meetGreetFee,
        airportTollCharge
      },
      templates: {
        bookingConfirmation: smsConf,
        onMyWay: smsWay,
        receiptThankYou: smsReceipt
      },
      twilio: {
        enabled: twilioEnabled,
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        phoneNumber: twilioPhoneNumber
      },
      documents,
      vehicleTypes
    };

    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const requestBrowserNotificationAccess = () => {
    if (!("Notification" in window)) {
      alert("This browser engine does not support local OS push alerts.");
      return;
    }
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        setNotifications(true);
        new Notification("FareFreedom Enabled", { body: "Push notifications are successfully subscribed in sandbox environment." });
      } else {
        alert("Push notifications denied by user.");
      }
    });
  };

  return (
    <form onSubmit={handleSaveWholeSettings} className="space-y-6">
      
      {/* Settings Tab head banner */}
      <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">Control Preferences Center</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Customize metric formulas, dispatch variables, and user profiles</p>
        </div>

        <div className="flex items-center gap-2.5">
          {saveSuccess && (
            <span className="text-[10px] bg-emerald-100 border border-emerald-250 text-emerald-800 px-3 py-1.5 rounded-lg font-bold font-sans animate-bounce">
              ✓ Core Settings Saved Successfully!
            </span>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadowcursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 Columns): Profiles, Tariff rates & SMS Templates */}
        <div className="lg:col-span-8 space-y-6">

          {/* Customer Booking Link */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Link className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wide">Customer Booking Link</span>
            </div>
            
            <p className="text-[11px] text-slate-400 font-sans leading-normal">
              Share this link with customers so they can book rides directly with you. The slug handles dynamically based on your licensee name.
            </p>

            <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 p-2 rounded-xl">
              <input
                type="text"
                readOnly
                value={bookingUrl}
                className="flex-1 bg-transparent border-none text-xs text-slate-705 outline-none font-sans font-medium"
                id="booking-link-input"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  copied 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
                id="copy-booking-link-btn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Slug handle: <strong className="font-mono text-indigo-600">/{bookingSlug}</strong></span>
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, "", `/book/${bookingSlug}`);
                  window.dispatchEvent(new Event("popstate"));
                }}
                className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition cursor-pointer"
                id="test-customer-view-btn"
              >
                Launch Active Booking Page <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Box 1: Driver Bio & PHV Details */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Car className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wide">Licensee Profile Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Driver's Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Direct Contact Telephone</label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Make / Brand</label>
                <input
                  type="text"
                  required
                  placeholder="Toyota"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Model class</label>
                <input
                  type="text"
                  required
                  placeholder="Prius Plus"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">TfL Reg Plate</label>
                <input
                  type="text"
                  required
                  placeholder="LN71 PCO"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Exterior Colour</label>
                <input
                  type="text"
                  required
                  placeholder="Silver Metallic"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Box 2: Automated custom rates pricing */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wide">Dynamic Tariffs Pricing Core</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-sans">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Base Flag Drop (£)</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={baseFare}
                  onChange={(e) => setBaseFare(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Rate / Mile (£)</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={perMileRate}
                  onChange={(e) => setPerMileRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Rate / Min (£)</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={perMinuteRate}
                  onChange={(e) => setPerMinuteRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Meet &amp; Greet VIP</label>
                <input
                  type="number"
                  step="0.50"
                  required
                  value={meetGreetFee}
                  onChange={(e) => setMeetGreetFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Airport Toll Charge</label>
                <input
                  type="number"
                  step="0.50"
                  required
                  value={airportTollCharge}
                  onChange={(e) => setAirportTollCharge(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Types & Fares Pricing Matrix */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black uppercase text-slate-800 tracking-wide">Vehicle Types &amp; Fares</span>
              </div>
              <button
                type="button"
                onClick={openAddVehicleModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Vehicle Type
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400 font-sans leading-normal">
              Configure independent base rates, mileage multipliers, and scheduling durations for each vehicle classification you offer.
            </p>

            <div className="space-y-3">
              {vehicleTypes.map((vt) => (
                <div key={vt.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  vt.enabled 
                    ? "bg-white border-slate-100 shadow-xs" 
                    : "bg-slate-50/45 border-slate-100 opacity-60"
                }`}>
                  <div className="flex items-center gap-3">
                    {/* Vehicle Icon Badge */}
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-xl shadow-xs shrink-0 select-none">
                      {vt.icon || "🚗"}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800 tracking-tight">{vt.name}</span>
                        {vt.maxPassengers && (
                          <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {vt.maxPassengers} pax · {vt.maxLuggage ?? 3} bags
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                        {vt.description || `${vt.maxPassengers ?? 4} passengers - ${vt.maxLuggage ?? 3} bags`}
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono font-medium pt-0.5">
                        Base <strong className="text-slate-700 font-bold">£{(vt.baseFare ?? 0).toFixed(2)}</strong> · /mi <strong className="text-slate-700 font-bold">£{(vt.perMileRate ?? 0).toFixed(2)}</strong> · M&amp;G <strong className="text-slate-700 font-bold">£{(vt.meetGreetFee ?? 8.00).toFixed(2)}</strong> · Airport <strong className="text-slate-700 font-bold">£{(vt.airportTollCharge ?? 7.00).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditVehicleModal(vt)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-50 cursor-pointer transition"
                      title="Edit rates"
                    >
                      <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVehicleEnabled(vt.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer transition"
                      title={vt.enabled ? "Disable this type" : "Enable this type"}
                    >
                      {vt.enabled ? (
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-405" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicleType(vt.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-550 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition"
                      title="Delete classification"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Box 3: Custom merge code SMS templates variables */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wide">Custom merged SMS notifications</span>
            </div>

            <p className="text-[10.5px] text-slate-400 font-sans leading-normal">
              Merge code variables available swap dynamically: <strong>{`{name}, {date}, {time}, {pickup}, {destination}, {driver}, {make}, {model}, {reg}, {color}, {fare}, {payment}, {link}`}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">SMS Template 1: Booking Confirmation Template</label>
                <textarea
                  value={smsConf}
                  onChange={(e) => setSmsConf(e.target.value)}
                  className="w-full h-16 bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-sans leading-relaxed text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">SMS Template 2: On My Way Carrier dispatch</label>
                <textarea
                  value={smsWay}
                  onChange={(e) => setSmsWay(e.target.value)}
                  className="w-full h-16 bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-sans leading-relaxed text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">SMS Template 3: Client Finished receipt &amp; Invoice</label>
                <textarea
                  value={smsReceipt}
                  onChange={(e) => setSmsReceipt(e.target.value)}
                  className="w-full h-16 bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-sans leading-relaxed text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Bring Your Own SMS Network (Twilio) */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black uppercase text-slate-800 tracking-wide">Bring Your Own SMS Network</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twilioEnabled}
                  onChange={(e) => setTwilioEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              Connect your own Twilio account to send SMS from your number at your own cost — no platform credits used. Defaults to YourTaxiMate carrier sandbox if disabled.
            </p>

            {twilioEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-sans animate-fade-in">
                <div>
                  <label className="text-[9px] text-slate-500 font-bold block mb-1">Twilio Account SID</label>
                  <input
                    type="text"
                    required
                    placeholder="ACxxxxxxxxxxxxxxxx"
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-bold block mb-1">Twilio Auth Token</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••••••"
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-bold block mb-1">Twilio Phone / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="+447700900000"
                    value={twilioPhoneNumber}
                    onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (4 Columns): UI, Localization, push settings */}
        <div className="lg:col-span-4 space-y-5">

          {/* Verification Documents UK Compliance */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 text-xs font-sans">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wide">Verification Documents</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              UK driver compliance registry. DBS, PHV badge, licence, insurance, and MOT records must remain authentic to bypass platform locks.
            </p>

            <div className="space-y-3">
              {documents.map((doc, index) => {
                let statusStyle = "";
                if (doc.status === "Verified") {
                  statusStyle = "bg-emerald-50 border-emerald-100 text-emerald-800";
                } else if (doc.status === "Pending") {
                  statusStyle = "bg-blue-50 border-blue-100 text-blue-700 animate-pulse";
                } else if (doc.status === "Expired") {
                  statusStyle = "bg-rose-50 border-rose-100 text-rose-800";
                } else {
                  statusStyle = "bg-slate-50 border-slate-200 text-slate-500";
                }

                return (
                  <div key={doc.id} className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="font-bold text-slate-800 text-[10.5px]">{doc.name}</span>
                      <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 border rounded ${statusStyle}`}>
                        {doc.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Expires:</span>
                        <input
                          type="date"
                          value={doc.expiryDate}
                          onChange={(e) => {
                            const updated = [...documents];
                            updated[index].expiryDate = e.target.value;
                            
                            // Auto expired evaluation
                            const chosenDate = new Date(e.target.value);
                            const today = new Date();
                            if (chosenDate < today) {
                              updated[index].status = "Expired";
                            } else if (updated[index].status === "Expired") {
                              updated[index].status = "Verified";
                            }
                            setDocuments(updated);
                          }}
                          className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-600 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...documents];
                          updated[index].status = "Pending";
                          setDocuments(updated);
                          alert(`${doc.name} update uploaded successfully! Marked as "Pending Verification" review.`);
                        }}
                        className="text-[9.5px] text-blue-600 hover:text-blue-700 font-extrabold cursor-pointer hover:underline"
                      >
                        [Re-upload]
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Box 4: Styling preferences */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 font-sans text-xs">
            <span className="text-xs font-extrabold uppercase text-slate-800 tracking-wide border-b border-slate-50 pb-2 block">
              Preferences &amp; Styling
            </span>

            <div className="space-y-4">
              
              {/* Toggle Dark Mode */}
              <div className="flex justify-between items-center text-slate-700 font-semibold">
                <span className="flex items-center gap-1.5 font-bold">
                  {darkMode ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  Night Mode Canvas
                </span>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">System localization Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-bold focus:outline-none focus:bg-white text-slate-700"
                >
                  <option value="GBP">🇬🇧 Great British Pound Sterling (£)</option>
                  <option value="USD">🇺🇸 United States Dollar ($)</option>
                  <option value="EUR">🇪🇺 European Single Euro (€)</option>
                </select>
              </div>

              {/* Map Provider Selector */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Preferred Dispatch Navigation Map</label>
                <select
                  value={preferredMap}
                  onChange={(e) => setPreferredMap(e.target.value as "google" | "apple" | "waze")}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-bold focus:outline-none focus:bg-white text-slate-700"
                >
                  <option value="google">🗺️ Google Maps Navigation</option>
                  <option value="apple">🍏 Apple Maps Navigation</option>
                  <option value="waze">🚙 Waze Directions App</option>
                </select>
              </div>

              {/* Alert notifications subscription */}
              <div className="space-y-2 border-t border-slate-50 pt-3">
                <div className="flex justify-between items-center text-slate-700 font-semibold">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Bell className="w-4 h-4 text-blue-500" /> Push Alerts (1h)
                  </span>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  Schedules automatic background checks every 5 minutes and flags driver notifications to start jobs starting within 1 hour.
                </p>

                <button
                  type="button"
                  onClick={requestBrowserNotificationAccess}
                  className="text-[10px] font-sans font-bold text-blue-600 hover:text-blue-700 hover:underline block cursor-pointer"
                >
                  [Request System OS Push Permissions]
                </button>
              </div>

            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl text-[10.5px] font-sans flex items-start gap-2 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="leading-normal text-slate-400">
              License parameters and SMS notifications coordinates are fully integrated with device SMS clipboard encoders. Keep registrations active to prevent routing lockdown.
            </p>
          </div>
        </div>

      </div>

      {/* 🔮 SLIDE 4: VEHICLE EDIT & ADD DIALOG MODAL */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h4 className="text-sm font-black text-slate-800">
                {editingVehicleId ? "Edit Vehicle Type" : "Add Vehicle Type"}
              </h4>
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg h-7 w-7 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh] text-xs font-sans">
              
              {/* Icon Picker Row */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Icon</span>
                <div className="flex gap-2">
                  {["🚗", "🚙", "🚐", "🚕", "🚌", "✈️"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setModalIcon(item)}
                      className={`w-10 h-10 border text-lg rounded-xl flex items-center justify-center transition cursor-pointer ${
                        modalIcon === item 
                          ? "ring-2 ring-blue-600 bg-blue-50 border-blue-400" 
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Vehicle Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Executive Saloon"
                  value={modalVehicleName}
                  onChange={(e) => setModalVehicleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2.5 font-bold text-slate-800 text-xs"
                />
              </div>

              {/* Passengers/Luggage Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Max Passengers</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={modalMaxPassengers}
                    onChange={(e) => setModalMaxPassengers(parseInt(e.target.value) || 4)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 font-black text-slate-800 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Max Luggage</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={modalMaxLuggage}
                    onChange={(e) => setModalMaxLuggage(parseInt(e.target.value) || 3)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 font-black text-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Description (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 4 passengers - 3 luggage"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-slate-705 text-xs"
                />
              </div>

              {/* Rates Base/Mile */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Base Fare (£)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={modalBaseFare}
                    onChange={(e) => setModalBaseFare(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-slate-800 font-bold tracking-tight text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Per Mile (£)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={modalPerMileRate}
                    onChange={(e) => setModalPerMileRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-slate-800 font-bold tracking-tight text-xs font-mono"
                  />
                </div>
              </div>

              {/* Rates Extras MeetGreet/Toll */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Meet &amp; Greet (£)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={modalMeetGreetFee}
                    onChange={(e) => setModalMeetGreetFee(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Airport Toll (£)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={modalAirportToll}
                    onChange={(e) => setModalAirportToll(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
              </div>

              {/* Real-time trip estimate preview box */}
              <div className="bg-slate-50/85 border border-slate-200/60 p-3 rounded-xl font-medium text-slate-500/90 text-center select-none">
                Example (8 mi trip): <strong className="text-slate-800 font-black font-mono">£{(modalBaseFare + 8 * modalPerMileRate).toFixed(2)}</strong>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 border border-slate-250 text-slate-700 bg-white hover:bg-slate-50 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVehicleModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </form>
  );
}
