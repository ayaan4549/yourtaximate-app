import React, { useState } from "react";
import { ComplianceDocument } from "../../types";
import { 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Plus, 
  Folder, 
  Car, 
  Heart, 
  Award, 
  Plane, 
  Compass,
  CheckCircle,
  Calendar,
  Upload,
  Clock,
  Trash2,
  X
} from "lucide-react";

interface DocumentsTabProps {
  documents: ComplianceDocument[];
  onUpdateDocuments: (docs: ComplianceDocument[]) => void;
}

export function DocumentsTab({ documents, onUpdateDocuments }: DocumentsTabProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState("driver");
  const [newDocExpiry, setNewDocExpiry] = useState("");

  // Statistics summaries
  const totalDocs = documents.length;
  const verifiedCount = documents.filter(d => d.status === "Verified").length;
  const pendingCount = documents.filter(d => d.status === "Pending").length;
  const expiredCount = documents.filter(d => d.status === "Expired").length;
  const missingCount = documents.filter(d => d.status === "Missing").length;

  // Real compliance calculation (Score out of 100 based on verified docs ratio)
  const complianceScore = totalDocs > 0 ? Math.round((verifiedCount / totalDocs) * 100) : 0;

  // Filtering list
  const CATEGORIES = [
    { id: "all", label: "All", icon: Folder },
    { id: "driver", label: "📂 Driver", icon: Award },
    { id: "vehicle", label: "🚗 Vehicle", icon: Car },
    { id: "insurance", label: "🛡️ Insurance", icon: ShieldCheck },
    { id: "medical", label: "🏥 Medical", icon: Heart },
    { id: "operator", label: "📑 Operator", icon: FileText },
    { id: "airport", label: "✈️ Airport", icon: Plane },
    { id: "training", label: "🎓 Training", icon: Compass }
  ];

  const filteredDocs = documents.filter(doc => {
    if (activeCategory === "all") return true;
    return doc.type === activeCategory;
  });

  // Action handlers
  const handleExpiryChange = (id: string, newDate: string) => {
    const updated = documents.map(doc => {
      if (doc.id === id) {
        let status = doc.status;
        const chosen = new Date(newDate);
        const today = new Date();
        if (chosen < today) {
          status = "Expired";
        } else if (status === "Expired") {
          status = "Verified";
        }
        return { ...doc, expiryDate: newDate, status };
      }
      return doc;
    });
    onUpdateDocuments(updated);
  };

  const handleStatusChange = (id: string, status: "Verified" | "Pending" | "Missing" | "Expired") => {
    const updated = documents.map(doc => {
      if (doc.id === id) {
        return { ...doc, status };
      }
      return doc;
    });
    onUpdateDocuments(updated);
  };

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter(doc => doc.id !== id);
    onUpdateDocuments(updated);
  };

  const handleAddNewDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const newDoc: ComplianceDocument = {
      id: "doc-" + Date.now(),
      name: newDocName,
      type: newDocType,
      status: "Pending",
      expiryDate: newDocExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    onUpdateDocuments([...documents, newDoc]);
    setNewDocName("");
    setNewDocExpiry("");
    setIsModalOpen(false);
  };

  // Predefined missing list trigger
  const missingSuggestions = [
    { name: "V5C Log Book", type: "vehicle" },
    { name: "Private Hire Vehicle Licence", type: "vehicle" },
    { name: "MOT Certificate", type: "vehicle" },
    { name: "Road Tax Certification", type: "vehicle" }
  ].filter(s => !documents.some(d => d.name.toLowerCase().includes(s.name.toLowerCase())));

  const handleQuickAdd = (name: string, type: string) => {
    const newDoc: ComplianceDocument = {
      id: "doc-" + Date.now(),
      name: name,
      type: type,
      status: "Pending",
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };
    onUpdateDocuments([...documents, newDoc]);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title Header */}
      <div>
        <h3 className="text-lg font-black font-display text-slate-900 tracking-tight">Licensing &amp; Documents</h3>
        <p className="text-xs text-slate-400 mt-0.5">UK private hire compliance tracker - HMRC audits standard verification</p>
      </div>

      {/* Grid of Stats Cards & Compliance Circle Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Compliance Circle Gauge */}
        <div className="md:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex items-center gap-5 justify-center">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            {/* SVG Circle indicator */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#f1f5f9"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={complianceScore > 75 ? "#10b981" : complianceScore > 40 ? "#f59e0b" : "#f43f5e"}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * complianceScore) / 100}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="text-center">
              <span className="text-xl font-black text-slate-800 tracking-tight font-mono">{complianceScore}%</span>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Compliance</p>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-800">TfL PHV Standard Verified</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Keep verified documents active to remain roadworthy in Greater London or local authority.
            </p>
          </div>
        </div>

        {/* Dynamic Boxes */}
        <div className="md:col-span-8 grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs flex flex-col justify-content-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Added</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800 font-mono">{verifiedCount + pendingCount}</span>
              <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">Documents added</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs flex flex-col justify-content-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Expiring</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800 font-mono">
                {documents.filter(d => {
                  if (d.status === "Expired" || !d.expiryDate) return false;
                  const diff = new Date(d.expiryDate).getTime() - Date.now();
                  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // <30 days
                }).length}
              </span>
              <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">Expiring soon (&lt;30d)</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs flex flex-col justify-content-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Expired</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800 font-mono">{expiredCount}</span>
              <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">Expired records</p>
            </div>
          </div>
        </div>

      </div>

      {/* Filters bar + Action Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full select-none shrink-0 scrollbar-none">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  isActive 
                    ? "bg-slate-900 text-white shadow" 
                    : "text-slate-500 bg-white border border-slate-150 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {cat.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="lg:self-auto self-end px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs duration-100"
        >
          <Plus className="w-3.5 h-3.5 animate-pulse" />
          Add Document
        </button>
      </div>

      {/* Main Document Listing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="md:col-span-2 bg-slate-50/50 border border-slate-150 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300" />
            <span className="text-xs font-extrabold text-slate-700 block">No documents added yet</span>
            <p className="text-[10.5px] text-slate-400 max-w-xs leading-normal">
              No files uploaded under <strong className="text-slate-600 font-bold uppercase">"{activeCategory}"</strong> category. Click upload or quick-add from suggest bar below.
            </p>
          </div>
        ) : (
          filteredDocs.map(doc => {
            const isNearExpiry = doc.expiryDate && (new Date(doc.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000);
            return (
              <div 
                key={doc.id} 
                className={`p-4 rounded-2xl bg-white border shadow-xs transition-colors flex flex-col justify-between space-y-3.5 ${
                  doc.status === "Expired" 
                    ? "border-rose-200 bg-rose-50/10" 
                    : isNearExpiry 
                      ? "border-amber-200 bg-amber-50/15" 
                      : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${
                      doc.status === "Verified" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                      doc.status === "Pending" ? "bg-blue-50 border-blue-100 text-blue-600" :
                      doc.status === "Expired" ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-slate-50 border-slate-150 text-slate-400"
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 tracking-tight leading-tight">{doc.name}</h4>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wide">Category: {doc.type}</span>
                    </div>
                  </div>

                  {/* Status pills selector */}
                  <select
                    value={doc.status}
                    onChange={(e) => handleStatusChange(doc.id, e.target.value as any)}
                    className={`text-[9px] font-black lowercase tracking-wide px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                      doc.status === "Verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      doc.status === "Pending" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      doc.status === "Expired" ? "bg-rose-5 text-rose-700 border-rose-200 animate-pulse" : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    <option value="Verified">verified</option>
                    <option value="Pending">pending approval</option>
                    <option value="Missing">missing</option>
                    <option value="Expired">expired</option>
                  </select>
                </div>

                {/* Expiry Selector and Sub Actions */}
                <div className="border-t border-slate-50 pt-2.5 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 flex items-center gap-1 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Expires:
                    </span>
                    <input
                      type="date"
                      value={doc.expiryDate}
                      onChange={(e) => handleExpiryChange(doc.id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 focus:bg-white px-2 py-1 rounded-lg font-mono font-bold text-slate-700 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleStatusChange(doc.id, "Pending");
                        alert(`Re-uploaded ${doc.name}! marked as pending verification review.`);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-0.5 hover:underline cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      Re-upload
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1 rounded hover:bg-rose-50 cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Slide 1 Missing suggestions bottom alert board */}
      {missingSuggestions.length > 0 && (
        <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in text-xs font-sans select-none">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-slate-800">Missing Required Documents</span>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal max-w-sm">
                Add standard licensing parameters to restore compliance checklist to 100% and avoid insurance lockdown.
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {missingSuggestions.map(item => (
              <button
                key={item.name}
                onClick={() => handleQuickAdd(item.name, item.type)}
                className="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200/50 px-2 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 duration-100"
              >
                <Plus className="w-3 h-3" />
                + {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Document Pop dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in font-sans text-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-100 overflow-hidden flex flex-col">
            
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="font-extrabold text-slate-800">Add New Compliance Document</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewDocument} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., TfL Certificate of Insurance"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Classification Type</label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-none text-slate-705"
                  >
                    <option value="driver">Driver</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="insurance">Insurance</option>
                    <option value="medical">Medical</option>
                    <option value="operator">Operator</option>
                    <option value="airport">Airport</option>
                    <option value="training">Training</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide font-extrabold block">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newDocExpiry}
                    onChange={(e) => setNewDocExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-2 border border-slate-150 text-[10px] text-slate-500 leading-normal">
                <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Files are processed locally and securely archived securely in browser state variables.</span>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-550 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition"
                >
                  Create Record
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
