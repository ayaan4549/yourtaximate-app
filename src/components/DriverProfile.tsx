import React, { useState, useRef } from "react";
import { 
  User, 
  Car, 
  Star, 
  UploadCloud, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  AlertTriangle,
  Loader2,
  Lock,
  Edit2
} from "lucide-react";

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: "Verified" | "Pending" | "Expires soon" | "Expired";
  expiry: string;
  critical: boolean;
}

interface DriverProfileProps {
  documents: DocumentItem[];
  onAddDocument: (newDoc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  onRenewDocument: (id: string) => void;
}

export function DriverProfile({ 
  documents, 
  onAddDocument, 
  onDeleteDocument, 
  onRenewDocument 
}: DriverProfileProps) {
  // Personal Details state
  const [driverName, setDriverName] = useState("Licensee");
  const [isEditingName, setIsEditingName] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+44 7700 900077");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [badgeNumber, setBadgeNumber] = useState("PHV-77129");
  const [isEditingBadge, setIsEditingBadge] = useState(false);

  // Vehicle Details state
  const [vehicleMakeModel, setVehicleMakeModel] = useState("Mercedes-Benz E-Class");
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState("LR23 XTM");
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [vehicleColor, setVehicleColor] = useState("Premium Metallic Black");
  const [isEditingColor, setIsEditingColor] = useState(false);

  // Rating and reviews simulation
  const mockReviews = [
    { id: 1, stars: 5, text: "The driver was exceptionally polite, spotless Mercedes, arrived 5 mins early at Gatwick!", date: "Yesterday" },
    { id: 2, stars: 5, text: "Excellent navigation. Quick and reliable pre-booked airport run.", date: "May 18, 2026" },
    { id: 3, stars: 4, text: "Very smooth ride. Smooth driving through London traffic.", date: "May 15, 2026" }
  ];

  // Drag and drop / Manual file upload state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("licence");
  const [expiryDate, setExpiryDate] = useState("2027-12-31");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mockFileName, setMockFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      setMockFileName(file.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setMockFileName(file.name);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockFileName && !uploadedFile) {
      alert("Please select or drag a document file to upload.");
      return;
    }

    setIsUploading(true);

    // Simulate reliable upload latency
    setTimeout(() => {
      setIsUploading(false);
      
      let docName = "UK DVLA Driving Licence Update";
      if (selectedDocType === "insurance") docName = "Hire & Reward Insurance PHV";
      if (selectedDocType === "mot") docName = "MOT Compliance Certificate";
      if (selectedDocType === "pco") docName = "TfL PHV Driver Badge";

      onAddDocument({
        id: Math.random().toString(36).substring(7),
        name: docName,
        type: selectedDocType,
        status: "Pending",
        expiry: expiryDate,
        critical: true
      });

      setUploadSuccess(true);
      setUploadedFile(null);
      setMockFileName("");
      
      setTimeout(() => {
        setUploadSuccess(false);
      }, 4000);

    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Personal and Vehicle details card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Driver Profile Specs */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-md space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-600/10">
                DM
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  {isEditingName ? (
                    <input 
                      type="text" 
                      value={driverName} 
                      onChange={(e) => setDriverName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      className="text-base font-extrabold text-slate-900 border-b border-blue-500 focus:outline-none py-0.5 w-32"
                    />
                  ) : (
                    <>
                      <h4 className="text-base font-black text-slate-900">{driverName}</h4>
                      <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-md text-amber-700 w-fit">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-black">4.9 Star Carrier</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Editable Fields */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-bold">Smart Phone Contacts</span>
                <div className="flex items-center gap-1.5">
                  {isEditingPhone ? (
                    <input 
                      type="text" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onBlur={() => setIsEditingPhone(false)}
                      autoFocus
                      className="font-mono text-slate-800 border-b border-blue-500 focus:outline-none text-right py-0.5"
                    />
                  ) : (
                    <>
                      <span className="font-mono text-slate-800 font-bold">{phoneNumber}</span>
                      <button onClick={() => setIsEditingPhone(true)} className="text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-bold">PCO Badge / Licence No</span>
                <div className="flex items-center gap-1.5">
                  {isEditingBadge ? (
                    <input 
                      type="text" 
                      value={badgeNumber} 
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      onBlur={() => setIsEditingBadge(false)}
                      autoFocus
                      className="font-mono text-slate-800 border-b border-blue-500 focus:outline-none text-right py-0.5"
                    />
                  ) : (
                    <>
                      <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md text-[11px]">{badgeNumber}</span>
                      <button onClick={() => setIsEditingBadge(true)} className="text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-bold">Account Verification</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold tracking-wide uppercase px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Approved
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Fleet Parameters */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-md space-y-4">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600" />
              Pre-booked Live Vehicle Stats
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Vehicle Model</span>
                <div className="flex items-center gap-1.5">
                  {isEditingVehicle ? (
                    <input 
                      type="text" 
                      value={vehicleMakeModel} 
                      onChange={(e) => setVehicleMakeModel(e.target.value)}
                      onBlur={() => setIsEditingVehicle(false)}
                      autoFocus
                      className="font-sans text-slate-800 border-b border-blue-500 focus:outline-none text-right py-0.5"
                    />
                  ) : (
                    <>
                      <span className="text-slate-800 font-bold">{vehicleMakeModel}</span>
                      <button onClick={() => setIsEditingVehicle(true)} className="text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">UK Registration Plate</span>
                <div className="flex items-center gap-1.5">
                  {isEditingPlate ? (
                    <input 
                      type="text" 
                      value={vehiclePlate} 
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      onBlur={() => setIsEditingPlate(false)}
                      autoFocus
                      className="font-mono text-slate-800 border-b border-blue-500 focus:outline-none text-right py-0.5"
                    />
                  ) : (
                    <>
                      <span className="font-mono text-slate-950 font-extrabold bg-amber-400 border border-amber-500 px-2 py-0.5 rounded-md text-[11px] shadow-sm tracking-wide">{vehiclePlate}</span>
                      <button onClick={() => setIsEditingPlate(true)} className="text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Exterior Colorway</span>
                <div className="flex items-center gap-1.5">
                  {isEditingColor ? (
                    <input 
                      type="text" 
                      value={vehicleColor} 
                      onChange={(e) => setVehicleColor(e.target.value)}
                      onBlur={() => setIsEditingColor(false)}
                      autoFocus
                      className="font-sans text-slate-800 border-b border-blue-500 focus:outline-none text-right py-0.5"
                    />
                  ) : (
                    <>
                      <span className="text-slate-800 font-bold">{vehicleColor}</span>
                      <button onClick={() => setIsEditingColor(true)} className="text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-bold">Private Hire Class</span>
                <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 font-bold tracking-wider uppercase px-2 py-0.5 rounded">
                  Executive Lux
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Custom Verification Document Upload & List View (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Interactive File Upload Node */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-md space-y-4">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              Upload &amp; Refresh Private Hire Documents
            </h4>

            <form onSubmit={handleDocumentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="text-[10px] font-sans font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Select Document Type
                  </label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-sans font-bold"
                  >
                    <option value="licence">UK DVLA Driving Licence</option>
                    <option value="insurance">Hire &amp; Reward Insurance Receipt</option>
                    <option value="mot">Active MOT PDF Record</option>
                    <option value="pco">TfL PHV Driver Badge / PCO Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-sans font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Document Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Drag and Drop Zone Container */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging 
                    ? "border-blue-500 bg-blue-50/50" 
                    : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/40"
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf"
                />

                <UploadCloud className={`w-8 h-8 ${isDragging ? "text-blue-500 scale-110" : "text-slate-400"} transition-all`} />
                <p className="text-xs font-bold text-slate-800">
                  {mockFileName ? mockFileName : "Drag and drop document record here, or click to browse files"}
                </p>
                <p className="text-[10px] text-slate-400">
                  Supports PDF, PNG, JPG files up to 10MB (Complies with Private Hire guidelines)
                </p>
              </div>

              {mockFileName && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-600 font-bold">{mockFileName}</span>
                  <button 
                    type="button" 
                    onClick={() => { setUploadedFile(null); setMockFileName(""); }}
                    className="text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || (!mockFileName && !uploadedFile)}
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Uploading Encrypted PDF Vector to Vault...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Submit Compliance Document Record
                  </>
                )}
              </button>

              {uploadSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2 text-xs text-emerald-800 animate-fade-in">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p>✓ Compliance Document Registered successfully! Marked as <strong>"Pending Verification"</strong> under UK regulation policies.</p>
                </div>
              )}
            </form>
          </div>

          {/* Active Documents Listing Node */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-md space-y-3.5">
            <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>All Uploaded Credentials</span>
              <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full">ACTIVE AND PENDING</span>
            </h4>

            <div className="space-y-2">
              {documents.map((doc) => {
                const isExpiredSoon = doc.status === "Expires soon";
                const isPending = doc.status === "Pending";
                return (
                  <div key={doc.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl mt-0.5 sm:mt-0 text-slate-500 flex items-center justify-center">
                        <FileText className="w-4.5 h-4.5 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{doc.name}</span>
                          {isPending ? (
                            <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide animate-pulse">
                              Pending Review
                            </span>
                          ) : isExpiredSoon ? (
                            <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Expires Soon
                            </span>
                          ) : (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          Regulatory Target Expiry: <strong className="text-slate-700 font-semibold">{doc.expiry}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isPending && (
                        <button
                          type="button"
                          onClick={() => onRenewDocument(doc.id)}
                          className="text-[10px] font-extrabold font-sans text-blue-600 bg-white border border-slate-200 hover:border-blue-400 hover:bg-slate-50 rounded-xl px-2.5 py-1.5 transition cursor-pointer"
                        >
                          Auto-Renew
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id)}
                        className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Reviews Rating Feedbacks */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-md space-y-4">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Latest Customer Feedbacks (Live Stream)
            </h4>

            <div className="space-y-3">
              {mockReviews.map((review) => (
                <div key={review.id} className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: review.stars }).map((_, index) => (
                        <Star key={index} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{review.date}</span>
                  </div>
                  <p className="text-slate-600 font-sans">"{review.text}"</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
