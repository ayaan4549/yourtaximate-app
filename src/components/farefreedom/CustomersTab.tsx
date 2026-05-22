import React, { useState } from "react";
import { Customer } from "../../types";
import { UserPlus, Search, Phone, MessageSquare, Trash2, Edit, AlertCircle, Bookmark, Check } from "lucide-react";

interface CustomersTabProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onDeleteCustomer: (phone: string) => void;
  onUpdateCustomer: (customer: Customer) => void;
}

export function CustomersTab({ customers, onAddCustomer, onDeleteCustomer, onUpdateCustomer }: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Edit notes state
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const trimmedPhone = phone.replace(/\D/g, "");
    if (customers.some(c => c.phone.replace(/\D/g, "") === trimmedPhone)) {
      alert("A client with this phone number is already registered inside contact records.");
      return;
    }

    const newCust: Customer = {
      name,
      phone,
      notes: notes.trim() || "Regular street hail client",
      bookingCount: 0,
      tripCount: 0,
      totalSpent: 0
    };

    onAddCustomer(newCust);
    setName("");
    setPhone("");
    setNotes("");
    setShowAddForm(false);
  };

  const handleSaveNotesEdit = (cust: Customer) => {
    onUpdateCustomer({
      ...cust,
      notes: editingNotes.trim()
    });
    setEditingPhone(null);
  };

  // Search filtration
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* Contact head actions bars */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search contact book by name or telephone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl py-2 pl-9 pr-4 text-xs"
          />
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-slate-800"
        >
          <UserPlus className="w-3.5 h-3.5 text-blue-400" />
          Add Customer Contact
        </button>
      </div>

      {/* Manual Collapsible Contact add form */}
      {showAddForm && (
        <form onSubmit={handleSaveCustomer} className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm space-y-4 animate-fade-in">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wide border-b border-slate-50 pb-2 block">
            Register New Passenger Card
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Passnger Driver Name</label>
              <input
                type="text"
                required
                placeholder="Frodo Baggins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Telephone contact number</label>
              <input
                type="text"
                required
                placeholder="+44 7700 900234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold block mb-1">Internal Reference Notes</label>
            <textarea
              placeholder="Requires premium estate class, drops frequent luggage, tip friendly."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-16 bg-slate-50 border border-slate-200 focus:outline-none rounded-lg p-2.5 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
            >
              Record Contact
            </button>
          </div>
        </form>
      )}

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-1 md:col-span-3 text-center py-10 bg-white border border-slate-100 rounded-xl">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span className="text-xs text-slate-400 font-sans">No passenger contacts found inside records search.</span>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const isEditing = editingPhone === c.phone;

            return (
              <div key={c.phone} className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-200 transition space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 justify-between border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold font-sans text-xs flex items-center justify-center shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{c.phone}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => onDeleteCustomer(c.phone)}
                      className="text-slate-300 hover:text-red-500 p-1 rounded transition"
                      title="Deallocate directory reference"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Summary metric values */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg text-center font-sans text-[10px] text-slate-500 font-bold">
                    <div>
                      <span>Prebooked</span>
                      <strong className="text-slate-800 text-[11px] block mt-0.5">{c.bookingCount}</strong>
                    </div>
                    <div>
                      <span>Metre Completed</span>
                      <strong className="text-slate-800 text-[11px] block mt-0.5">{c.tripCount}</strong>
                    </div>
                    <div>
                      <span>Spend (Ltv)</span>
                      <strong className="text-blue-700 text-[11px] block mt-0.5">£{c.totalSpent.toFixed(0)}</strong>
                    </div>
                  </div>

                  {/* Custom passenger reference notes */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-slate-400" /> Administrative Memo
                    </label>
                    {isEditing ? (
                      <div className="flex gap-1 items-end mt-1">
                        <textarea
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded p-1.5 text-[11px]"
                        />
                        <button 
                          onClick={() => handleSaveNotesEdit(c)}
                          className="p-1.5 bg-slate-900 border border-slate-900 text-white rounded hover:bg-slate-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2 bg-slate-50/50 p-2 rounded-lg text-[11px] text-slate-600 leading-normal font-sans italic relative">
                        <p className="flex-1 font-bold">{c.notes}</p>
                        <button 
                          onClick={() => {
                            setEditingPhone(c.phone);
                            setEditingNotes(c.notes);
                          }}
                          className="text-slate-300 hover:text-slate-600 p-0.5 shrink-0"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instant Dial / WhatsApp shortcuts */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 mt-1">
                  <a 
                    href={`tel:${c.phone}`}
                    className="py-1.5 rounded-lg border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-900 text-[10px] font-bold text-center flex items-center justify-center gap-1 hover:bg-slate-50 font-sans transition-all"
                  >
                    <Phone className="w-3 h-3 text-slate-400" /> Call Dial
                  </a>
                  <a 
                    href={`https://wa.me/${c.phone.replace(/\+/g, "")}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 hover:border-emerald-300 text-emerald-800 text-[10px] font-bold text-center flex items-center justify-center gap-1 transition-all"
                  >
                    <MessageSquare className="w-3 h-3 text-teal-600" /> Chat WhatsApp
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
